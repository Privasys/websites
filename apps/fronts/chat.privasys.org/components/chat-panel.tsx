'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import { streamChatCompletion, type ChatMessage } from '~/lib/chat-stream';
import { Composer } from './composer';

interface DisplayMessage extends ChatMessage {
    id: string;
    streaming?: boolean;
    error?: string;
}

let nextId = 0;
const newId = () => `m${++nextId}`;

// Streaming chat panel.
//
// Two visual states:
//   - Empty: a centered "Where should we start?" greeting + the Composer
//     pinned in the middle of the viewport (Gemini new-chat layout).
//   - Active: scrollable message list + Composer docked at the bottom.
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
            placeholder={
                model ? `Message ${model.name}…` : 'No model loaded for this instance.'
            }
            autoFocus
            disabledReason={disabledReason}
        />
    );

    // Empty / new-chat state — Gemini-style centered hero.
    if (messages.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center px-4">
                <div className="w-full max-w-2xl">
                    <div className="mb-8 text-center">
                        {userGreeting && (
                            <p className="text-2xl font-medium text-[var(--color-text-secondary)]">
                                {userGreeting}
                            </p>
                        )}
                        <h2
                            className="mt-1 text-3xl font-semibold sm:text-4xl"
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
                        <div className="flex flex-col items-center gap-3">
                            <button
                                type="button"
                                onClick={onConnect}
                                className="rounded-full px-6 py-2.5 text-sm font-semibold text-[var(--color-navy)] shadow-sm transition-opacity hover:opacity-90"
                                style={{ background: 'var(--brand-gradient)' }}
                            >
                                Connect to start chatting
                            </button>
                            {disabledReason && (
                                <p className="text-xs text-[var(--color-text-secondary)]">
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
        <div className="flex flex-1 flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
                <div className="mx-auto flex max-w-3xl flex-col gap-6">
                    {messages.map((m) => (
                        <Message key={m.id} message={m} />
                    ))}
                </div>
            </div>

            <div className="px-4 pb-5">
                <div className="mx-auto max-w-3xl">{composer}</div>
                <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-[var(--color-text-muted)]">
                    Replies are signed by the hardware running the model. Verify any
                    response from the “Your session is secure” panel.
                </p>
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
                    <p className="mt-2 text-xs text-red-400">{message.error}</p>
                )}
            </div>
        </div>
    );
}

function StreamCursor() {
    return <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle" />;
}
