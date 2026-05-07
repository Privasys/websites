'use client';

import { useEffect, useRef, useState } from 'react';

import { Markdown } from './markdown';

// Collapsible "Thinking" panel for reasoning-model output. Streamed
// reasoning is auto-expanded so the user sees the chain-of-thought
// arrive live; once the closing tag arrives the panel auto-collapses.
//
// The reasoning text itself is markdown — Gemma 4 (and the deepseek_r1
// reasoning parser) emit headings, lists and inline code in the
// chain-of-thought just like in the final answer. We render it through
// the same `Markdown` component used for assistant messages so that
// formatting comes through, with a slightly muted/smaller treatment
// applied via the wrapper to keep the panel visually distinct from
// the answer below it.
export function ThinkingBlock({
    text,
    streaming
}: {
    text: string;
    streaming: boolean;
}) {
    const [openOverride, setOpenOverride] = useState<boolean | null>(null);
    const open = openOverride ?? streaming;
    const scrollRef = useRef<HTMLDivElement>(null);

    // While the panel is open and reasoning is still streaming, keep
    // the scroll pinned to the bottom so the latest token is always
    // visible. We only auto-scroll while *streaming*: once the model
    // switches to the answer the user may want to scroll up to read
    // the chain-of-thought, and we should leave their position alone.
    useEffect(() => {
        if (!open || !streaming) return;
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [open, streaming, text]);

    return (
        <div className='rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/60'>
            <button
                type='button'
                onClick={() => setOpenOverride(!open)}
                className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            >
                <span className='flex items-center gap-2'>
                    {streaming ? (
                        <span
                            className='inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary-blue)]'
                            aria-hidden
                        />
                    ) : null}
                    {streaming ? 'Thinking…' : 'Thought process'}
                </span>
                <span className='text-[10px] uppercase tracking-wide opacity-60'>
                    {open ? 'hide' : 'show'}
                </span>
            </button>
            {open && (
                <div
                    ref={scrollRef}
                    className='max-h-64 overflow-y-auto border-t border-[var(--color-border-dark)] px-3 py-2'
                >
                    {text ? (
                        <Markdown className='space-y-2 text-[13px] leading-relaxed text-[var(--color-text-muted)] opacity-90'>
                            {text}
                        </Markdown>
                    ) : (
                        <span className='text-[13px] text-[var(--color-text-muted)] opacity-60'>
                            …
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

