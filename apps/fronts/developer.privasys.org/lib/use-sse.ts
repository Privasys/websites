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

    useEffect(() => {
        if (!token) return;

        let cancelled = false;
        let retryDelay = 1000;
        let controller: AbortController;

        async function connectSSE() {
            while (!cancelled) {
                controller = new AbortController();
                try {
                    const resp = await fetch(`${API_URL}/api/v1/events`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
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
    }, [token]);
}
