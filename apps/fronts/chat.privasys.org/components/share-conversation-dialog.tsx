'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    shareConversation,
    shareLinkURL,
    listShareRequests,
    decideShareRequest,
    type CreatedShareLink,
    type ShareMode,
    type ShareRequest
} from '~/lib/drive-chat-api';

// Share a chat conversation, read-only, from the chat UI. A conversation is a
// Drive folder, so this mints a share link on that folder and hands back a URL
// the owner copies and sends. Two modes:
//   - Public  ('open')       : anyone with a Wallet and the link gets read.
//   - Private ('restricted') : the visitor must present the listed attributes
//                              and the owner approves each request below.
// Recipients are always read-only; they fork the conversation to make it their
// own. The Drive front's /l page is the recipient landing (sign in, redeem,
// present attributes) so we do not reimplement redemption here.
export function ShareConversationDialog({
    session,
    tenantId,
    conversationId,
    title,
    instanceId,
    onClose
}: {
    session: SealedSession;
    tenantId: string;
    conversationId: string;
    title: string;
    /** The current inference instance, so a fork can drop the recipient into
     *  the same instance from the /shared page. */
    instanceId?: string;
    onClose: () => void;
}) {
    const [mode, setMode] = useState<ShareMode>('open');
    const [attributes, setAttributes] = useState('');
    const [creating, setCreating] = useState(false);
    const [link, setLink] = useState<CreatedShareLink | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [requests, setRequests] = useState<ShareRequest[]>([]);
    const [deciding, setDeciding] = useState<string | null>(null);

    const url = link ? shareLinkURL(link, { instanceId }) : '';

    const refreshRequests = useCallback(async () => {
        try {
            const all = await listShareRequests(session, tenantId, 'pending');
            setRequests(all.filter((r) => r.node_id === conversationId));
        } catch {
            // A missing requests list is non-fatal; the link still works.
        }
    }, [session, tenantId, conversationId]);

    // Pending requests only matter for a private link; poll while the dialog is
    // open and a restricted link has been minted.
    useEffect(() => {
        if (mode !== 'restricted' || !link) return;
        void refreshRequests();
        const t = setInterval(() => void refreshRequests(), 5000);
        return () => clearInterval(t);
    }, [mode, link, refreshRequests]);

    const create = async () => {
        setCreating(true);
        setError(null);
        try {
            const attrs =
                mode === 'restricted'
                    ? attributes
                        .split(',')
                        .map((a) => a.trim())
                        .filter(Boolean)
                    : undefined;
            const created = await shareConversation(session, tenantId, conversationId, {
                mode,
                requiredAttributes: attrs
            });
            setLink(created);
            setCopied(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create the share link.');
        } finally {
            setCreating(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError('Copy failed. Select the link and copy it manually.');
        }
    };

    const decide = async (id: string, decision: 'approve' | 'deny') => {
        setDeciding(id);
        try {
            await decideShareRequest(session, tenantId, id, decision);
            await refreshRequests();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not record that decision.');
        } finally {
            setDeciding(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] p-5 text-sm text-[var(--color-text-primary)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-title"
            >
                <div className="mb-3 flex items-center justify-between">
                    <h2 id="share-title" className="text-base font-semibold">
                        Share conversation
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        aria-label="Close"
                    >
                        {'✕'}
                    </button>
                </div>

                <p className="mb-4 truncate text-xs text-[var(--color-text-secondary)]" title={title}>
                    {'“'}
                    {title || 'Untitled chat'}
                    {'”'} is shared <span className="font-medium">read-only</span>. Recipients can
                    read it and fork their own copy, but cannot change yours.
                </p>

                {/* Mode selector */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                    {(
                        [
                            {
                                key: 'open' as ShareMode,
                                label: 'Public',
                                hint: 'Anyone with a Wallet and the link'
                            },
                            {
                                key: 'restricted' as ShareMode,
                                label: 'Private',
                                hint: 'You approve each person'
                            }
                        ]
                    ).map((m) => (
                        <button
                            key={m.key}
                            type="button"
                            onClick={() => {
                                setMode(m.key);
                                setLink(null);
                            }}
                            className={`rounded-lg border px-3 py-2 text-left transition ${
                                mode === m.key
                                    ? 'border-[var(--color-primary-blue)] bg-[var(--color-primary-blue)]/10'
                                    : 'border-[var(--color-border-dark)] hover:border-[var(--color-text-muted)]'
                            }`}
                        >
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-[11px] text-[var(--color-text-muted)]">{m.hint}</div>
                        </button>
                    ))}
                </div>

                {mode === 'restricted' && (
                    <label className="mb-4 block">
                        <span className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                            Required attributes (comma separated, optional)
                        </span>
                        <input
                            value={attributes}
                            onChange={(e) => {
                                setAttributes(e.target.value);
                                setLink(null);
                            }}
                            placeholder="e.g. email_verified, over_18"
                            className="w-full rounded-md border border-[var(--color-border-dark)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary-blue)]"
                        />
                    </label>
                )}

                {!link ? (
                    <button
                        type="button"
                        onClick={create}
                        disabled={creating}
                        className="w-full rounded-lg bg-[var(--color-primary-blue)] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                        {creating ? 'Creating link…' : 'Create share link'}
                    </button>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <input
                                readOnly
                                value={url}
                                onFocus={(e) => e.currentTarget.select()}
                                className="flex-1 truncate rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/50 px-2 py-1.5 text-xs outline-none"
                            />
                            <button
                                type="button"
                                onClick={copy}
                                className="shrink-0 rounded-md bg-[var(--color-primary-blue)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                            >
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                            {mode === 'open'
                                ? 'Anyone who opens this link and signs in with a Wallet gets read access.'
                                : 'People who open this link appear below for you to approve.'}
                        </p>
                    </div>
                )}

                {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

                {mode === 'restricted' && link && (
                    <div className="mt-4 border-t border-[var(--color-border-dark)] pt-3">
                        <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
                            Pending requests
                        </div>
                        {requests.length === 0 ? (
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                                No one is waiting yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {requests.map((req) => (
                                    <li
                                        key={req.id}
                                        className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border-dark)] px-2 py-1.5"
                                    >
                                        <span
                                            className="truncate font-mono text-[11px] text-[var(--color-text-secondary)]"
                                            title={req.requester_sub}
                                        >
                                            {req.requester_sub.slice(0, 12)}
                                            {'…'}
                                        </span>
                                        <span className="flex shrink-0 gap-1">
                                            <button
                                                type="button"
                                                disabled={deciding === req.id}
                                                onClick={() => decide(req.id, 'approve')}
                                                className="rounded bg-emerald-600/80 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                disabled={deciding === req.id}
                                                onClick={() => decide(req.id, 'deny')}
                                                className="rounded bg-[var(--color-surface-2)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-60"
                                            >
                                                Deny
                                            </button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
