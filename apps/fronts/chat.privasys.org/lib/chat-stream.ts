// Minimal OpenAI-compatible streaming
// client for chat.privasys.org.
//
// Talks directly to the fleet's `endpoint` (an RA-TLS-fronted vLLM
// proxy with /v1/chat/completions). The browser already verified
// the server's quote during the attestation handshake, so plain
// fetch() over HTTPS is sufficient here - the trust came from
// attestation, not from a secret bearer.

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface StreamChatArgs {
    endpoint: string;
    model: string;
    messages: ChatMessage[];
    token?: string;
    signal?: AbortSignal;
    /** Called for each delta text chunk as it arrives. */
    onDelta: (delta: string) => void;
    /** Called once with the full final assistant message. */
    onDone?: (final: string) => void;
    /** Called on stream error. */
    onError?: (err: Error) => void;
}

interface SSEChunk {
    choices?: Array<{
        delta?: { content?: string };
        finish_reason?: string | null;
    }>;
}

/**
 * Stream a chat completion via OpenAI-compatible SSE.
 *
 * Returns when the server emits `[DONE]` or the connection closes.
 */
export async function streamChatCompletion(args: StreamChatArgs): Promise<void> {
    const url = `${args.endpoint.replace(/\/$/, '')}/v1/chat/completions`;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
    };
    if (args.token) headers.Authorization = `Bearer ${args.token}`;

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers,
            signal: args.signal,
            body: JSON.stringify({
                model: args.model,
                messages: args.messages,
                stream: true,
            }),
        });
    } catch (e) {
        const err = e instanceof Error ? e : new Error('fetch failed');
        args.onError?.(err);
        throw err;
    }

    if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        const err = new Error(
            `chat request failed: ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`,
        );
        args.onError?.(err);
        throw err;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // SSE events are separated by blank lines.
            let sep: number;
            while ((sep = buffer.indexOf('\n\n')) !== -1) {
                const event = buffer.slice(0, sep);
                buffer = buffer.slice(sep + 2);

                for (const line of event.split('\n')) {
                    if (!line.startsWith('data:')) continue;
                    const data = line.slice(5).trim();
                    if (!data) continue;
                    if (data === '[DONE]') {
                        args.onDone?.(full);
                        return;
                    }
                    try {
                        const chunk = JSON.parse(data) as SSEChunk;
                        const delta = chunk.choices?.[0]?.delta?.content;
                        if (delta) {
                            full += delta;
                            args.onDelta(delta);
                        }
                    } catch {
                        // Ignore malformed chunks; vLLM occasionally emits
                        // keep-alives that aren't strict JSON.
                    }
                }
            }
        }
        args.onDone?.(full);
    } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return;
        const err = e instanceof Error ? e : new Error('stream failed');
        args.onError?.(err);
        throw err;
    } finally {
        reader.releaseLock();
    }
}
