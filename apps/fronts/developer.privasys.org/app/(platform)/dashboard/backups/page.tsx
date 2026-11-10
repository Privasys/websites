'use client';

// Every backup the owner keeps, across apps. A deleted app's backups outlive
// it, keep billing per GB stored and can be deleted here; a live app's
// backups are managed on its Backups tab and go with the app.

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { listBackupSets, getBackupSet, deleteBackupSet, getBackupOptions, backupMonthlyGBP } from '~/lib/api';
import type { BackupOptions, BackupSet, BackupSnapshot } from '~/lib/api';
import { useConfirm } from '~/components/confirm-dialog';
import { RestorePointsTable, BACKUP_DELETION_COPY, formatStored } from '~/components/backups';

export default function BackupsPage() {
    const { session } = useAuth();
    const confirm = useConfirm();
    const [sets, setSets] = useState<BackupSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<string | null>(null); // deleted app whose restore points are shown
    const [points, setPoints] = useState<Record<string, BackupSnapshot[]>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [options, setOptions] = useState<BackupOptions | null>(null);

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setError(null);
        try {
            const [list, opts] = await Promise.all([listBackupSets(session.accessToken), getBackupOptions(session.accessToken)]);
            setSets(list);
            setOptions(opts);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load backups');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => { load(); }, [load]);

    async function toggle(s: BackupSet) {
        if (open === s.app_id) { setOpen(null); return; }
        setOpen(s.app_id);
        if (points[s.app_id] || !session?.accessToken) return;
        try {
            const set = await getBackupSet(session.accessToken, s.app_id);
            setPoints(p => ({ ...p, [s.app_id]: set.snapshots }));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load restore points');
        }
    }

    async function remove(s: BackupSet) {
        if (!session?.accessToken) return;
        if (!(await confirm({
            title: `Delete the backups of ${s.app_name}?`,
            body: `All ${s.snapshots} restore point${s.snapshots === 1 ? '' : 's'} go. ${BACKUP_DELETION_COPY}`,
            confirmLabel: 'Delete backups', danger: true, typeToConfirm: s.app_name
        }))) return;
        setBusy(s.app_id);
        setError(null);
        try {
            await deleteBackupSet(session.accessToken, s.app_id);
            if (open === s.app_id) setOpen(null);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Backups</h1>
                <p className="mt-1 max-w-3xl text-sm text-black/50 dark:text-white/50">
                    Restore points of your apps that use a key you hold, encrypted under that key. A live app&apos;s backups
                    are managed on its Backups tab. When you delete an app you can keep its backups: they stay here, billed
                    per GB stored, until you delete them.
                </p>
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {loading && <div className="text-sm text-black/40 dark:text-white/40">Loading backups…</div>}
            {!loading && sets.length === 0 && (
                <div className="p-8 rounded-xl border border-black/10 dark:border-white/10 text-sm text-black/50 dark:text-white/50">
                    No backups yet. Set a schedule on an app&apos;s Backups tab to start keeping restore points.
                </div>
            )}

            {sets.length > 0 && (
                <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-black/40 dark:text-white/40 border-b border-black/5 dark:border-white/5">
                                <th className="px-4 py-2 font-medium">App</th>
                                <th className="px-4 py-2 font-medium">Restore points</th>
                                <th className="px-4 py-2 font-medium">Stored</th>
                                <th className="px-4 py-2 font-medium">Last updated</th>
                                <th className="px-4 py-2 font-medium text-right">≈ £/month</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {sets.map(s => (
                                <SetRow key={s.app_id} s={s} gbp={options && s.stored_bytes != null ? backupMonthlyGBP(options, s.redundancy, s.stored_bytes) : null} open={open === s.app_id} points={points[s.app_id]} busy={busy === s.app_id} onToggle={() => toggle(s)} onDelete={() => remove(s)} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function SetRow({ s, gbp, open, points, busy, onToggle, onDelete }: { s: BackupSet; gbp: number | null; open: boolean; points?: BackupSnapshot[]; busy: boolean; onToggle: () => void; onDelete: () => void }) {
    const deleted = !!s.app_deleted_at;
    return (
        <>
            <tr className="border-b border-black/5 dark:border-white/5 last:border-0">
                <td className="px-4 py-3">
                    <div className="font-medium">
                        {deleted ? s.app_name : <Link href={`/dashboard/apps/${s.app_id}?tab=backups`} className="hover:underline">{s.app_name}</Link>}
                    </div>
                    {deleted && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400">
                            app deleted on {new Date(s.app_deleted_at!).toLocaleDateString(undefined, { dateStyle: 'medium' })}, still billing
                        </div>
                    )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{s.snapshots}</td>
                <td className="px-4 py-3 whitespace-nowrap">{s.stored_bytes != null ? formatStored(s.stored_bytes) : <span className="text-black/30 dark:text-white/30">Unknown</span>}</td>
                <td className="px-4 py-3 whitespace-nowrap text-black/60 dark:text-white/60">{new Date(s.updated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{gbp != null ? `£${gbp.toFixed(2)}` : <span className="text-black/30 dark:text-white/30">Unknown</span>}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                    {deleted ? (
                        <>
                            <button onClick={onToggle} className="px-2.5 py-1 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
                                {open ? 'Hide restore points' : 'Restore points'}
                            </button>
                            <button onClick={onDelete} disabled={busy} className="ml-2 px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40">
                                {busy ? '…' : 'Delete backups'}
                            </button>
                        </>
                    ) : (
                        <Link href={`/dashboard/apps/${s.app_id}?tab=backups`} className="px-2.5 py-1 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
                            Manage
                        </Link>
                    )}
                </td>
            </tr>
            {open && (
                <tr>
                    <td colSpan={6} className="px-4 pb-4">
                        {points ? <RestorePointsTable snapshots={points} /> : <div className="text-sm text-black/40 dark:text-white/40">Loading restore points…</div>}
                        <p className="mt-2 text-xs text-black/50 dark:text-white/50">The app is deleted, so there is nothing to restore onto here. The restore points open only with the app key you hold.</p>
                    </td>
                </tr>
            )}
        </>
    );
}
