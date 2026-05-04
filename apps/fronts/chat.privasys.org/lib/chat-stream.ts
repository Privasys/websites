// Minimal OpenAI-compatible streaming
// client for chat.privasys.org.
//
// Talks directly to the fleet's `endpoint` (an RA-TLS-fronted vLLM
// proxy with /v1/chat/completions). The browser already verified
// the server's quote during the attestation handshake, so plain
// fetch() over HTTPS is sufficient here - the trust came from
// attestation, not from a secret bearer.

import type { SamplingParams } from './sampling';
import type { SealedSession } from '@privasys/auth';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// Reproducibility metadata block emitted by the confidential-ai
// proxy as the last SSE event (before [DONE]) and as a top-level
// "reproducibility" key on non-stream responses. See
// platform/confidential-ai/internal/reproducibility/.
export interface Reproducibility {
    seed?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
    model?: string;
    model_digest?: string;
    quantization?: string;
    vllm_version?: string;
    cuda_version?: string;
    gpu_type?: string;
    image_digest?: string;
    tee_type?: string;
    /** Per-tool summary populated by the agentic loop. */
    tool_calls?: ToolCallSummary[];
    /**
     * SHA-256 (hex) of the client-side system prompt used for this turn.
     * Stamped by the chat front-end at stream completion; not produced
     * by the enclave. Lets a verifier confirm which prompt the model
     * was conditioned on. Full text lives at lib/system-prompt.ts.
     */
    system_prompt_sha256?: string;
    /** Human-readable version tag for the system prompt (e.g. "v1"). */
    system_prompt_version?: string;
    [key: string]: unknown;
}

export interface ToolCallSummary {
    name: string;
    status: 'ok' | 'error';
    duration_ms: number;
    error?: string;
}

// Live tool_call event (start). Emitted by confidential-ai before
// dispatching the call to the owning MCP server.
export interface ToolCallEvent {
    id: string;
    name: string;       // "<server>__<tool>"
    args: unknown;      // raw JSON the model produced
    started_at: number; // ms since epoch (set client-side on receipt)
    /**
     * True when the upstream MCP server (or its server-config) marks
     * this tool as a privileged write action that needs explicit
     * user attention. The server still dispatches the call; the
     * front-end uses this to render an inline notice and -- in a
     * future iteration -- the deny-and-cancel button.
     */
    requires_confirmation?: boolean;
}

// Live tool_result event (end). Status "ok" carries the JSON result;
// "error" carries the error message.
export interface ToolResultEvent {
    id: string;
    name: string;
    status: 'ok' | 'error';
    result?: unknown;
    error?: string;
    duration_ms: number;
    finished_at: number;
}

export interface StreamChatArgs {
    endpoint: string;
    model: string;
    messages: ChatMessage[];
    sampling?: SamplingParams;
    token?: string;
    signal?: AbortSignal;
    /** Called for each delta text chunk as it arrives. */
    onDelta: (delta: string) => void;
    /** Called once with the full final assistant message. */
    onDone?: (final: string, meta?: Reproducibility) => void;
    /** Called on stream error. */
    onError?: (err: Error) => void;
    /** Called when the agent starts a tool call. */
    onToolCall?: (ev: ToolCallEvent) => void;
    /** Called when a tool call completes (ok or error). */
    onToolResult?: (ev: ToolResultEvent) => void;
    /**
     * Optional sealed session-relay handle. When provided, the request
     * is tunnelled through PrivasysSession.stream() so the chat traffic
     * is encrypted end-to-end (browser ↔ enclave) and never visible to
     * the gateway. Falls back to plain fetch when omitted.
     */
    sealedSession?: SealedSession;
}

interface SSEChunk {
    choices?: Array<{
        delta?: { content?: string };
        finish_reason?: string | null;
    }>;
    reproducibility?: Reproducibility;
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
        'Accept': 'text/event-stream'
    };
    if (args.token) headers.Authorization = `Bearer ${args.token}`;

    const body: Record<string, unknown> = {
        model: args.model,
        messages: args.messages,
        stream: true
    };
    if (args.sampling) {
        for (const [k, v] of Object.entries(args.sampling)) {
            if (v !== undefined && v !== null && v !== '') body[k] = v;
        }
    }

    let res: Response | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array>;
    if (args.sealedSession) {
        try {
            const sealed = await args.sealedSession.stream('POST', '/v1/chat/completions', body, {
                signal: args.signal
            });
            if (sealed.status >= 400) {
                const drained: Uint8Array[] = [];
                const r = sealed.body.getReader();
                for (;;) {
                    const { value, done } = await r.read();
                    if (done) break;
                    if (value) drained.push(value);
                }
                const text = drained.length ? new TextDecoder().decode(concatU8(drained)) : '';
                const err = new Error(
                    `chat request failed: ${sealed.status}${text ? ` - ${text.slice(0, 200)}` : ''}`
                );
                args.onError?.(err);
                throw err;
            }
            reader = sealed.body.getReader();
        } catch (e) {
            const err = e instanceof Error ? e : new Error('sealed stream failed');
            args.onError?.(err);
            throw err;
        }
    } else {
        try {
            res = await fetch(url, {
                method: 'POST',
                headers,
                signal: args.signal,
                body: JSON.stringify(body)
            });
        } catch (e) {
            const err = e instanceof Error ? e : new Error('fetch failed');
            args.onError?.(err);
            throw err;
        }

        if (!res.ok || !res.body) {
            const text = await res.text().catch(() => '');
            const err = new Error(
                `chat request failed: ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`
            );
            args.onError?.(err);
            throw err;
        }

        reader = res.body.getReader();
    }
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    let meta: Reproducibility | undefined;

    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let sep: number;
            while ((sep = buffer.indexOf('\n\n')) !== -1) {
                const event = buffer.slice(0, sep);
                buffer = buffer.slice(sep + 2);

                // SSE event block: optional `event:` header sets the
                // event type; we treat unset (or `message`) as the
                // OpenAI-compatible stream and route `tool_call` /
                // `tool_result` to the agentic callbacks.
                let eventName = 'message';
                let dataPayload = '';
                for (const line of event.split('\n')) {
                    if (line.startsWith('event:')) {
                        eventName = line.slice(6).trim();
                    } else if (line.startsWith('data:')) {
                        // SSE allows multi-line `data:`; concatenate.
                        dataPayload += (dataPayload ? '\n' : '') + line.slice(5).trim();
                    }
                }
                if (!dataPayload) continue;
                if (dataPayload === '[DONE]') {
                    args.onDone?.(full, meta);
                    return;
                }
                try {
                    const parsed = JSON.parse(dataPayload);
                    if (eventName === 'tool_call') {
                        args.onToolCall?.({
                            ...(parsed as Omit<ToolCallEvent, 'started_at'>),
                            started_at: Date.now()
                        });
                        continue;
                    }
                    if (eventName === 'tool_result') {
                        args.onToolResult?.({
                            ...(parsed as Omit<ToolResultEvent, 'finished_at'>),
                            finished_at: Date.now()
                        });
                        continue;
                    }
                    if (eventName === 'error') {
                        const msg = (parsed as { message?: string })?.message ?? 'agent error';
                        args.onError?.(new Error(msg));
                        continue;
                    }
                    // Default `message` event: OpenAI-compatible chunk
                    // or our reproducibility wrapper.
                    const chunk = parsed as SSEChunk;
                    if (chunk.reproducibility) {
                        meta = chunk.reproducibility;
                    }
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
        args.onDone?.(full, meta);
    } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return;
        const err = e instanceof Error ? e : new Error('stream failed');
        args.onError?.(err);
        throw err;
    } finally {
        reader.releaseLock();
    }
}

function concatU8(parts: Uint8Array[]): Uint8Array {
    let total = 0;
    for (const p of parts) total += p.byteLength;
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
        out.set(p, off);
        off += p.byteLength;
    }
    return out;
}
