'use client';

// On-call for the account: one rota for every app of the account, and
// each person's alert channels set once. An app can still be given a rota
// of its own, and a person can set something else for one app, below.

import { useEffect, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { getAccount } from '~/lib/api';
import { AppOnCallTab, AccountOnCallPanel } from '~/components/app-oncall-tab';
import { AccountAppPicker, appFromAddress, useAccountApps } from '~/components/account-app-picker';
import { useCurrentAccount } from '~/components/account-context';

export default function OnCallPage() {
    const { session } = useAuth();
    const token = session?.accessToken ?? '';
    const account = useCurrentAccount();
    const { apps, loading } = useAccountApps(token);
    const [appId, setAppId] = useState('');
    const [team, setTeam] = useState<{ sub: string; name?: string; role: string }[] | null>(null);
    const [showApp, setShowApp] = useState(false);

    // The account's people who can be on call: its admins, who lead and
    // respond. Members see the apps and are not paged.
    useEffect(() => {
        if (!token) return;
        getAccount(token)
            .then((a) => setTeam(a.members
                .filter((m) => m.role === 'admin' || m.role === 'member')
                .map((m) => ({ sub: m.sub, name: m.name || m.email, role: m.role === 'admin' ? 'admin' : 'viewer' }))))
            .catch(() => setTeam([]));
    }, [token]);

    useEffect(() => {
        if (apps.length === 0) return;
        const wanted = appFromAddress();
        if (wanted && apps.some((a) => a.id === wanted)) {
            setAppId(wanted);
            setShowApp(true);
        } else {
            setAppId((cur) => cur || apps[0].id);
        }
    }, [apps]);

    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold">On-call</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Who is alerted when one of this account&apos;s apps goes down, in what order, and how. The account rota covers
                every app; give an app a rota of its own only where it needs one.
            </p>

            {loading || team === null ? (
                <div className="mt-8 text-sm text-black/40 dark:text-white/40">Loading…</div>
            ) : apps.length === 0 || !account ? (
                <div className="mt-8 text-sm text-black/50 dark:text-white/50">This account has no monitored apps yet.</div>
            ) : (
                <>
                    <div className="mt-8">
                        <AccountOnCallPanel accountId={account.id} token={token} team={team} />
                    </div>

                    <section className="mt-12">
                        <h2 className="text-lg font-medium">One app</h2>
                        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                            An app&apos;s own rota, its alert history, and your alerts for it alone.
                        </p>
                        {!showApp ? (
                            <button
                                type="button"
                                onClick={() => setShowApp(true)}
                                className="mt-3 px-3 py-2 text-sm rounded-lg border border-black/15 dark:border-white/15"
                            >
                                Open an app
                            </button>
                        ) : (
                            <>
                                <div className="mt-4">
                                    <AccountAppPicker apps={apps} value={appId} onChange={setAppId} />
                                </div>
                                {appId && token && (
                                    <div key={appId} className="mt-6">
                                        <AppOnCallTab appId={appId} token={token} />
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
