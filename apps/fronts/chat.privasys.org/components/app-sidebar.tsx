'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { fetchUserProfile, type UserProfile } from '~/lib/me-api';
import type { Instance } from '~/lib/types';
import { ThemeToggle } from './theme-toggle';

// Gemini-style left sidebar.
//
//   - Privasys logo + product name
//   - "New chat" button
//   - Chats list (placeholder until persistence lands)
//   - Bottom block:
//       · "Your session is secure" trust pill — only visible when the
//         user is authenticated; clicking opens the in-shell Security
//         view (full-pane attestation).
//       · Sign in (in-panel) / user pill + Sign out
//       · Theme toggle (light is the default; dark is opt-in)
export function AppSidebar({
    instance,
    onNewChat,
    onShowSecurity,
    onShowSignIn,
}: {
    instance: Instance | null;
    onNewChat: () => void;
    onShowSecurity: () => void;
    onShowSignIn: () => void;
}) {
    const { session, signOut } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);

    // Fetch /api/v1/me whenever the session changes so the sidebar can
    // show the user's real name/email instead of the JWT `sub` slice.
    useEffect(() => {
        if (!session?.accessToken) {
            setProfile(null);
            return;
        }
        const ctrl = new AbortController();
        fetchUserProfile(session.accessToken, ctrl.signal)
            .then(setProfile)
            .catch(() => {
                /* /me failed (likely scope/audience) — fall back to JWT decode */
            });
        return () => ctrl.abort();
    }, [session?.accessToken]);

    const display = pickDisplay(profile, session?.accessToken);
    const secureEnabled = !!session && !!instance && !!instance.endpoint;

    return (
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
                {session && (
                    <button
                        type="button"
                        onClick={onShowSecurity}
                        disabled={!secureEnabled}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--color-primary-green)] transition-colors hover:bg-[var(--color-surface-2)]/60 disabled:opacity-50"
                    >
                        <ShieldIcon />
                        <span className="flex-1">Your session is secure</span>
                    </button>
                )}

                {session ? (
                    <div className="mt-2 flex items-center gap-2 rounded-md px-2 py-2">
                        <UserBadge label={display.initial} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-[var(--color-text-primary)]">
                                {display.primary}
                            </p>
                            {display.secondary && (
                                <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                                    {display.secondary}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={() => void signOut()}
                                className="mt-0.5 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-primary-blue)]"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onShowSignIn}
                        className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]/60"
                    >
                        <SignInIcon />
                        <span>Sign in</span>
                    </button>
                )}

                <div className="mt-2 flex items-center justify-end border-t border-[var(--color-border-dark)] pt-2">
                    <ThemeToggle />
                </div>
            </div>
        </aside>
    );
}

interface DisplayInfo {
    primary: string;
    secondary?: string;
    initial: string;
}

function pickDisplay(profile: UserProfile | null, token: string | undefined): DisplayInfo {
    // Prefer the management-service profile when we have it.
    if (profile) {
        const name = profile.display_name || profile.name || '';
        const email = profile.display_email || profile.email || '';
        const primary = name || email || 'Privasys user';
        const secondary = name && email && name !== email ? email : undefined;
        return { primary, secondary, initial: initialOf(primary) };
    }
    // Fallback: decode the JWT (only `sub` is reliably present).
    if (!token) return { primary: 'Privasys user', initial: 'P' };
    const parts = token.split('.');
    if (parts.length !== 3) return { primary: 'Privasys user', initial: 'P' };
    try {
        const payload = JSON.parse(
            atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
        ) as {
            email?: string;
            name?: string;
            given_name?: string;
            preferred_username?: string;
            sub?: string;
        };
        const primary =
            payload.name ||
            payload.given_name ||
            payload.email ||
            payload.preferred_username ||
            (payload.sub ? `User ${payload.sub.slice(0, 6)}` : 'Privasys user');
        return { primary, initial: initialOf(primary) };
    } catch {
        return { primary: 'Privasys user', initial: 'P' };
    }
}

function initialOf(s: string): string {
    return (s.trim().charAt(0) || 'P').toUpperCase();
}

function UserBadge({ label }: { label: string }) {
    return (
        <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold text-[var(--color-navy)]"
            style={{ background: 'var(--brand-gradient)' }}
        >
            {label}
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
