'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { fetchUserProfile, type UserProfile } from '~/lib/me-api';
import type { Instance } from '~/lib/types';
import type { Conversation } from '~/lib/conversations';
import { AttestationStatusBadge, type AggregateAttestationStatus } from '@privasys/attestation-view';
import { ThemeToggle } from './theme-toggle';

// Gemini-style left sidebar.
//
//   - Privasys logo + product name
//   - "New chat" button
//   - Chats list (placeholder until persistence lands)
//   - Bottom block:
//       · "Secure enclaves attestations" trust pill — only visible when the
//         user is authenticated; clicking opens the in-shell Security
//         view (full-pane attestation).
//       · Sign in (in-panel) / user pill + Sign out
//       · Theme toggle (light is the default; dark is opt-in)
export function AppSidebar({
    instance,
    conversations,
    activeConversationId,
    attestationStatus,
    onNewChat,
    onSelectConversation,
    onDeleteConversation,
    onRenameConversation,
    onShowSecurity,
    onShowTools,
    onShowKnowledge,
    onShowSignIn
}: {
    instance: Instance | null;
    conversations: Conversation[];
    activeConversationId: string | null;
    /** Verification status of the CONFIDENTIAL-AI enclave alone (from the
     *  always-mounted SecurityView). Drives the "Secure enclave" pill —
     *  tools are attested separately and never affect it. */
    attestationStatus?: AggregateAttestationStatus;
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
    onRenameConversation: (id: string, title: string) => void;
    onShowSecurity: () => void;
    onShowTools?: () => void;
    /** Open the assistant Knowledge (Drive AI-scope) view. Only shown when
     *  Drive is wired (the chat passes it conditionally). */
    onShowKnowledge?: () => void;
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
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[var(--color-border-dark)] bg-[var(--color-surface-1)]/80 md:sticky md:top-0 md:flex md:h-screen md:self-start">
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
                {conversations.length === 0 ? (
                    <p className="px-2 text-xs text-[var(--color-text-muted)]">
                        No conversations yet. Start a new chat to see it here.
                        History is stored only on this device.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-0.5">
                        {conversations.map((c) => (
                            <ConversationRow
                                key={c.id}
                                conversation={c}
                                active={c.id === activeConversationId}
                                onSelect={() => onSelectConversation(c.id)}
                                onDelete={() => onDeleteConversation(c.id)}
                                onRename={(t) => onRenameConversation(c.id, t)}
                            />
                        ))}
                    </ul>
                )}
            </div>

            <div className="border-t border-[var(--color-border-dark)] px-3 py-3">
                {session && onShowTools && (
                    <button
                        type="button"
                        onClick={onShowTools}
                        disabled={!secureEnabled}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)]/60 disabled:opacity-50"
                    >
                        <WrenchIcon />
                        <span className="flex-1">AI Tools</span>
                    </button>
                )}
                {session && onShowKnowledge && (
                    <button
                        type="button"
                        onClick={onShowKnowledge}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)]/60"
                    >
                        <BookIcon />
                        <span className="flex-1">Knowledge</span>
                    </button>
                )}
                {session && (
                    <button
                        type="button"
                        onClick={onShowSecurity}
                        disabled={!secureEnabled}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)]/60 disabled:opacity-50"
                    >
                        <ShieldIcon />
                        <span className="flex-1">Secure enclave</span>
                        <SecureEnclaveTag status={attestationStatus} enabled={secureEnabled} />
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

                <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border-dark)] pt-2">
                    <BuildInfo instance={instance} />
                    <ThemeToggle />
                </div>
            </div>
        </aside>
    );
}

// Build provenance, bottom-left: the front-end version + commit (baked in
// at build time by deploy-chat.yml) and, when the enclave advertises it on
// /healthz, the back-end (confidential-ai) commit — each linking to the
// exact commit on GitHub.
const COMMIT_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA ?? '';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '';

function BuildInfo({ instance }: { instance: Instance | null }) {
    const [ai, setAi] = useState<{ commit?: string; version?: string } | null>(null);

    // Best-effort: /healthz is public (exempt from sealed-transport
    // enforcement) and already used for liveness probing. Older backend
    // builds don't carry commit/version — the AI line is simply omitted.
    useEffect(() => {
        const endpoint = instance?.endpoint;
        if (!endpoint) return;
        const ctrl = new AbortController();
        fetch(`${endpoint.replace(/\/$/, '')}/healthz`, {
            signal: ctrl.signal,
            cache: 'no-store',
            credentials: 'omit',
            headers: { Accept: 'application/json' }
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((body: { commit?: string; version?: string } | null) => {
                if (body?.commit || body?.version) {
                    setAi({ commit: body.commit, version: body.version });
                }
            })
            .catch(() => {
                /* liveness/banner flows handle outages; this is cosmetic */
            });
        return () => ctrl.abort();
    }, [instance?.endpoint]);

    const uiShort = COMMIT_SHA ? COMMIT_SHA.slice(0, 7) : 'dev';
    const uiLabel = APP_VERSION ? `v${APP_VERSION} · ${uiShort}` : uiShort;

    return (
        <span className="flex min-w-0 flex-col px-1 font-mono text-[10px] leading-4 text-[var(--color-text-muted)]">
            <BuildLine
                prefix="UI"
                label={uiLabel}
                href={COMMIT_SHA ? `https://github.com/Privasys/websites/commit/${COMMIT_SHA}` : undefined}
            />
            {ai?.commit && (
                <BuildLine
                    prefix="AI"
                    label={ai.version ? `v${ai.version} · ${ai.commit.slice(0, 7)}` : ai.commit.slice(0, 7)}
                    href={`https://github.com/Privasys/confidential-ai/commit/${ai.commit}`}
                />
            )}
        </span>
    );
}

function BuildLine({ prefix, label, href }: { prefix: string; label: string; href?: string }) {
    if (!href) {
        return (
            <span className="truncate">
                {prefix} {label}
            </span>
        );
    }
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={`View the ${prefix} build's commit on GitHub`}
            className="truncate hover:text-[var(--color-primary-blue)]"
        >
            {prefix} {label}
        </a>
    );
}

// The "Secure enclave" label stays neutral; a status TAG beside it carries
// the verdict of the INFERENCE ENCLAVE's attestation alone (tools are
// verified separately in the AI Tools view and never affect this). Uses
// the shared attestation badge so it reads identically everywhere.
function SecureEnclaveTag({
    status,
    enabled
}: {
    status: AggregateAttestationStatus | undefined;
    enabled: boolean;
}) {
    if (!enabled) return null;
    // AggregateAttestationStatus ('verifying' | 'verified' | 'failed') maps
    // 1:1 onto the badge's status; default to 'verifying' before any result.
    return (
        <AttestationStatusBadge
            status={status ?? 'verifying'}
            reason='Not verified'
            className='shrink-0'
        />
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
            atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
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

function ConversationRow({
    conversation,
    active,
    onSelect,
    onDelete,
    onRename
}: {
    conversation: Conversation;
    active: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (title: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(conversation.title);

    useEffect(() => {
        setDraft(conversation.title);
    }, [conversation.title]);

    const commit = () => {
        const next = draft.trim();
        if (next && next !== conversation.title) onRename(next);
        setEditing(false);
    };

    return (
        <li
            className={`group relative flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${
                active
                    ? 'bg-[var(--color-surface-2)]/70 text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]/40'
            }`}
        >
            {editing ? (
                <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') {
                            setDraft(conversation.title);
                            setEditing(false);
                        }
                    }}
                    className="flex-1 truncate rounded-sm border border-[var(--color-primary-blue)]/40 bg-transparent px-1 text-sm outline-none"
                />
            ) : (
                <button
                    type="button"
                    onClick={onSelect}
                    onDoubleClick={() => setEditing(true)}
                    title={conversation.title}
                    className="flex-1 truncate text-left"
                >
                    {conversation.title || 'Untitled chat'}
                </button>
            )}
            {!editing && (
                <span className="ml-1 hidden shrink-0 items-center gap-0.5 group-hover:inline-flex">
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        title="Rename"
                        className="rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary-blue)]"
                    >
                        <PencilIcon />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (confirm(`Delete "${conversation.title}"? This cannot be undone.`)) {
                                onDelete();
                            }
                        }}
                        title="Delete"
                        className="rounded p-1 text-[var(--color-text-muted)] hover:text-red-400"
                    >
                        <TrashIcon />
                    </button>
                </span>
            )}
        </li>
    );
}

function PencilIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6 17.5 20a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2L5 6" />
        </svg>
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

function BookIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
    );
}

function WrenchIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
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
