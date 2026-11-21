'use client';

// An app's support team: the people its monitor alerts and lets respond to
// incidents and requests, beyond the app's own team. Shown on the account's
// Support page for the app chosen there.

import { useState, useEffect } from 'react';
import { listAppSupportTeam, upsertAppSupportMember, removeAppSupportMember } from '~/lib/api';
import type { AppSupportMember, SupportRole } from '~/lib/api';
import { useConfirm } from '~/components/confirm-dialog';

const SUPPORT_ROLES: { value: SupportRole; label: string; help: string }[] = [
    { value: 'support-admin', label: 'Support admin', help: 'Manages the support team, on-call and the status page.' },
    { value: 'support-member', label: 'Support member', help: 'Responds to incidents and works tickets.' },
    { value: 'support-viewer', label: 'Support viewer', help: 'Reads incidents, tickets and reports.' }
];

export function SupportTeamSection({ appId, token }: { appId: string; token: string }) {
    const confirm = useConfirm();
    const [members, setMembers] = useState<AppSupportMember[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [newSub, setNewSub] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<SupportRole>('support-member');

    useEffect(() => {
        listAppSupportTeam(token, appId)
            .then(r => { setMembers(r.members); setError(null); })
            .catch(e => setError(e instanceof Error ? e.message : 'Failed to load the support team'));
    }, [token, appId]);

    async function run(action: () => Promise<{ members: AppSupportMember[] }>) {
        setBusy(true);
        setError(null);
        try {
            const r = await action();
            setMembers(r.members);
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The support team could not be changed');
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const sub = newSub.trim();
        if (!sub) return;
        const ok = await run(() => upsertAppSupportMember(token, appId, {
            sub, role: newRole,
            email: newEmail.trim() || undefined,
            name: newName.trim() || undefined
        }));
        if (ok) { setNewSub(''); setNewEmail(''); setNewName(''); }
    }

    async function handleRemove(m: AppSupportMember) {
        const label = m.name || m.email || m.sub;
        if (!(await confirm({ title: `Remove ${label} from the support team?`, confirmLabel: 'Remove', danger: true }))) return;
        await run(() => removeAppSupportMember(token, appId, m.sub));
    }

    const inputClass = 'mt-1 w-full px-3 py-2 text-sm rounded-lg border border-black/15 dark:border-white/15 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';

    return (
        <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
            <h2 className="text-sm font-semibold">Support team</h2>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                The people this app&apos;s monitor alerts, who respond to its incidents and tickets. Owners and admins are already support admins, and viewers support viewers; add anyone else here. Someone on the support team only gets no deploy, configure or team rights on the app.
            </p>
            {error && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}
            {members === null && !error && (
                <div className="mt-4 text-sm text-black/50 dark:text-white/50">Loading the support team…</div>
            )}
            {members !== null && (
                <ul className="mt-4 divide-y divide-black/10 dark:divide-white/10">
                    {members.map((m) => {
                        const label = m.name || m.email || m.sub;
                        return (
                            <li key={m.sub} className="py-3 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">{label}</div>
                                    {m.email && m.email !== label && (
                                        <div className="text-xs text-black/50 dark:text-white/50 mt-0.5 truncate">{m.email}</div>
                                    )}
                                    <div className="text-[11px] font-mono text-black/40 dark:text-white/40 mt-0.5 truncate" title={m.sub}>{m.sub}</div>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                    <select
                                        value={m.role}
                                        disabled={busy}
                                        aria-label={`Support role for ${label}`}
                                        onChange={(e) => run(() => upsertAppSupportMember(token, appId, {
                                            sub: m.sub, email: m.email || undefined, name: m.name || undefined,
                                            role: e.target.value as SupportRole
                                        }))}
                                        className="text-xs px-2 py-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent disabled:opacity-40"
                                    >
                                        {SUPPORT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(m)}
                                        disabled={busy}
                                        className="text-xs px-2.5 py-1 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-40"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                    {members.length === 0 && (
                        <li className="py-3 text-sm text-black/50 dark:text-white/50">Nobody beyond the app team yet.</li>
                    )}
                </ul>
            )}
            <form onSubmit={handleAdd} className="mt-5 pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
                <h3 className="text-xs font-semibold">Add to the support team</h3>
                <div>
                    <label className="block text-xs font-medium text-black/60 dark:text-white/60">Subject ID <span className="text-red-600">*</span></label>
                    <input type="text" value={newSub} onChange={(e) => setNewSub(e.target.value)} required
                        placeholder="Their Subject ID, from Settings → Identity" className={`${inputClass} font-mono`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-black/60 dark:text-white/60">Role</label>
                        <select value={newRole} onChange={(e) => setNewRole(e.target.value as SupportRole)} className={inputClass}>
                            {SUPPORT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-black/60 dark:text-white/60">Email (display only)</label>
                        <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="alice@example.com" className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-black/60 dark:text-white/60">Name (display only)</label>
                        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Alice" className={inputClass} />
                    </div>
                </div>
                <p className="text-[11px] text-black/40 dark:text-white/40">{SUPPORT_ROLES.find(r => r.value === newRole)?.help}</p>
                <button type="submit" disabled={busy || !newSub.trim()}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40">
                    {busy ? 'Saving…' : 'Add to the support team'}
                </button>
            </form>
        </section>
    );
}
