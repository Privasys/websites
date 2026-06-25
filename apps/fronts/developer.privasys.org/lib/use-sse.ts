import { useEffect, useRef } from 'react';
import { getApiBaseUrl } from './api-base-url';

const API_URL = getApiBaseUrl();

interface SSEEvent {
    event: string;
    data: Record<string, string>;
}

type SSEHandler = (event: SSEEvent) => void;

/**
 * Hook that connects to the SSE endpoint and calls the handler on each event.
 * Automatically reconnects on disconnect with exponential backoff.
 */
export function useSSE(token: string | undefined, handler: SSEHandler) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    // Hold the token in a ref so a silent renewal (the SDK hands back a fresh
    // access-token string every few minutes) does NOT re-run the effect and
    // tear down the live stream. Keying the effect on the token *value* made
    // every renewal abort and re-open the SSE connection — and re-run every
    // consumer's loader — which is a big part of the "constant polling" you
    // see in the network tab. We key only on whether a token exists; each
    // (re)connect reads the freshest token from the ref, and a long-lived
    // stream naturally picks up the new token when the server closes it.
    const tokenRef = useRef(token);
    tokenRef.current = token;
    const hasToken = !!token;

    useEffect(() => {
        if (!hasToken) return;

        let cancelled = false;
        let retryDelay = 1000;
        let controller: AbortController;

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
                                    handlerRef.current({ event: currentEvent, data });
                                } catch { /* ignore parse errors */ }
                                currentEvent = '';
                                currentData = '';
                            }
                        }
                    }

                    // The stream closed cleanly (done === true) — e.g. a proxy
                    // idle-closed it or the server-side token expired. Pause
                    // before reopening (same backoff as the error path) so a
                    // proxy that drops the stream immediately can't drive a
                    // tight reconnect loop that looks just like polling.
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
}
