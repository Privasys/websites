'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import { ModelPicker } from './model-picker';

// Unified composer used both in the empty-state (centered) and in the
// docked footer once a conversation has started. Layout mirrors Gemini:
//   - Single rounded surface
//   - Textarea at the top
//   - Bottom row: attach + model picker (left), send (right)
//
// Model picker lives INSIDE the composer (per design feedback).
export function Composer({
    value,
    onChange,
    onSend,
    onStop,
    streaming,
    instance,
    model,
    onModelChange,
    placeholder,
    autoFocus,
    disabledReason,
}: {
    value: string;
    onChange: (next: string) => void;
    onSend: () => void;
    onStop?: () => void;
    streaming?: boolean;
    instance: Instance;
    model: AvailableModel | null;
    onModelChange: (m: AvailableModel) => void;
    placeholder?: string;
    autoFocus?: boolean;
    /**
     * If set, the composer is disabled and a one-line CTA / hint is shown
     * below it (e.g. "Sign in to start chatting").
     */
    disabledReason?: string;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const disabled = !!disabledReason;

    // Auto-resize textarea up to ~10 lines.
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 240) + 'px';
    }, [value]);

    useEffect(() => {
        if (autoFocus) textareaRef.current?.focus();
    }, [autoFocus]);

    const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && !streaming) onSend();
        }
    };

    return (
        <div className="w-full">
            <div className="rounded-3xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] shadow-lg shadow-black/20 transition-colors focus-within:border-[var(--color-primary-blue)]/60">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={placeholder ?? 'Type a message…'}
                    rows={1}
                    disabled={disabled}
                    className="block w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] leading-6 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none disabled:opacity-60"
                />

                <div className="flex items-center gap-2 px-3 pt-1 pb-2.5">
                    <button
                        type="button"
                        title="Attach (coming soon)"
                        disabled
                        className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-text-muted)] opacity-50"
                    >
                        <PaperclipIcon />
                    </button>

                    <div className="ml-1">
                        <ModelPicker
                            instance={instance}
                            selected={model}
                            onSelect={onModelChange}
                        />
                    </div>

                    <div className="ml-auto">
                        {streaming ? (
                            <button
                                type="button"
                                onClick={onStop}
                                aria-label="Stop"
                                className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]/80"
                            >
                                <StopIcon />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onSend}
                                disabled={disabled || !value.trim() || !model}
                                aria-label="Send"
                                className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-navy)] shadow-md transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                                style={{ background: 'var(--brand-gradient)' }}
                            >
                                <SendIcon />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {disabledReason && (
                <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
                    {disabledReason}
                </p>
            )}
        </div>
    );
}

function PaperclipIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
    );
}

function SendIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
    );
}

function StopIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
    );
}
