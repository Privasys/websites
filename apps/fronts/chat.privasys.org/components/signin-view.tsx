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
        'No passwords. Sign in with the Privasys Wallet on your phone.',
        'Attestation-verified confidential computing. Verify it yourself, no need to trust the operator.'
    ]
};

// Full-page sign-in gate. The auth SDK renders the ENTIRE surface (page
// presentation, Option C): a templated header with Chat's logo and name,
// the "Secured by Privasys ID" seal and a Close control; the pitch left;
// every ceremony state right; the SDK terms footer. Chat renders NO chrome
// of its own — one container, three outcomes: success, close (back to chat
// when reachable, otherwise a quiet closed panel), error (banner + retry).
export function SignInGate({
    instance,
    onCancel,
    onSuccess
}: {
    instance: Instance;
    /** Where the SDK's Close control leads when the app is reachable
     *  behind the gate (signed-in reconnect). Absent on the signed-out
     *  page: Close then shows a quiet closed panel instead. */
    onCancel?: () => void;
    onSuccess: () => void;
}) {
    const { connectInto } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const startedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [closed, setClosed] = useState(false);

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
            app: {
                displayName: 'Privasys Chat',
                ...(typeof window !== 'undefined'
                    ? { logoUrl: `${window.location.origin}/favicon/privasys-logo.mini.svg` }
                    : {})
            },
            ...(sessionRelayHost
                ? {
                    appHost: sessionRelayHost,
                    extraAppHosts: [chatServiceHost()],
                    // Sealed transport: only the wallet can open the channel
                    // (SDK default for session-relay apps; explicit here).
                    methods: ['wallet'] as const
                }
                : {})
        })
            .then(() => onSuccess())
            .catch((e: unknown) => {
                startedRef.current = false;
                if ((e as { code?: string }).code === 'cancelled') {
                    if (onCancel) onCancel();
                    else setClosed(true);
                    return;
                }
                setError(e instanceof Error ? e.message : 'Sign-in failed.');
            });
    }, [instance, connectInto, onSuccess, onCancel]);

    useEffect(() => {
        // Wait for the real instance metadata before starting: without it we
        // cannot know whether `session_relay` is enabled, and the SDK would
        // run a vanilla ceremony (no sealed transport bootstrap).
        if (!instance.endpoint || closed) return;
        start();
    }, [instance.endpoint, closed, start]);

    if (closed) {
        return (
            <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    Sign-in closed
                </h1>
                <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
                    You need to sign in with Privasys ID to start a confidential conversation.
                </p>
                {/* Clearing `closed` remounts the ceremony container; the
                    effect then restarts connect() against it. */}
                <button
                    type="button"
                    onClick={() => setClosed(false)}
                    className="rounded-full px-6 py-2.5 text-sm font-semibold text-[var(--color-navy)] shadow-sm transition-opacity hover:opacity-90"
                    style={{ background: 'var(--color-primary-green)' }}
                >
                    Sign in
                </button>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-1 flex-col">
            {error && (
                <div className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
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
            {/* The SDK gate fills the viewport (page presentation). */}
            <div ref={containerRef} className="min-h-[640px] w-full flex-1" />
        </div>
    );
}
