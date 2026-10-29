'use client';

// A custom domain in front of an app's UI.
//
// The app keeps its platform hostname for everything attested: the sealed
// transport, sign-in, and the address the wallet shows when it verifies the
// enclave. Only what a browser displays moves. The owner adds a hostname,
// creates two DNS records, and the control plane serves it once the ownership
// record proves out.
//
// In direct mode the gateway passes the hostname's connections through
// untouched and the enclave presents its own certificate, obtained inside it
// under the app's ACME account. The owner pins that account with a CAA record,
// so only the app's approved code can obtain a certificate for the name.

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { listAppDomains, addAppDomain, verifyAppDomain, deleteAppDomain, setAppDomainMode } from '~/lib/api';
import type { AppUIDomain, AppDomainMode } from '~/lib/api';

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

const MODE_LABEL: Record<AppDomainMode, string> = {
    'alias': 'TLS at the gateway',
    'direct-pending': 'Obtaining certificate',
    'direct': 'TLS in the enclave'
};

const MODE_CLS: Record<AppDomainMode, string> = {
    'alias': 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
    'direct-pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'direct': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
};

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button type="button"
            onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
            className="shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid grid-cols-[7rem_1fr] gap-2 items-start">
            <div className="text-[11px] font-medium text-black/40 dark:text-white/40 pt-0.5">{label}</div>
            <div className="min-w-0 text-[11px] break-all">{children}</div>
        </div>
    );
}

// DirectPanel shows what direct mode needs and has for one hostname.
function DirectPanel({ d, appName }: { d: AppUIDomain; appName: string }) {
    const x = d.direct;
    if (!x) return null;
    const mode = d.mode ?? 'alias';
    const state = (ok: boolean, good: string, todo: ReactNode) => ok
        ? <span className="text-emerald-700 dark:text-emerald-400">{good}</span>
        : <span className="text-amber-700 dark:text-amber-400">{todo}</span>;
    return (
        <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03] p-3 space-y-2">
            <div className="text-[11px] text-black/50 dark:text-white/50">
                {mode === 'direct'
                    ? 'The gateway passes this hostname through untouched: TLS ends in the enclave, with a certificate whose key was born there.'
                    : 'Direct mode ends TLS in the enclave, with a certificate it obtains itself, so only the app’s code sees the traffic.'}
            </div>
            {x.unavailable && <div className="text-[11px] text-amber-700 dark:text-amber-400">{x.unavailable}</div>}
            <Fact label="Runtime">{state(x.supported, 'Supports direct mode', 'Needs a newer runtime')}</Fact>
            <Fact label="Signed policy">
                {state(x.in_policy, 'Lists this hostname', <>Approve it: <code>privasys apps policy approve {appName} --domains {d.hostname}</code></>)}
            </Fact>
            {x.account_uri && <Fact label="ACME account"><code>{x.account_uri}</code></Fact>}
            {x.caa_record && (
                <Fact label="CAA record">
                    <div className="flex items-start gap-2">
                        <code className="flex-1">{x.caa_record}</code>
                        <CopyButton text={x.caa_record} />
                    </div>
                    <div className="mt-1 text-black/40 dark:text-white/40">
                        Publish it on the hostname itself, and point the hostname with an A record: a CAA record cannot sit beside a CNAME.
                    </div>
                </Fact>
            )}
            {x.issued && (
                <>
                    <Fact label="Certificate">Valid until {x.not_after ? new Date(x.not_after).toLocaleDateString() : 'unknown'}</Fact>
                    {x.spki_sha256 && <Fact label="Key (SHA-256)"><code>{x.spki_sha256}</code></Fact>}
                </>
            )}
            {d.direct_warning && <div className="text-[11px] text-red-600 dark:text-red-400">{d.direct_warning}</div>}
        </div>
    );
}

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

export function AppDomains({ token, appId, appName }: { token: string; appId: string; appName?: string }) {
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

    async function handleMode(d: AppUIDomain, mode: 'direct' | 'alias') {
        setBusy(d.id);
        setError(null);
        try {
            await setAppDomainMode(token, appId, d.id, mode);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'The switch was refused');
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
                                {d.mode && (
                                    <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full ${MODE_CLS[d.mode]}`}>
                                        {MODE_LABEL[d.mode]}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {d.status === 'live' && d.mode === 'alias' && d.direct?.supported && (
                                    <button onClick={() => handleMode(d, 'direct')} disabled={busy === d.id}
                                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40">
                                        {busy === d.id ? 'Checking…' : 'Switch to direct'}
                                    </button>
                                )}
                                {(d.mode === 'direct' || d.mode === 'direct-pending') && (
                                    <button onClick={() => handleMode(d, 'alias')} disabled={busy === d.id}
                                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40">
                                        Back to gateway TLS
                                    </button>
                                )}
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

                        {d.status === 'live' && d.direct && <DirectPanel d={d} appName={appName ?? appId} />}

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
