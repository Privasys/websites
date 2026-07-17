'use client';

// First-class volumes: the encrypted storage behind container apps, owned
// independently of the apps. A volume is created at first deploy, bills per
// GB-hour at its provider/region storage rate (attached or not), survives app
// deletion, and exists until deleted here. Resize is online and grow-only.

import { useAuth } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback } from 'react';
import { listVolumes, getVolume, resizeVolume, deleteVolume } from '~/lib/api';
import type { Volume } from '~/lib/api';

const STORAGE_GBP_PER_GB_MONTH = 0.2; // 278 credits/GB/hour × 720h ≈ £0.20

function usageBar(v: Volume) {
    if (v.used_mb == null || v.avail_mb == null) return null;
    const totalMB = v.used_mb + v.avail_mb;
    const pct = totalMB > 0 ? Math.min(100, Math.round((v.used_mb / totalMB) * 100)) : 0;
    return (
        <div className="w-40">
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-black/40 dark:text-white/40">
                {(v.used_mb / 1024).toFixed(1)} GB used · {(v.avail_mb / 1024).toFixed(1)} GB free
            </div>
        </div>
    );
}

export default function VolumesPage() {
    const { session } = useAuth();
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null); // volume id being acted on
    const [resizing, setResizing] = useState<Volume | null>(null);
    const [newSize, setNewSize] = useState('');

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const vols = await listVolumes(session.accessToken);
            setVolumes(vols);
            // Enrich with live usage, best-effort, without blocking the list.
            vols.forEach(async v => {
                try {
                    const full = await getVolume(session.accessToken!, v.id);
                    setVolumes(prev => prev.map(p => (p.id === v.id ? full : p)));
                } catch { /* usage unavailable — keep the row as listed */ }
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load volumes');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => { load(); }, [load]);

    async function handleResize() {
        if (!session?.accessToken || !resizing) return;
        const gb = Number(newSize);
        if (!Number.isFinite(gb) || gb <= resizing.size_gb) {
            setError(`New size must be larger than ${resizing.size_gb} GB (grow-only).`);
            return;
        }
        setBusy(resizing.id);
        setError(null);
        try {
            await resizeVolume(session.accessToken, resizing.id, Math.floor(gb));
            setResizing(null);
            setNewSize('');
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Resize failed');
        } finally {
            setBusy(null);
        }
    }

    async function handleDelete(v: Volume) {
        if (!session?.accessToken) return;
        if (!confirm(`Delete volume "${v.name}" (${v.size_gb} GB)? Its encrypted data is DESTROYED and cannot be recovered — export the app's key first if you want the data. Billing stops immediately.`)) return;
        setBusy(v.id);
        setError(null);
        try {
            await deleteVolume(session.accessToken, v.id);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="max-w-5xl space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Volumes</h1>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                    Your encrypted storage, independent of your apps. Volumes bill per GB-hour at the host
                    region&apos;s storage rate (≈ £{STORAGE_GBP_PER_GB_MONTH.toFixed(2)}/GB/month) — attached or not —
                    until you delete them. Deleting an app keeps its volume; delete it here when you are done with the data.
                </p>
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {loading && <div className="text-sm text-black/40 dark:text-white/40">Loading volumes…</div>}
            {!loading && volumes.length === 0 && (
                <div className="p-8 rounded-xl border border-black/10 dark:border-white/10 text-sm text-black/50 dark:text-white/50">
                    No volumes yet. A volume is created automatically the first time you deploy a container app with storage.
                </div>
            )}

            {volumes.length > 0 && (
                <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-black/40 dark:text-white/40 border-b border-black/5 dark:border-white/5">
                                <th className="px-4 py-2 font-medium">Volume</th>
                                <th className="px-4 py-2 font-medium">Size</th>
                                <th className="px-4 py-2 font-medium">Usage</th>
                                <th className="px-4 py-2 font-medium">Location</th>
                                <th className="px-4 py-2 font-medium">App</th>
                                <th className="px-4 py-2 font-medium text-right">≈ £/month</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {volumes.map(v => (
                                <tr key={v.id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{v.name}</div>
                                        <div className="text-[11px] text-black/40 dark:text-white/40">
                                            {v.attached
                                                ? <span className="text-emerald-600 dark:text-emerald-400">attached</span>
                                                : v.app_id
                                                    ? 'detached (app stopped)'
                                                    : <span className="text-amber-600 dark:text-amber-400">orphaned (app deleted — still billing)</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">{v.size_gb} GB</td>
                                    <td className="px-4 py-3">{usageBar(v) ?? <span className="text-[11px] text-black/30 dark:text-white/30">{v.attached ? 'loading…' : 'unknown while detached'}</span>}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-black/60 dark:text-white/60">{v.provider}/{v.region}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{v.app_name || <span className="text-black/30 dark:text-white/30">—</span>}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">£{(v.size_gb * STORAGE_GBP_PER_GB_MONTH).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <button
                                            onClick={() => { setResizing(v); setNewSize(String(v.size_gb * 2)); }}
                                            disabled={busy === v.id}
                                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
                                        >
                                            Resize
                                        </button>
                                        <button
                                            onClick={() => handleDelete(v)}
                                            disabled={busy === v.id}
                                            className="ml-2 px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                                        >
                                            {busy === v.id ? '…' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {resizing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => busy === null && setResizing(null)}>
                    <div className="w-full max-w-sm rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-5 space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-semibold">Resize {resizing.name}</h3>
                        <p className="text-sm text-black/60 dark:text-white/60">
                            Grow-only, applied online (a detached volume grows fully on its next start).
                            Currently {resizing.size_gb} GB.
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                type="number" min={resizing.size_gb + 1} value={newSize}
                                onChange={e => setNewSize(e.target.value)}
                                className="w-32 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                            />
                            <span className="text-sm text-black/50 dark:text-white/50">GB · ≈ £{((Number(newSize) || 0) * STORAGE_GBP_PER_GB_MONTH).toFixed(2)}/month</span>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setResizing(null)} disabled={busy !== null} className="px-3 py-1.5 text-sm rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">Cancel</button>
                            <button onClick={handleResize} disabled={busy !== null} className="px-4 py-1.5 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40">
                                {busy !== null ? 'Resizing…' : 'Resize'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
