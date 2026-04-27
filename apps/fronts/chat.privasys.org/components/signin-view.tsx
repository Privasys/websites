'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';

// Inline sign-in view. Mounts the privasys.id auth iframe inside the
// chat panel via the `signInInto(container)` SDK hook so the overall
// shell (sidebar + header) remains visible during authentication.
export function SignInView({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
    const { signInInto } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const startedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (startedRef.current) return;
        const el = containerRef.current;
        if (!el) return;
        startedRef.current = true;
        void signInInto(el)
            .then(() => onSuccess())
            .catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : 'Sign-in failed.';
                if (msg !== 'Authentication cancelled') {
                    setError(msg);
                }
            });
    }, [signInInto, onSuccess]);

    return (
        <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
                <header className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                            Connect to Privasys
                        </h1>
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            Authenticate with your Privasys wallet to start a confidential conversation.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/50 px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary-blue)]/60 hover:text-[var(--color-primary-blue)]"
                    >
                        Cancel
                    </button>
                </header>

                {error && (
                    <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <div
                    ref={containerRef}
                    className="min-h-[560px] flex-1 overflow-hidden rounded-2xl border border-[var(--color-border-dark)] bg-white shadow-sm"
                />
            </div>
        </div>
    );
}
