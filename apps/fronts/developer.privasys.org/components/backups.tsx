'use client';

// Backups of a BYOK container app's volume: the restore points, the schedule,
// back up now and restore. The enclave running the app takes the backups,
// encrypted under the app key its owner holds; the portal never sees that key.
// Every action is one server-side call, so a closed tab changes nothing.

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getBackupOptions, getBackupPolicy, listAppBackups, setBackupPolicy, startBackup, restoreApp, listVolumes, backupMonthlyGBP, apiErrorCode } from '~/lib/api';
import type { BackupOptions, BackupPolicy, BackupCatalog, BackupSnapshot } from '~/lib/api';
import type { App, AppDeployment, Enclave } from '~/lib/types';

export const BACKUP_DELETION_COPY =
    'Backups are deleted now and billing stops. The storage provider erases the remaining encrypted copies within 35 days; they can’t be read without your app key.';

export function formatStored(bytes?: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = bytes;
    let i = 0;
    while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
    return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function when(iso?: string | null): string {
    return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

// keptAs turns kopia's retention reasons (daily-3, monthly-1, latest-2) into
// the kinds of restore point this one counts as: "Daily, monthly".
function keptAs(reasons?: string[]): string {
    const kinds = Array.from(new Set((reasons ?? []).map(r => r.replace(/-\d+$/, ''))));
    if (kinds.length === 0) return '';
    const s = kinds.join(', ');
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// nextRunLabel says roughly when the next scheduled backup runs.
function nextRunLabel(iso?: string | null): string {
    if (!iso) return '';
    const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    if (mins <= 60) return 'next run within the hour';
    if (mins < 24 * 60) return `next run in about ${Math.round(mins / 60)} hours`;
    return `next run about ${when(iso)}`;
}

const btn = 'px-3 py-1.5 text-sm rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed';
const btnPrimary = 'px-4 py-1.5 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed';
const btnDanger = 'px-4 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed';
const field = 'w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';

// RestorePointsTable lists restore points; onRestore is absent when there is
// nothing to restore onto (a deleted app).
export function RestorePointsTable({ snapshots, onRestore, disabled }: { snapshots: BackupSnapshot[]; onRestore?: (s: BackupSnapshot) => void; disabled?: boolean }) {
    if (snapshots.length === 0) {
        return <div className="p-6 rounded-xl border border-black/10 dark:border-white/10 text-sm text-black/50 dark:text-white/50">No restore points yet.</div>;
    }
    const sorted = [...snapshots].sort((a, b) => b.start_time.localeCompare(a.start_time));
    return (
        <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs text-black/40 dark:text-white/40 border-b border-black/5 dark:border-white/5">
                        <th className="px-4 py-2 font-medium">Taken</th>
                        <th className="px-4 py-2 font-medium">Size</th>
                        <th className="px-4 py-2 font-medium">Files</th>
                        <th className="px-4 py-2 font-medium">Kept as</th>
                        <th className="px-4 py-2 font-medium">Origin</th>
                        {onRestore && <th className="px-4 py-2" />}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map(s => (
                        <tr key={s.id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                            <td className="px-4 py-3 whitespace-nowrap" title={s.id}>{when(s.start_time)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{formatStored(s.size_bytes)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{s.files.toLocaleString()}</td>
                            <td className="px-4 py-3 text-black/60 dark:text-white/60">{keptAs(s.retention)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-black/60 dark:text-white/60">{s.description === 'manual' ? 'Manual' : 'Scheduled'}</td>
                            {onRestore && (
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <button onClick={() => onRestore(s)} disabled={disabled} className="px-2.5 py-1 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40">
                                        Restore…
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

interface TabProps {
    app: App;
    token: string;
    deployments: AppDeployment[];
    enclaves: Enclave[];
    /** Called once a restore has started: the caller shows the deployment. */
    onRestoreStarted: () => void;
}

export function BackupsTab({ app, token, deployments, enclaves, onRestoreStarted }: TabProps) {
    const [options, setOptions] = useState<BackupOptions | null>(null);
    const [policy, setPolicy] = useState<BackupPolicy | null>(null);
    const [catalog, setCatalog] = useState<BackupCatalog | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [scheduling, setScheduling] = useState(false);
    const [restoring, setRestoring] = useState<BackupSnapshot | 'latest' | null>(null);

    const byok = app.key_provider === 'byok';
    const running = deployments.some(d => d.status === 'active');

    const load = useCallback(async () => {
        try {
            const opts = await getBackupOptions(token);
            setOptions(opts);
            if (!byok || !opts.available) return;
            const [p, c] = await Promise.all([getBackupPolicy(token, app.id), listAppBackups(token, app.id)]);
            setPolicy(p);
            setCatalog(c);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load backups');
        } finally {
            setLoading(false);
        }
    }, [token, app.id, byok]);

    useEffect(() => { load(); }, [load]);

    // Follow a running backup or move until it settles.
    const busy = policy?.job?.state === 'running' || policy?.move?.state === 'running';
    useEffect(() => {
        if (!busy) return;
        const t = setInterval(load, 5000);
        return () => clearInterval(t);
    }, [busy, load]);

    if (loading) return <div className="text-sm text-black/40 dark:text-white/40">Loading backups…</div>;
    if (options && !options.available) {
        return <p className="text-sm text-black/50 dark:text-white/50">Backups are not offered on this platform.</p>;
    }
    if (!byok) {
        return (
            <p className="max-w-2xl text-sm text-black/60 dark:text-white/60">
                Backups need an app key you hold. Create the app with your own key to enable them.{' '}
                <a href="https://docs.privasys.org" target="_blank" rel="noopener noreferrer" className="underline">Read how</a>
            </p>
        );
    }

    const redundancy = options?.redundancy.find(r => r.id === policy?.redundancy) ?? options?.redundancy[0];
    const monthly = options ? backupMonthlyGBP(options, policy?.redundancy, catalog?.stored_bytes) : null;
    const intervalLabel = options?.intervals.find(i => i.id === policy?.interval)?.label ?? policy?.interval;
    const retentionLabel = options?.retention.find(r => r.id === policy?.retention)?.label ?? policy?.retention;
    const job = policy?.job;
    const move = policy?.move;
    const snapshots = catalog?.snapshots ?? [];

    async function backUpNow() {
        setStarting(true);
        setError(null);
        setNotice(null);
        try {
            await startBackup(token, app.id);
            setNotice('Backup started.');
            await load();
        } catch (e) {
            const code = apiErrorCode(e);
            setError(code === 'busy' ? 'A backup is already running.' : e instanceof Error ? e.message : 'Backup failed to start');
        } finally {
            setStarting(false);
        }
    }

    return (
        <div className="space-y-6">
            {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {notice && <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}

            {move?.state === 'running' && (
                <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sm text-sky-800 dark:text-sky-300">
                    Moving your restore points to {options?.redundancy.find(r => r.id === move.to)?.label ?? move.to}
                    {move.total_bytes > 0 && <> ({Math.round((move.copied_bytes / move.total_bytes) * 100)}%)</>}… backups resume when it is done.
                </div>
            )}
            {move?.state === 'failed' && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-300">
                    The move to {options?.redundancy.find(r => r.id === move.to)?.label ?? move.to} did not finish{move.error ? `: ${move.error}` : ''}. Your restore points stay where they were. Save the schedule again to retry.
                </div>
            )}

            <section className="rounded-xl border border-black/10 dark:border-white/10 p-4 grid gap-4 sm:grid-cols-3">
                <div>
                    <div className="text-xs text-black/40 dark:text-white/40">Stored</div>
                    <div className="mt-1 text-sm font-medium">{formatStored(catalog?.stored_bytes)}</div>
                    <div className="text-xs text-black/50 dark:text-white/50">
                        {monthly != null ? `≈ £${monthly.toFixed(2)}/month` : ''}{redundancy ? ` · ${redundancy.label}, ${redundancy.location}` : ''}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-black/40 dark:text-white/40">Schedule</div>
                    <div className="mt-1 text-sm font-medium">{policy?.enabled ? `${intervalLabel} · ${retentionLabel?.toLowerCase()} retention` : 'Off'}</div>
                    <div className="text-xs text-black/50 dark:text-white/50">
                        {policy?.enabled ? (policy.next_run_at ? nextRunLabel(policy.next_run_at) : 'paused while the app is stopped') : 'Back up by hand, or set a schedule'}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-black/40 dark:text-white/40">Latest backup</div>
                    {job ? (
                        <>
                            <div className={`mt-1 text-sm font-medium ${job.state === 'failed' ? 'text-red-600 dark:text-red-400' : job.state === 'running' ? 'text-sky-700 dark:text-sky-300' : ''}`}>
                                {job.state === 'running' ? 'Running…' : job.state === 'failed' ? 'Failed' : 'Succeeded'}
                            </div>
                            <div className="text-xs text-black/50 dark:text-white/50">{when(job.finished_at ?? job.started_at)}{job.error ? ` · ${job.error}` : ''}</div>
                        </>
                    ) : <div className="mt-1 text-sm text-black/50 dark:text-white/50">None yet</div>}
                </div>
            </section>

            <div className="flex flex-wrap items-center gap-2">
                <button onClick={backUpNow} disabled={!running || starting || busy} className={btnPrimary} title={running ? undefined : 'Backups run on the enclave that runs the app: start it first.'}>
                    {starting ? 'Starting…' : 'Back up now'}
                </button>
                <button onClick={() => setScheduling(true)} disabled={move?.state === 'running'} className={btn}>Schedule…</button>
                <button onClick={() => setRestoring('latest')} disabled={snapshots.length === 0 || busy} className={btn}>Restore…</button>
                {!running && <span className="text-xs text-black/50 dark:text-white/50">The app is stopped: back up now and schedule changes need it running.</span>}
            </div>

            <section className="space-y-2">
                <h3 className="text-sm font-medium">Restore points</h3>
                <RestorePointsTable snapshots={snapshots} onRestore={s => setRestoring(s)} disabled={busy} />
                <p className="text-xs text-black/50 dark:text-white/50">
                    Backups are encrypted under the app key you hold and kept in immutable storage. You pay for the size stored, which is usually well below the app&apos;s data size: it is deduplicated and compressed.
                </p>
            </section>

            {scheduling && options && policy && (
                <ScheduleDialog
                    app={app} token={token} options={options} policy={policy} hasBackups={snapshots.length > 0}
                    onClose={() => setScheduling(false)}
                    onSaved={async msg => { setScheduling(false); setNotice(msg); await load(); }}
                />
            )}
            {restoring && (
                <RestoreDialog
                    app={app} token={token} snapshots={snapshots} initial={restoring === 'latest' ? 'latest' : restoring.id}
                    deployments={deployments} enclaves={enclaves}
                    onBackUpFirst={() => { setRestoring(null); backUpNow(); }}
                    onClose={() => setRestoring(null)}
                    onStarted={() => { setRestoring(null); onRestoreStarted(); }}
                />
            )}
        </div>
    );
}

function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div role="dialog" aria-modal="true" className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-5 space-y-4`} onClick={e => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}

function ScheduleDialog({ app, token, options, policy, hasBackups, onClose, onSaved }: {
    app: App; token: string; options: BackupOptions; policy: BackupPolicy; hasBackups: boolean;
    onClose: () => void; onSaved: (msg: string) => void;
}) {
    const [interval, setIntervalChoice] = useState(policy.interval || 'off');
    const [retention, setRetention] = useState(policy.retention || 'standard');
    const [redundancy, setRedundancy] = useState(policy.redundancy || options.redundancy[0]?.id || 'region');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const moving = hasBackups && redundancy !== policy.redundancy;

    async function save() {
        setSaving(true);
        setError(null);
        try {
            const res = await setBackupPolicy(token, app.id, { interval, retention, redundancy });
            onSaved(moving ? 'Schedule saved. Your restore points are being moved.' : res.warning ? `Schedule saved. ${res.warning}` : 'Schedule saved.');
        } catch (e) {
            const code = apiErrorCode(e);
            setError(code === 'not_running' ? 'Moving existing restore points needs the app running. Start it, then save again.'
                : code === 'moving' ? 'A move is in progress. Save again once it is done.'
                    : e instanceof Error ? e.message : 'Saving failed');
            setSaving(false);
        }
    }

    return (
        <Modal onClose={() => !saving && onClose()} wide>
            <h3 className="text-base font-semibold">Backup schedule</h3>
            <label className="block space-y-1.5">
                <span className="text-xs text-black/50 dark:text-white/50">How often</span>
                <select value={interval} onChange={e => setIntervalChoice(e.target.value)} className={field}>
                    {options.intervals.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                </select>
            </label>
            <fieldset className="space-y-1.5">
                <legend className="text-xs text-black/50 dark:text-white/50 mb-1.5">What is kept</legend>
                {options.retention.map(r => (
                    <label key={r.id} className="flex items-start gap-2 text-sm cursor-pointer">
                        <input type="radio" name="retention" checked={retention === r.id} onChange={() => setRetention(r.id)} className="mt-1" />
                        <span><span className="font-medium">{r.label}</span><span className="block text-xs text-black/50 dark:text-white/50">{r.description}</span></span>
                    </label>
                ))}
            </fieldset>
            {options.redundancy.length > 0 && (
                <fieldset className="space-y-1.5">
                    <legend className="text-xs text-black/50 dark:text-white/50 mb-1.5">Where</legend>
                    {options.redundancy.map(r => (
                        <label key={r.id} className="flex items-start gap-2 text-sm cursor-pointer">
                            <input type="radio" name="redundancy" checked={redundancy === r.id} onChange={() => setRedundancy(r.id)} className="mt-1" />
                            <span>
                                <span className="font-medium">{r.label}</span> · {r.location}
                                <span className="block text-xs text-black/50 dark:text-white/50">≈ £{r.gbp_per_gb_month.toFixed(3)} per GB stored per month</span>
                            </span>
                        </label>
                    ))}
                </fieldset>
            )}
            {moving && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                    Your existing restore points are moved; this takes a few minutes and backups pause meanwhile.
                </p>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
                <button onClick={onClose} disabled={saving} className={btn}>Cancel</button>
                <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : moving ? 'Save and move' : 'Save schedule'}</button>
            </div>
        </Modal>
    );
}

function RestoreDialog({ app, token, snapshots, initial, deployments, enclaves, onBackUpFirst, onClose, onStarted }: {
    app: App; token: string; snapshots: BackupSnapshot[]; initial: string;
    deployments: AppDeployment[]; enclaves: Enclave[];
    onBackUpFirst: () => void; onClose: () => void; onStarted: () => void;
}) {
    const [step, setStep] = useState<1 | 2>(1);
    const [snapshotId, setSnapshotId] = useState(initial);
    const [enclaveId, setEnclaveId] = useState('');
    const [hasVolume, setHasVolume] = useState<boolean | null>(null);
    const [typed, setTyped] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sorted = [...snapshots].sort((a, b) => b.start_time.localeCompare(a.start_time));
    const active = deployments.find(d => d.status === 'active');

    useEffect(() => {
        listVolumes(token).then(vs => setHasVolume(vs.some(v => v.app_id === app.id))).catch(() => setHasVolume(true));
    }, [token, app.id]);

    async function restore() {
        setSubmitting(true);
        setError(null);
        try {
            await restoreApp(token, app.id, { snapshot_id: snapshotId, ...(enclaveId ? { enclave_id: enclaveId } : {}) });
            onStarted();
        } catch (e) {
            const code = apiErrorCode(e);
            setError(code === 'busy' ? 'A backup is running. Restore once it has finished, so the newest restore point is included.'
                : code === 'moving' ? 'Your restore points are being moved. Restore once the move is done.'
                    : code === 'snapshot_not_found' ? 'That restore point no longer exists.'
                        : e instanceof Error ? e.message : 'Restore failed to start');
            setSubmitting(false);
        }
    }

    const willReplace = hasVolume || !!active;
    return (
        <Modal onClose={() => !submitting && onClose()} wide>
            <h3 className="text-base font-semibold">Restore {app.display_name || app.name}</h3>
            {step === 1 && (
                <>
                    <label className="block space-y-1.5">
                        <span className="text-xs text-black/50 dark:text-white/50">Restore point</span>
                        <select value={snapshotId} onChange={e => setSnapshotId(e.target.value)} className={field}>
                            <option value="latest">Latest{sorted[0] ? ` (${when(sorted[0].start_time)})` : ''}</option>
                            {sorted.map(s => <option key={s.id} value={s.id}>{when(s.start_time)} · {formatStored(s.size_bytes)}</option>)}
                        </select>
                    </label>
                    {enclaves.length > 1 && (
                        <label className="block space-y-1.5">
                            <span className="text-xs text-black/50 dark:text-white/50">Run it on</span>
                            <select value={enclaveId} onChange={e => setEnclaveId(e.target.value)} className={field}>
                                <option value="">Its current enclave</option>
                                {enclaves.filter(e => e.id !== active?.enclave_id).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </label>
                    )}
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className={btn}>Cancel</button>
                        <button onClick={() => (willReplace ? setStep(2) : restore())} disabled={hasVolume === null || submitting} className={btnPrimary}>
                            {willReplace ? 'Continue' : submitting ? 'Restoring…' : 'Restore'}
                        </button>
                    </div>
                </>
            )}
            {step === 2 && (
                <>
                    <div className="space-y-2 text-sm text-black/70 dark:text-white/70">
                        <p>A restore never writes over data. To restore, the app is stopped and its current volume is deleted, so the data on it now is destroyed. The app then starts again on the restore point.</p>
                        <p>If the data on it now matters, take a backup first.</p>
                    </div>
                    <button onClick={onBackUpFirst} disabled={!active} className={btn}>Back up now first</button>
                    <label className="block space-y-1.5">
                        <span className="text-xs text-black/50 dark:text-white/50">Type <strong className="font-mono text-black dark:text-white">{app.name}</strong> to confirm</span>
                        <input value={typed} onChange={e => setTyped(e.target.value)} placeholder={app.name} className={`${field} font-mono`} autoFocus />
                    </label>
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setStep(1)} disabled={submitting} className={btn}>Back</button>
                        <button onClick={restore} disabled={typed !== app.name || submitting} className={btnDanger}>
                            {submitting ? 'Restoring…' : 'Delete volume and restore'}
                        </button>
                    </div>
                </>
            )}
            {step === 1 && error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </Modal>
    );
}
