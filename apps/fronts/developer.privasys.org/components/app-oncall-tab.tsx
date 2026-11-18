'use client';

// The app's On-call tab: how each person wants to be alerted, who is on
// call, and what happened to each outage.
//
// A person's choices are their own. The monitor keeps them apart from its
// signed ledger so they can be changed or removed, and it decides who may
// do what from the person's platform token.

import { useCallback, useEffect, useState } from 'react';
import {
    getOnCall, saveMyAlerts, forgetMyAlerts, saveOnCallPlan, sendTestAlert, takePage, MonitorError
} from '~/lib/monitor';
import type { OnCallOverview, AlertPreference, OnCallPlan, OnCallPage } from '~/lib/monitor';
import { useConfirm } from '~/components/confirm-dialog';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PAGE_STATE: Record<string, { label: string; cls: string }> = {
    open: { label: 'Waiting for someone', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    taken: { label: 'Taken', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    resolved: { label: 'Resolved', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
    exhausted: { label: 'Nobody took it', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' }
};

const STEP: Record<string, string> = {
    opened: 'Outage detected',
    wallet_sent: 'Sent to wallet',
    wallet_failed: 'Wallet delivery failed',
    email_sent: 'Email sent',
    email_failed: 'Email failed',
    no_answer: 'No answer in time',
    nobody_reached: 'Nobody could be reached at this level',
    all_declined: 'Everyone at this level declined',
    declined: 'Declined',
    escalated: 'Passed to the next level',
    taken: 'Taken',
    resolved: 'Recovered',
    exhausted: 'Every level was tried',
    team_unavailable: 'The team list could not be read'
};

const card = 'p-5 rounded-xl border border-black/10 dark:border-white/10';
const input = 'mt-1 w-full px-3 py-2 text-sm rounded-lg border border-black/15 dark:border-white/15 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';
const label = 'block text-xs font-medium text-black/60 dark:text-white/60';
const primary = 'px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40';
const secondary = 'px-3 py-2 text-sm rounded-lg border border-black/15 dark:border-white/15 disabled:opacity-40';

function when(unix: number): string {
    return new Date(unix * 1000).toLocaleString();
}

function browserZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

export function AppOnCallTab({ appId, token }: { appId: string; token: string }) {
    const [data, setData] = useState<OnCallOverview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [off, setOff] = useState(false);

    const load = useCallback(async () => {
        try {
            setData(await getOnCall(token, appId));
            setError(null);
            setOff(false);
        } catch (e) {
            if (e instanceof MonitorError && e.status === 404) setOff(true);
            else setError(e instanceof Error ? e.message : 'The monitor could not be reached.');
        }
    }, [token, appId]);

    useEffect(() => { load(); }, [load]);

    if (off) {
        return (
            <section className={card}>
                <h2 className="text-sm font-semibold">Monitoring is off</h2>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">Turn monitoring on in the Status tab first. On-call alerts follow from it.</p>
            </section>
        );
    }
    if (error && !data) {
        return (
            <section className={card}>
                <h2 className="text-sm font-semibold">The monitor could not be reached</h2>
                <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>
                <button type="button" onClick={load} className={`mt-4 ${secondary}`}>Try again</button>
            </section>
        );
    }
    if (!data) {
        return <div className="text-sm text-black/50 dark:text-white/50">Asking the monitor…</div>;
    }

    const nameOf = (sub: string) => data.team?.find(m => m.sub === sub)?.name || sub;

    return (
        <div className="space-y-6">
            <MyAlerts key={data.me.updated_at ?? 0} appId={appId} token={token} me={data.me} onSaved={load} />
            <Rota appId={appId} token={token} data={data} nameOf={nameOf} onSaved={load} />
            <Pages appId={appId} token={token} pages={data.pages ?? []} nameOf={nameOf} onChanged={load} />
        </div>
    );
}

function MyAlerts({ appId, token, me, onSaved }: { appId: string; token: string; me: AlertPreference; onSaved: () => void }) {
    const confirm = useConfirm();
    const window0 = me.weekly?.[0];
    const [wallet, setWallet] = useState(me.wallet);
    const [email, setEmail] = useState(me.email ?? '');
    const [mode, setMode] = useState(me.when);
    const [days, setDays] = useState<number[]>(window0?.days ?? [1, 2, 3, 4, 5]);
    const [from, setFrom] = useState(window0?.from ?? '09:00');
    const [to, setTo] = useState(window0?.to ?? '17:00');
    const [zone] = useState(me.timezone && me.timezone !== 'UTC' ? me.timezone : browserZone());
    const [awayFrom, setAwayFrom] = useState(me.away?.[0]?.from ?? '');
    const [awayTo, setAwayTo] = useState(me.away?.[0]?.to ?? '');
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function run(action: () => Promise<void>) {
        setBusy(true);
        setError(null);
        setNote(null);
        try {
            await action();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'That could not be saved.');
        } finally {
            setBusy(false);
        }
    }

    const save = () => run(async () => {
        await saveMyAlerts(token, appId, {
            wallet, email: email.trim() || undefined, when: mode, timezone: zone,
            weekly: mode === 'schedule' ? [{ days, from, to }] : undefined,
            away: awayFrom && awayTo ? [{ from: awayFrom, to: awayTo }] : undefined
        });
        setNote('Saved.');
        onSaved();
    });

    const test = () => run(async () => {
        const results = await sendTestAlert(token, appId);
        const parts = Object.entries(results).map(([k, v]) => `${k === 'wallet' ? 'Wallet' : 'Email'}: ${v}`);
        setNote(parts.length ? parts.join(' · ') : 'Choose a channel and save first.');
    });

    async function forget() {
        if (!(await confirm({
            title: 'Remove your alert settings?',
            body: 'Your email address and hours are deleted from the monitor. You go back to wallet alerts while on call.',
            confirmLabel: 'Remove', danger: true
        }))) return;
        await run(async () => { await forgetMyAlerts(token, appId); onSaved(); });
    }

    return (
        <section className={card}>
            <h2 className="text-sm font-semibold">My alerts</h2>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">How this app&apos;s outages reach you. Only you can change this.</p>

            <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={wallet} onChange={e => setWallet(e.target.checked)} />
                    Privasys Wallet notification
                </label>
                <div>
                    <label className={label} htmlFor="alert-email">Email (optional)</label>
                    <input id="alert-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
                </div>
                <div>
                    <label className={label} htmlFor="alert-when">When</label>
                    <select id="alert-when" value={mode} onChange={e => setMode(e.target.value as AlertPreference['when'])} className={input}>
                        <option value="on_call">Only while I am on call</option>
                        <option value="always">Always</option>
                        <option value="schedule">During set hours</option>
                    </select>
                </div>
                {mode === 'schedule' && (
                    <div className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] space-y-3">
                        <div className="flex flex-wrap gap-3">
                            {DAYS.map((d, i) => (
                                <label key={d} className="flex items-center gap-1 text-xs">
                                    <input type="checkbox" checked={days.includes(i)}
                                        onChange={e => setDays(e.target.checked ? [...days, i].sort() : days.filter(x => x !== i))} />
                                    {d}
                                </label>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={label} htmlFor="alert-from">From</label>
                                <input id="alert-from" type="time" value={from} onChange={e => setFrom(e.target.value)} className={input} />
                            </div>
                            <div>
                                <label className={label} htmlFor="alert-to">To</label>
                                <input id="alert-to" type="time" value={to} onChange={e => setTo(e.target.value)} className={input} />
                            </div>
                        </div>
                        <p className="text-[11px] text-black/40 dark:text-white/40">Times are in {zone}.</p>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={label} htmlFor="away-from">Away from</label>
                        <input id="away-from" type="date" value={awayFrom} onChange={e => setAwayFrom(e.target.value)} className={input} />
                    </div>
                    <div>
                        <label className={label} htmlFor="away-to">Away until</label>
                        <input id="away-to" type="date" value={awayTo} onChange={e => setAwayTo(e.target.value)} className={input} />
                    </div>
                </div>
            </div>

            {error && <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {note && <div className="mt-3 text-xs text-black/60 dark:text-white/60">{note}</div>}

            <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={save} disabled={busy} className={primary}>{busy ? 'Working…' : 'Save'}</button>
                <button type="button" onClick={test} disabled={busy} className={secondary}>Send me a test</button>
                <button type="button" onClick={forget} disabled={busy} className={secondary}>Remove my settings</button>
            </div>
        </section>
    );
}

function Rota({ appId, token, data, nameOf, onSaved }: {
    appId: string; token: string; data: OnCallOverview; nameOf: (_s: string) => string; onSaved: () => void;
}) {
    const responders = (data.team ?? []).filter(m => m.role !== 'viewer' && m.role !== 'support-viewer');
    const [rotation, setRotation] = useState<string[]>(data.plan.rotation ?? []);
    const [period, setPeriod] = useState(data.plan.period_days || 7);
    const [ack, setAck] = useState(data.plan.ack_minutes || 10);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save() {
        setBusy(true);
        setError(null);
        try {
            const plan: OnCallPlan = {
                ...data.plan, rotation, period_days: rotation.length ? period : 0, ack_minutes: ack,
                start_at: data.plan.start_at || Math.floor(Date.now() / 1000)
            };
            await saveOnCallPlan(token, appId, plan);
            onSaved();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The rota could not be saved.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className={card}>
            <h2 className="text-sm font-semibold">On-call rota</h2>
            <p className="mt-1 text-sm">
                {data.on_call ? <>On call now: <span className="font-medium">{nameOf(data.on_call)}</span></> : 'Nobody is on call. An outage goes straight to the whole team.'}
            </p>
            {data.team_error && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{data.team_error}</p>}
            {data.can_manage ? (
                <div className="mt-4 space-y-3">
                    <div>
                        <span className={label}>Takes turns, in this order</span>
                        <ul className="mt-1 space-y-1">
                            {responders.map(m => (
                                <li key={m.sub}>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={rotation.includes(m.sub)}
                                            onChange={e => setRotation(e.target.checked ? [...rotation, m.sub] : rotation.filter(s => s !== m.sub))} />
                                        <span className="truncate">{m.name || m.sub}</span>
                                        {rotation.includes(m.sub) && <span className="text-[11px] text-black/40 dark:text-white/40">#{rotation.indexOf(m.sub) + 1}</span>}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={label} htmlFor="rota-period">Changes hands every</label>
                            <select id="rota-period" value={period} onChange={e => setPeriod(Number(e.target.value))} className={input}>
                                <option value={1}>Day</option>
                                <option value={7}>Week</option>
                                <option value={14}>Two weeks</option>
                            </select>
                        </div>
                        <div>
                            <label className={label} htmlFor="rota-ack">Time to respond (minutes)</label>
                            <input id="rota-ack" type="number" min={1} max={240} value={ack} onChange={e => setAck(Number(e.target.value))} className={input} />
                        </div>
                    </div>
                    <p className="text-[11px] text-black/40 dark:text-white/40">If nobody takes an outage in that time it passes to the whole team, then to the app&apos;s owners and admins.</p>
                    {error && <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
                    <button type="button" onClick={save} disabled={busy} className={primary}>{busy ? 'Saving…' : 'Save rota'}</button>
                </div>
            ) : (
                <p className="mt-2 text-xs text-black/50 dark:text-white/50">The app&apos;s owners, admins and support admins manage the rota.</p>
            )}
        </section>
    );
}

function Pages({ appId, token, pages, nameOf, onChanged }: {
    appId: string; token: string; pages: OnCallPage[]; nameOf: (_s: string) => string; onChanged: () => void;
}) {
    const [error, setError] = useState<string | null>(null);

    async function take(id: string) {
        setError(null);
        try {
            await takePage(token, appId, id);
            onChanged();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The outage could not be taken.');
        }
    }

    return (
        <section className={card}>
            <h2 className="text-sm font-semibold">Alert history</h2>
            {error && <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            <ul className="mt-3 divide-y divide-black/10 dark:divide-white/10">
                {pages.map(p => {
                    const st = PAGE_STATE[p.state] ?? PAGE_STATE.open;
                    return (
                        <li key={p.id} className="py-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                                        <span>{p.component}</span>
                                        <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${st.cls}`}>{st.label}</span>
                                    </div>
                                    <div className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">
                                        {when(p.opened_at)}{p.taken_by ? ` · taken by ${nameOf(p.taken_by)}` : ''}
                                    </div>
                                </div>
                                {(p.state === 'open' || p.state === 'exhausted') && (
                                    <button type="button" onClick={() => take(p.id)} className={secondary}>Take it</button>
                                )}
                            </div>
                            <details className="mt-2">
                                <summary className="text-xs cursor-pointer text-black/50 dark:text-white/50">What happened</summary>
                                <ol className="mt-2 space-y-1">
                                    {(p.history ?? []).map((e, i) => (
                                        <li key={i} className="text-[11px] text-black/60 dark:text-white/60">
                                            {new Date(e.at * 1000).toLocaleTimeString()} · {STEP[e.what] ?? e.what}
                                            {e.sub ? ` · ${nameOf(e.sub)}` : ''}
                                            {e.detail ? ` · ${e.detail}` : ''}
                                        </li>
                                    ))}
                                </ol>
                            </details>
                        </li>
                    );
                })}
                {pages.length === 0 && <li className="py-2.5 text-sm text-black/50 dark:text-white/50">No alerts yet.</li>}
            </ul>
        </section>
    );
}
