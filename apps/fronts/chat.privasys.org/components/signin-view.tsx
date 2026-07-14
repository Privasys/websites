'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { chatServiceHost } from '~/lib/chat-service-api';
import { useAuth } from '~/lib/privasys-auth';
import type { Instance } from '~/lib/types';

// Chat's pitch for the SDK gate's left panel (page presentation). The SDK
// styles it; strings only.
const CHAT_PITCH = {
    title: 'Your conversations, sealed.',
    description:
        'Privasys Chat runs its AI model inside a hardware-protected enclave. ' +
        'The operator can never read your prompts or replies, and you can ' +
        'verify it yourself by remote attestation.',
    bullets: [
        'Sealed browser-to-enclave transport. The gateway only sees ciphertext.',
        'Chat history stays on this device. The platform stores none of it.',
        'No passwords. Sign in with the Privasys Wallet or a passkey.',
        'Attestation-verified confidential computing, no trust required.'
    ]
};

// Full-page sign-in gate. The auth SDK renders the ENTIRE surface (page
// presentation): chat's pitch in the left panel and every ceremony state on
// the right — sign-in options, push/QR, the one-tap re-approval after a
// back-end redeploy (reason-aware copy comes from the SDK), success. Chat's
// integration is one container plus connectInto(); it reacts only to
// success and failure.
export function SignInGate({
    instance,
    notice,
    onCancel,
    onSuccess
}: {
    instance: Instance;
    /** Optional context line above the ceremony (e.g. session expired). */
    notice?: string;
    /** When set, shows "Back to chat" and aborts the ceremony on click. */
    onCancel?: () => void;
    onSuccess: () => void;
}) {
    const { connectInto, cancelSignIn } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const startedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    const start = useCallback(() => {
        const el = containerRef.current;
        if (!el || startedRef.current) return;
        startedRef.current = true;
        setError(null);
        const sessionRelayHost = instance.session_relay?.enabled
            ? instance.session_relay.app_host
            : undefined;
        void connectInto(el, {
            pitch: CHAT_PITCH,
            ...(sessionRelayHost
                ? { appHost: sessionRelayHost, extraAppHosts: [chatServiceHost()] }
                : {})
        })
            .then(() => onSuccess())
            .catch((e: unknown) => {
                startedRef.current = false;
                if ((e as { code?: string }).code === 'cancelled') return;
                setError(e instanceof Error ? e.message : 'Sign-in failed.');
            });
    }, [instance, connectInto, onSuccess]);

    useEffect(() => {
        // Wait for the real instance metadata before starting: without it we
        // cannot know whether `session_relay` is enabled, and the SDK would
        // run a vanilla ceremony (no sealed transport bootstrap).
        if (!instance.endpoint) return;
        start();
    }, [instance.endpoint, start]);

    return (
        <div className="flex min-h-screen flex-1 flex-col">
            <header className="flex items-center gap-2 px-5 py-4">
                <img
                    src="/favicon/privasys-logo.mini.svg"
                    alt="Privasys"
                    className="h-7 w-7"
                />
                <span className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
                    Privasys Chat
                </span>
                {onCancel && (
                    <button
                        type="button"
                        onClick={() => {
                            cancelSignIn();
                            onCancel();
                        }}
                        className="ml-auto rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/50 px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary-blue)]/60 hover:text-[var(--color-primary-blue)]"
                    >
                        Back to chat
                    </button>
                )}
            </header>

            <main className="flex flex-1 flex-col">
                {notice && (
                    <p className="mx-auto mt-2 text-center text-sm text-[var(--color-text-secondary)]">
                        {notice}
                    </p>
                )}
                {error && (
                    <div className="mx-auto mt-4 flex max-w-md items-center gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                        <span className="flex-1">{error}</span>
                        <button
                            type="button"
                            onClick={start}
                            className="shrink-0 rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium hover:bg-red-500/10"
                        >
                            Try again
                        </button>
                    </div>
                )}
                {/* The SDK gate fills this container (page presentation). */}
                <div ref={containerRef} className="min-h-[620px] w-full flex-1" />
            </main>
        </div>
    );
}
