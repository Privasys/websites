'use client';

import { useAuth } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback } from 'react';
import {
    getAccount,
    addAccountMember,
    updateAccountMember,
    removeAccountMember,
    listAccountInvites,
    createAccountInvite,
    resendAccountInvite,
    revokeAccountInvite,
    isApiStatus
} from '~/lib/api';
import type { Account, AccountMember, AccountRole, AccountInvite } from '~/lib/api';
import { TeamAppAccess } from '~/components/team-app-access';

const ROLE_LABEL: Record<AccountRole, string> = {
    admin: 'Admin',
    billing: 'Billing',
    member: 'Member'
};

const ROLE_HINT: Record<AccountRole, string> = {
    admin: 'Manage team, billing and app roles',
    billing: 'View and manage billing only',
    member: 'Sees every app; can be given more on any app'
};

export default function TeamPage() {
    const { session } = useAuth();
    const [account, setAccount] = useState<Account | null>(null);
    const [role, setRole] = useState<AccountRole | ''>('');
    const [members, setMembers] = useState<AccountMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Invitations by email
    const [invites, setInvites] = useState<AccountInvite[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<AccountRole>('member');
    const [inviting, setInviting] = useState(false);

    // Add-member form
    const [newSub, setNewSub] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<AccountRole>('member');
    const [adding, setAdding] = useState(false);

    const isAdmin = role === 'admin';

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        try {
            const data = await getAccount(session.accessToken);
            setAccount(data.account);
            setRole(data.role);
            setMembers(data.members);
            if (data.role === 'admin') {
                setInvites(await listAccountInvites(session.accessToken).catch(() => []));
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load account');
        }
        setLoading(false);
    }, [session?.accessToken]);

    useEffect(() => { load(); }, [load]);

    function flash(msg: string) {
        setSuccess(msg);
        setTimeout(() => setSuccess(''), 3000);
    }

    async function handleAddMember() {
        if (!session?.accessToken || !newSub.trim()) return;
        setAdding(true);
        setError('');
        try {
            const { members: m } = await addAccountMember(session.accessToken, {
                sub: newSub.trim(), email: newEmail.trim(), name: newName.trim(), role: newRole
            });
            setMembers(m);
            setNewSub(''); setNewEmail(''); setNewName(''); setNewRole('member');
            flash('Member added.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to add member');
        }
        setAdding(false);
    }

    async function handleInvite() {
        if (!session?.accessToken || !inviteEmail.trim()) return;
        setInviting(true);
        setError('');
        try {
            const { invite } = await createAccountInvite(session.accessToken, inviteEmail.trim(), inviteRole);
            setInvites((list) => [invite, ...list]);
            setInviteEmail('');
            setInviteRole('member');
            flash(`Invitation sent to ${invite.email}.`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The invitation could not be sent');
        }
        setInviting(false);
    }

    async function handleResend(id: string) {
        if (!session?.accessToken) return;
        setError('');
        try {
            const { invite } = await resendAccountInvite(session.accessToken, id);
            setInvites((list) => list.map((i) => (i.id === id ? invite : i)));
            flash(`Invitation sent again to ${invite.email}. The earlier link no longer works.`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The invitation could not be sent again');
        }
    }

    async function handleRevoke(id: string) {
        if (!session?.accessToken) return;
        setError('');
        try {
            await revokeAccountInvite(session.accessToken, id);
            setInvites((list) => list.filter((i) => i.id !== id));
            flash('Invitation withdrawn.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The invitation could not be withdrawn');
        }
    }

    async function handleRoleChange(sub: string, r: AccountRole) {
        if (!session?.accessToken) return;
        setError('');
        try {
            const { members: m } = await updateAccountMember(session.accessToken, sub, r);
            setMembers(m);
            flash('Role updated.');
        } catch (e) {
            if (isApiStatus(e, 403)) setError('Cannot demote the last account admin.');
            else setError(e instanceof Error ? e.message : 'Failed to update role');
            load();
        }
    }

    async function handleRemove(sub: string) {
        if (!session?.accessToken) return;
        setError('');
        try {
            const { members: m } = await removeAccountMember(session.accessToken, sub);
            setMembers(m);
            flash('Member removed.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to remove member');
        }
    }

    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold">Team</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                The people in this account. Its name and public pages are under Settings.
            </p>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}
            {success && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">
                    {success}
                </div>
            )}

            {loading ? (
                <div className="mt-8 text-sm text-black/40 dark:text-white/40">Loading…</div>
            ) : (
                <>
                    {/* Members */}
                    <section className="mt-10">
                        <h2 className="text-lg font-medium">Members</h2>
                        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                            People who belong to this account. The owner cannot be removed.
                        </p>

                        <div className="mt-4 rounded-xl border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10">
                            {members.length === 0 && (
                                <div className="px-5 py-4 text-sm text-black/40 dark:text-white/40">No members yet.</div>
                            )}
                            {members.map((m) => {
                                const isOwner = m.sub === account?.owner_sub;
                                return (
                                    <div key={m.sub} className="px-5 py-4 flex items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">
                                                {m.name || m.email || m.sub}
                                                {isOwner && (
                                                    <span className="ml-2 text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">Owner</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-black/40 dark:text-white/40 font-mono truncate">{m.sub}</div>
                                        </div>
                                        {isAdmin && !isOwner ? (
                                            <select
                                                value={m.role}
                                                onChange={(e) => handleRoleChange(m.sub, e.target.value as AccountRole)}
                                                className="px-2 py-1.5 text-xs rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
                                                title={ROLE_HINT[m.role]}
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="billing">Billing</option>
                                                <option value="member">Member</option>
                                            </select>
                                        ) : (
                                            <span className="px-2 py-1.5 text-xs text-black/50 dark:text-white/50" title={ROLE_HINT[m.role]}>
                                                {ROLE_LABEL[m.role]}
                                            </span>
                                        )}
                                        {isAdmin && !isOwner && (
                                            <button
                                                onClick={() => handleRemove(m.sub)}
                                                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Invite by email */}
                        {isAdmin && (
                            <div className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-3">
                                <div className="text-sm font-medium">Invite someone</div>
                                <p className="text-xs text-black/40 dark:text-white/40">
                                    They get an email explaining the platform and the Privasys Wallet, with a link to join
                                    {account?.name ? <> {account.name}</> : ' this account'}. The link works once and expires after seven days.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                                        placeholder="name@company.com"
                                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
                                    />
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as AccountRole)}
                                        className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
                                        title={ROLE_HINT[inviteRole]}
                                    >
                                        <option value="member">Member</option>
                                        <option value="billing">Billing</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <button
                                        onClick={handleInvite}
                                        disabled={inviting || !inviteEmail.trim()}
                                        className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
                                    >
                                        {inviting ? 'Sending…' : 'Send invitation'}
                                    </button>
                                </div>
                                {invites.length > 0 && (
                                    <div className="pt-2">
                                        <div className="text-xs font-medium text-black/50 dark:text-white/50 mb-1">Waiting to be accepted</div>
                                        <div className="divide-y divide-black/5 dark:divide-white/10">
                                            {invites.map((i) => {
                                                const expired = new Date(i.expires_at).getTime() < Date.now();
                                                return (
                                                    <div key={i.id} className="py-2 flex items-center gap-3 text-sm">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="truncate">{i.email}</div>
                                                            <div className="text-xs text-black/40 dark:text-white/40">
                                                                {ROLE_LABEL[i.role]} · {expired ? 'expired' : `expires ${new Date(i.expires_at).toLocaleDateString()}`}
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleResend(i.id)} className="text-xs hover:underline">Send again</button>
                                                        <button onClick={() => handleRevoke(i.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Withdraw</button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Add member by their Privasys ID */}
                        {isAdmin && (
                            <details className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-3">
                                <summary className="text-sm font-medium cursor-pointer">Add someone by their Privasys ID</summary>
                                <p className="text-xs text-black/40 dark:text-white/40">
                                    Identify the person by their Privasys subject ID (<span className="font-mono">sub</span>).
                                    Email and name are for display only.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={newSub}
                                        onChange={(e) => setNewSub(e.target.value)}
                                        placeholder="Subject ID (sub) *"
                                        className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent font-mono"
                                    />
                                    <select
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value as AccountRole)}
                                        className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
                                    >
                                        <option value="member">Member</option>
                                        <option value="billing">Billing</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Name (optional)"
                                        className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
                                    />
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="Email (optional)"
                                        className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
                                    />
                                </div>
                                <button
                                    onClick={handleAddMember}
                                    disabled={adding || !newSub.trim()}
                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
                                >
                                    {adding ? 'Adding…' : 'Add member'}
                                </button>
                            </details>
                        )}
                    </section>

                    {isAdmin && session?.accessToken && (
                        <TeamAppAccess token={session.accessToken} refreshKey={members.map((m) => m.sub + ':' + m.role).join(',')} />
                    )}
                </>
            )}
        </div>
    );
}
