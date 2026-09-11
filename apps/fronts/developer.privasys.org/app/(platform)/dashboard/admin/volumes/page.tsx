'use client';

// Volumes across every owner, for platform operators. The owner Volumes page
// only lists the caller's own, so this is where the volumes that block an
// enclave's retirement are cleared. Delete destroys through the host; Forget
// closes the record without contacting the host, for a machine that is gone.

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, hasAdminRole, hasManagerRole } from '~/lib/privasys-auth';
import { adminDeleteVolume, adminForgetVolume, adminListEnclaves, adminListVolumes } from '~/lib/api';
import type { AdminVolume } from '~/lib/api';
import type { Enclave } from '~/lib/types';

const STORAGE_GBP_PER_GB_MONTH = 0.2; // same rate as the owner Volumes page

function volumeState(v: AdminVolume): { label: string; cls: string } {
    if (v.attached) return { label: 'In use', cls: 'text-emerald-600 dark:text-emerald-400' };
    if (v.app_id) return { label: 'App not running here', cls: 'text-black/50 dark:text-white/50' };
    return { label: 'Unbound, still billing', cls: 'text-amber-600 dark:text-amber-400' };
}

function AdminVolumes() {
    const { session } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const enclaveFilter = searchParams.get('enclave') ?? '';
    const isManager = hasManagerRole(session?.roles);
    const isAdmin = hasAdminRole(session?.roles);

    const [volumes, setVolumes] = useState<AdminVolume[]>([]);
    const [enclaves, setEnclaves] = useState<Enclave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        setError(null);
        try {
            setVolumes(await adminListVolumes(session.accessToken, enclaveFilter || undefined));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load volumes');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, enclaveFilter]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!session?.accessToken) return;
        adminListEnclaves(session.accessToken).then(setEnclaves).catch(() => { /* filter falls back to the URL value */ });
    }, [session?.accessToken]);

    const filterName = useMemo(() => enclaves.find(e => e.id === enclaveFilter)?.name, [enclaves, enclaveFilter]);
    const totalGB = volumes.reduce((n, v) => n + v.size_gb, 0);

    function setFilter(id: string) {
        router.replace(id ? `/dashboard/admin/volumes?enclave=${encodeURIComponent(id)}` : '/dashboard/admin/volumes');
    }

    async function act(v: AdminVolume, kind: 'delete' | 'forget') {
        if (!session?.accessToken) return;
        const owner = v.owner_email || v.owner_sub;
        const message = kind === 'delete'
            ? `Delete volume "${v.name}" (${v.size_gb} GB) owned by ${owner}? Its host is asked to destroy the encrypted data and billing stops. This cannot be undone.`
            : `Forget volume "${v.name}" (${v.size_gb} GB) owned by ${owner}? The record is closed and billing stops, but its host is not contacted. Use this when the machine is gone or about to be deleted: any data still on it goes with the machine.`;
        if (!confirm(message)) return;
        setBusy(v.id);
        setError(null);
        try {
            if (kind === 'delete') await adminDeleteVolume(session.accessToken, v.id);
            else await adminForgetVolume(session.accessToken, v.id);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : kind === 'delete' ? 'Delete failed' : 'Forget failed');
        } finally {
            setBusy(null);
        }
    }

    if (!isManager) {
        return <p className="text-sm text-red-600">Access denied. Manager role required.</p>;
    }

    return (
        <div className="max-w-6xl space-y-5">
            <div>
                <h1 className="text-2xl font-semibold">Volumes</h1>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                    Every owner&apos;s encrypted volumes. A volume lives on one enclave and bills until it is deleted.
                    Delete asks its host to destroy the data. Forget only closes the record, for a volume whose machine is gone.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <select value={enclaveFilter} onChange={e => setFilter(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent">
                    <option value="">All enclaves</option>
                    {enclaves.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    {enclaveFilter && !filterName && <option value={enclaveFilter}>{enclaveFilter}</option>}
                </select>
                <span className="text-sm text-black/50 dark:text-white/50">
                    {volumes.length} volume{volumes.length !== 1 ? 's' : ''} · {totalGB} GB · ≈ £{(totalGB * STORAGE_GBP_PER_GB_MONTH).toFixed(2)}/month
                </span>
                {enclaveFilter && (
                    <Link href="/dashboard/admin/enclave" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        Back to enclaves
                    </Link>
                )}
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {loading && volumes.length === 0 && <div className="text-sm text-black/40 dark:text-white/40 animate-pulse">Loading volumes…</div>}
            {!loading && volumes.length === 0 && (
                <div className="p-8 rounded-xl border border-dashed border-black/10 dark:border-white/10 text-sm text-black/50 dark:text-white/50">
                    {enclaveFilter ? 'No volumes on this enclave.' : 'No volumes.'}
                </div>
            )}

            {volumes.length > 0 && (
                <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-black/40 dark:text-white/40 border-b border-black/5 dark:border-white/5">
                                <th className="px-4 py-2 font-medium">Volume</th>
                                <th className="px-4 py-2 font-medium">Owner</th>
                                <th className="px-4 py-2 font-medium">App</th>
                                <th className="px-4 py-2 font-medium">Enclave</th>
                                <th className="px-4 py-2 font-medium">Size</th>
                                <th className="px-4 py-2 font-medium text-right">≈ £/month</th>
                                <th className="px-4 py-2 font-medium">Created</th>
                                {isAdmin && <th className="px-4 py-2" />}
                            </tr>
                        </thead>
                        <tbody>
                            {volumes.map(v => {
                                const st = volumeState(v);
                                return (
                                    <tr key={v.id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{v.name}</div>
                                            <div className={`text-[11px] ${st.cls}`}>{st.label}</div>
                                        </td>
                                        <td className="px-4 py-3 text-black/60 dark:text-white/60">{v.owner_email || <code className="text-[11px]">{v.owner_sub.slice(0, 12)}…</code>}</td>
                                        <td className="px-4 py-3">
                                            {v.app_id && v.app_name
                                                ? <Link href={`/dashboard/admin/apps/${v.app_id}`} className="hover:underline">{v.app_name}</Link>
                                                : <span className="text-black/30 dark:text-white/30">None</span>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {v.enclave_name ? (
                                                <>
                                                    <div>{v.enclave_name}</div>
                                                    <div className="text-[11px] text-black/40 dark:text-white/40 font-mono">{v.enclave_host}</div>
                                                </>
                                            ) : <span className="text-black/30 dark:text-white/30">No host recorded</span>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">{v.size_gb} GB</td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">£{(v.size_gb * STORAGE_GBP_PER_GB_MONTH).toFixed(2)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-black/60 dark:text-white/60">{new Date(v.created_at).toLocaleDateString()}</td>
                                        {isAdmin && (
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <button onClick={() => act(v, 'delete')} disabled={busy === v.id || v.attached}
                                                    title={v.attached ? 'In use: stop the app first' : 'Destroy the data through its host'}
                                                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40">
                                                    {busy === v.id ? '…' : 'Delete'}
                                                </button>
                                                <button onClick={() => act(v, 'forget')} disabled={busy === v.id || v.attached}
                                                    title={v.attached ? 'In use: stop the app first' : 'Close the record without contacting the host'}
                                                    className="ml-2 px-2.5 py-1 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40">
                                                    Forget
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function AdminVolumesPage() {
    return (
        <Suspense fallback={<div className="text-sm text-black/40 dark:text-white/40 animate-pulse">Loading volumes…</div>}>
            <AdminVolumes />
        </Suspense>
    );
}
