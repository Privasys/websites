'use client';

import Link from 'next/link';
import { use, useMemo, useState, useEffect } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import {
    getVaultConstellation,
    listVaults,
    adminCreateVault,
    adminUpdateVault,
    adminDeleteVault,
    adminCheckVault,
    adminCheckConstellation
} from '~/lib/api';
import type {
    VaultConstellation,
    Vault,
    VaultStatus,
    CreateVaultBody,
    UpdateVaultBody
} from '~/lib/types';

const STATUS_STYLE: Record<VaultStatus, string> = {
    healthy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    unreachable: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    mrenclave_mismatch: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    unknown: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60'
};

function StatusBadge({ status }: { status: VaultStatus }) {
    return (
        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[status] ?? STATUS_STYLE.unknown}`}>
            {status}
        </span>
    );
}

type VaultForm = { name: string; site: string; host: string; port: string; enabled: boolean };

const EMPTY_FORM: VaultForm = { name: '', site: '', host: '', port: '8443', enabled: true };

function toForm(v: Vault): VaultForm {
    return { name: v.name, site: v.site, host: v.host, port: String(v.port), enabled: v.enabled };
}

export default function AdminConstellationVaultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { session } = useAuth();
    const [con, setCon] = useState<VaultConstellation | null>(null);
    const [vaults, setVaults] = useState<Vault[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<Vault | 'new' | null>(null);
    const [checking, setChecking] = useState<string | null>(null);

    function reload() {
        if (!session?.accessToken) return;
        setLoading(true);
        Promise.all([
            getVaultConstellation(session.accessToken, id),
            listVaults(session.accessToken, id)
        ])
            .then(([c, r]) => { setCon(c); setVaults(r.vaults ?? []); })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        reload();

    }, [session?.accessToken, id]);

    const isManager = hasManagerRole(session?.roles);
    if (!isManager) {
        return (
            <div className="max-w-4xl">
                <h1 className="text-2xl font-semibold">Access denied</h1>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">You need the manager role to access this page.</p>
            </div>
        );
    }

    async function checkOne(v: Vault) {
        if (!session?.accessToken) return;
        setChecking(v.id);
        try {
            const updated = await adminCheckVault(session.accessToken, id, v.id);
            setVaults((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
        } catch (e) {
            alert(`Check failed: ${(e as Error).message}`);
        } finally {
            setChecking(null);
        }
    }

    async function checkAll() {
        if (!session?.accessToken) return;
        setChecking('all');
        try {
            const r = await adminCheckConstellation(session.accessToken, id);
            setVaults(r.vaults ?? []);
        } catch (e) {
            alert(`Check failed: ${(e as Error).message}`);
        } finally {
            setChecking(null);
        }
    }

    return (
        <div className="max-w-5xl">
            <Link href="/dashboard/admin/vaults" className="text-sm text-black/50 dark:text-white/50 hover:underline">
                ← Vault constellations
            </Link>

            <div className="mt-3 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-3">
                        {con?.name ?? 'Constellation'}
                        {con?.active && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 align-middle">active</span>
                        )}
                    </h1>
                    {con && (
                        <p className="mt-2 text-xs font-mono text-black/50 dark:text-white/50 break-all">
                            {con.environment} · MRENCLAVE {con.mrenclave} · {con.attestation_server}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={checking === 'all' || vaults.length === 0}
                        onClick={checkAll}
                        className="px-3 py-2 rounded-md text-sm font-medium border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                        {checking === 'all' ? 'Checking…' : 'Check all'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80">
                        + Add vault
                    </button>
                </div>
            </div>

            {loading && (
                <div className="mt-10 text-center py-16">
                    <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div>
                </div>
            )}
            {error && (
                <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

            {!loading && !error && (
                <div className="mt-6 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                                <th className="text-left px-4 py-3 font-medium">Site</th>
                                <th className="text-left px-4 py-3 font-medium">Endpoint</th>
                                <th className="text-left px-4 py-3 font-medium">Enabled</th>
                                <th className="text-left px-4 py-3 font-medium">Health</th>
                                <th className="text-left px-4 py-3 font-medium">Checked</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {vaults.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-black/50 dark:text-white/50">
                                        No vaults registered. Click <strong>+ Add vault</strong>.
                                    </td>
                                </tr>
                            )}
                            {vaults.map((v) => (
                                <tr key={v.id} className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/2 dark:hover:bg-white/2">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{v.site || '—'}</div>
                                        {v.name && <div className="text-xs text-black/40 dark:text-white/40">{v.name}</div>}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-black/60 dark:text-white/60">{v.host}:{v.port}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{v.enabled ? 'yes' : 'no'}</td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={v.status} />
                                        {v.last_error && (
                                            <div className="text-xs text-red-600/70 dark:text-red-400/60 mt-1 max-w-xs truncate" title={v.last_error}>{v.last_error}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-black/50 dark:text-white/50">
                                        {v.last_checked_at ? new Date(v.last_checked_at).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <button type="button" disabled={checking === v.id} onClick={() => checkOne(v)} className="text-sm font-medium underline mr-4 disabled:opacity-50">
                                            {checking === v.id ? 'Checking…' : 'Check'}
                                        </button>
                                        <button type="button" onClick={() => setEditing(v)} className="text-sm font-medium underline mr-4">Edit</button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!session?.accessToken) return;
                                                if (!confirm(`Remove vault ${v.host}:${v.port}?`)) return;
                                                try {
                                                    await adminDeleteVault(session.accessToken, id, v.id);
                                                    setVaults((rows) => rows.filter((r) => r.id !== v.id));
                                                } catch (e) {
                                                    alert(`Delete failed: ${(e as Error).message}`);
                                                }
                                            }}
                                            className="text-sm font-medium text-red-600 underline">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && (
                <VaultEditor
                    constellationId={id}
                    vault={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); reload(); }}
                    token={session?.accessToken ?? ''}
                />
            )}
        </div>
    );
}

function VaultEditor({
    constellationId,
    vault,
    onClose,
    onSaved,
    token
}: {
    constellationId: string;
    vault: Vault | null;
    onClose: () => void;
    onSaved: () => void;
    token: string;
}) {
    const initial = useMemo<VaultForm>(() => (vault ? toForm(vault) : EMPTY_FORM), [vault]);
    const [form, setForm] = useState<VaultForm>(initial);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    function set<K extends keyof VaultForm>(k: K, v: VaultForm[K]) {
        setForm((s) => ({ ...s, [k]: v }));
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!token) { setErr('Not authenticated'); return; }
        const port = Number(form.port);
        if (!form.host.trim() || !Number.isInteger(port) || port <= 0) {
            setErr('host and a positive integer port are required');
            return;
        }
        setSaving(true);
        try {
            if (vault) {
                const body: UpdateVaultBody = {
                    name: form.name.trim(),
                    site: form.site.trim(),
                    host: form.host.trim(),
                    port,
                    enabled: form.enabled
                };
                await adminUpdateVault(token, constellationId, vault.id, body);
            } else {
                const body: CreateVaultBody = {
                    name: form.name.trim(),
                    site: form.site.trim(),
                    host: form.host.trim(),
                    port,
                    enabled: form.enabled
                };
                await adminCreateVault(token, constellationId, body);
            }
            onSaved();
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-black/10 dark:border-white/10">
                <form onSubmit={submit} className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">{vault ? 'Edit vault' : 'Add vault'}</h2>
                        <button type="button" onClick={onClose} className="text-sm text-black/60 dark:text-white/60 hover:underline">Close</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Host *" hint="IP or hostname, e.g. 141.94.219.130.">
                            <input value={form.host} onChange={(e) => set('host', e.target.value)} className={inputCls} required />
                        </Field>
                        <Field label="Port *" hint="e.g. 8443.">
                            <input value={form.port} onChange={(e) => set('port', e.target.value)} className={inputCls} inputMode="numeric" required />
                        </Field>
                        <Field label="Site" hint="paris | london | dev.">
                            <input value={form.site} onChange={(e) => set('site', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Name" hint="Optional label, e.g. paris-8443.">
                            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Enabled" hint="Disabled vaults drop out of the directory + provisioner.">
                            <label className="inline-flex items-center gap-2 mt-2">
                                <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
                                <span className="text-sm">enabled</span>
                            </label>
                        </Field>
                    </div>

                    {err && <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{err}</div>}

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/80">
                            {saving ? 'Saving…' : vault ? 'Save changes' : 'Add vault'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const inputCls =
    'w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="block text-sm font-medium mb-1">{label}</span>
            {children}
            {hint && <span className="block text-xs text-black/50 dark:text-white/50 mt-1">{hint}</span>}
        </label>
    );
}
