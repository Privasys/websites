'use client';

// Who holds what on the account's apps, on one screen. The account role is
// the baseline: admins manage every app, members see every app, billing
// people see billing. An account admin can make a member an admin of
// particular apps here. The app's creator stays as they are.

import { useCallback, useEffect, useState } from 'react';
import { getAccountAccess, setAccountAccess } from '~/lib/api';
import type { AccountAccess } from '~/lib/api';

export function TeamAppAccess({ token, refreshKey }: { token: string; refreshKey: string }) {
    const [data, setData] = useState<AccountAccess | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');

    const load = useCallback(async () => {
        try {
            setData(await getAccountAccess(token));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'App access could not be loaded');
        }
    }, [token]);

    useEffect(() => { load(); }, [load, refreshKey]);

    if (!data) {
        return error ? <div className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</div> : null;
    }
    if (data.apps.length === 0) return null;

    const roleOf = (appId: string, sub: string) => data.grants.find((g) => g.app_id === appId && g.sub === sub)?.role ?? '';

    async function toggle(appId: string, sub: string, makeAdmin: boolean) {
        const key = `${appId}:${sub}`;
        setBusy(key);
        setError('');
        try {
            await setAccountAccess(token, appId, sub, makeAdmin ? 'admin' : '');
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The app role could not be changed');
        }
        setBusy('');
    }

    const appName = (a: AccountAccess['apps'][number]) => a.display_name || a.name;

    return (
        <section className="mt-10">
            <h2 className="text-lg font-medium">App access</h2>
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Admins manage every app in the account and approve its releases. Members see every app; make a member an
                admin of the apps they work on. Billing members see billing only.
            </p>
            {error && <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            <div className="mt-4 rounded-xl border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10">
                {data.members.map((m) => (
                    <div key={m.sub} className="px-5 py-4">
                        <div className="text-sm font-medium truncate">{m.name || m.email || m.sub}</div>
                        {m.role === 'admin' && (
                            <div className="mt-1 text-xs text-black/50 dark:text-white/50">Admin on every app, as an account admin.</div>
                        )}
                        {m.role === 'billing' && (
                            <div className="mt-1 text-xs text-black/50 dark:text-white/50">No app access: billing only.</div>
                        )}
                        {m.role === 'member' && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                                {data.apps.map((a) => {
                                    const role = roleOf(a.id, m.sub);
                                    const creator = a.creator_sub === m.sub;
                                    const fixed = creator || role === 'owner';
                                    const isAdmin = fixed || role === 'admin';
                                    return (
                                        <label key={a.id} className={`flex items-center gap-2 text-sm ${fixed ? 'opacity-70' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={isAdmin}
                                                disabled={fixed || busy === `${a.id}:${m.sub}`}
                                                onChange={(e) => toggle(a.id, m.sub, e.target.checked)}
                                            />
                                            <span className="truncate">{appName(a)}</span>
                                            <span className="text-xs text-black/40 dark:text-white/40">
                                                {creator ? 'creator' : role === 'owner' ? 'owner' : isAdmin ? 'admin' : 'sees it'}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
