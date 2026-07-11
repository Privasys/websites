'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    getPermissions,
    revokeGrant,
    setNodeACL,
    shareWithUser,
    type DriveNode,
    type NodePermissions,
    type Scope,
    type TenantKind
} from '~/lib/drive-api';
import { avatarColor, granteeLabel, initials } from '~/lib/format';
import { CloseIcon, FolderIcon, FileIcon, LockIcon, TrashIcon } from './icons';

// Tenant member roles an enterprise folder ACL can narrow to.
const ROLE_OPTIONS = ['owner', 'admin', 'contributor', 'reader'] as const;

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Add-person form
    const [grantee, setGrantee] = useState('');
    const [role, setRole] = useState<'viewer' | 'editor'>('viewer');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setPerms(await getPermissions(session, tenantID, node.id));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load permissions.');
        } finally {
            setLoading(false);
        }
    }, [session, tenantID, node.id]);

    useEffect(() => {
        void load();
    }, [load]);

    const activeGrants = (perms?.grants ?? []).filter(
        (g) => !g.revoked && g.subject.startsWith('subject:')
    );

    const share = async () => {
        const sub = grantee.trim();
        if (!sub) return;
        setBusy(true);
        setError(null);
        try {
            const scope: Scope[] = role === 'editor' ? ['read', 'write'] : ['read'];
            await shareWithUser(session, tenantID, node.id, sub, scope);
            setGrantee('');
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not share.');
        } finally {
            setBusy(false);
        }
    };

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

                    {/* Add people */}
                    <label className="mb-1.5 block text-sm font-medium">Add people</label>
                    <div className="flex gap-2">
                        <input
                            value={grantee}
                            onChange={(e) => setGrantee(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && void share()}
                            placeholder="Recipient's Privasys ID"
                            className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--drv-accent)]"
                            style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}
                        />
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
                            className="rounded-lg border px-2 py-2 text-sm outline-none"
                            style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}
                        >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                        </select>
                        <button
                            onClick={() => void share()}
                            disabled={busy || !grantee.trim()}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                            style={{ background: 'var(--drv-accent)' }}
                        >
                            Share
                        </button>
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
                className="mt-3 rounded-full px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--drv-accent)' }}
            >
                {roles.length ? 'Save restriction' : 'Clear restriction'}
            </button>
        </div>
    );
}
