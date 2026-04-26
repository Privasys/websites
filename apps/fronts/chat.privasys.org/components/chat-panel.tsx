'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import { streamChatCompletion, type ChatMessage } from '~/lib/chat-stream';

interface DisplayMessage extends ChatMessage {
    id: string;
    streaming?: boolean;
    error?: string;
}

let nextId = 0;
const newId = () => `m${++nextId}`;

// Streaming chat panel. Uses fetch + SSE against the
// fleet endpoint. Auth token (when fleet requires it) is wired
// through but the privasys-auth integration is a follow-up.
export function ChatPanel({
    instance,
    model,
    token,
}: {
    instance: Instance;
    model: AvailableModel | null;
    token?: string;
}) {
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    useEffect(() => () => abortRef.current?.abort(), []);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || streaming || !model) return;

        const userMsg: DisplayMessage = { id: newId(), role: 'user', content: text };
        const assistantId = newId();
        const history = [...messages, userMsg];

        setMessages([
            ...history,
            { id: assistantId, role: 'assistant', content: '', streaming: true },
        ]);
        setInput('');
        setStreaming(true);

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        try {
            await streamChatCompletion({
                endpoint: instance.endpoint,
                model: model.name,
                messages: history.map(({ role, content }) => ({ role, content })),
                token,
                signal: ctrl.signal,
                onDelta: (delta) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId ? { ...m, content: m.content + delta } : m,
                        ),
                    );
                },
                onDone: () => {
                    setMessages((prev) =>
                        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
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
    }, [input, streaming, model, instance.endpoint, messages, token]);

    const stop = useCallback(() => abortRef.current?.abort(), []);

    return (
        <div className='flex flex-1 flex-col'>
            <div ref={scrollRef} className='flex-1 overflow-y-auto px-4 py-6'>
                <div className='mx-auto flex max-w-3xl flex-col gap-6'>
                    {messages.length === 0 && (
                        <div className='mx-auto max-w-md text-center'>
                            <div
                                className='mx-auto h-1 w-16 rounded-full opacity-80'
                                style={{ background: 'var(--brand-gradient)' }}
                            />
                            <p className='mt-6 text-sm text-[var(--color-text-secondary)]'>
                                Start a conversation. Every reply is signed by the
                                hardware running the model.
                            </p>
                        </div>
                    )}
                    {messages.map((m) => (
                        <Message key={m.id} message={m} />
                    ))}
                </div>
            </div>

            <div className='border-t border-[var(--color-border-dark)] bg-[var(--color-surface-1)]/60 px-4 py-3 backdrop-blur'>
                <div className='mx-auto flex max-w-3xl items-end gap-2'>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void send();
                            }
                        }}
                        placeholder={model ? `Message ${model.name}...` : 'No model loaded.'}
                        disabled={!model || streaming}
                        rows={2}
                        className='flex-1 resize-none rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/60 px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-blue)]/40 disabled:opacity-50'
                    />
                    {streaming ? (
                        <button
                            type='button'
                            onClick={stop}
                            className='rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/40 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:border-red-400/60 hover:text-red-300'
                        >
                            Stop
                        </button>
                    ) : (
                        <button
                            type='button'
                            onClick={() => void send()}
                            disabled={!model || !input.trim()}
                            className='rounded-lg px-4 py-2 text-sm font-semibold text-[var(--color-navy)] shadow-md shadow-[#34E89E]/10 transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100'
                            style={{ background: 'var(--brand-gradient)' }}
                        >
                            Send
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Message({ message }: { message: DisplayMessage }) {
    const isUser = message.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm ${
                    isUser
                        ? 'rounded-br-sm bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border border-[var(--color-primary-blue)]/30'
                        : 'rounded-bl-sm bg-[var(--color-surface-1)] text-[var(--color-text-primary)] border border-[var(--color-border-dark)]'
                }`}
            >
                {message.content || (message.streaming ? <StreamCursor /> : null)}
                {message.streaming && message.content ? <StreamCursor /> : null}
                {message.error && (
                    <p className='mt-2 text-xs text-red-400'>{message.error}</p>
                )}
            </div>
        </div>
    );
}

function StreamCursor() {
    return <span className='ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle' />;
}
