'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import {
    streamChatCompletion,
    type ChatMessage,
    type Reproducibility,
} from '~/lib/chat-stream';
import { DEFAULT_SAMPLING, type SamplingParams } from '~/lib/sampling';
import { modelLabel } from '~/lib/model-label';
import { Composer } from './composer';
import { Markdown } from './markdown';
import { MetadataDialog } from './metadata-dialog';

interface DisplayMessage extends ChatMessage {
    id: string;
    streaming?: boolean;
    error?: string;
    meta?: Reproducibility;
    sampling?: SamplingParams;
    startedAt?: number;
    finishedAt?: number;
}

let nextId = 0;
const newId = () => `m${++nextId}`;

// Streaming chat panel.
//
// Two visual states:
//   - Empty: a centered "Where should we start?" greeting + the Composer
//     pinned in the middle of the viewport (Gemini new-chat layout).
//   - Active: scrollable message list + Composer docked at the bottom.
//
// Assistant turns render as full-width markdown (no chat bubble) with a
// per-message action row (Copy, Metadata, wall-time). User turns keep
// the right-aligned pill so the conversation flow is still obvious.
export function ChatPanel({
    instance,
    model,
    onModelChange,
    token,
    disabledReason,
    userGreeting,
    onConnect,
}: {
    instance: Instance;
    model: AvailableModel | null;
    onModelChange: (m: AvailableModel) => void;
    token?: string;
    disabledReason?: string;
    userGreeting?: string;
    /** When set, the empty-state shows a prominent Connect button
     *  instead of a disabled composer (used in the unauth flow). */
    onConnect?: () => void;
}) {
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [sampling, setSampling] = useState<SamplingParams>({ ...DEFAULT_SAMPLING });
    const [metaFor, setMetaFor] = useState<DisplayMessage | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }, [messages]);

    useEffect(() => () => abortRef.current?.abort(), []);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || streaming || !model) return;

        const userMsg: DisplayMessage = { id: newId(), role: 'user', content: text };
        const assistantId = newId();
        const history = [...messages, userMsg];
        const startedAt = Date.now();
        const samplingSnapshot: SamplingParams = { ...sampling };

        setMessages([
            ...history,
            {
                id: assistantId,
                role: 'assistant',
                content: '',
                streaming: true,
                sampling: samplingSnapshot,
                startedAt,
            },
        ]);
        setInput('');
        setStreaming(true);

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        try {
            await streamChatCompletion({
                endpoint: instance.endpoint,
                model: model.name,
                sampling: samplingSnapshot,
                messages: history.map(({ role, content }) => ({ role, content })),
                token,
                signal: ctrl.signal,
                onDelta: (delta) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId
                                ? { ...m, content: m.content + delta }
                                : m,
                        ),
                    );
                },
                onDone: (_full, meta) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId
                                ? {
                                      ...m,
                                      streaming: false,
                                      meta,
                                      finishedAt: Date.now(),
                                  }
                                : m,
                        ),
                    );
                },
                onError: (err) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId
                                ? { ...m, streaming: false, error: err.message }
                                : m,
                        ),
                    );
                },
            });
        } finally {
            setStreaming(false);
            abortRef.current = null;
        }
    }, [input, streaming, model, instance.endpoint, messages, token, sampling]);

    const stop = useCallback(() => abortRef.current?.abort(), []);

    const composer = (
        <Composer
            value={input}
            onChange={setInput}
            onSend={() => void send()}
            onStop={stop}
            streaming={streaming}
            instance={instance}
            model={model}
            onModelChange={onModelChange}
            sampling={sampling}
            onSamplingChange={setSampling}
            placeholder={
                model
                    ? `Message ${modelLabel(model)}\u2026`
                    : 'No model loaded for this instance.'
            }
            autoFocus
            disabledReason={disabledReason}
        />
    );

    // Empty / new-chat state — Gemini-style centered hero.
    if (messages.length === 0) {
        return (
            <div className='flex flex-1 flex-col items-center justify-center px-4'>
                <div className='w-full max-w-2xl'>
                    <div className='mb-8 text-center'>
                        {userGreeting && (
                            <p className='text-2xl font-medium text-[var(--color-text-secondary)]'>
                                {userGreeting}
                            </p>
                        )}
                        <h2
                            className='mt-1 text-3xl font-semibold sm:text-4xl'
                            style={{
                                background: 'var(--brand-gradient)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            Where should we start?
                        </h2>
                    </div>
                    {onConnect ? (
                        <div className='flex flex-col items-center gap-3'>
                            <button
                                type='button'
                                onClick={onConnect}
                                className='rounded-full px-6 py-2.5 text-sm font-semibold text-[var(--color-navy)] shadow-sm transition-opacity hover:opacity-90'
                                style={{ background: 'var(--brand-gradient)' }}
                            >
                                Connect to start chatting
                            </button>
                            {disabledReason && (
                                <p className='text-xs text-[var(--color-text-secondary)]'>
                                    {disabledReason}
                                </p>
                            )}
                        </div>
                    ) : (
                        composer
                    )}
                </div>
            </div>
        );
    }

    // Active chat state — scrollable transcript + docked composer.
    return (
        <div className='flex flex-1 flex-col'>
            <div ref={scrollRef} className='flex-1 overflow-y-auto px-4 py-6'>
                <div className='mx-auto flex max-w-3xl flex-col gap-6'>
                    {messages.map((m) => (
                        <Message
                            key={m.id}
                            message={m}
                            onShowMeta={() => setMetaFor(m)}
                        />
                    ))}
                </div>
            </div>

            <div className='px-4 pb-5'>
                <div className='mx-auto max-w-3xl'>{composer}</div>
                <p className='mx-auto mt-2 max-w-3xl text-center text-[11px] text-[var(--color-text-muted)]'>
                    Replies are signed by the hardware running the model. Verify
                    any response from the &ldquo;Your session is secure&rdquo;
                    panel.
                </p>
            </div>

            {metaFor && (
                <MetadataDialog
                    sampling={metaFor.sampling}
                    reproducibility={metaFor.meta}
                    elapsedMs={
                        metaFor.startedAt && metaFor.finishedAt
                            ? metaFor.finishedAt - metaFor.startedAt
                            : undefined
                    }
                    onClose={() => setMetaFor(null)}
                />
            )}
        </div>
    );
}

function Message({
    message,
    onShowMeta,
}: {
    message: DisplayMessage;
    onShowMeta: () => void;
}) {
    if (message.role === 'user') {
        return (
            <div className='flex justify-end'>
                <div className='max-w-[80%] rounded-2xl rounded-br-sm border border-[var(--color-primary-blue)]/30 bg-[var(--color-surface-2)] px-4 py-2.5 text-sm whitespace-pre-wrap text-[var(--color-text-primary)] shadow-sm'>
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-2'>
            {message.content ? (
                <Markdown>{message.content}</Markdown>
            ) : message.streaming ? (
                <p className='text-sm text-[var(--color-text-muted)]'>
                    <StreamCursor />
                </p>
            ) : null}
            {message.streaming && message.content && (
                <p className='text-sm text-[var(--color-text-muted)]'>
                    <StreamCursor />
                </p>
            )}
            {message.error && (
                <p className='text-xs text-red-400'>{message.error}</p>
            )}
            {!message.streaming && message.content && (
                <MessageActions message={message} onShowMeta={onShowMeta} />
            )}
        </div>
    );
}

function MessageActions({
    message,
    onShowMeta,
}: {
    message: DisplayMessage;
    onShowMeta: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* ignore */
        }
    };

    const elapsed =
        message.finishedAt && message.startedAt
            ? ((message.finishedAt - message.startedAt) / 1000).toFixed(1)
            : null;
    const tokens = approxTokens(message.content);
    const tps =
        elapsed && tokens > 0 ? (tokens / parseFloat(elapsed)).toFixed(1) : null;

    return (
        <div className='flex items-center gap-3 text-xs text-[var(--color-text-muted)]'>
            <button
                type='button'
                onClick={() => void copy()}
                className='inline-flex items-center gap-1 hover:text-[var(--color-text-primary)]'
                title='Copy reply'
            >
                {copied ? '\u2713 Copied' : 'Copy'}
            </button>
            <button
                type='button'
                onClick={onShowMeta}
                className='inline-flex items-center gap-1 hover:text-[var(--color-text-primary)]'
                title='View reproducibility metadata'
            >
                Metadata
            </button>
            {elapsed && (
                <span>
                    {elapsed}s{tps && ` \u00B7 ~${tps} tok/s`}
                </span>
            )}
        </div>
    );
}

function StreamCursor() {
    return (
        <span className='ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle' />
    );
}

// Approximate token count for display purposes only. vLLM doesn't
// always return usage on streamed responses, so we estimate using
// the rough "1 token ~ 4 characters" rule of thumb. The displayed
// throughput is therefore approximate.
function approxTokens(text: string): number {
    if (!text) return 0;
    return Math.max(1, Math.round(text.length / 4));
}
