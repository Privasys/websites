'use client';

// The account's settings: its name, kind, domain and short name. The
// account is the one chosen in the top bar; only its admins change these.
// Your own details and access tokens are on Your profile.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '~/lib/privasys-auth';
import { getAccount, updateAccount } from '~/lib/api';
import type { Account, AccountRole } from '~/lib/api';
import { accountPagesUrls } from '~/lib/monitor';

export default function AccountSettingsPage() {
    const { session } = useAuth();
    const token = session?.accessToken ?? '';
    const [account, setAccount] = useState<Account | null>(null);
    const [role, setRole] = useState<AccountRole | ''>('');
    const [name, setName] = useState('');
    const [kind, setKind] = useState<'individual' | 'org'>('individual');
    const [domain, setDomain] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isAdmin = role === 'admin';

    const fill = (a: Account) => {
        setAccount(a);
        setName(a.name || '');
        setKind(a.kind || 'individual');
        setDomain(a.domain || '');
        setSlug(a.slug || '');
    };

    const load = useCallback(async () => {
        if (!token) return;
        try {
            const data = await getAccount(token);
            fill(data.account);
            setRole(data.role);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load the account');
        }
        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    async function save() {
        if (!account) return;
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const { account: updated } = await updateAccount(token, {
                kind,
                name: name.trim(),
                domain: kind === 'org' ? domain.trim() : '',
                slug: slug.trim().toLowerCase()
            });
            fill(updated);
            setSuccess('Settings saved.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The settings could not be saved.');
        }
        setSaving(false);
    }

    const input = 'mt-1 w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent disabled:opacity-60';
    const pages = account?.slug ? accountPagesUrls(account.slug) : null;

    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                {account ? <>The settings of <span className="font-medium">{account.name || 'this account'}</span>. </> : null}
                {isAdmin ? 'Only the account\'s admins can change them.' : 'Only the account\'s admins can change these.'}
                {' '}Your own details and access tokens are on <Link href="/dashboard/profile" className="underline">Your profile</Link>.
            </p>

            {error && <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {success && <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}

            {loading ? (
                <div className="mt-8 text-sm text-black/40 dark:text-white/40">Loading…</div>
            ) : account && (
                <>
                    <section className="mt-10">
                        <h2 className="text-lg font-medium">Account</h2>
                        <div className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs font-medium text-black/50 dark:text-white/50">Name</span>
                                    <input type="text" value={name} disabled={!isAdmin} onChange={(e) => setName(e.target.value)} className={input} />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-medium text-black/50 dark:text-white/50">Type</span>
                                    <select
                                        value={kind}
                                        disabled={!isAdmin || account.kind === 'org'}
                                        onChange={(e) => setKind(e.target.value as 'individual' | 'org')}
                                        className={input}
                                    >
                                        <option value="individual">Individual</option>
                                        <option value="org">Organisation</option>
                                    </select>
                                </label>
                            </div>
                            {kind === 'org' && (
                                <label className="block">
                                    <span className="text-xs font-medium text-black/50 dark:text-white/50">Domain</span>
                                    <input type="text" value={domain} disabled={!isAdmin} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className={input} />
                                </label>
                            )}
                            <div>
                                <div className="text-xs font-medium text-black/50 dark:text-white/50">Account ID</div>
                                <div className="text-sm mt-0.5 font-mono text-black/40 dark:text-white/40">{account.id}</div>
                            </div>
                        </div>
                    </section>

                    <section className="mt-10">
                        <h2 className="text-lg font-medium">Public pages</h2>
                        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                            The account&apos;s status and support pages, and its apps&apos; pages, live under its short name.
                            Choose which apps they list on <Link href="/dashboard/status" className="underline">Status &amp; support</Link>.
                        </p>
                        <div className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-3">
                            <label className="block max-w-sm">
                                <span className="text-xs font-medium text-black/50 dark:text-white/50">Short name</span>
                                <input type="text" value={slug} disabled={!isAdmin} maxLength={32} onChange={(e) => setSlug(e.target.value)} placeholder="your-company" className={input} />
                                <span className="mt-1 block text-xs text-black/40 dark:text-white/40">3 to 32 lowercase letters, digits or single hyphens.</span>
                            </label>
                            {pages && (
                                <div className="text-sm space-y-1">
                                    <div>Status: <a href={pages.status} target="_blank" rel="noreferrer" className="underline">{pages.status}</a></div>
                                    <div>Support: <a href={pages.support} target="_blank" rel="noreferrer" className="underline">{pages.support}</a></div>
                                </div>
                            )}
                        </div>
                    </section>

                    {isAdmin && (
                        <div className="mt-8">
                            <button
                                onClick={save}
                                disabled={saving}
                                className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : 'Save settings'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
