'use client';

import { use, useEffect, useMemo, useState } from 'react';
import type { Instance } from '~/lib/types';
import { fetchInstance, InstanceNotFoundError, pickInitialModel, probeInstanceHealth } from '~/lib/instance-api';
import { ChatShell } from '~/components/chat-shell';
import { SignInGate } from '~/components/signin-view';
import { useAuth } from '~/lib/privasys-auth';

const BOOK_DEMO_URL = 'https://tinyurl.com/bfoing-30';
// Back-end probe budget. The dev/demo enclave lives on a Spot VM that is
// frequently stopped between sessions; rather than letting the user type a
// prompt and wait ~7 s for the gateway's 502, we ping `/healthz` first and
// surface the friendly "infrastructure currently reserved" view when the
// upstream is unreachable.
const HEALTH_PROBE_TIMEOUT_MS = 4_000;

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
    // 'unknown' until we've probed; 'up' / 'down' after the probe resolves.
    // We don't gate the UI on the probe — the chat shell renders as soon
    // as `instance` arrives — but `down` swaps the chat panel for the
    // "infrastructure reserved" notice with a Calendly link.
    const [backendStatus, setBackendStatus] = useState<'unknown' | 'up' | 'down'>('unknown');

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

    // Probe the enclave once we know its endpoint. While the back-end
    // is unreachable we re-poll every 15 s so the friendly notice
    // clears automatically once the operator brings the VM back up
    // (and the user doesn't need to know to refresh the tab).
    useEffect(() => {
        const endpoint = instance?.endpoint;
        if (!endpoint) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const probe = () => {
            probeInstanceHealth(endpoint, HEALTH_PROBE_TIMEOUT_MS)
                .then((reachable) => {
                    if (cancelled) return;
                    setBackendStatus(reachable ? 'up' : 'down');
                    if (!reachable) {
                        timer = setTimeout(probe, 15_000);
                    }
                })
                .catch(() => {
                    if (cancelled) return;
                    setBackendStatus('down');
                    timer = setTimeout(probe, 15_000);
                });
        };

        setBackendStatus('unknown');
        probe();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [instance?.endpoint]);

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

    // Unauthenticated: full-page sign-in gate (drive.privasys.org pattern) —
    // no chat chrome until a session exists. Use the real instance metadata
    // if it's already loaded so the sign-in iframe can opt into
    // session-relay; the gate waits on `instance.endpoint` otherwise (the
    // ceremony must not start against the placeholder — the wallet would
    // get a vanilla QR with no `mode: "session-relay"`).
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
            <SignInGate
                instance={instance ?? placeholder}
                notice={expired ? 'Your session expired. Sign in again to keep chatting.' : undefined}
                onSuccess={() => { /* session state flips the page to the shell */ }}
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

    if (backendStatus === 'down') {
        return (
            <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
                <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                    Demo currently reserved
                </h1>
                <p className="text-[var(--color-text-secondary)]">
                    Our infrastructure is currently reserved for a demo. Please try
                    again in a few hours, or book a slot to see Privasys live.
                </p>
                <a
                    href={BOOK_DEMO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full px-6 py-2.5 text-sm font-semibold text-[var(--color-navy)] shadow-sm transition-opacity hover:opacity-90"
                    style={{ background: 'var(--brand-gradient)' }}
                >
                    Book a demo
                </a>
                <p className="text-xs text-[var(--color-text-muted)]">
                    This page will refresh automatically when the back-end is reachable again.
                </p>
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
