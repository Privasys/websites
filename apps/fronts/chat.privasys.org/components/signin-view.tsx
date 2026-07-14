'use client';

import { useEffect, useRef, useState } from 'react';
import { chatServiceHost } from '~/lib/chat-service-api';
import { useAuth } from '~/lib/privasys-auth';
import type { Instance } from '~/lib/types';

// Full-page sign-in gate (same pattern as drive.privasys.org): chat pitch
// on the left, the auth SDK's inline ceremony on the right. It replaces
// the WHOLE shell while signing in, so no signed-in chrome (sidebar,
// conversation list, user pill) shows behind an authentication prompt.
// The SDK renders the ceremony in inline presentation (no card chrome of
// its own) because we pass a container.
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
    const { signInInto, cancelSignIn } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const startedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (startedRef.current) return;
        const el = containerRef.current;
        if (!el) return;
        // Wait for the real instance metadata to load before kicking off the
        // sign-in flow — without it we cannot know whether `session_relay`
        // is enabled, and the SDK would generate a vanilla QR (no
        // `mode: "session-relay"`) so the wallet would bind a normal passkey
        // instead of bootstrapping a sealed session against the enclave.
        if (!instance.endpoint) return;
        startedRef.current = true;
        // Opt into the sealed session-relay flow when the management
        // service tells us this instance has the bootstrap middleware.
        // The wallet attests `app_host`'s quote and binds the issued JWT
        // to a sealed CBOR-AES-GCM transport session that lives inside
        // the privasys.id iframe.
        const sessionRelayHost = instance.session_relay?.enabled
            ? instance.session_relay.app_host
            : undefined;
        // Multi-app attestation: seal the chat-service back-end (a separate
        // enclave) in the SAME wallet ceremony, so getSealedSession(chatHost)
        // later resumes silently without a second phone touch.
        const opts = sessionRelayHost
            ? { sessionRelayHost, extraAppHosts: [chatServiceHost()] }
            : undefined;
        void signInInto(el, opts)
            .then(() => onSuccess())
            .catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : 'Sign-in failed.';
                if (msg !== 'Authentication cancelled') {
                    setError(msg);
                }
            });
    }, [instance, signInInto, onSuccess]);

    return (
        <div className="flex min-h-screen flex-1 flex-col bg-[var(--color-surface-0,transparent)]">
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

            <main className="flex flex-1 items-center justify-center px-6">
                <div className="grid w-full max-w-4xl items-center gap-10 py-12 md:grid-cols-2">
                    {/* Pitch */}
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                            Your conversations, sealed.
                        </h1>
                        <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                            Privasys Chat runs its AI model inside a hardware-protected
                            enclave. The operator can never read your prompts or replies,
                            and you can verify it yourself by remote attestation.
                        </p>
                        <ul className="mt-6 space-y-3 text-sm text-[var(--color-text-primary)]">
                            <Feature text="Sealed browser-to-enclave transport. The gateway only sees ciphertext." />
                            <Feature text="Chat history stays on this device. The platform stores none of it." />
                            <Feature text="No passwords. Sign in with the Privasys Wallet or a passkey." />
                            <Feature text="Attestation-verified confidential computing, no trust required." />
                        </ul>
                    </div>

                    {/* Sign-in. Passing a container puts the auth SDK in inline
                        presentation: no brand panel or close button, a compact
                        column sized for this explicitly sized container. */}
                    <div>
                        {notice && (
                            <p className="mb-3 text-center text-sm text-[var(--color-text-secondary)]">
                                {notice}
                            </p>
                        )}
                        {error && (
                            <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                                {error}
                            </div>
                        )}
                        <div
                            ref={containerRef}
                            className="h-[560px] w-full overflow-hidden rounded-2xl"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

function Feature({ text }: { text: string }) {
    return (
        <li className="flex items-start gap-2.5">
            <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: 'var(--color-primary-blue)' }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5L20 7" />
                </svg>
            </span>
            {text}
        </li>
    );
}
