'use client';

import { useState } from 'react';

// Collapsible "Thinking" panel for reasoning-model output. Streamed
// reasoning is auto-expanded so the user sees the chain-of-thought
// arrive live; once the closing tag arrives the panel auto-collapses.
export function ThinkingBlock({
    text,
    streaming
}: {
    text: string;
    streaming: boolean;
}) {
    const [openOverride, setOpenOverride] = useState<boolean | null>(null);
    const open = openOverride ?? streaming;
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
                <pre className='max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-[var(--color-border-dark)] px-3 py-2 font-mono text-[12px] leading-relaxed text-[var(--color-text-secondary)]'>
                    {text || ' '}
                </pre>
            )}
        </div>
    );
}
