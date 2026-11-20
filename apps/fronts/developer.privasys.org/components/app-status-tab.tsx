'use client';

// The app's Status tab: its monitor on the platform's shared monitor.
//
// Turning monitoring on gives the app a check that it answers at its
// address, every minute, with no configuration. The status page stays
// private until the team makes it public; then anyone can read it, with
// every uptime bar checkable against the monitor's signed ledger.
//
// The portal decides nothing here: the monitor reads the person's role on
// the app from their platform token and refuses what it does not allow.

import { useCallback, useEffect, useState } from 'react';
import {
    enableMonitoring, getMonitorStatus, listMonitorServices, listMonitorIncidents,
    setServiceVisibility, publicStatusPageUrl, MonitorError
} from '~/lib/monitor';
import type { MonitorStatus, MonitorService, MonitorIncident, Indicator } from '~/lib/monitor';
import { useConfirm } from '~/components/confirm-dialog';
import { useCurrentAccount } from '~/components/account-switcher';

const INDICATOR: Record<Indicator, { label: string; cls: string }> = {
    none: { label: 'Operational', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
    minor: { label: 'Degraded', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    major: { label: 'Partial outage', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
    critical: { label: 'Major outage', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    maintenance: { label: 'Maintenance', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' }
};

type Phase = 'loading' | 'off' | 'on' | 'denied' | 'error';

function when(unix: number): string {
    return new Date(unix * 1000).toLocaleString();
}

export function AppStatusTab({ appId, appName, token }: { appId: string; appName: string; token: string }) {
    const confirm = useConfirm();
    // The app lives in the account the portal is working in; its page is
    // under that account's short name when it has one.
    const accountSlug = useCurrentAccount()?.slug || undefined;
    const [phase, setPhase] = useState<Phase>('loading');
    const [status, setStatus] = useState<MonitorStatus | null>(null);
    const [services, setServices] = useState<MonitorService[]>([]);
    const [incidents, setIncidents] = useState<MonitorIncident[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setError(null);
        try {
            const [st, svcs, incs] = await Promise.all([
                getMonitorStatus(token, appId),
                listMonitorServices(token, appId),
                listMonitorIncidents(token, appId)
            ]);
            setStatus(st);
            setServices(svcs);
            setIncidents(incs);
            setPhase('on');
        } catch (e) {
            if (e instanceof MonitorError && e.status === 404) {
                setPhase('off');
            } else if (e instanceof MonitorError && (e.status === 401 || e.status === 403)) {
                setPhase('denied');
                setError(e.message);
            } else {
                setPhase('error');
                setError(e instanceof Error ? e.message : 'The monitor could not be reached.');
            }
        }
    }, [token, appId]);

    useEffect(() => { load(); }, [load]);

    async function handleEnable() {
        setBusy(true);
        setError(null);
        try {
            await enableMonitoring(token, appId);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Monitoring could not be turned on.');
        } finally {
            setBusy(false);
        }
    }

    async function handleVisibility(svc: MonitorService) {
        const next = svc.visibility === 'public' ? 'private' : 'public';
        const ok = await confirm(next === 'public'
            ? {
                title: `Publish the status page for ${svc.name}?`,
                body: 'Anyone with the link will see this app\'s uptime, its incidents and the updates your team writes on them. The change is recorded in the app\'s ledger.',
                confirmLabel: 'Publish'
            }
            : {
                title: `Make the status page for ${svc.name} private?`,
                body: 'The public page and its data will answer "not found". The change is recorded in the app\'s ledger, so hiding the page is itself on the record.',
                confirmLabel: 'Make private',
                danger: true
            });
        if (!ok) return;
        setBusy(true);
        setError(null);
        try {
            await setServiceVisibility(token, appId, svc, next);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The page could not be changed.');
        } finally {
            setBusy(false);
        }
    }

    const card = 'p-5 rounded-xl border border-black/10 dark:border-white/10';
    const errorBox = error && (
        <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>
    );

    if (phase === 'loading') {
        return <div className="text-sm text-black/50 dark:text-white/50">Asking the monitor… The first time, your wallet may ask you to approve a secure connection to it.</div>;
    }

    if (phase === 'off') {
        return (
            <section className={card}>
                <h2 className="text-sm font-semibold">Monitoring is off</h2>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                    Turn it on and the platform monitor checks every minute that this app answers at its address, records every reading in a signed ledger, and opens an incident when it stops answering. The status page stays private until you publish it.
                </p>
                {errorBox}
                <button type="button" onClick={handleEnable} disabled={busy}
                    className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40">
                    {busy ? 'Turning on…' : 'Turn on monitoring'}
                </button>
            </section>
        );
    }

    if (phase === 'denied' || phase === 'error') {
        return (
            <section className={card}>
                <h2 className="text-sm font-semibold">{phase === 'denied' ? 'The monitor did not let you in' : 'The monitor could not be reached'}</h2>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                    {phase === 'denied'
                        ? 'Your role on this app rides your sign-in. If you were added to the team recently, sign out and back in so your sign-in carries it.'
                        : 'It may be restarting. Try again in a minute.'}
                </p>
                {errorBox}
                <button type="button" onClick={load} className="mt-4 text-xs px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/15">Try again</button>
            </section>
        );
    }

    const summaries = new Map((status?.services ?? []).map(s => [s.id, s]));

    return (
        <div className="space-y-6">
            <section className={card}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-sm font-semibold">Status</h2>
                        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                            Checked every minute at the app&apos;s address. A new app&apos;s first check can take up to five minutes to appear.
                        </p>
                    </div>
                    <button type="button" onClick={load} disabled={busy} className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-black/15 dark:border-white/15 disabled:opacity-40">Refresh</button>
                </div>
                {errorBox}
                <ul className="mt-4 divide-y divide-black/10 dark:divide-white/10">
                    {services.map(svc => {
                        const sum = summaries.get(svc.id);
                        const ind = INDICATOR[sum?.indicator ?? 'none'] ?? INDICATOR.none;
                        const isPublic = svc.visibility === 'public';
                        return (
                            <li key={svc.id} className="py-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium flex items-center gap-2">
                                            <span className="truncate">{svc.name}</span>
                                            <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${ind.cls}`}>{ind.label}</span>
                                        </div>
                                        {sum?.headline && <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">{sum.headline}</div>}
                                        <div className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">
                                            {sum ? `${sum.components} component${sum.components === 1 ? '' : 's'} · ${sum.open_incidents} open incident${sum.open_incidents === 1 ? '' : 's'}` : 'No readings yet'}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => handleVisibility(svc)} disabled={busy}
                                        className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-black/15 dark:border-white/15 disabled:opacity-40">
                                        {isPublic ? 'Make private' : 'Publish status page'}
                                    </button>
                                </div>
                                {isPublic && (
                                    <div className="mt-2 text-xs">
                                        Public page:{' '}
                                        <a href={publicStatusPageUrl(appName, accountSlug)} target="_blank" rel="noopener noreferrer" className="underline break-all">
                                            {publicStatusPageUrl(appName, accountSlug)}
                                        </a>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                    {services.length === 0 && (
                        <li className="py-3 text-sm text-black/50 dark:text-white/50">Monitoring is on. The app&apos;s check appears here within five minutes.</li>
                    )}
                </ul>
            </section>

            <section className={card}>
                <h2 className="text-sm font-semibold">Recent incidents</h2>
                <ul className="mt-3 divide-y divide-black/10 dark:divide-white/10">
                    {incidents.map(inc => (
                        <li key={inc.id} className="py-2.5">
                            <div className="text-sm font-medium">{inc.title}</div>
                            <div className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">
                                {inc.status} · {inc.impact} · opened {when(inc.opened_at)}
                                {inc.resolved_at ? ` · resolved ${when(inc.resolved_at)}` : ''}
                                {inc.auto ? ' · opened by the monitor' : ''}
                            </div>
                        </li>
                    ))}
                    {incidents.length === 0 && (
                        <li className="py-2.5 text-sm text-black/50 dark:text-white/50">None.</li>
                    )}
                </ul>
                {status?.last_checkpoint && (
                    <p className="mt-4 text-[11px] text-black/40 dark:text-white/40">
                        Ledger checkpoint v{status.last_checkpoint.version}
                        {status.last_checkpoint.issued_at ? `, ${when(status.last_checkpoint.issued_at)}` : ''}.
                    </p>
                )}
            </section>
        </div>
    );
}
