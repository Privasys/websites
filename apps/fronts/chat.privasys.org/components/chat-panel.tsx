'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import {
    streamChatCompletion
} from '~/lib/chat-stream';
import { DEFAULT_SAMPLING, type SamplingParams } from '~/lib/sampling';
import { modelLabel } from '~/lib/model-label';
import type { PersistedMessage, Rating, ToolInvocation } from '~/lib/conversations';
import { clearFeedback, recordFeedback } from '~/lib/pending-feedback';
import { Composer } from './composer';
import { Markdown } from './markdown';
import { MetadataDialog } from './metadata-dialog';
import { ToolCallCard } from './tool-call-card';

interface DisplayMessage extends PersistedMessage {
    /** True while tokens are still streaming in for this message. */
    streaming?: boolean;
}

let nextId = 0;
const newId = () => `m${Date.now().toString(36)}-${++nextId}`;

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
    initialMessages,
    conversationId,
    onMessagesChange
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
    /** Persisted messages to hydrate from. */
    initialMessages: PersistedMessage[];
    /** Id of the conversation we are editing, or null when about to
     *  create a new one. */
    conversationId: string | null;
    /** Persist a new message list. Returns the conversation id the
     *  messages were written to (creates one when called with no
     *  active conversation). */
    onMessagesChange: (messages: PersistedMessage[]) => string | null;
}) {
    const [messages, setMessages] = useState<DisplayMessage[]>(
        () => initialMessages.map((m) => ({ ...m }))
    );
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [sampling, setSampling] = useState<SamplingParams>({ ...DEFAULT_SAMPLING });
    const [metaFor, setMetaFor] = useState<DisplayMessage | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    // Track which conversation id our current messages belong to.
    // When the parent rotates `conversationId`, ChatShell remounts us
    // (via key=conversationId), so this is mainly used after a brand
    // new conversation gets persisted (id flips from null -> string).
    const localConvIdRef = useRef<string | null>(conversationId);

    // Persist a snapshot of the message list. Strips transient state
    // (`streaming`) so the on-disk shape matches PersistedMessage.
    const persist = useCallback(
        (next: DisplayMessage[]) => {
            const sanitized: PersistedMessage[] = next.map(({ streaming, ...rest }) => rest);
            const id = onMessagesChange(sanitized);
            if (id) localConvIdRef.current = id;
        },
        [onMessagesChange]
    );

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
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

        const initial: DisplayMessage[] = [
            ...history,
            {
                id: assistantId,
                role: 'assistant',
                content: '',
                streaming: true,
                sampling: samplingSnapshot,
                startedAt
            }
        ];
        setMessages(initial);
        // Persist the user turn + placeholder eagerly so a refresh
        // mid-stream still surfaces the in-flight question. The
        // assistant body will be overwritten when streaming ends.
        persist(initial);
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
                                : m
                        )
                    );
                },
                onToolCall: (ev) => {
                    const inv: ToolInvocation = {
                        id: ev.id,
                        name: ev.name,
                        args: ev.args,
                        status: 'running',
                        startedAt: ev.started_at
                    };
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId
                                ? { ...m, toolInvocations: [...(m.toolInvocations ?? []), inv] }
                                : m
                        )
                    );
                },
                onToolResult: (ev) => {
                    setMessages((prev) =>
                        prev.map((m) => {
                            if (m.id !== assistantId) return m;
                            const list = (m.toolInvocations ?? []).map((inv) =>
                                inv.id === ev.id
                                    ? {
                                        ...inv,
                                        status: ev.status,
                                        result: ev.result,
                                        error: ev.error,
                                        finishedAt: ev.finished_at,
                                        durationMs: ev.duration_ms
                                    }
                                    : inv
                            );
                            return { ...m, toolInvocations: list };
                        })
                    );
                },
                onDone: (_full, meta) => {
                    setMessages((prev) => {
                        const next = prev.map((m) =>
                            m.id === assistantId
                                ? {
                                    ...m,
                                    streaming: false,
                                    meta,
                                    finishedAt: Date.now()
                                }
                                : m
                        );
                        persist(next);
                        return next;
                    });
                },
                onError: (err) => {
                    setMessages((prev) => {
                        const next = prev.map((m) =>
                            m.id === assistantId
                                ? { ...m, streaming: false, error: err.message }
                                : m
                        );
                        persist(next);
                        return next;
                    });
                }
            });
        } finally {
            setStreaming(false);
            abortRef.current = null;
        }
    }, [input, streaming, model, instance.endpoint, messages, token, sampling, persist]);

    const stop = useCallback(() => abortRef.current?.abort(), []);

    const rateMessage = useCallback(
        (id: string, rating: Rating | null, comment?: string) => {
            setMessages((prev) => {
                const next = prev.map((m) =>
                    m.id === id
                        ? rating === null
                            ? { ...m, rating: undefined, ratingComment: undefined }
                            : { ...m, rating, ratingComment: comment }
                        : m
                );
                persist(next);
                return next;
            });
            const convId = localConvIdRef.current;
            if (rating === null) {
                clearFeedback(id);
            } else if (convId) {
                recordFeedback({
                    messageId: id,
                    conversationId: convId,
                    instanceId: instance.id,
                    rating,
                    comment,
                    createdAt: Date.now()
                });
            }
        },
        [persist, instance.id]
    );

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
                                backgroundClip: 'text'
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
                            onRate={(rating, comment) => rateMessage(m.id, rating, comment)}
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
    onRate
}: {
    message: DisplayMessage;
    onShowMeta: () => void;
    onRate: (rating: Rating | null, comment?: string) => void;
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
            {message.toolInvocations && message.toolInvocations.length > 0 && (
                <div className='flex flex-col gap-1'>
                    {message.toolInvocations.map((inv) => (
                        <ToolCallCard key={inv.id} invocation={inv} />
                    ))}
                </div>
            )}
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
                <MessageActions message={message} onShowMeta={onShowMeta} onRate={onRate} />
            )}
        </div>
    );
}

function MessageActions({
    message,
    onShowMeta,
    onRate
}: {
    message: DisplayMessage;
    onShowMeta: () => void;
    onRate: (rating: Rating | null, comment?: string) => void;
}) {
    const [copied, setCopied] = useState(false);
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [commentDraft, setCommentDraft] = useState(message.ratingComment ?? '');
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

    const toggleRating = (next: Rating) => {
        if (message.rating === next) {
            // Un-rate.
            onRate(null);
            setShowCommentBox(false);
            return;
        }
        onRate(next, message.ratingComment);
        if (next === 'down') setShowCommentBox(true);
    };

    return (
        <div className='flex flex-col gap-2'>
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
                <button
                    type='button'
                    onClick={() => toggleRating('up')}
                    className={`inline-flex items-center gap-1 ${
                        message.rating === 'up'
                            ? 'text-[var(--color-primary-green)]'
                            : 'hover:text-[var(--color-text-primary)]'
                    }`}
                    title='Helpful'
                    aria-pressed={message.rating === 'up'}
                >
                    <ThumbUpIcon /> {message.rating === 'up' ? 'Rated' : 'Good'}
                </button>
                <button
                    type='button'
                    onClick={() => toggleRating('down')}
                    className={`inline-flex items-center gap-1 ${
                        message.rating === 'down'
                            ? 'text-red-400'
                            : 'hover:text-[var(--color-text-primary)]'
                    }`}
                    title='Not helpful'
                    aria-pressed={message.rating === 'down'}
                >
                    <ThumbDownIcon /> {message.rating === 'down' ? 'Rated' : 'Bad'}
                </button>
                {elapsed && (
                    <span>
                        {elapsed}s{tps && ` \u00B7 ~${tps} tok/s`}
                    </span>
                )}
            </div>
            {showCommentBox && message.rating === 'down' && (
                <div className='flex flex-col gap-1.5 rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/40 p-2'>
                    <textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder='Optional: what was wrong with this reply? Stays on this device until you leave.'
                        className='min-h-[60px] w-full resize-y rounded-sm border border-[var(--color-border-dark)] bg-transparent p-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary-blue)]/60'
                    />
                    <div className='flex justify-end gap-2'>
                        <button
                            type='button'
                            onClick={() => setShowCommentBox(false)}
                            className='text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        >
                            Cancel
                        </button>
                        <button
                            type='button'
                            onClick={() => {
                                onRate('down', commentDraft.trim() || undefined);
                                setShowCommentBox(false);
                            }}
                            className='text-xs font-medium text-[var(--color-primary-blue)] hover:opacity-80'
                        >
                            Save feedback
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ThumbUpIcon() {
    return (
        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M7 10v12' />
            <path d='M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4-8a2 2 0 0 1 4 1.88Z' />
        </svg>
    );
}

function ThumbDownIcon() {
    return (
        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M17 14V2' />
            <path d='M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17v12l-4 8a2 2 0 0 1-4-1.88Z' />
        </svg>
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
