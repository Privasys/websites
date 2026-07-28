'use client';

// Memory view (§8.7 / chat-memory-integration plan §4.2). One concept, one
// source of truth: your Drive is the assistant's memory, and the AI-scope
// GRANT is the only state. `Memory/` is always on — the spine the assistant
// keeps notes in and writes back to. Everything else it may recall is opt-in.
//
// Every control here writes the grant, so a change is durable, cross-device,
// and honoured identically by both retrieval paths (in-enclave and the client
// fallback). Enforcement is server-side inside Drive; the UI only expresses
// intent.

import { useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import { useAIScope } from '~/lib/use-ai-scope';

export function MemoryView({
    session,
    tenantId,
    onConnect
}: {
    session: SealedSession | null;
    tenantId: string | null;
    /** Establish the Drive sealed session (wallet push approval) when the
     *  user has not connected Drive in this session yet. */
    onConnect: () => Promise<void>;
}) {
    const scope = useAIScope(session, tenantId);
    const [connecting, setConnecting] = useState(false);

    if (!session || !tenantId) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="max-w-md">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Connect your Drive
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Your Drive is my memory: what I remember about you, and whatever else you
                        let me recall. It stays end-to-end encrypted — connect it once, approving
                        on your phone.
                    </p>
                </div>
                <button
                    type="button"
                    disabled={connecting}
                    onClick={async () => {
                        setConnecting(true);
                        try {
                            await onConnect();
                        } finally {
                            setConnecting(false);
                        }
                    }}
                    className="rounded-full px-5 py-2 text-sm font-semibold text-[var(--color-navy)] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--brand-gradient)' }}
                >
                    {connecting ? 'Approve on your phone…' : 'Connect Drive'}
                </button>
            </div>
        );
    }

    const anyFolderScoped = scope.folders.some((f) => f.scoped);

    return (
        <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-2xl">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Memory
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Your Drive is my memory. I can search only what you turn on here — I cannot
                        see anything you leave off. Retrieval happens inside the attested enclave
                        over your sealed session; the operator never sees it.
                    </p>
                </div>

                {scope.error && (
                    <div className="mb-4 rounded-lg border border-red-300/40 bg-red-50/40 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-900/10 dark:text-red-300">
                        {scope.error}
                    </div>
                )}

                <p className="mb-2 text-[11px] font-medium tracking-wider text-[var(--color-text-muted)] uppercase">
                    Always on
                </p>
                <Row
                    title="What I remember about you"
                    description="Notes I keep as we talk — preferences, context about your work — stored as files in your Drive's Memory folder."
                    control={
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                            Always on
                        </span>
                    }
                />

                <p className="mt-8 mb-2 text-[11px] font-medium tracking-wider text-[var(--color-text-muted)] uppercase">
                    What I can recall
                </p>
                <div className="flex flex-col gap-2">
                    <Row
                        title="Past conversations"
                        description={
                            scope.conversationsId
                                ? 'Let me recall your previous chats when they are relevant.'
                                : 'Available once you have a saved conversation.'
                        }
                        control={
                            <Toggle
                                on={scope.conversationsScoped || scope.allScoped}
                                disabled={
                                    !scope.conversationsId ||
                                    scope.allScoped ||
                                    scope.busyNodeId === scope.conversationsId
                                }
                                onChange={(on) => void scope.setConversations(on)}
                            />
                        }
                    />
                    <Row
                        title="Entire Drive"
                        description="Everything in your Drive, including files you add later. The broadest option."
                        control={
                            <Toggle
                                on={scope.allScoped}
                                disabled={scope.busyNodeId === '__all__'}
                                onChange={(on) => void scope.setEntireDrive(on)}
                            />
                        }
                    />
                </div>

                <p className="mt-8 mb-2 text-[11px] font-medium tracking-wider text-[var(--color-text-muted)] uppercase">
                    Specific folders
                </p>
                {scope.loading && scope.folders.length === 0 ? (
                    <p className="px-1 text-sm text-[var(--color-text-muted)]">Loading…</p>
                ) : scope.folders.length === 0 ? (
                    <p className="px-1 text-sm text-[var(--color-text-muted)]">
                        No other folders in your Drive yet.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {scope.folders.map((f) => (
                            <Row
                                key={f.id}
                                title={f.name}
                                description={
                                    scope.allScoped
                                        ? 'Included via “Entire Drive”.'
                                        : 'Let me search this folder and everything in it.'
                                }
                                control={
                                    <Toggle
                                        on={f.scoped || scope.allScoped}
                                        disabled={scope.allScoped || scope.busyNodeId === f.id}
                                        onChange={(on) => void scope.setFolder(f.id, on)}
                                    />
                                }
                            />
                        ))}
                    </div>
                )}

                {!scope.allScoped && !scope.conversationsScoped && !anyFolderScoped && (
                    <p className="mt-6 rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/40 px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                        Right now I only use what I remember about you. Turn something on above and
                        I can also recall it.
                    </p>
                )}
            </div>
        </div>
    );
}

function Row({
    title,
    description,
    control
}: {
    title: string;
    description: string;
    control: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] px-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
            </div>
            <div className="shrink-0">{control}</div>
        </div>
    );
}

function Toggle({
    on,
    disabled,
    onChange
}: {
    on: boolean;
    disabled?: boolean;
    onChange: (_on: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(!on)}
            className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
                on
                    ? 'bg-[var(--color-primary-blue)]'
                    : 'bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border-dark)] ring-inset'
            }`}
        >
            <span
                className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    on ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}
