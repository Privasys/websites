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
                        <p className='text-center text-sm text-zinc-500'>
                            Start a conversation. Every reply is signed by the hardware.
                        </p>
                    )}
                    {messages.map((m) => (
                        <Message key={m.id} message={m} />
                    ))}
                </div>
            </div>

            <div className='border-t border-zinc-800 px-4 py-3'>
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
                        className='flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50'
                    />
                    {streaming ? (
                        <button
                            type='button'
                            onClick={stop}
                            className='rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800'
                        >
                            Stop
                        </button>
                    ) : (
                        <button
                            type='button'
                            onClick={() => void send()}
                            disabled={!model || !input.trim()}
                            className='rounded-md bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50'
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
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                    isUser ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-100'
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
