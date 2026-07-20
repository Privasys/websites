'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '~/lib/privasys-auth';
import { useChatDrive } from '~/lib/use-chat-drive';
import {
    driveEnabled,
    driveHost,
    forkConversation,
    getConversation,
    redeemLink,
    resolveLink,
    type ResolvedLink
} from '~/lib/drive-chat-api';
import { parseTranscript } from '~/lib/drive-transcript';
import type { PersistedMessage } from '~/lib/conversations';
import { Markdown } from '~/components/markdown';

// chat.privasys.org/shared/<linkId>#<secret>
//
// Recipient landing for a shared conversation. The secret rides in the URL
// fragment (never sent to a server); we sign the visitor in with their Wallet,
// resolve the link, redeem it (open = read immediately, restricted = a request
// the owner approves), then render the conversation read-only. A fork copies
// the transcript into the visitor's own drive so they can carry it on. `?i=`
// carries the source inference instance so the fork lands them there.

const SHARE_PITCH = {
    title: 'A conversation was shared with you.',
    description:
        'Sign in with your Privasys Wallet to read it. Shared conversations are ' +
        'read-only; you can fork one into your own drive to carry it on. The link ' +
        'secret stays in your browser and is never sent to a server.',
    bullets: [
        'Sealed browser-to-enclave transport. The gateway only sees ciphertext.',
        'Read-only: the owner’s copy is never changed.',
        'Fork any shared conversation into your own private drive.'
    ]
};

type Phase =
    | 'auth' // signing in
    | 'connecting' // establishing the Drive session
    | 'resolving' // resolving the link
    | 'attributes' // restricted: confirm before requesting
    | 'pending' // restricted: waiting for the owner
    | 'denied' // restricted: owner declined
    | 'loading' // fetching the transcript
    | 'ready' // rendering
    | 'error';

export default function SharedConversationPage({
    params
}: {
    params: Promise<{ linkId: string }>;
}) {
    const { linkId } = use(params);
    const { session: authSession, loading: authLoading, connectInto } = useAuth();
    const drive = useChatDrive();

    const [secret, setSecret] = useState<string | null>(null);
    const [instanceId, setInstanceId] = useState<string | null>(null);
    const [phase, setPhase] = useState<Phase>('auth');
    const [error, setError] = useState<string | null>(null);
    const [resolved, setResolved] = useState<ResolvedLink | null>(null);
    const [messages, setMessages] = useState<PersistedMessage[]>([]);
    const [forkedId, setForkedId] = useState<string | null>(null);
    const [forking, setForking] = useState(false);
    const [attrValues, setAttrValues] = useState<Record<string, string>>({});

    // The secret and the optional instance hint live in the URL, read once on
    // the client (the fragment never reaches the server).
    useEffect(() => {
        const hash = window.location.hash.replace(/^#/, '');
        setSecret(hash ? decodeURIComponent(hash) : '');
        const p = new URLSearchParams(window.location.search);
        setInstanceId(p.get('i'));
    }, []);

    // --- sign-in gate (SDK connect(), page presentation) ------------------
    const gateRef = useRef<HTMLDivElement>(null);
    const gateStarted = useRef(false);
    const startGate = useCallback(() => {
        const el = gateRef.current;
        if (!el || gateStarted.current) return;
        gateStarted.current = true;
        setError(null);
        void connectInto(el, {
            pitch: SHARE_PITCH,
            app: {
                displayName: 'Privasys Chat',
                ...(typeof window !== 'undefined'
                    ? { logoUrl: `${window.location.origin}/favicon/privasys-logo.mini.svg` }
                    : {})
            },
            // Voucher the Drive enclave up front so useChatDrive resumes its
            // sealed session silently (no second phone tap after sign-in).
            extraAppHosts: [driveHost()]
        }).catch((e: unknown) => {
            gateStarted.current = false;
            if ((e as { code?: string }).code === 'cancelled') return;
            setError(e instanceof Error ? e.message : 'Sign-in failed.');
            setPhase('error');
        });
    }, [connectInto]);

    useEffect(() => {
        if (authLoading || authSession) return;
        setPhase('auth');
        startGate();
    }, [authLoading, authSession, startGate]);

    // Track Drive session state once signed in.
    useEffect(() => {
        if (!authSession) return;
        if (drive.status === 'ready') return; // handled by the resolve effect
        if (drive.status === 'error') {
            setError(drive.error ?? 'Could not connect to Drive.');
            setPhase('error');
            return;
        }
        setPhase('connecting');
    }, [authSession, drive.status, drive.error]);

    // --- resolve + redeem -------------------------------------------------
    const loadTranscript = useCallback(
        async (r: ResolvedLink) => {
            if (!drive.session) return;
            setPhase('loading');
            try {
                const detail = await getConversation(drive.session, r.tenant_id, r.node.id);
                setMessages(parseTranscript(detail.transcript));
                setPhase('ready');
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not load the conversation.');
                setPhase('error');
            }
        },
        [drive.session]
    );

    const doRedeem = useCallback(
        async (r: ResolvedLink, attrs?: Record<string, string>) => {
            if (!drive.session) return;
            try {
                const res = await redeemLink(drive.session, linkId, secret ?? '', attrs);
                if (res.status === 'granted') {
                    await loadTranscript(r);
                } else {
                    setPhase('pending');
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not request access.');
                setPhase('attributes');
            }
        },
        [drive.session, linkId, secret, loadTranscript]
    );

    const runResolve = useCallback(async () => {
        if (!drive.session || secret === null) return;
        setPhase('resolving');
        setError(null);
        try {
            const r = await resolveLink(drive.session, linkId, secret);
            setResolved(r);
            if (r.already_granted || r.request_status === 'approved') {
                void loadTranscript(r);
                return;
            }
            if (r.request_status === 'pending') {
                setPhase('pending');
                return;
            }
            if (r.request_status === 'denied') {
                setPhase('denied');
                return;
            }
            if (r.mode === 'open') {
                await doRedeem(r);
            } else {
                setPhase('attributes');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'This link could not be opened.');
            setPhase('error');
        }
    }, [drive.session, secret, linkId, loadTranscript, doRedeem]);

    // Kick off resolution as soon as the Drive session is ready.
    useEffect(() => {
        if (drive.status === 'ready' && drive.session && secret !== null && !resolved) {
            void runResolve();
        }
    }, [drive.status, drive.session, secret, resolved, runResolve]);

    // Poll while a restricted request is pending, until the owner decides.
    useEffect(() => {
        if (phase !== 'pending' || !drive.session) return;
        const t = setInterval(async () => {
            try {
                const r = await resolveLink(drive.session!, linkId, secret ?? '');
                if (r.already_granted || r.request_status === 'approved') {
                    setResolved(r);
                    void loadTranscript(r);
                } else if (r.request_status === 'denied') {
                    setPhase('denied');
                }
            } catch {
                // transient; keep polling
            }
        }, 5000);
        return () => clearInterval(t);
    }, [phase, drive.session, linkId, secret, loadTranscript]);

    const fork = async () => {
        if (!drive.session || !drive.tenantId || !resolved) return;
        setForking(true);
        setError(null);
        try {
            const id = await forkConversation(
                drive.session,
                resolved.tenant_id,
                resolved.node.id,
                drive.tenantId,
                `${resolved.node.name} (copy)`
            );
            setForkedId(id);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not fork this conversation.');
        } finally {
            setForking(false);
        }
    };

    const title = useMemo(() => resolved?.node.name ?? 'Shared conversation', [resolved]);

    if (!driveEnabled()) {
        return <Centered title="Sharing is not available on this instance." />;
    }

    // Sign-in gate fills the viewport (SDK page presentation).
    if (!authSession && phase !== 'error') {
        return (
            <div className="flex min-h-screen flex-1 flex-col">
                {error && <ErrorBanner message={error} onRetry={startGate} />}
                <div ref={gateRef} className="min-h-[640px] w-full flex-1" />
            </div>
        );
    }

    if (phase === 'error') {
        return <Centered title="This link could not be opened." detail={error ?? undefined} />;
    }

    if (phase === 'connecting' || phase === 'resolving' || phase === 'loading') {
        return <Centered title="Opening the shared conversation…" spinner />;
    }

    if (phase === 'attributes' && resolved) {
        const required = resolved.required_attributes ?? [];
        const allPresented = required.every((k) => (attrValues[k] ?? '').trim() !== '');
        return (
            <Centered
                title="This conversation is shared privately."
                detail={
                    required.length
                        ? 'Present the details the owner asked for. The owner then approves your request; nothing you enter is stored by the drive.'
                        : `${resolved.owner_name || 'The owner'} approves each viewer. Send a request to read it.`
                }
            >
                {error && <ErrorBanner message={error} />}
                {required.length > 0 && (
                    <div className="flex w-full max-w-xs flex-col gap-2">
                        {required.map((k) => (
                            <label key={k} className="text-left">
                                <span className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                                    {k}
                                </span>
                                <input
                                    value={attrValues[k] ?? ''}
                                    onChange={(e) =>
                                        setAttrValues((v) => ({ ...v, [k]: e.target.value }))
                                    }
                                    className="w-full rounded-md border border-[var(--color-border-dark)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary-blue)]"
                                />
                            </label>
                        ))}
                    </div>
                )}
                <button
                    type="button"
                    disabled={!allPresented}
                    onClick={() => void doRedeem(resolved, required.length ? attrValues : undefined)}
                    className="rounded-full bg-[var(--color-primary-blue)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                    Request access
                </button>
            </Centered>
        );
    }

    if (phase === 'pending' && resolved) {
        return (
            <Centered
                title="Waiting for approval"
                detail={`${resolved.owner_name || 'The owner'} needs to approve your request. This page updates automatically.`}
                spinner
            />
        );
    }

    if (phase === 'denied') {
        return <Centered title="Access was declined." detail="The owner did not approve this request." />;
    }

    // phase === 'ready'
    return (
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-dark)]/60 pb-4">
                <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold text-[var(--color-text-primary)]">
                        {title}
                    </h1>
                    <p className="text-xs text-[var(--color-text-muted)]">
                        Shared read-only by {resolved?.owner_name || 'another user'}
                    </p>
                </div>
                {forkedId ? (
                    <Link
                        href={instanceId ? `/i/${instanceId}` : '/'}
                        className="shrink-0 rounded-full bg-[var(--color-primary-green)] px-5 py-2 text-sm font-semibold text-[var(--color-navy)] hover:opacity-90"
                    >
                        Open in your chats
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={fork}
                        disabled={forking}
                        className="shrink-0 rounded-full border border-[var(--color-primary-blue)]/50 px-5 py-2 text-sm font-medium text-[var(--color-primary-blue)] hover:bg-[var(--color-primary-blue)]/10 disabled:opacity-60"
                    >
                        {forking ? 'Forking…' : 'Fork into my drive'}
                    </button>
                )}
            </header>

            {error && <ErrorBanner message={error} />}

            <div className="flex flex-1 flex-col gap-5 pb-10">
                {messages.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">
                        This conversation has no messages yet.
                    </p>
                ) : (
                    messages.map((m) => <ReadOnlyTurn key={m.id} message={m} />)
                )}
            </div>
        </div>
    );
}

function ReadOnlyTurn({ message }: { message: PersistedMessage }) {
    if (message.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-[var(--color-primary-blue)]/30 bg-[var(--color-surface-2)] px-4 py-2.5 text-sm whitespace-pre-wrap text-[var(--color-text-primary)] shadow-sm">
                    {message.content}
                </div>
            </div>
        );
    }
    return (
        <div className="text-sm text-[var(--color-text-primary)]">
            <Markdown>{message.content}</Markdown>
        </div>
    );
}

function Centered({
    title,
    detail,
    spinner,
    children
}: {
    title: string;
    detail?: string;
    spinner?: boolean;
    children?: ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            {spinner && (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-blue)] border-t-transparent" />
            )}
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
            {detail && <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{detail}</p>}
            {children}
        </div>
    );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="mx-auto mb-4 flex max-w-md items-center gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <span className="flex-1">{message}</span>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="shrink-0 rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium hover:bg-red-500/10"
                >
                    Try again
                </button>
            )}
        </div>
    );
}
