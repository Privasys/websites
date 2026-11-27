'use client';

// The app's Support tab: the queue of tickets, one ticket's conversation,
// and how the app takes support requests.
//
// Tickets are kept on the app's sealed volume, outside the monitor's signed
// ledger, so they can be corrected and deleted. The monitor decides what
// each person may do from their platform token; this page only shows it.

import { useCallback, useEffect, useState } from 'react';
import {
    listTickets, getTicket, commentTicket, updateTicket, deleteTicket,
    getSupportSettings, saveSupportSettings, getOnCall, MonitorError,
    clearOwnSupportSettings, getAccountSupportSettings, saveAccountSupportSettings
} from '~/lib/monitor';
import type { TicketRow, TicketDetail, SupportSettings, TicketChange } from '~/lib/monitor';
import { useConfirm } from '~/components/confirm-dialog';
import { MonitorWait } from '~/components/monitor-wait';
import { useRetryWithRenewal } from '~/lib/privasys-auth';

const STATUS: Record<string, { label: string; cls: string }> = {
    new: { label: 'New', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
    triaged: { label: 'Triaged', cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
    assigned: { label: 'Assigned', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' },
    in_progress: { label: 'In progress', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    waiting: { label: 'Waiting on requester', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
    resolved: { label: 'Resolved', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
    closed: { label: 'Closed', cls: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60' }
};
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const card = 'p-5 rounded-xl border border-black/10 dark:border-white/10';
const input = 'mt-1 w-full px-3 py-2 text-sm rounded-lg border border-black/15 dark:border-white/15 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';
const label = 'block text-xs font-medium text-black/60 dark:text-white/60';
const primary = 'px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40';
const secondary = 'px-3 py-2 text-sm rounded-lg border border-black/15 dark:border-white/15 disabled:opacity-40';
const errorBox = 'mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300';

function when(unix: number): string {
    return new Date(unix * 1000).toLocaleString();
}

function message(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

function Status({ status }: { status: string }) {
    const s = STATUS[status] ?? STATUS.new;
    return <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${s.cls}`}>{s.label}</span>;
}

type Person = { sub: string; name?: string };

export function AppSupportTab({ appId, token }: { appId: string; token: string }) {
    const [settings, setSettings] = useState<SupportSettings | null>(null);
    const [canManage, setCanManage] = useState(false);
    const [canRespond, setCanRespond] = useState(false);
    const [own, setOwn] = useState(true);
    const [inherits, setInherits] = useState(false);
    const [rows, setRows] = useState<TicketRow[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [open, setOpen] = useState<number | null>(null);
    const [filter, setFilter] = useState('active');
    const [error, setError] = useState<string | null>(null);
    const [off, setOff] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const { attempt, retry } = useRetryWithRenewal();

    const load = useCallback(async () => {
        try {
            const [cfg, list] = await Promise.all([getSupportSettings(token, appId), listTickets(token, appId)]);
            setSettings(cfg.settings);
            setCanManage(cfg.can_manage);
            setCanRespond(cfg.can_respond);
            setOwn(cfg.own ?? true);
            setInherits(cfg.inherits_account ?? false);
            setRows(list);
            setError(null);
            setOff(false);
        } catch (e) {
            if (e instanceof MonitorError && e.status === 404) setOff(true);
            else setError(message(e, 'The monitor could not be reached.'));
        } finally {
            setLoaded(true);
        }
    }, [token, appId]);

    useEffect(() => { load(); }, [load, attempt]);
    useEffect(() => {
        getOnCall(token, appId).then(o => setPeople(o.team ?? [])).catch(() => setPeople([]));
    }, [token, appId]);

    if (off) {
        return (
            <section className={card}>
                <h2 className="text-sm font-semibold">Monitoring is off</h2>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">Turn monitoring on in the Status tab first. The support desk comes with it.</p>
            </section>
        );
    }
    if (!loaded) return <MonitorWait className="text-sm text-black/50 dark:text-white/50" />;
    if (!settings) {
        return (
            <section className={card}>
                <h2 className="text-sm font-semibold">The support desk could not be loaded</h2>
                {error && <div className={errorBox}>{error}</div>}
                <button type="button" onClick={retry} className={`mt-4 ${secondary}`}>Try again</button>
            </section>
        );
    }

    const nameOf = (sub?: string) => (sub ? people.find(p => p.sub === sub)?.name || sub : '');

    if (open !== null) {
        return (
            <Ticket appId={appId} token={token} number={open} settings={settings} people={people} nameOf={nameOf}
                canRespond={canRespond} canManage={canManage} onBack={() => { setOpen(null); load(); }} />
        );
    }

    const shown = rows.filter(r => {
        if (filter === 'active') return r.ticket.status !== 'resolved' && r.ticket.status !== 'closed';
        if (filter === 'done') return r.ticket.status === 'resolved' || r.ticket.status === 'closed';
        return true;
    });

    return (
        <div className="space-y-6">
            <section className={card}>
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-sm font-semibold">Tickets</h2>
                    <div className="flex items-center gap-2">
                        <select aria-label="Which tickets" value={filter} onChange={e => setFilter(e.target.value)}
                            className="text-xs px-2 py-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent">
                            <option value="active">Open</option>
                            <option value="done">Resolved and closed</option>
                            <option value="all">All</option>
                        </select>
                        <button type="button" onClick={load} className="text-xs px-2.5 py-1 rounded-lg border border-black/15 dark:border-white/15">Refresh</button>
                    </div>
                </div>
                {error && <div className={errorBox}>{error}</div>}
                <ul className="mt-3 divide-y divide-black/10 dark:divide-white/10">
                    {shown.map(({ ticket: t, due, comments }) => (
                        <li key={t.number}>
                            <button type="button" onClick={() => setOpen(t.number)} className="w-full text-left py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                                <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                                    <span className="text-black/40 dark:text-white/40">T-{t.number}</span>
                                    <span className="min-w-0 truncate">{t.subject}</span>
                                    <Status status={t.status} />
                                    {t.priority !== 'normal' && <span className="text-[10px] uppercase tracking-wide text-black/50 dark:text-white/50">{t.priority}</span>}
                                    {(due?.first_response_breached || due?.resolution_breached) && t.status !== 'closed' && t.status !== 'resolved' && (
                                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Past target</span>
                                    )}
                                </div>
                                <div className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">
                                    {t.requester_name || t.requester} · {when(t.updated_at)} · {comments} repl{comments === 1 ? 'y' : 'ies'}
                                    {t.assignee ? ` · ${nameOf(t.assignee)}` : ' · unassigned'}
                                </div>
                            </button>
                        </li>
                    ))}
                    {shown.length === 0 && <li className="py-3 text-sm text-black/50 dark:text-white/50">No tickets here.</li>}
                </ul>
            </section>
            <Settings key={`${own}:${inherits}`} scope="app" settings={settings} canManage={canManage}
                save={(s) => saveSupportSettings(token, appId, s)}
                onSaved={(s) => { setSettings(s); load(); }}
                own={own} inherits={inherits}
                onUseAccount={async () => { await clearOwnSupportSettings(token, appId); await load(); }} />
        </div>
    );
}

function Ticket({ appId, token, number, settings, people, nameOf, canRespond, canManage, onBack }: {
    appId: string; token: string; number: number; settings: SupportSettings; people: Person[];
    nameOf: (_s?: string) => string; canRespond: boolean; canManage: boolean; onBack: () => void;
}) {
    const confirm = useConfirm();
    const [data, setData] = useState<TicketDetail | null>(null);
    const [reply, setReply] = useState('');
    const [internal, setInternal] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getTicket(token, appId, number).then(setData).catch(e => setError(message(e, 'The ticket could not be loaded.')));
    }, [token, appId, number]);

    async function run(action: () => Promise<TicketDetail | void>) {
        setBusy(true);
        setError(null);
        try {
            const next = await action();
            if (next) setData(next);
            return true;
        } catch (e) {
            setError(message(e, 'That could not be saved.'));
            return false;
        } finally {
            setBusy(false);
        }
    }

    const change = (c: TicketChange) => run(() => updateTicket(token, appId, number, c));

    async function send() {
        const ok = await run(() => commentTicket(token, appId, number, reply, internal));
        if (ok) { setReply(''); setInternal(false); }
    }

    async function remove() {
        if (!(await confirm({
            title: `Delete T-${number}?`,
            body: 'The ticket and every reply on it are deleted for good.',
            confirmLabel: 'Delete', danger: true
        }))) return;
        if (await run(() => deleteTicket(token, appId, number))) onBack();
    }

    const back = <button type="button" onClick={onBack} className="text-sm text-black/50 dark:text-white/50 hover:underline">&larr; All tickets</button>;
    if (!data) return <div className="space-y-3">{back}{error ? <div className={errorBox}>{error}</div> : <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>}</div>;
    const t = data.ticket;
    const select = 'mt-1 w-full px-2 py-1.5 text-sm rounded-lg border border-black/15 dark:border-white/15 bg-transparent disabled:opacity-50';

    return (
        <div className="space-y-4">
            {back}
            <section className={card}>
                <div className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                    <span className="text-black/40 dark:text-white/40">T-{t.number}</span>
                    <span>{t.subject}</span>
                    <Status status={t.status} />
                </div>
                <div className="text-[11px] text-black/50 dark:text-white/50 mt-1">
                    {t.requester_name || t.requester} · {when(t.created_at)}{t.category ? ` · ${t.category}` : ''}
                </div>
                <p className="mt-3 text-sm whitespace-pre-wrap break-words">{t.body}</p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className={label} htmlFor="t-status">Status</label>
                        <select id="t-status" value={t.status} disabled={!canRespond || busy} onChange={e => change({ status: e.target.value })} className={select}>
                            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={label} htmlFor="t-priority">Priority</label>
                        <select id="t-priority" value={t.priority} disabled={!canRespond || busy} onChange={e => change({ priority: e.target.value })} className={select}>
                            {PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={label} htmlFor="t-assignee">Assigned to</label>
                        <select id="t-assignee" value={t.assignee ?? ''} disabled={!canRespond || busy} onChange={e => change({ assignee: e.target.value })} className={select}>
                            <option value="">Nobody</option>
                            {people.map(p => <option key={p.sub} value={p.sub}>{p.name || p.sub}</option>)}
                        </select>
                    </div>
                </div>
                {settings.categories && settings.categories.length > 0 && (
                    <div className="mt-3 sm:w-1/3">
                        <label className={label} htmlFor="t-category">Category</label>
                        <select id="t-category" value={t.category ?? ''} disabled={!canRespond || busy} onChange={e => change({ category: e.target.value })} className={select}>
                            <option value="">None</option>
                            {settings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
                {data.due && t.status !== 'closed' && t.status !== 'resolved' && (
                    <p className={`mt-3 text-[11px] ${data.due.first_response_breached || data.due.resolution_breached ? 'text-red-700 dark:text-red-300' : 'text-black/50 dark:text-white/50'}`}>
                        {t.first_response_at ? 'Answered.' : `First reply due ${when(data.due.first_response_by)}.`} Resolution due {when(data.due.resolution_by)}.
                    </p>
                )}
            </section>

            <section className={card}>
                <h3 className="text-sm font-semibold">Conversation</h3>
                <ul className="mt-3 space-y-3">
                    {(t.comments ?? []).map(c => (
                        <li key={c.id} className={`p-3 rounded-lg text-sm ${c.internal ? 'bg-amber-50 dark:bg-amber-900/15' : 'bg-black/[0.03] dark:bg-white/[0.04]'}`}>
                            <div className="text-[11px] text-black/50 dark:text-white/50">
                                {c.author_name || nameOf(c.author)} · {when(c.at)}{c.internal ? ' · internal note' : ''}
                            </div>
                            <p className="mt-1 whitespace-pre-wrap break-words">{c.body}</p>
                        </li>
                    ))}
                    {(t.comments ?? []).length === 0 && <li className="text-sm text-black/50 dark:text-white/50">No replies yet.</li>}
                </ul>
                {canRespond && (
                    <div className="mt-4">
                        <label className={label} htmlFor="t-reply">Reply</label>
                        <textarea id="t-reply" rows={4} value={reply} onChange={e => setReply(e.target.value)} className={input} />
                        <label className="mt-2 flex items-center gap-2 text-xs">
                            <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} />
                            Internal note: the requester will not see this
                        </label>
                        <button type="button" onClick={send} disabled={busy || !reply.trim()} className={`mt-3 ${primary}`}>
                            {busy ? 'Sending…' : internal ? 'Add note' : 'Send reply'}
                        </button>
                    </div>
                )}
                {error && <div className={errorBox}>{error}</div>}
            </section>

            {data.ticket.events && data.ticket.events.length > 0 && (
                <details className={card}>
                    <summary className="text-sm font-semibold cursor-pointer">History</summary>
                    <ol className="mt-2 space-y-1">
                        {data.ticket.events.map((e, i) => (
                            <li key={i} className="text-[11px] text-black/60 dark:text-white/60">
                                {when(e.at)} · {e.what}{e.detail ? `: ${e.what === 'assigned' ? nameOf(e.detail) : e.detail}` : ''}{e.actor ? ` · ${nameOf(e.actor)}` : ''}
                            </li>
                        ))}
                    </ol>
                </details>
            )}
            {canManage && <button type="button" onClick={remove} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-700 dark:border-red-900/50 dark:text-red-400 disabled:opacity-40">Delete ticket</button>}
        </div>
    );
}

/** The account's support settings: every app of the account whose team set none of its own runs on them. */
export function AccountSupportSettings({ accountId, token }: { accountId: string; token: string }) {
    const [data, setData] = useState<{ settings: SupportSettings; set: boolean; can_manage: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setData(await getAccountSupportSettings(token, accountId));
            setError(null);
        } catch (e) {
            setError(message(e, 'The monitor could not be reached.'));
        }
    }, [token, accountId]);

    useEffect(() => { load(); }, [load]);

    if (!data) {
        return error
            ? <section className={card}><h2 className="text-sm font-semibold">Account settings</h2><div className={errorBox}>{error}</div></section>
            : <MonitorWait className="text-sm text-black/50 dark:text-white/50" />;
    }
    return (
        <Settings key={String(data.set)} scope="account" settings={data.settings} canManage={data.can_manage}
            save={(s) => saveAccountSupportSettings(token, accountId, s)} onSaved={() => load()} accountSet={data.set} />
    );
}

function Settings({ scope, settings, canManage, save, onSaved, own, inherits, onUseAccount, accountSet }: {
    scope: 'app' | 'account';
    settings: SupportSettings;
    canManage: boolean;
    save: (_s: SupportSettings) => Promise<unknown>;
    onSaved: (_s: SupportSettings) => void;
    /** For an app: its team set settings of its own. */
    own?: boolean;
    /** For an app: it runs on its account's settings. */
    inherits?: boolean;
    onUseAccount?: () => Promise<void>;
    /** For the account: its admins set its settings. */
    accountSet?: boolean;
}) {
    const [intake, setIntake] = useState(settings.intake);
    const [categories, setCategories] = useState((settings.categories ?? []).join(', '));
    const [perHour, setPerHour] = useState(settings.tickets_per_hour);
    const [perDay, setPerDay] = useState(settings.tickets_per_day);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setBusy(true);
        setError(null);
        setNote(null);
        try {
            const next: SupportSettings = {
                ...settings, intake, tickets_per_hour: perHour, tickets_per_day: perDay,
                categories: categories.split(',').map(c => c.trim()).filter(Boolean)
            };
            await save(next);
            onSaved(next);
            setNote('Saved.');
        } catch (e) {
            setError(message(e, 'The settings could not be saved.'));
        } finally {
            setBusy(false);
        }
    }

    async function useAccount() {
        if (!onUseAccount) return;
        setBusy(true);
        setError(null);
        try {
            await onUseAccount();
        } catch (e) {
            setError(message(e, 'The app could not be moved back to the account\'s settings.'));
            setBusy(false);
        }
    }

    return (
        <section className={card}>
            <h2 className="text-sm font-semibold">{scope === 'account' ? 'Account settings' : 'Who can open tickets'}</h2>
            {scope === 'account' && (
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                    {accountSet
                        ? 'Every app of the account runs its desk on these, unless its own settings are set below.'
                        : 'Not set yet: each app keeps its own settings, and an app without any takes no requests. Save to cover every app without its own.'}
                </p>
            )}
            {scope === 'app' && inherits && (
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                    This app uses the account&apos;s settings. Saving here gives it settings of its own.
                </p>
            )}
            {scope === 'app' && own && (
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                    This app has settings of its own, in place of the account&apos;s.
                </p>
            )}
            <div className="mt-3 space-y-3">
                <div>
                    <label className={label} htmlFor="s-intake">Support requests</label>
                    <select id="s-intake" value={intake} disabled={!canManage} onChange={e => setIntake(e.target.value as SupportSettings['intake'])} className={input}>
                        <option value="off">Off</option>
                        <option value="team">{scope === 'account' ? 'Each app\'s team only' : 'This app\'s team only'}</option>
                        <option value="public">Anyone signed in with the Privasys Wallet</option>
                    </select>
                </div>
                <div>
                    <label className={label} htmlFor="s-cats">Categories (comma-separated, optional)</label>
                    <input id="s-cats" value={categories} disabled={!canManage} onChange={e => setCategories(e.target.value)} placeholder="Billing, Sign-in, Bug" className={input} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={label} htmlFor="s-hour">Tickets per person, per hour</label>
                        <input id="s-hour" type="number" min={1} value={perHour} disabled={!canManage} onChange={e => setPerHour(Number(e.target.value))} className={input} />
                    </div>
                    <div>
                        <label className={label} htmlFor="s-day">Tickets per person, per day</label>
                        <input id="s-day" type="number" min={1} value={perDay} disabled={!canManage} onChange={e => setPerDay(Number(e.target.value))} className={input} />
                    </div>
                </div>
            </div>
            {error && <div className={errorBox}>{error}</div>}
            {note && <div className="mt-3 text-xs text-black/60 dark:text-white/60">{note}</div>}
            {canManage ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={submit} disabled={busy} className={primary}>{busy ? 'Saving…' : 'Save'}</button>
                    {scope === 'app' && own && onUseAccount && (
                        <button type="button" onClick={useAccount} disabled={busy} className={secondary}>Use the account&apos;s settings</button>
                    )}
                </div>
            ) : (
                <p className="mt-3 text-xs text-black/50 dark:text-white/50">
                    {scope === 'account' ? 'The account\'s admins change these.' : 'The app\'s owners, admins and support admins change these.'}
                </p>
            )}
        </section>
    );
}
