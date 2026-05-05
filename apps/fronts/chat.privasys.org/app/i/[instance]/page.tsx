'use client';

import { use, useEffect, useMemo, useState } from 'react';
import type { Instance } from '~/lib/types';
import { fetchInstance, InstanceNotFoundError, pickInitialModel } from '~/lib/instance-api';
import { ChatShell } from '~/components/chat-shell';
import { useAuth } from '~/lib/privasys-auth';

// chat.privasys.org/i/<instance>.
//   - When unauthenticated: render the full shell with the composer in
//     read-only mode and a "Sign in to chat" hint underneath. The Sign in
//     button lives in the sidebar (Edgeless pattern: chat is visible, but
//     sending requires Connect).
//   - When authenticated: load the instance metadata and stream replies.
export default function InstancePage({ params }: { params: Promise<{ instance: string }> }) {
    const { instance: instanceId } = use(params);
    const { session, loading: authLoading, expired } = useAuth();
    const [instance, setInstance] = useState<Instance | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch instance metadata. We do this even when unauthenticated so the
    // sign-in flow can read `instance.session_relay` and opt into the sealed
    // CBOR transport from the very first ceremony — without this, the wallet
    // gets a vanilla QR (no `mode: "session-relay"`) and binds a normal
    // passkey instead of bootstrapping a sealed session against the enclave.
    useEffect(() => {
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
    }, [instanceId]);

    const greeting = useMemo(() => decodeGreeting(session?.accessToken), [session]);

    if (authLoading) {
        return (
            <main className="grid flex-1 place-items-center px-6 py-16">
                <div className="text-sm text-[var(--color-text-secondary)] animate-pulse">
                    Checking session for {instanceId}…
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

    // Unauthenticated: render the shell so the sidebar + sign-in flow are
    // visible. Use the real instance metadata if it's already loaded so the
    // sign-in iframe can opt into session-relay; otherwise fall back to a
    // placeholder until `fetchInstance` resolves.
    if (!session) {
        const placeholder: Instance = {
            id: instanceId,
            alias: instanceId,
            fleet_id: '',
            endpoint: '',
            multi_model: false,
            loaded_model: null,
            available_models: [],
            auth: { required: true, issuer: '' },
            attestation_server: ''
        };
        return (
            <ChatShell
                key="guest"
                instance={instance ?? placeholder}
                initialModel={null}
                disabledReason={
                    expired
                        ? 'Your session expired. Sign in to keep chatting.'
                        : 'Sign in from the sidebar to start a confidential conversation.'
                }
                userGreeting="Welcome"
            />
        );
    }

    if (!instance) {
        return (
            <main className="grid flex-1 place-items-center px-6 py-16">
                <div className="text-sm text-[var(--color-text-secondary)] animate-pulse">
                    Loading {instanceId}…
                </div>
            </main>
        );
    }

    return (
        <ChatShell
            key="auth"
            instance={instance}
            initialModel={pickInitialModel(instance)}
            userGreeting={greeting}
        />
    );
}

function decodeGreeting(token: string | undefined): string | undefined {
    if (!token) return undefined;
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;
    try {
        const payload = JSON.parse(
            atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        ) as { name?: string; given_name?: string; preferred_username?: string; email?: string };
        const first =
            payload.given_name ||
            (payload.name ? payload.name.split(' ')[0] : undefined) ||
            payload.preferred_username ||
            (payload.email ? payload.email.split('@')[0] : undefined);
        return first ? `Hi ${first}` : 'Hello';
    } catch {
        return 'Hello';
    }
}
