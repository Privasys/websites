'use client';

// Knowledge view (§8.7 AI scope): what the assistant may draw on. Memory is
// always available; past conversations are off by default; the user can turn
// on their entire Drive or cherry-pick individual folders. Everything is
// backed by Drive enable_ai/disable_ai grants over the sealed session.

import { useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import { useAIScope } from '~/lib/use-ai-scope';

export function KnowledgeView({
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
                        Your conversations, memory and knowledge base live in your private
                        Privasys Drive. Connect it to choose what I can draw on. You&apos;ll
                        approve access once on your phone.
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

    return (
        <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-2xl">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Assistant knowledge
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Choose what I&apos;m allowed to search when answering. Everything stays
                        in your private Drive — I only draw on what you enable here, and the
                        search runs inside the enclave.
                    </p>
                </div>

                {scope.error && (
                    <div className="mb-4 rounded-lg border border-red-300/40 bg-red-50/40 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-900/10 dark:text-red-300">
                        {scope.error}
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <ScopeRow
                        title="Memory"
                        description="Notes I keep about you and your work. Always available so I stay consistent across chats."
                        control={<AlwaysBadge />}
                    />

                    <ScopeRow
                        title="Past conversations"
                        description={
                            scope.conversationsId
                                ? 'Let me search summaries of your previous chats to recall earlier context.'
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

                    <ScopeRow
                        title="Entire Drive"
                        description="Search everything in your Drive, including files you add later. The broadest option."
                        control={
                            <Toggle
                                on={scope.allScoped}
                                disabled={scope.busyNodeId === '__all__'}
                                onChange={(on) => void scope.setEntireDrive(on)}
                            />
                        }
                    />
                </div>

                <div className="mt-8">
                    <p className="mb-2 text-[11px] font-medium tracking-wider text-[var(--color-text-muted)] uppercase">
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
                                <ScopeRow
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
                </div>
            </div>
        </div>
    );
}

function ScopeRow({
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

function AlwaysBadge() {
    return (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            Always on
        </span>
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
