'use client';

// Status & support: the account's public status and support pages, and
// which of its apps are watched, published and listed on them.
//
// Three facts per app, held in two places. Whether an app is monitored and
// whether its status page is public are the monitor's (each app has its
// own monitor there). Whether the app is listed on the account's pages is
// the control plane's, with the account's short name. The portal shows
// them together and decides nothing: each side checks the caller's role.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '~/lib/privasys-auth';
import { getAccount, updateAccount, listApps, getStatusListing, setStatusListing } from '~/lib/api';
import type { Account, AccountRole } from '~/lib/api';
import type { App } from '~/lib/types';
import {
    enableMonitoring, listMonitorServices, setServiceVisibility, publicStatusPageUrl,
    accountPagesUrls, MonitorError
} from '~/lib/monitor';
import type { MonitorService } from '~/lib/monitor';
import { useConfirm } from '~/components/confirm-dialog';

const STATUS_SERVICE_ID = 'svc-app';

interface Row {
    app: App;
    // undefined while loading; null when the monitor could not say.
    monitored?: boolean | null;
    service?: MonitorService | null;
    listed?: boolean;
    canList?: boolean;
    error?: string;
}

export default function StatusAndSupportPage() {
    const { session } = useAuth();
    const token = session?.accessToken ?? '';
    const confirm = useConfirm();
    const [account, setAccount] = useState<Account | null>(null);
    const [role, setRole] = useState<AccountRole | ''>('');
    const [slug, setSlug] = useState('');
    const [savingSlug, setSavingSlug] = useState(false);
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isAdmin = role === 'admin';

    const patchRow = (id: string, patch: Partial<Row>) =>
        setRows((rs) => rs.map((r) => (r.app.id === id ? { ...r, ...patch } : r)));

    const loadRow = useCallback(async (app: App) => {
        if (!token) return;
        try {
            const l = await getStatusListing(token, app.id);
            patchRow(app.id, { listed: l.listed, canList: l.can_manage });
        } catch {
            patchRow(app.id, { listed: false, canList: false });
        }
        try {
            const svcs = await listMonitorServices(token, app.id);
            patchRow(app.id, { monitored: true, service: svcs.find((s) => s.id === STATUS_SERVICE_ID) ?? svcs[0] ?? null });
        } catch (e) {
            if (e instanceof MonitorError && e.status === 404) {
                patchRow(app.id, { monitored: false, service: null });
            } else {
                patchRow(app.id, { monitored: null, error: e instanceof Error ? e.message : 'The monitor could not be reached.' });
            }
        }
    }, [token]);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            const [acc, apps] = await Promise.all([getAccount(token), listApps(token)]);
            setAccount(acc.account);
            setRole(acc.role);
            setSlug(acc.account.slug ?? '');
            const sorted = [...apps].sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name));
            setRows(sorted.map((app) => ({ app })));
            setLoading(false);
            // One app at a time: each asks the monitor over the same sealed
            // session, and the first may need the wallet to approve it.
            for (const app of sorted) await loadRow(app);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
            setLoading(false);
        }
    }, [token, loadRow]);

    useEffect(() => { load(); }, [load]);

    function flash(msg: string) {
        setSuccess(msg);
        setTimeout(() => setSuccess(''), 3000);
    }

    async function saveSlug() {
        setSavingSlug(true);
        setError('');
        try {
            const { account: updated } = await updateAccount(token, { slug: slug.trim().toLowerCase() });
            setAccount(updated);
            setSlug(updated.slug ?? '');
            flash(updated.slug ? 'Your pages have their address.' : 'The short name was removed.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The short name could not be saved.');
        } finally {
            setSavingSlug(false);
        }
    }

    async function turnOn(row: Row) {
        setError('');
        try {
            await enableMonitoring(token, row.app.id);
            await loadRow(row.app);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Monitoring could not be turned on.');
        }
    }

    async function togglePublic(row: Row) {
        const svc = row.service;
        if (!svc) return;
        const next = svc.visibility === 'public' ? 'private' : 'public';
        const ok = await confirm(next === 'public'
            ? {
                title: `Publish the status page for ${svc.name}?`,
                body: 'Anyone with the link will see this app\'s uptime, its incidents and the updates your team writes on them. The change is recorded in the app\'s ledger.',
                confirmLabel: 'Publish'
            }
            : {
                title: `Make the status page for ${svc.name} private?`,
                body: 'The public page and its data will answer "not found". The change is recorded in the app\'s ledger.',
                confirmLabel: 'Make private',
                danger: true
            });
        if (!ok) return;
        setError('');
        try {
            await setServiceVisibility(token, row.app.id, svc, next);
            await loadRow(row.app);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The page could not be changed.');
        }
    }

    async function toggleListed(row: Row) {
        setError('');
        try {
            const r = await setStatusListing(token, row.app.id, !row.listed);
            patchRow(row.app.id, { listed: r.listed });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The listing could not be changed.');
        }
    }

    const pages = account?.slug ? accountPagesUrls(account.slug) : null;
    const input = 'mt-1 w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent disabled:opacity-60';
    const primary = 'px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50';
    const small = 'px-2.5 py-1 text-xs font-medium rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50';
    const pill = (on: boolean) => `inline-block px-2 py-0.5 rounded-full text-xs font-medium ${on
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
        : 'bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50'}`;

    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold">Status &amp; support</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Your apps&apos; public status and support pages. Each app you monitor is watched from
                inside a confidential VM, and its status page can be checked by anyone against a signed
                ledger. Choose which apps your pages list.
            </p>

            {error && <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {success && <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}

            {loading ? (
                <div className="mt-8 text-sm text-black/40 dark:text-white/40">Loading…</div>
            ) : (
                <>
                    <section className="mt-10">
                        <h2 className="text-lg font-medium">Your pages</h2>
                        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                            {isAdmin
                                ? 'Choose a short name for your account. Your status and support pages, and each listed app\'s page, live under it.'
                                : 'Only account admins can choose the short name.'}
                        </p>
                        <div className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-4">
                            <label className="block max-w-sm">
                                <span className="text-xs font-medium text-black/50 dark:text-white/50">Short name</span>
                                <input
                                    type="text"
                                    value={slug}
                                    disabled={!isAdmin}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="your-company"
                                    maxLength={32}
                                    className={input}
                                />
                                <span className="mt-1 block text-xs text-black/40 dark:text-white/40">
                                    3 to 32 lowercase letters, digits or single hyphens.
                                </span>
                            </label>
                            {pages && (
                                <div className="text-sm space-y-1">
                                    <div>Status: <a href={pages.status} target="_blank" rel="noreferrer" className="underline">{pages.status}</a></div>
                                    <div>Support: <a href={pages.support} target="_blank" rel="noreferrer" className="underline">{pages.support}</a></div>
                                </div>
                            )}
                            {isAdmin && (
                                <button onClick={saveSlug} disabled={savingSlug || slug.trim() === (account?.slug ?? '')} className={primary}>
                                    {savingSlug ? 'Saving…' : 'Save short name'}
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="mt-10">
                        <h2 className="text-lg font-medium">Apps</h2>
                        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                            An app&apos;s page answers once it is public, listed or not. Listing adds it to your
                            account&apos;s status page, and to its support page when the app takes requests from the public.
                            On-call and support settings are in each app&apos;s Status, On-call and Support tabs.
                        </p>
                        <div className="mt-4 rounded-xl border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
                            {rows.length === 0 && <div className="p-4 text-sm text-black/50 dark:text-white/50">You have no apps yet.</div>}
                            {rows.map((row) => {
                                const name = row.app.display_name || row.app.name;
                                const isPublic = row.service?.visibility === 'public';
                                return (
                                    <div key={row.app.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/dashboard/apps/${row.app.id}`} className="font-medium hover:underline">{name}</Link>
                                            {isPublic && (
                                                <a
                                                    href={publicStatusPageUrl(row.app.name, account?.slug)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="ml-2 text-xs text-black/50 dark:text-white/50 underline"
                                                >
                                                    status page
                                                </a>
                                            )}
                                            {row.error && <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">{row.error}</div>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            {row.monitored === undefined && <span className="text-xs text-black/40 dark:text-white/40">Asking the monitor…</span>}
                                            {row.monitored === false && (
                                                <>
                                                    <span className={pill(false)}>Not monitored</span>
                                                    <button className={small} onClick={() => turnOn(row)}>Turn on</button>
                                                </>
                                            )}
                                            {row.monitored === true && (
                                                <>
                                                    <span className={pill(true)}>Monitored</span>
                                                    <span className={pill(isPublic)}>{isPublic ? 'Public' : 'Private'}</span>
                                                    {row.service && (
                                                        <button className={small} onClick={() => togglePublic(row)}>
                                                            {isPublic ? 'Make private' : 'Publish'}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {row.listed !== undefined && (
                                                <label className={`flex items-center gap-1.5 text-xs ${row.canList ? '' : 'opacity-50'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!row.listed}
                                                        disabled={!row.canList}
                                                        onChange={() => toggleListed(row)}
                                                    />
                                                    Listed
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
