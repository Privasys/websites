'use client';

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from './privasys-auth';
import { getApiBaseUrl } from './api-base-url';

const API_URL = getApiBaseUrl();

interface SSEEvent {
    event: string;
    data: Record<string, string>;
}

type SSEHandler = (event: SSEEvent) => void;

interface SSEContextValue {
    /** Register a handler for every event on the shared stream. Returns an unsubscribe fn. */
    subscribe: (handler: SSEHandler) => () => void;
}

const SSEContext = createContext<SSEContextValue | null>(null);

/**
 * SSEProvider opens a SINGLE Server-Sent Events connection for the whole
 * platform dashboard and fans every event out to all subscribers.
 *
 * Previously each page AND the sidebar called useSSE directly, so the
 * dashboard held two or more EventSource connections at once and every one of
 * them reconnected on each token renewal. One shared stream removes that
 * multiplication. The token is held in a ref so a silent renewal does not tear
 * down the live stream — the next (re)connect picks up the fresh token — and a
 * clean close backs off before reopening so a buffering proxy can't drive a
 * tight reconnect loop.
 */
export function SSEProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth();
    const token = session?.accessToken;

    // Subscribers live in a ref so (un)subscribing never re-runs the
    // connection effect.
    const subscribersRef = useRef<Set<SSEHandler>>(new Set());

    const tokenRef = useRef(token);
    tokenRef.current = token;
    const hasToken = !!token;

    const subscribe = useCallback((handler: SSEHandler) => {
        subscribersRef.current.add(handler);
        return () => { subscribersRef.current.delete(handler); };
    }, []);

    useEffect(() => {
        if (!hasToken) return;

        let cancelled = false;
        let retryDelay = 1000;
        let controller: AbortController;

        const emit = (event: SSEEvent) => {
            // Snapshot so a handler that (un)subscribes mid-dispatch can't
            // mutate the set we're iterating. A throwing subscriber must not
            // kill the read loop or starve the others.
            for (const handler of [...subscribersRef.current]) {
                try { handler(event); } catch { /* ignore subscriber errors */ }
            }
        };

        async function connectSSE() {
            while (!cancelled) {
                controller = new AbortController();
                try {
                    const resp = await fetch(`${API_URL}/api/v1/events`, {
                        headers: {
                            Authorization: `Bearer ${tokenRef.current}`,
                            Accept: 'text/event-stream'
                        },
                        signal: controller.signal
                    });

                    if (!resp.ok || !resp.body) {
                        if (resp.status === 401) {
                            window.dispatchEvent(new Event('auth:expired'));
                            return; // Stop reconnecting — session needs refresh
                        }
                        throw new Error(`SSE connection failed: ${resp.status}`);
                    }

                    retryDelay = 1000; // Reset on successful connection
                    const reader = resp.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    let currentEvent = '';
                    let currentData = '';

                    while (!cancelled) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() ?? '';

                        for (const line of lines) {
                            if (line.startsWith('event: ')) {
                                currentEvent = line.slice(7).trim();
                            } else if (line.startsWith('data: ')) {
                                currentData = line.slice(6).trim();
                            } else if (line === '' && currentEvent && currentData) {
                                try {
                                    const data = JSON.parse(currentData);
                                    emit({ event: currentEvent, data });
                                } catch { /* ignore parse errors */ }
                                currentEvent = '';
                                currentData = '';
                            }
                        }
                    }

                    // Clean close (done === true): pause before reopening so a
                    // proxy that idle-closes the stream can't drive a tight
                    // reconnect loop that looks just like polling.
                    if (!cancelled) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        retryDelay = Math.min(retryDelay * 2, 30000);
                    }
                } catch (_e) {
                    if (_e instanceof DOMException && _e.name === 'AbortError') {
                        if (cancelled) return;
                        continue;
                    }
                    if (cancelled) return;
                    // Reconnect with backoff
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    retryDelay = Math.min(retryDelay * 2, 30000);
                }
            }
        }

        connectSSE();

        return () => {
            cancelled = true;
            controller?.abort();
        };
    }, [hasToken]);

    return <SSEContext.Provider value={{ subscribe }}>{children}</SSEContext.Provider>;
}

/**
 * Subscribe to the shared SSE stream. The handler runs on every event; it does
 * NOT open its own connection. Must be used under an <SSEProvider>. Outside one
 * (no provider in the tree) it is a no-op.
 */
export function useSSE(handler: SSEHandler) {
    const ctx = useContext(SSEContext);
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!ctx) return;
        return ctx.subscribe((event) => handlerRef.current(event));
    }, [ctx]);
}
