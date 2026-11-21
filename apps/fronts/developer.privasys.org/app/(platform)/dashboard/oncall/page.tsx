'use client';

// On-call for the account's apps: who is paged when an app goes down, in
// what order, and how each person is reached. One rota per app today,
// chosen here; each person's own alert channels are set once and used for
// every app.

import { useEffect, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { AppOnCallTab } from '~/components/app-oncall-tab';
import { AccountAppPicker, appFromAddress, useAccountApps } from '~/components/account-app-picker';

export default function OnCallPage() {
    const { session } = useAuth();
    const token = session?.accessToken ?? '';
    const { apps, loading } = useAccountApps(token);
    const [appId, setAppId] = useState('');

    useEffect(() => {
        if (apps.length === 0) return;
        const wanted = appFromAddress();
        setAppId((cur) => cur || (apps.some((a) => a.id === wanted) ? wanted : apps[0].id));
    }, [apps]);

    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold">On-call</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Who is alerted when one of this account&apos;s apps goes down, in what order, and how. Choose the app to see
                and change its rota.
            </p>
            {loading ? (
                <div className="mt-8 text-sm text-black/40 dark:text-white/40">Loading…</div>
            ) : apps.length === 0 ? (
                <div className="mt-8 text-sm text-black/50 dark:text-white/50">This account has no monitored apps yet.</div>
            ) : (
                <>
                    <div className="mt-6">
                        <AccountAppPicker apps={apps} value={appId} onChange={setAppId} />
                    </div>
                    {appId && token && (
                        <div key={appId} className="mt-6">
                            <AppOnCallTab appId={appId} token={token} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
