'use client';

// Last-resort access to an app's backups: read-only keys limited to its own
// restore points, so its owner can get the data back with stock kopia and the
// app key they hold, without Privasys. The secret is shown once, when the
// access is created, and never again.

import { useCallback, useEffect, useState } from 'react';
import { getBackupAccess, createBackupAccess, revokeBackupAccess } from '~/lib/api';
import type { BackupAccess, BackupAccessScope } from '~/lib/api';
import { useConfirm } from '~/components/confirm-dialog';

const btn = 'px-3 py-1.5 text-sm rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed';
const btnPrimary = 'px-4 py-1.5 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed';

function envFile(appName: string, a: BackupAccess): string {
    return [
        `# Read-only access to the backups of ${appName}. Keep this file private.`,
        `# Created ${a.created_at ?? ''}. Revoke it from the app's Backups tab.`,
        `AWS_ACCESS_KEY_ID=${a.access_key_id}`,
        `AWS_SECRET_ACCESS_KEY=${a.secret_access_key}`,
        `S3_ENDPOINT=${a.endpoint}`,
        `S3_REGION=${a.region ?? ''}`,
        `S3_BUCKET=${a.bucket}`,
        `S3_PREFIX=${a.prefix}`,
        ''
    ].join('\n');
}

function restoreCommands(a: BackupAccess): string {
    return [
        '# 1. The repository password, derived on your machine from the app key you hold',
        'export KOPIA_PASSWORD=$(privasys apps key backup-password --from-file app.key)',
        '# 2. The read-only keys',
        `export AWS_ACCESS_KEY_ID=${a.access_key_id} AWS_SECRET_ACCESS_KEY=<your secret>`,
        '# 3. Open the repository read-only with stock kopia (kopia.io), list and restore',
        `kopia repository connect s3 --bucket=${a.bucket} --endpoint=${a.endpoint} --region=${a.region ?? ''} --prefix=${a.prefix} --readonly --no-persist-credentials`,
        'kopia snapshot list --all',
        'kopia snapshot restore <snapshot-id> ./restored'
    ].join('\n');
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
    const [done, setDone] = useState(false);
    return (
        <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {}); }}
            className="px-2 py-0.5 text-xs rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
        >
            {done ? 'Copied' : label}
        </button>
    );
}

function Field({ label, value, secret }: { label: string; value?: string; secret?: boolean }) {
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 text-black/50 dark:text-white/50">{label}</span>
            <code className={`flex-1 min-w-0 truncate font-mono ${secret ? 'text-amber-700 dark:text-amber-300' : ''}`}>{value}</code>
            {value && <CopyButton text={value} />}
        </div>
    );
}

export function BackupAccessSection({ token, scope, appId, appName }: { token: string; scope: BackupAccessScope; appId: string; appName: string }) {
    const confirm = useConfirm();
    const [open, setOpen] = useState(false);
    const [access, setAccess] = useState<BackupAccess | null>(null);
    const [fresh, setFresh] = useState<BackupAccess | null>(null); // with the secret, this once
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setAccess(await getBackupAccess(token, scope, appId));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load the access');
        }
    }, [token, scope, appId]);

    useEffect(() => { if (open && !access) load(); }, [open, access, load]);

    async function create(replace: boolean) {
        if (replace && !(await confirm({
            title: 'Replace the read-only access?',
            body: 'New keys are created and the current ones stop working at once. Anything using them needs the new keys.',
            confirmLabel: 'Replace keys'
        }))) return;
        setBusy(true);
        setError(null);
        try {
            const a = await createBackupAccess(token, scope, appId);
            setFresh(a);
            setAccess({ ...a, secret_access_key: undefined });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Creating the access failed');
        } finally {
            setBusy(false);
        }
    }

    async function revoke() {
        if (!(await confirm({
            title: 'Revoke the read-only access?',
            body: 'The keys stop working at once. You can create new ones at any time.',
            confirmLabel: 'Revoke access', danger: true
        }))) return;
        setBusy(true);
        setError(null);
        try {
            await revokeBackupAccess(token, scope, appId);
            setFresh(null);
            setAccess({ exists: false });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Revoking the access failed');
        } finally {
            setBusy(false);
        }
    }

    function download(a: BackupAccess) {
        const url = URL.createObjectURL(new Blob([envFile(appName, a)], { type: 'text/plain' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${appName}-backup-access.env`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <section className="rounded-xl border border-black/10 dark:border-white/10">
            <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <span>
                    <span className="text-sm font-medium">Last-resort access</span>
                    <span className="block text-xs text-black/50 dark:text-white/50">Get your data back without Privasys, with read-only keys and the app key you hold.</span>
                </span>
                <span className="text-xs text-black/40 dark:text-white/40">{open ? 'Hide' : 'Show'}</span>
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-3">
                    <p className="text-sm text-black/60 dark:text-white/60">
                        These keys can read this app&apos;s backups and nothing else: they cannot change or delete anything,
                        and they cannot see other apps. The backups stay encrypted under your app key, so the keys are
                        useful only together with it. With both, the open-source tool kopia restores your data on any machine.
                    </p>
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                    {fresh?.secret_access_key && (
                        <div className="rounded-lg border border-amber-300/60 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-900/10 p-3 space-y-2">
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Save the secret now: it is not shown again.</p>
                            <Field label="Access key id" value={fresh.access_key_id} />
                            <Field label="Secret access key" value={fresh.secret_access_key} secret />
                            <Field label="Endpoint" value={fresh.endpoint} />
                            <Field label="Region" value={fresh.region} />
                            <Field label="Bucket" value={fresh.bucket} />
                            <Field label="Prefix" value={fresh.prefix} />
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => download(fresh)} className={btn}>Download as .env</button>
                                <CopyButton text={envFile(appName, fresh)} label="Copy all" />
                            </div>
                        </div>
                    )}

                    {access?.exists && (
                        <>
                            {!fresh && (
                                <div className="space-y-1">
                                    <Field label="Access key id" value={access.access_key_id} />
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="w-32 shrink-0 text-black/50 dark:text-white/50">Created</span>
                                        <span>{access.created_at ? new Date(access.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''}</span>
                                    </div>
                                </div>
                            )}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-black/50 dark:text-white/50">To restore (Linux or macOS)</span>
                                    <CopyButton text={restoreCommands(access)} />
                                </div>
                                <pre className="text-[11px] leading-relaxed font-mono p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] overflow-x-auto whitespace-pre">{restoreCommands(access)}</pre>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => create(true)} disabled={busy} className={btn}>{busy ? 'Working…' : 'Replace keys'}</button>
                                <button onClick={revoke} disabled={busy} className={`${btn} text-red-600 dark:text-red-400`}>Revoke</button>
                            </div>
                        </>
                    )}

                    {access && !access.exists && (
                        <button onClick={() => create(false)} disabled={busy} className={btnPrimary}>
                            {busy ? 'Creating… (up to a minute)' : 'Create read-only access'}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
