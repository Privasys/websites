'use client';

// First-run Context prompt (§8.7). Shown once, when the user starts their
// SECOND conversation — the moment cross-chat recall first becomes useful. It
// sets the GLOBAL default for "past conversations" (an AI-scope grant) and
// teaches that the per-chat Context control exists. Everything it sets is
// afterwards adjustable per-conversation from the composer's Context chip and
// globally in the Knowledge view — nothing is buried in settings.

import { useState } from 'react';

export function ContextIntroModal({
    onUsePastChats,
    onKeepSeparate
}: {
    /** Enable past-conversation recall globally (an enable-AI grant). */
    onUsePastChats: () => Promise<void> | void;
    /** Leave past conversations off. */
    onKeepSeparate: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const use = async () => {
        setBusy(true);
        try {
            await onUsePastChats();
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] shadow-2xl">
                <div className="px-6 pt-6 pb-2 text-center">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Get more helpful replies from your past chats
                    </h2>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-text-secondary)]">
                        I can draw on your earlier conversations for more useful, personalised
                        answers. They stay end-to-end encrypted in your private Drive — only you
                        can see them.
                    </p>
                </div>
                <div className="flex flex-col gap-2 p-4">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void use()}
                        className="rounded-xl border border-[var(--color-border-dark)] px-4 py-3 text-left transition-colors hover:border-[var(--color-primary-blue)]/60 hover:bg-[var(--color-surface-2)]/40 disabled:opacity-60"
                    >
                        <span className="block text-sm font-medium text-[var(--color-text-primary)]">
                            {busy ? 'Enabling…' : 'Use past chats'}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                            I&apos;ll recall relevant context from your previous conversations.
                        </span>
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onKeepSeparate}
                        className="rounded-xl border border-[var(--color-border-dark)] px-4 py-3 text-left transition-colors hover:border-[var(--color-primary-blue)]/60 hover:bg-[var(--color-surface-2)]/40 disabled:opacity-60"
                    >
                        <span className="block text-sm font-medium text-[var(--color-text-primary)]">
                            Keep chats separate
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                            I won&apos;t look across your conversations.
                        </span>
                    </button>
                </div>
                <p className="px-6 pb-5 text-center text-[11px] text-[var(--color-text-muted)]">
                    You can change this any time — per chat from the <strong>Context</strong>{' '}
                    menu, or for everything in <strong>Knowledge</strong>.
                </p>
            </div>
        </div>
    );
}
