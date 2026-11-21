'use client';

// The account's people, on one table: each person's account role and what
// it gives them on the account's apps, with invitations waiting beside
// them. An admin edits a person in a drawer: their account role, the apps
// they are an admin of, or their removal.

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
    getAccountAccess,
    setAccountAccess,
    isApiStatus
} from '~/lib/api';
import type { Account, AccountMember, AccountRole, AccountInvite, AccountAccess } from '~/lib/api';
import { useConfirm } from '~/components/confirm-dialog';

const ROLE_LABEL: Record<AccountRole, string> = { admin: 'Admin', billing: 'Billing', member: 'Member' };

const ROLE_HINT: Record<AccountRole, string> = {
    admin: 'Manages the team, billing and every app, and approves releases.',
    billing: 'Sees and manages billing only.',
    member: 'Sees every app; can be made an admin of particular apps.'
};

const input = 'w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent';
const primary = 'px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50';
const secondary = 'px-3 py-1.5 text-xs font-medium rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50';

export default function TeamPage() {
    const { session } = useAuth();
    const token = session?.accessToken ?? '';
    const confirm = useConfirm();
    const [account, setAccount] = useState<Account | null>(null);
    const [role, setRole] = useState<AccountRole | ''>('');
    const [members, setMembers] = useState<AccountMember[]>([]);
    const [invites, setInvites] = useState<AccountInvite[]>([]);
    const [access, setAccess] = useState<AccountAccess | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);

    const isAdmin = role === 'admin';

    const load = useCallback(async () => {
        if (!token) return;
        try {
            const data = await getAccount(token);
            setAccount(data.account);
            setRole(data.role);
            setMembers(data.members);
            if (data.role === 'admin') {
                const [inv, acc] = await Promise.all([
                    listAccountInvites(token).catch(() => []),
                    getAccountAccess(token).catch(() => null)
                ]);
                setInvites(inv);
                setAccess(acc);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load the account');
        }
        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    function flash(msg: string) {
        setSuccess(msg);
        setTimeout(() => setSuccess(''), 3000);
    }

    // What a person holds on the account's apps, in a few words.
    function appSummary(m: AccountMember): string {
        if (m.role === 'admin') return 'Admin of every app';
        if (m.role === 'billing') return 'No app access';
        if (!access || access.apps.length === 0) return 'Sees every app';
        const adminOf = access.apps.filter((a) =>
            a.creator_sub === m.sub || access.grants.some((g) => g.app_id === a.id && g.sub === m.sub && (g.role === 'admin' || g.role === 'owner'))
        ).length;
        if (adminOf === 0) return 'Sees every app';
        if (adminOf === access.apps.length) return 'Admin of every app';
        return `Admin of ${adminOf} app${adminOf === 1 ? '' : 's'}, sees the rest`;
    }

    async function changeRole(sub: string, r: AccountRole) {
        setError('');
        try {
            const { members: m } = await updateAccountMember(token, sub, r);
            setMembers(m);
            flash('Role updated.');
        } catch (e) {
            if (isApiStatus(e, 403)) setError('The account needs at least one admin.');
            else setError(e instanceof Error ? e.message : 'The role could not be changed');
        }
        load();
    }

    async function remove(m: AccountMember) {
        const ok = await confirm({
            title: `Remove ${m.name || m.email || 'this person'}?`,
            body: 'They lose access to the account and its apps, including any app they were made an admin of.',
            confirmLabel: 'Remove',
            danger: true
        });
        if (!ok) return;
        setError('');
        try {
            const { members: list } = await removeAccountMember(token, m.sub);
            setMembers(list);
            setEditing(null);
            flash('Removed.');
        } catch (e) {
            if (isApiStatus(e, 403)) setError('The account needs at least one admin.');
            else setError(e instanceof Error ? e.message : 'They could not be removed');
        }
        load();
    }

    async function toggleAppAdmin(appId: string, sub: string, makeAdmin: boolean) {
        setError('');
        try {
            await setAccountAccess(token, appId, sub, makeAdmin ? 'admin' : '');
            setAccess(await getAccountAccess(token));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The app role could not be changed');
        }
    }

    async function resend(id: string) {
        setError('');
        try {
            const { invite } = await resendAccountInvite(token, id);
            setInvites((list) => list.map((i) => (i.id === id ? invite : i)));
            flash(`Invitation sent again to ${invite.email}. The earlier link no longer works.`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The invitation could not be sent again');
        }
    }

    async function withdraw(id: string) {
        setError('');
        try {
            await revokeAccountInvite(token, id);
            setInvites((list) => list.filter((i) => i.id !== id));
            flash('Invitation withdrawn.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The invitation could not be withdrawn');
        }
    }

    const editedMember = members.find((m) => m.sub === editing) ?? null;

    return (
        <div className="max-w-4xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Team</h1>
                    <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                        The people in {account?.name ? <span className="font-medium">{account.name}</span> : 'this account'} and
                        what they can do on its apps.
                    </p>
                </div>
                {isAdmin && (
                    <button onClick={() => setInviting(true)} className={primary}>Invite</button>
                )}
            </div>

            {error && <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {success && <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}

            {loading ? (
                <div className="mt-8 text-sm text-black/40 dark:text-white/40">Loading…</div>
            ) : (
                <div className="mt-8 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-black/2 dark:bg-white/3 text-left text-xs text-black/50 dark:text-white/50">
                            <tr>
                                <th className="px-5 py-2.5 font-medium">Person</th>
                                <th className="px-5 py-2.5 font-medium">Account role</th>
                                <th className="px-5 py-2.5 font-medium hidden sm:table-cell">Apps</th>
                                <th className="px-5 py-2.5" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/10">
                            {members.map((m) => {
                                const owner = m.sub === account?.owner_sub;
                                return (
                                    <tr key={m.sub}>
                                        <td className="px-5 py-3 min-w-0">
                                            <div className="font-medium truncate">
                                                {m.name || m.email || 'Unnamed'}
                                                {owner && <span className="ml-2 text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">Owner</span>}
                                            </div>
                                            {m.email && m.name && <div className="text-xs text-black/40 dark:text-white/40 truncate">{m.email}</div>}
                                        </td>
                                        <td className="px-5 py-3" title={ROLE_HINT[m.role]}>{ROLE_LABEL[m.role]}</td>
                                        <td className="px-5 py-3 text-black/60 dark:text-white/60 hidden sm:table-cell">{appSummary(m)}</td>
                                        <td className="px-5 py-3 text-right">
                                            {isAdmin && !owner && (
                                                <button onClick={() => setEditing(m.sub)} className={secondary}>Edit</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {invites.map((i) => {
                                const expired = new Date(i.expires_at).getTime() < Date.now();
                                return (
                                    <tr key={i.id} className="bg-black/1 dark:bg-white/2">
                                        <td className="px-5 py-3 min-w-0">
                                            <div className="truncate">{i.email}</div>
                                            <div className="text-xs text-black/40 dark:text-white/40">
                                                {expired ? 'Invitation expired' : `Invited, until ${new Date(i.expires_at).toLocaleDateString()}`}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-black/50 dark:text-white/50">{ROLE_LABEL[i.role]}</td>
                                        <td className="px-5 py-3 text-black/40 dark:text-white/40 hidden sm:table-cell">Not joined yet</td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            <button onClick={() => resend(i.id)} className={secondary}>Send again</button>
                                            <button onClick={() => withdraw(i.id)} className={`${secondary} ml-2 text-red-600 dark:text-red-400`}>Withdraw</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {editedMember && (
                <EditDrawer
                    member={editedMember}
                    access={access}
                    onClose={() => setEditing(null)}
                    onRole={(r) => changeRole(editedMember.sub, r)}
                    onToggleApp={(appId, on) => toggleAppAdmin(appId, editedMember.sub, on)}
                    onRemove={() => remove(editedMember)}
                />
            )}

            {inviting && (
                <InviteDrawer
                    token={token}
                    accountName={account?.name ?? ''}
                    onClose={() => setInviting(false)}
                    onInvited={(inv) => { setInvites((list) => [inv, ...list]); flash(`Invitation sent to ${inv.email}.`); }}
                    onAdded={(list) => { setMembers(list); flash('Added.'); load(); }}
                />
            )}
        </div>
    );
}

// A panel over the right of the page.
function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 dark:bg-black/50" onClick={onClose} />
            <aside className="relative w-full max-w-md h-full bg-white dark:bg-neutral-900 border-l border-black/10 dark:border-white/10 shadow-xl overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-neutral-900 px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                    <h2 className="text-base font-semibold truncate">{title}</h2>
                    <button onClick={onClose} className="text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white" aria-label="Close">✕</button>
                </div>
                <div className="px-6 py-5 space-y-6">{children}</div>
            </aside>
        </div>
    );
}

function EditDrawer({ member, access, onClose, onRole, onToggleApp, onRemove }: {
    member: AccountMember;
    access: AccountAccess | null;
    onClose: () => void;
    onRole: (r: AccountRole) => void;
    onToggleApp: (appId: string, on: boolean) => void;
    onRemove: () => void;
}) {
    const roleOf = (appId: string) => access?.grants.find((g) => g.app_id === appId && g.sub === member.sub)?.role ?? '';
    return (
        <Drawer title={member.name || member.email || 'Person'} onClose={onClose}>
            <div>
                <div className="text-xs font-medium text-black/50 dark:text-white/50">Account role</div>
                <div className="mt-2 space-y-2">
                    {(['admin', 'member', 'billing'] as AccountRole[]).map((r) => (
                        <label key={r} className="flex items-start gap-2 text-sm cursor-pointer">
                            <input type="radio" name="account-role" checked={member.role === r} onChange={() => onRole(r)} className="mt-1" />
                            <span>
                                <span className="font-medium">{ROLE_LABEL[r]}</span>
                                <span className="block text-xs text-black/50 dark:text-white/50">{ROLE_HINT[r]}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {member.role === 'member' && access && access.apps.length > 0 && (
                <div>
                    <div className="text-xs font-medium text-black/50 dark:text-white/50">Admin of these apps</div>
                    <p className="mt-1 text-xs text-black/40 dark:text-white/40">They see every app; tick the ones they manage and approve releases for.</p>
                    <div className="mt-3 space-y-2">
                        {access.apps.map((a) => {
                            const creator = a.creator_sub === member.sub;
                            const held = roleOf(a.id);
                            const fixed = creator || held === 'owner';
                            return (
                                <label key={a.id} className={`flex items-center gap-2 text-sm ${fixed ? 'opacity-60' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={fixed || held === 'admin'}
                                        disabled={fixed}
                                        onChange={(e) => onToggleApp(a.id, e.target.checked)}
                                    />
                                    <span className="truncate">{a.display_name || a.name}</span>
                                    {fixed && <span className="text-xs text-black/40 dark:text-white/40">{creator ? 'creator' : 'owner'}</span>}
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="pt-4 border-t border-black/5 dark:border-white/10">
                <button onClick={onRemove} className="text-sm text-red-600 dark:text-red-400 hover:underline">Remove from the account</button>
            </div>
        </Drawer>
    );
}

function InviteDrawer({ token, accountName, onClose, onInvited, onAdded }: {
    token: string;
    accountName: string;
    onClose: () => void;
    onInvited: (inv: AccountInvite) => void;
    onAdded: (members: AccountMember[]) => void;
}) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<AccountRole>('member');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sub, setSub] = useState('');
    const [name, setName] = useState('');

    async function invite() {
        setBusy(true);
        setError('');
        try {
            const { invite: inv } = await createAccountInvite(token, email.trim(), role);
            onInvited(inv);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The invitation could not be sent');
        }
        setBusy(false);
    }

    async function addById() {
        setBusy(true);
        setError('');
        try {
            const { members } = await addAccountMember(token, { sub: sub.trim(), name: name.trim(), role });
            onAdded(members);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'They could not be added');
        }
        setBusy(false);
    }

    return (
        <Drawer title={`Invite to ${accountName || 'the account'}`} onClose={onClose}>
            {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            <div>
                <div className="text-xs font-medium text-black/50 dark:text-white/50">Role</div>
                <div className="mt-2 space-y-2">
                    {(['member', 'admin', 'billing'] as AccountRole[]).map((r) => (
                        <label key={r} className="flex items-start gap-2 text-sm cursor-pointer">
                            <input type="radio" name="invite-role" checked={role === r} onChange={() => setRole(r)} className="mt-1" />
                            <span>
                                <span className="font-medium">{ROLE_LABEL[r]}</span>
                                <span className="block text-xs text-black/50 dark:text-white/50">{ROLE_HINT[r]}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </div>
            <div>
                <label className="block">
                    <span className="text-xs font-medium text-black/50 dark:text-white/50">Email</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && email.trim()) invite(); }}
                        placeholder="name@company.com"
                        className={`mt-1 ${input}`}
                        autoFocus
                    />
                </label>
                <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                    They get an email explaining the platform and the Privasys Wallet, with a link that works once and expires
                    after seven days.{role === 'admin' ? ' An admin invitation can only be accepted by someone signed in with this email address.' : ''}
                </p>
                <button onClick={invite} disabled={busy || !email.trim()} className={`mt-4 ${primary}`}>
                    {busy ? 'Sending…' : 'Send invitation'}
                </button>
            </div>
            <details className="pt-4 border-t border-black/5 dark:border-white/10">
                <summary className="text-sm cursor-pointer text-black/60 dark:text-white/60">Or add someone by their Privasys ID</summary>
                <div className="mt-3 space-y-3">
                    <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Privasys ID (sub)" className={`${input} font-mono`} />
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={input} />
                    <button onClick={addById} disabled={busy || !sub.trim()} className={primary}>Add</button>
                </div>
            </details>
        </Drawer>
    );
}
