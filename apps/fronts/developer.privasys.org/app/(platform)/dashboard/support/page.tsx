'use client';

// Support for the account's apps: one inbox of the requests open on every
// app, then the chosen app's desk (its conversations and who may file) and
// its support team.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { listTickets, MonitorError } from '~/lib/monitor';
import type { TicketRow } from '~/lib/monitor';
import { AppSupportTab, AccountSupportSettings } from '~/components/app-support-tab';
import { useCurrentAccount } from '~/components/account-context';
import { MonitorWait } from '~/components/monitor-wait';
import { SupportTeamSection } from '~/components/app-support-team';
import { AccountAppPicker, appFromAddress, useAccountApps } from '~/components/account-app-picker';

const OPEN = new Set(['new', 'triaged', 'assigned', 'in_progress', 'waiting']);

const STATUS_LABEL: Record<string, string> = {
    new: 'New', triaged: 'Triaged', assigned: 'Assigned', in_progress: 'In progress',
    waiting: 'Waiting', resolved: 'Resolved', closed: 'Closed'
};

interface InboxRow { appId: string; appName: string; row: TicketRow }

function when(unix: number): string {
    return new Date(unix * 1000).toLocaleString();
}

export default function SupportPage() {
    const { session } = useAuth();
    const token = session?.accessToken ?? '';
    const account = useCurrentAccount();
    const { apps, loading } = useAccountApps(token);
    const [appId, setAppId] = useState('');
    const [inbox, setInbox] = useState<InboxRow[] | null>(null);
    const [showClosed, setShowClosed] = useState(false);

    useEffect(() => {
        if (apps.length === 0) return;
        const wanted = appFromAddress();
        setAppId((cur) => cur || (apps.some((a) => a.id === wanted) ? wanted : apps[0].id));
    }, [apps]);

    // Every app's requests, one app at a time over the same channel
    // to the monitor. An app without monitoring has no desk and is skipped.
    const loadInbox = useCallback(async () => {
        if (!token || apps.length === 0) return;
        const rows: InboxRow[] = [];
        for (const a of apps) {
            try {
                const tickets = await listTickets(token, a.id);
                for (const row of tickets) rows.push({ appId: a.id, appName: a.display_name || a.name, row });
            } catch (e) {
                if (!(e instanceof MonitorError)) throw e;
            }
        }
        rows.sort((x, y) => y.row.ticket.updated_at - x.row.ticket.updated_at);
        setInbox(rows);
    }, [token, apps]);

    useEffect(() => { loadInbox().catch(() => setInbox([])); }, [loadInbox]);

    const shown = (inbox ?? []).filter((r) => showClosed || OPEN.has(r.row.ticket.status));

    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold">Support</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Requests to this account&apos;s apps, in one place. People file them on each app&apos;s support page with
                their Privasys Wallet; your team replies here.
            </p>

            {loading ? (
                <div className="mt-8 text-sm text-black/40 dark:text-white/40">Loading…</div>
            ) : apps.length === 0 ? (
                <div className="mt-8 text-sm text-black/50 dark:text-white/50">This account has no monitored apps yet.</div>
            ) : (
                <>
                    <section className="mt-8">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-lg font-medium">Inbox</h2>
                            <label className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
                                <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
                                Show resolved and closed
                            </label>
                        </div>
                        <div className="mt-3 rounded-xl border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10">
                            {inbox === null && (
                                <MonitorWait className="p-4 text-sm text-black/40 dark:text-white/40" />
                            )}
                            {inbox !== null && shown.length === 0 && (
                                <div className="p-4 text-sm text-black/50 dark:text-white/50">No open requests.</div>
                            )}
                            {shown.map(({ appId: id, appName, row }) => (
                                <button
                                    key={`${id}:${row.ticket.number}`}
                                    type="button"
                                    onClick={() => setAppId(id)}
                                    className="w-full text-left p-4 flex items-start gap-3 hover:bg-black/3 dark:hover:bg-white/5"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{row.ticket.subject}</div>
                                        <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                                            {appName} · T-{row.ticket.number} · {row.ticket.requester_name || 'requester'} · updated {when(row.ticket.updated_at)}
                                        </div>
                                    </div>
                                    <span className="shrink-0 px-2 py-0.5 rounded-full text-xs bg-black/5 dark:bg-white/10">
                                        {STATUS_LABEL[row.ticket.status] ?? row.ticket.status}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {account && token && (
                        <section className="mt-10">
                            <AccountSupportSettings accountId={account.id} token={token} />
                        </section>
                    )}

                    <section className="mt-10">
                        <h2 className="text-lg font-medium">One app</h2>
                        <p className="mt-1 mb-4 text-sm text-black/50 dark:text-white/50">
                            An app&apos;s requests, its support team, and settings of its own where it needs them.
                        </p>
                        <AccountAppPicker apps={apps} value={appId} onChange={setAppId} label="App" />
                        {appId && token && (
                            <div key={appId} className="mt-6 space-y-8">
                                <AppSupportTab appId={appId} token={token} />
                                <SupportTeamSection appId={appId} token={token} />
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
