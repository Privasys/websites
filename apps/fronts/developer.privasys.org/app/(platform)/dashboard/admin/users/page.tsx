'use client';

import { useAuth, hasAdminRole } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback } from 'react';

interface User {
    user_id: string;
    display_name: string;
    email: string;
    created_at: string;
    roles: string[];
}

const AVAILABLE_ROLES = [
    'privasys-platform:admin',
    'privasys-platform:manager',
];

export default function AdminUsersPage() {
    const { session } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [grantRole, setGrantRole] = useState('');

    const isAdmin = hasAdminRole(session?.roles);

    const loadUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            setUsers(await res.json());
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session) loadUsers();
    }, [session, loadUsers]);

    const handleGrant = async (userId: string, role: string) => {
        setActionError(null);
        try {
            const res = await fetch('/api/admin/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        try {
            const res = await fetch('/api/admin/roles', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
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

    if (!isAdmin) {
        return (
            <div className="max-w-4xl">
                <p className="text-sm text-red-600 dark:text-red-400 mt-8">Access denied. Admin role required.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="max-w-4xl mt-16 text-center py-20">
                <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading users…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl">
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
        <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Users</h1>
                <span className="text-sm text-black/50 dark:text-white/50">{users.length} user{users.length !== 1 ? 's' : ''}</span>
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
                            <th className="text-left px-4 py-3 font-medium">User</th>
                            <th className="text-left px-4 py-3 font-medium">Roles</th>
                            <th className="text-left px-4 py-3 font-medium">Registered</th>
                            <th className="w-10" />
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.user_id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                                <td className="px-4 py-3">
                                    <div className="font-medium">{user.display_name || user.email || 'Anonymous'}</div>
                                    <div className="text-xs text-black/40 dark:text-white/40 font-mono mt-0.5">
                                        {user.user_id.length > 24 ? user.user_id.slice(0, 24) + '…' : user.user_id}
                                    </div>
                                    {user.email && user.display_name && (
                                        <div className="text-xs text-black/40 dark:text-white/40 mt-0.5">{user.email}</div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1.5">
                                        {user.roles.length === 0 && (
                                            <span className="text-xs text-black/30 dark:text-white/30">No roles</span>
                                        )}
                                        {user.roles.map((role) => (
                                            <span
                                                key={role}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                                            >
                                                {role}
                                                <button
                                                    onClick={() => handleRevoke(user.user_id, role)}
                                                    className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors"
                                                    title={`Revoke ${role}`}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-black/50 dark:text-white/50 text-xs">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => setExpandedUser(expandedUser === user.user_id ? null : user.user_id)}
                                        className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                                        title="Add role"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {/* Expanded row for granting a role */}
                        {expandedUser && (
                            <tr className="bg-black/[0.02] dark:bg-white/[0.02]">
                                <td colSpan={4} className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-black/50 dark:text-white/50">Add role:</span>
                                        <select
                                            value={grantRole}
                                            onChange={(e) => setGrantRole(e.target.value)}
                                            className="text-sm border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 bg-transparent"
                                        >
                                            <option value="">Select a role…</option>
                                            {AVAILABLE_ROLES.filter(
                                                (r) => !users.find((u) => u.user_id === expandedUser)?.roles.includes(r)
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
        </div>
    );
}
