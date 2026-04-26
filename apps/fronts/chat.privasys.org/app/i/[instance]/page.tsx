'use client';

import { use, useEffect, useRef, useState } from 'react';
import type { Instance } from '~/lib/types';
import { fetchInstance, InstanceNotFoundError, pickInitialModel } from '~/lib/instance-api';
import { ChatShell } from '~/components/chat-shell';
import { useAuth } from '~/lib/privasys-auth';

// chat.privasys.org/i/<instance> per the URL contract.
// `instance` is either an opaque 64-bit hex id (e.g. b1a2c3d4e5f60718)
// or a human alias (e.g. 'demo'). Boot sequence (per ai-plan.md §7.2):
//   1. Fetch the instance metadata from management-service.
//   2. (If auth.required) prompt sign-in via privasys-auth SDK.
//   3. Connect to instance.endpoint over RA-TLS, verify quote.
//   4. Render the chat shell.
//
// Steps 1, 2 and 4 are implemented here. Step 3 (sealed transport
// binding) lands with Phase D/E of the session-relay rollout.
export default function InstancePage({ params }: { params: Promise<{ instance: string }> }) {
    const { instance: instanceId } = use(params);
    const { session, loading: authLoading, signIn, expired } = useAuth();
    const [instance, setInstance] = useState<Instance | null>(null);
    const [error, setError] = useState<string | null>(null);
    const triggered = useRef(false);

    // Auto-trigger sign-in on first visit (no prior session).
    useEffect(() => {
        if (authLoading || session || triggered.current || expired) return;
        triggered.current = true;
        signIn().catch(() => {
            triggered.current = false;
        });
    }, [authLoading, session, signIn, expired]);

    useEffect(() => {
        if (!session) triggered.current = false;
    }, [session]);

    // Fetch instance metadata once authenticated.
    useEffect(() => {
        if (!session) return;
        const ctrl = new AbortController();
        fetchInstance(instanceId, ctrl.signal)
            .then(setInstance)
            .catch((e: unknown) => {
                if ((e as { name?: string })?.name === 'AbortError') return;
                if (e instanceof InstanceNotFoundError) {
                    setError(`No chat instance named "${instanceId}".`);
                } else {
                    setError(e instanceof Error ? e.message : 'Failed to load instance.');
                }
            });
        return () => ctrl.abort();
    }, [instanceId, session]);

    if (authLoading) {
        return <CenteredCard message={`Checking session for ${instanceId}…`} />;
    }

    if (!session) {
        return (
            <main className="grid flex-1 place-items-center px-6 py-16">
                <div className="w-full max-w-md text-center">
                    <BrandMark />
                    <h1 className="mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">
                        Sign in to chat
                    </h1>
                    <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                        Your session is end-to-end attested. Authenticate with your
                        Privasys wallet to start a confidential conversation with the{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">
                            {instanceId}
                        </span>{' '}
                        instance.
                    </p>
                    {expired && (
                        <p className="mt-4 text-xs text-amber-400">
                            Your previous session expired. Please sign in again.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={() =>
                            signIn().catch((e: unknown) => {
                                setError(e instanceof Error ? e.message : 'Sign-in failed.');
                            })
                        }
                        className="mt-8 inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-[var(--color-navy)] shadow-lg shadow-[#34E89E]/10 transition-transform hover:scale-[1.02]"
                        style={{ background: 'var(--brand-gradient)' }}
                    >
                        Sign in with Privasys
                    </button>
                    {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="mx-auto max-w-2xl px-6 py-16">
                <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                    Instance unavailable
                </h1>
                <p className="mt-4 text-[var(--color-text-secondary)]">{error}</p>
            </main>
        );
    }

    if (!instance) {
        return <CenteredCard message={`Loading ${instanceId}…`} />;
    }

    return <ChatShell instance={instance} initialModel={pickInitialModel(instance)} />;
}

function CenteredCard({ message }: { message: string }) {
    return (
        <main className="grid flex-1 place-items-center px-6 py-16">
            <div className="text-sm text-[var(--color-text-secondary)] animate-pulse">
                {message}
            </div>
        </main>
    );
}

function BrandMark() {
    return (
        <img
            src="/favicon/privasys-logo.auto-dark.svg"
            alt="Privasys"
            className="mx-auto h-12 w-12"
        />
    );
}

