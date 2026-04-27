'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { AttestationDrawer } from './attestation-drawer';
import type { Instance } from '~/lib/types';

// Gemini-style left sidebar:
//   - Privasys logo + product name
//   - "New chat" button
//   - Chats list (placeholder until persistence lands)
//   - Bottom block: "Your session is secure" trust pill (opens attestation
//     drawer) and Sign in / Sign out.
//
// The conversations list is a local-only placeholder for now — chat history
// persistence is a separate workstream (no backend yet on the chat front).
export function AppSidebar({
    instance,
    onNewChat,
}: {
    instance: Instance | null;
    onNewChat: () => void;
}) {
    const { session, signIn, signOut } = useAuth();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const userLabel = useMemo(() => decodeUserLabel(session?.accessToken), [session]);

    return (
        <>
            <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[var(--color-border-dark)] bg-[var(--color-surface-1)]/80 md:flex">
                <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                    <img
                        src="/favicon/privasys-logo.mini.svg"
                        alt="Privasys"
                        className="h-7 w-7"
                    />
                    <span className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
                        Privasys Chat
                    </span>
                </div>

                <div className="px-3">
                    <button
                        type="button"
                        onClick={onNewChat}
                        className="flex w-full items-center gap-2 rounded-full border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/40 px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-primary-blue)]/60 hover:text-[var(--color-primary-blue)]"
                    >
                        <PlusIcon />
                        New chat
                    </button>
                </div>

                <div className="mt-6 flex-1 overflow-y-auto px-3">
                    <p className="px-2 pb-2 text-[11px] font-medium tracking-wider text-[var(--color-text-muted)] uppercase">
                        Chats
                    </p>
                    <p className="px-2 text-xs text-[var(--color-text-muted)]">
                        Conversations are not stored. Each session starts fresh and lives
                        only in this browser tab.
                    </p>
                </div>

                <div className="border-t border-[var(--color-border-dark)] px-3 py-3">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        disabled={!instance || !instance.endpoint}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--color-primary-green)] transition-colors hover:bg-[var(--color-surface-2)]/40 disabled:opacity-50"
                    >
                        <ShieldIcon />
                        <span className="flex-1">Your session is secure</span>
                    </button>

                    {session ? (
                        <div className="mt-2 flex items-center gap-2 rounded-md px-2 py-2">
                            <UserBadge label={userLabel} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-[var(--color-text-primary)]">
                                    {userLabel}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void signOut()}
                                    className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-primary-blue)]"
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void signIn()}
                            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]/40"
                        >
                            <SignInIcon />
                            <span>Sign in</span>
                        </button>
                    )}
                </div>
            </aside>

            {instance && instance.endpoint && (
                <AttestationDrawer
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    instance={instance}
                />
            )}
        </>
    );
}

function decodeUserLabel(token: string | undefined): string {
    if (!token) return 'Guest';
    const parts = token.split('.');
    if (parts.length !== 3) return 'Privasys user';
    try {
        const payload = JSON.parse(
            atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
        ) as { email?: string; preferred_username?: string; sub?: string };
        return (
            payload.email ||
            payload.preferred_username ||
            (payload.sub ? `User ${payload.sub.slice(0, 6)}` : 'Privasys user')
        );
    } catch {
        return 'Privasys user';
    }
}

function UserBadge({ label }: { label: string }) {
    const initial = label.trim().charAt(0).toUpperCase() || 'P';
    return (
        <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold text-[var(--color-navy)]"
            style={{ background: 'var(--brand-gradient)' }}
        >
            {initial}
        </span>
    );
}

function PlusIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function SignInIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
    );
}
