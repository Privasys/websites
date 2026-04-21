'use client';

import { useAuth, hasAdminRole } from '~/lib/privasys-auth';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { adminListUsers, adminDeleteUser, type AdminUser } from '~/lib/api';

interface UserRow extends AdminUser {
    roles: string[];
}

const AVAILABLE_ROLES = [
    'privasys-platform:admin',
    'privasys-platform:manager',
];

const PAGE_SIZE = 100;

function CopyButton({ value, label }: { value: string; label: string }) {
    const [copied, setCopied] = useState(false);
    if (!value) return null;
    return (
        <button
            type="button"
            onClick={async (e) => {
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                } catch {
                    // ignore
                }
            }}
            title={copied ? 'Copied' : `Copy ${label}`}
            className="inline-flex items-center justify-center w-5 h-5 ml-1 align-middle text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
        >
            {copied ? (
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5a2 2 0 012-2h10" />
                </svg>
            )}
        </button>
    );
}

export default function AdminUsersPage() {
    const { session } = useAuth();
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [grantRole, setGrantRole] = useState('');
    const [page, setPage] = useState(0);
    const [deleting, setDeleting] = useState<string | null>(null);

    const isAdmin = hasAdminRole(session?.roles);

    const loadUsers = useCallback(async () => {
        if (!session?.accessToken) return;
        try {
            // Users (including PII) come from the developer platform's
            // management-service, NOT from the IdP.
            const base = await adminListUsers(session.accessToken);
            // Roles live in the IdP, keyed by the opaque sub. Fetch each in
            // parallel; fall back to [] on error so the table still renders.
            const withRoles = await Promise.all(base.map(async (u): Promise<UserRow> => {
                try {
                    const res = await fetch(`/api/admin/roles?user_id=${encodeURIComponent(u.sub)}`, {
                        headers: { Authorization: `Bearer ${session.accessToken}` },
                    });
                    if (!res.ok) return { ...u, roles: [] };
                    const data = await res.json();
                    return { ...u, roles: Array.isArray(data.roles) ? data.roles : [] };
                } catch {
                    return { ...u, roles: [] };
                }
            }));
            setUsers(withRoles);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => {
        if (session) loadUsers();
    }, [session, loadUsers]);

    const handleGrant = async (userId: string, role: string) => {
        setActionError(null);
        if (!session?.accessToken) return;
        try {
            const res = await fetch('/api/admin/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
                body: JSON.stringify({ user_id: userId, role }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            await loadUsers();
            setGrantRole('');
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Failed to grant role');
        }
    };

    const handleRevoke = async (userId: string, role: string) => {
        setActionError(null);
        if (!session?.accessToken) return;
        try {
            const res = await fetch('/api/admin/roles', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
                body: JSON.stringify({ user_id: userId, role }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            await loadUsers();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Failed to revoke role');
        }
    };

    const handleDelete = async (user: UserRow) => {
        setActionError(null);
        if (!session?.accessToken) return;
        const label = user.display_name || user.name || user.email || user.sub;
        if (!window.confirm(
            `Delete user "${label}"?\n\nuser_id: ${user.sub}\n\nThis cannot be undone.`
        )) return;
        setDeleting(user.sub);
        try {
            await adminDeleteUser(session.accessToken, user.sub);
            await loadUsers();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Failed to delete user');
        } finally {
            setDeleting(null);
        }
    };

    const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const pageUsers = useMemo(
        () => users.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
        [users, safePage]
    );

    if (!isAdmin) {
        return (
            <div className="max-w-6xl">
                <p className="text-sm text-red-600 dark:text-red-400 mt-8">Access denied. Admin role required.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="max-w-6xl mt-16 text-center py-20">
                <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading users…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl">
                <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
                <button onClick={() => { setLoading(true); loadUsers(); }} className="mt-3 text-sm underline">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Users</h1>
                <span className="text-sm text-black/50 dark:text-white/50">
                    {users.length} user{users.length !== 1 ? 's' : ''}
                </span>
            </div>

            {actionError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {actionError}
                </div>
            )}

            <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                            <th className="text-left px-3 py-2 font-medium">Name</th>
                            <th className="text-left px-3 py-2 font-medium">Email</th>
                            <th className="text-left px-3 py-2 font-medium">User ID</th>
                            <th className="text-left px-3 py-2 font-medium">Roles</th>
                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Registered</th>
                            <th className="w-20 px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {pageUsers.map((user) => {
                            const name = user.display_name || user.name || (user.email ? user.email.split('@')[0] : 'Anonymous');
                            const shortSub = user.sub.length > 16 ? user.sub.slice(0, 8) + '…' + user.sub.slice(-6) : user.sub;
                            return (
                                <tr key={user.sub} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
                                    <td className="px-3 py-1.5 font-medium truncate max-w-[180px]" title={name}>{name}</td>
                                    <td className="px-3 py-1.5">
                                        {user.email ? (
                                            <span className="inline-flex items-center">
                                                <span className="truncate max-w-[200px] inline-block align-middle" title={user.email}>{user.email}</span>
                                                <CopyButton value={user.email} label="email" />
                                            </span>
                                        ) : (
                                            <span className="text-black/30 dark:text-white/30">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span className="inline-flex items-center">
                                            <span className="font-mono text-xs text-black/60 dark:text-white/60" title={user.sub}>{shortSub}</span>
                                            <CopyButton value={user.sub} label="user_id" />
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles.length === 0 && (
                                                <span className="text-xs text-black/30 dark:text-white/30">—</span>
                                            )}
                                            {user.roles.map((role) => (
                                                <span
                                                    key={role}
                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                                                >
                                                    {role.replace('privasys-platform:', '')}
                                                    <button
                                                        onClick={() => handleRevoke(user.sub, role)}
                                                        className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors"
                                                        title={`Revoke ${role}`}
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-black/50 dark:text-white/50 text-xs whitespace-nowrap">
                                        {new Date(user.first_seen_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 py-1.5 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => setExpandedUser(expandedUser === user.sub ? null : user.sub)}
                                            className="inline-flex items-center justify-center w-6 h-6 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                                            title="Add role"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user)}
                                            disabled={deleting === user.sub}
                                            className="inline-flex items-center justify-center w-6 h-6 ml-1 text-black/40 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-30"
                                            title={user.app_count > 0 ? `Cannot delete (${user.app_count} app${user.app_count !== 1 ? 's' : ''})` : 'Delete user'}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {expandedUser && pageUsers.some((u) => u.sub === expandedUser) && (
                            <tr className="bg-black/[0.02] dark:bg-white/[0.02]">
                                <td colSpan={6} className="px-3 py-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-black/50 dark:text-white/50">Add role:</span>
                                        <select
                                            value={grantRole}
                                            onChange={(e) => setGrantRole(e.target.value)}
                                            className="text-sm border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 bg-transparent"
                                        >
                                            <option value="">Select a role…</option>
                                            {AVAILABLE_ROLES.filter(
                                                (r) => !users.find((u) => u.sub === expandedUser)?.roles.includes(r)
                                            ).map((r) => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            value={grantRole}
                                            onChange={(e) => setGrantRole(e.target.value)}
                                            placeholder="or type a custom role"
                                            className="text-sm border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 bg-transparent flex-1"
                                        />
                                        <button
                                            onClick={() => grantRole && handleGrant(expandedUser, grantRole)}
                                            disabled={!grantRole}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-30"
                                        >
                                            Grant
                                        </button>
                                        <button
                                            onClick={() => { setExpandedUser(null); setGrantRole(''); }}
                                            className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm">
                    <span className="text-black/50 dark:text-white/50">
                        Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, users.length)} of {users.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={safePage === 0}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-black/50 dark:text-white/50">
                            Page {safePage + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={safePage >= totalPages - 1}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
