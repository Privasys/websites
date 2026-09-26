'use client';

// A custom domain in front of an app's UI.
//
// The app keeps its platform hostname for everything attested: the sealed
// transport, sign-in, and the address the wallet shows when it verifies the
// enclave. Only what a browser displays moves. The owner adds a hostname,
// creates two DNS records, and the control plane serves it once the ownership
// record proves out.

import { useCallback, useEffect, useState } from 'react';
import { listAppDomains, addAppDomain, verifyAppDomain, deleteAppDomain } from '~/lib/api';
import type { AppUIDomain } from '~/lib/api';

const STATUS_LABEL: Record<AppUIDomain['status'], string> = {
    pending: 'Waiting for DNS',
    live: 'Live',
    suspended: 'Suspended'
};

const STATUS_CLS: Record<AppUIDomain['status'], string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    live: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
};

function RecordRow({ label, name, value }: { label: string; name: string; value: string }) {
    return (
        <div className="grid grid-cols-[4rem_1fr] gap-2 items-start">
            <div className="text-[11px] font-medium text-black/40 dark:text-white/40 pt-0.5">{label}</div>
            <div className="min-w-0">
                <code className="block text-[11px] break-all">{name}</code>
                <code className="block text-[11px] break-all text-black/60 dark:text-white/60">{value}</code>
            </div>
        </div>
    );
}

export function AppDomains({ token, appId }: { token: string; appId: string }) {
    const [data, setData] = useState<{ domains: AppUIDomain[]; cnameTarget: string; maxPerApp: number; platformHost: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hostname, setHostname] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [unavailable, setUnavailable] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await listAppDomains(token, appId);
            setData({
                domains: r.domains ?? [],
                cnameTarget: r.cname_target ?? '',
                maxPerApp: r.max_per_app ?? 3,
                platformHost: r.platform_host ?? ''
            });
        } catch {
            // An older control plane has no domains endpoint: hide the card
            // rather than showing an error on every app page.
            setUnavailable(true);
        }
    }, [token, appId]);

    useEffect(() => { load(); }, [load]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setBusy('add');
        setError(null);
        try {
            await addAppDomain(token, appId, hostname.trim());
            setHostname('');
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add the domain');
        } finally {
            setBusy(null);
        }
    }

    async function handleVerify(d: AppUIDomain) {
        setBusy(d.id);
        setError(null);
        try {
            await verifyAppDomain(token, appId, d.id);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'The DNS record did not check out');
            await load();
        } finally {
            setBusy(null);
        }
    }

    async function handleRemove(d: AppUIDomain) {
        if (!confirm(`Remove ${d.hostname}? The app stays reachable at its platform hostname, and the gateways stop serving this one within a minute.`)) return;
        setBusy(d.id);
        setError(null);
        try {
            await deleteAppDomain(token, appId, d.id);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not remove the domain');
        } finally {
            setBusy(null);
        }
    }

    if (unavailable || !data) return null;

    const atLimit = data.domains.length >= data.maxPerApp;

    return (
        <section>
            <h2 className="text-sm font-semibold mb-1">Custom domain</h2>
            <p className="text-xs text-black/50 dark:text-white/50 mb-3">
                Serve this app&apos;s interface from your own hostname. The measured code still comes from the
                enclave, and the app&apos;s API address stays{' '}
                {data.platformHost ? <code className="text-[11px]">{data.platformHost}</code> : 'its platform hostname'}.
            </p>

            {error && (
                <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300">{error}</div>
            )}

            <div className="rounded-xl border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
                {data.domains.map(d => (
                    <div key={d.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                                <a href={`https://${d.hostname}`} target="_blank" rel="noreferrer"
                                    className="text-sm font-medium hover:underline break-all">{d.hostname}</a>
                                <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full ${STATUS_CLS[d.status]}`}>
                                    {STATUS_LABEL[d.status]}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {d.status !== 'live' && (
                                    <button onClick={() => handleVerify(d)} disabled={busy === d.id}
                                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40">
                                        {busy === d.id ? 'Checking…' : 'Check DNS'}
                                    </button>
                                )}
                                <button onClick={() => handleRemove(d)} disabled={busy === d.id}
                                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40">
                                    Remove
                                </button>
                            </div>
                        </div>

                        {d.status !== 'live' && (
                            <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03] p-3 space-y-2">
                                <div className="text-[11px] text-black/50 dark:text-white/50">
                                    Create these two records with your DNS provider. The first proves the hostname is yours;
                                    the second points it at our gateways.
                                </div>
                                <RecordRow label="TXT" name={d.dns.txt_name} value={d.dns.txt_value} />
                                <RecordRow label="CNAME" name={d.dns.cname_name} value={d.dns.cname_target} />
                                {d.last_error && (
                                    <div className="text-[11px] text-amber-700 dark:text-amber-400">{d.last_error}</div>
                                )}
                            </div>
                        )}

                        {d.status === 'suspended' && (
                            <div className="text-[11px] text-red-600 dark:text-red-400">
                                The ownership record stopped resolving, so this hostname is no longer served. Restore the TXT
                                record and check again.
                            </div>
                        )}
                    </div>
                ))}

                <form onSubmit={handleAdd} className="p-4 flex items-center gap-2 flex-wrap">
                    <input
                        value={hostname}
                        onChange={e => setHostname(e.target.value)}
                        placeholder="app.example.com"
                        disabled={atLimit}
                        className="flex-1 min-w-[16rem] px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 disabled:opacity-40"
                    />
                    <button type="submit" disabled={!hostname.trim() || busy === 'add' || atLimit}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40">
                        {busy === 'add' ? 'Adding…' : 'Add domain'}
                    </button>
                    {atLimit && (
                        <span className="text-[11px] text-black/40 dark:text-white/40">
                            Limit of {data.maxPerApp} reached. Remove one to add another.
                        </span>
                    )}
                </form>
            </div>
        </section>
    );
}
