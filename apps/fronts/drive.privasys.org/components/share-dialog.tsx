'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    createLink,
    getPermissions,
    listLinks,
    revokeGrant,
    setNodeACL,
    type CreatedLink,
    type DriveNode,
    type LinkMode,
    type NodePermissions,
    type ShareLink,
    type TenantKind
} from '~/lib/drive-api';
import { avatarColor, granteeLabel, initials } from '~/lib/format';
import { CloseIcon, FolderIcon, FileIcon, LinkIcon, LockIcon, TrashIcon } from './icons';

// Tenant member roles an enterprise folder ACL can narrow to.
const ROLE_OPTIONS = ['owner', 'admin', 'contributor', 'reader'] as const;

// Attributes a "restricted" link can require the visitor to present.
const ATTR_OPTIONS = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Verified email' },
    { key: 'govid_name', label: 'Government-ID name' }
] as const;

function linkURL(id: string, secret: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://drive.privasys.org';
    return `${origin}/l?id=${id}#${secret}`;
}

export function ShareDialog({
    session,
    tenantID,
    tenantKind = 'user',
    node,
    mySub,
    onClose
}: {
    session: SealedSession;
    tenantID: string;
    tenantKind?: TenantKind;
    node: DriveNode;
    mySub: string;
    onClose: () => void;
}) {
    const [perms, setPerms] = useState<NodePermissions | null>(null);
    const [links, setLinks] = useState<ShareLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Link builder
    const [mode, setMode] = useState<LinkMode>('open');
    const [reqAttrs, setReqAttrs] = useState<string[]>(['name']);
    const [generated, setGenerated] = useState<CreatedLink | null>(null);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [p, ls] = await Promise.all([
                getPermissions(session, tenantID, node.id),
                listLinks(session, tenantID, node.id).catch(() => [])
            ]);
            setPerms(p);
            setLinks(ls);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load permissions.');
        } finally {
            setLoading(false);
        }
    }, [session, tenantID, node.id]);

    useEffect(() => {
        void load();
    }, [load]);

    const generate = async () => {
        setBusy(true);
        setError(null);
        setGenerated(null);
        setCopied(false);
        try {
            const created = await createLink(session, tenantID, node.id, {
                mode,
                scope: ['read'],
                requiredAttributes: mode === 'restricted' ? reqAttrs : undefined
            });
            setGenerated(created);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create the link.');
        } finally {
            setBusy(false);
        }
    };

    const copyLink = async (id: string, secret: string) => {
        try {
            await navigator.clipboard.writeText(linkURL(id, secret));
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            /* clipboard blocked; the field is selectable */
        }
    };

    const toggleAttr = (k: string) =>
        setReqAttrs((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

    const activeGrants = (perms?.grants ?? []).filter(
        (g) => !g.revoked && g.subject.startsWith('subject:')
    );

    const revoke = async (grantID: string) => {
        setBusy(true);
        try {
            await revokeGrant(session, tenantID, grantID);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not revoke access.');
        } finally {
            setBusy(false);
        }
    };

    const saveACL = async (roles: string[]) => {
        setBusy(true);
        setError(null);
        try {
            await setNodeACL(session, tenantID, node.id, roles);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not update folder permissions.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
                style={{ background: 'var(--drv-surface)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--drv-border)' }}>
                    {node.kind === 'folder' ? (
                        <FolderIcon width={22} height={22} style={{ color: 'var(--drv-accent)' }} />
                    ) : (
                        <FileIcon width={22} height={22} style={{ color: 'var(--drv-text-muted)' }} />
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold">Share “{node.name}”</div>
                        <div className="text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                            {node.kind === 'folder'
                                ? 'People you add can access this folder and everything inside it.'
                                : 'People you add can access this file.'}
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--drv-hover)]">
                        <CloseIcon />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-auto p-5">
                    {error && (
                        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    {/* Share with a link. Privasys holds no names or email
                        addresses, so there is nobody to "add" by identity;
                        sharing is by link instead. */}
                    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--drv-border)' }}>
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <LinkIcon width={18} height={18} style={{ color: 'var(--drv-accent)' }} />
                            Share with a link
                        </div>
                        <p className="mt-1.5 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                            A link keeps this {node.kind === 'folder' ? 'folder' : 'file'} sealed
                            inside the enclave. The recipient opens it with the Privasys Wallet,
                            or is invited to install it (a passkey works once available).
                        </p>

                        <div className="mt-3 space-y-2">
                            <LinkModeChoice
                                selected={mode === 'open'}
                                onSelect={() => setMode('open')}
                                title="Anyone with the link"
                                body="Whoever holds the link can open it after signing in."
                            />
                            <LinkModeChoice
                                selected={mode === 'restricted'}
                                onSelect={() => setMode('restricted')}
                                title="Restricted to people you approve"
                                body="The visitor presents the attributes you choose; you approve each request."
                            />
                        </div>

                        {mode === 'restricted' && (
                            <div className="mt-3">
                                <div className="mb-1.5 text-xs font-medium" style={{ color: 'var(--drv-text-muted)' }}>
                                    Require the visitor to present
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {ATTR_OPTIONS.map((a) => (
                                        <button
                                            key={a.key}
                                            onClick={() => toggleAttr(a.key)}
                                            className="rounded-full border px-3 py-1.5 text-xs"
                                            style={{
                                                borderColor: reqAttrs.includes(a.key) ? 'var(--drv-accent)' : 'var(--drv-border)',
                                                background: reqAttrs.includes(a.key) ? 'var(--drv-accent-weak)' : 'transparent',
                                                color: reqAttrs.includes(a.key) ? 'var(--drv-accent)' : 'var(--drv-text)'
                                            }}
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => void generate()}
                            disabled={busy || (mode === 'restricted' && reqAttrs.length === 0)}
                            className="drv-btn-primary mt-3 flex items-center gap-2 rounded-full px-4 py-2 text-sm disabled:opacity-50"
                        >
                            <LinkIcon width={16} height={16} /> Create link
                        </button>

                        {generated && (
                            <div className="mt-3 rounded-lg border p-3" style={{ borderColor: 'var(--drv-accent)', background: 'var(--drv-accent-weak)' }}>
                                <div className="mb-1.5 text-xs font-medium" style={{ color: 'var(--drv-accent)' }}>
                                    Link ready. Copy it now, the secret is shown only once.
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={linkURL(generated.id, generated.secret)}
                                        onFocus={(e) => e.currentTarget.select()}
                                        className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs outline-none"
                                        style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}
                                    />
                                    <button
                                        onClick={() => void copyLink(generated.id, generated.secret)}
                                        className="drv-btn-primary rounded-lg px-3 py-2 text-xs"
                                    >
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {links.length > 0 && (
                            <div className="mt-4">
                                <div className="mb-1.5 text-xs font-medium" style={{ color: 'var(--drv-text-muted)' }}>
                                    Active links
                                </div>
                                <div className="space-y-1">
                                    {links.map((l) => (
                                        <div key={l.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm">
                                            <LinkIcon width={16} height={16} style={{ color: 'var(--drv-text-muted)' }} />
                                            <span className="flex-1 truncate">
                                                {l.mode === 'restricted'
                                                    ? `Restricted (${(l.required_attributes ?? []).join(', ') || 'attributes'})`
                                                    : 'Anyone with the link'}
                                            </span>
                                            <button
                                                title="Revoke link"
                                                onClick={() => void revoke(l.id)}
                                                disabled={busy}
                                                className="rounded-lg p-1 hover:bg-[var(--drv-hover)]"
                                                style={{ color: 'var(--drv-text-muted)' }}
                                            >
                                                <TrashIcon width={16} height={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* People with access */}
                    <div className="mt-6">
                        <div className="mb-2 text-sm font-medium">People with access</div>
                        {loading ? (
                            <div className="py-4 text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                                Loading…
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {/* Owner (implicit) */}
                                <PersonRow
                                    label={mySub}
                                    sublabel="Owner"
                                    right={<span className="text-xs" style={{ color: 'var(--drv-text-muted)' }}>Owner</span>}
                                />
                                {activeGrants.length === 0 && (
                                    <div className="px-1 py-2 text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                                        Not shared with anyone yet.
                                    </div>
                                )}
                                {activeGrants.map((g) => (
                                    <PersonRow
                                        key={g.id}
                                        label={granteeLabel(g.subject)}
                                        sublabel={g.scope.includes('write') ? 'Editor' : 'Viewer'}
                                        right={
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="rounded-full px-2 py-0.5 text-xs"
                                                    style={{ background: 'var(--drv-accent-weak)', color: 'var(--drv-accent)' }}
                                                >
                                                    {g.scope.includes('write') ? 'Can edit' : 'Can view'}
                                                    {g.expires_at ? ' · expires' : ''}
                                                </span>
                                                <button
                                                    title="Remove access"
                                                    onClick={() => void revoke(g.id)}
                                                    disabled={busy}
                                                    className="rounded-lg p-1 hover:bg-[var(--drv-hover)]"
                                                    style={{ color: 'var(--drv-text-muted)' }}
                                                >
                                                    <TrashIcon width={16} height={16} />
                                                </button>
                                            </div>
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Folder ACL (enterprise / SharePoint-style role narrowing) */}
                    {node.kind === 'folder' && tenantKind === 'enterprise' && (
                        <FolderACL
                            override={perms?.acl_override ?? null}
                            effective={perms?.effective_acl ?? null}
                            busy={busy}
                            onSave={saveACL}
                        />
                    )}
                </div>

                <div
                    className="flex items-center justify-between gap-2 border-t px-5 py-3 text-xs"
                    style={{ borderColor: 'var(--drv-border)', color: 'var(--drv-text-muted)' }}
                >
                    <span className="flex items-center gap-1.5">
                        <LockIcon /> Shared files stay end-to-end encrypted inside the enclave.
                    </span>
                    <button onClick={onClose} className="rounded-full px-4 py-1.5 font-medium hover:bg-[var(--drv-hover)]" style={{ color: 'var(--drv-text)' }}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

function LinkModeChoice({
    selected,
    onSelect,
    title,
    body
}: {
    selected: boolean;
    onSelect: () => void;
    title: string;
    body: string;
}) {
    return (
        <button
            onClick={onSelect}
            className="flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left"
            style={{
                borderColor: selected ? 'var(--drv-accent)' : 'var(--drv-border)',
                background: selected ? 'var(--drv-accent-weak)' : 'var(--drv-surface-2)'
            }}
        >
            <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                style={{ borderColor: selected ? 'var(--drv-accent)' : 'var(--drv-border)' }}
            >
                {selected && (
                    <span className="h-2 w-2 rounded-full" style={{ background: 'var(--drv-accent)' }} />
                )}
            </span>
            <span className="min-w-0">
                <span className="block text-[13px] font-medium">{title}</span>
                <span className="mt-0.5 block text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                    {body}
                </span>
            </span>
        </button>
    );
}

function PersonRow({
    label,
    sublabel,
    right
}: {
    label: string;
    sublabel: string;
    right: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg px-1 py-1.5">
            <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: avatarColor(label) }}
            >
                {initials(label)}
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{label}</div>
                <div className="text-xs" style={{ color: 'var(--drv-text-muted)' }}>{sublabel}</div>
            </div>
            {right}
        </div>
    );
}

function FolderACL({
    override,
    effective,
    busy,
    onSave
}: {
    override: string[] | null;
    effective: string[] | null;
    busy: boolean;
    onSave: (roles: string[]) => void;
}) {
    const [roles, setRoles] = useState<string[]>(override ?? []);
    useEffect(() => setRoles(override ?? []), [override]);

    const toggle = (r: string) =>
        setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

    return (
        <div className="mt-6 rounded-xl border p-4" style={{ borderColor: 'var(--drv-border)' }}>
            <div className="text-sm font-medium">Restrict this folder by role</div>
            <p className="mt-1 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                Only members with one of the selected roles can open this folder and its
                contents (SharePoint-style). Leave all unchecked to inherit the parent’s
                permissions. The owner is never locked out.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((r) => (
                    <button
                        key={r}
                        onClick={() => toggle(r)}
                        className="rounded-full border px-3 py-1.5 text-sm capitalize"
                        style={{
                            borderColor: roles.includes(r) ? 'var(--drv-accent)' : 'var(--drv-border)',
                            background: roles.includes(r) ? 'var(--drv-accent-weak)' : 'transparent',
                            color: roles.includes(r) ? 'var(--drv-accent)' : 'var(--drv-text)'
                        }}
                    >
                        {r}
                    </button>
                ))}
            </div>
            {effective && !override && (
                <div className="mt-3 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                    Currently inheriting: {effective.join(', ') || 'everyone in the workspace'}
                </div>
            )}
            <button
                onClick={() => onSave(roles)}
                disabled={busy}
                className="drv-btn-primary mt-3 rounded-full px-4 py-1.5 text-sm disabled:opacity-50"
            >
                {roles.length ? 'Save restriction' : 'Clear restriction'}
            </button>
        </div>
    );
}
