'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import type { Instance } from '~/lib/types';

// Inline sign-in view. Mounts the privasys.id auth iframe inside the
// chat panel via the `signInInto(container)` SDK hook so the overall
// shell (sidebar + header) remains visible during authentication.
export function SignInView({
    instance,
    onCancel,
    onSuccess
}: {
    instance: Instance;
    onCancel: () => void;
    onSuccess: () => void;
}) {
    const { signInInto } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const startedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (startedRef.current) return;
        const el = containerRef.current;
        if (!el) return;
        startedRef.current = true;
        // Opt into the sealed session-relay flow when the management
        // service tells us this instance has the bootstrap middleware.
        // The wallet attests `app_host`'s quote and binds the issued JWT
        // to a sealed CBOR-AES-GCM transport session that lives inside
        // the privasys.id iframe.
        const sessionRelayHost = instance.session_relay?.enabled
            ? instance.session_relay.app_host
            : undefined;
        void signInInto(el, sessionRelayHost ? { sessionRelayHost } : undefined)
            .then(() => onSuccess())
            .catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : 'Sign-in failed.';
                if (msg !== 'Authentication cancelled') {
                    setError(msg);
                }
            });
    }, [instance, signInInto, onSuccess]);

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-4 pb-4">
                {error && (
                    <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                        {error}
                    </div>
                )}
                <div
                    ref={containerRef}
                    className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-[var(--color-border-dark)] bg-white shadow-sm"
                />
            </div>
        </div>
    );
}
