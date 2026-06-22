'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import {
    listVaultConstellations,
    adminCreateConstellation,
    adminUpdateConstellation,
    adminDeleteConstellation,
    adminActivateConstellation
} from '~/lib/api';
import type {
    VaultConstellation,
    CreateConstellationBody,
    UpdateConstellationBody
} from '~/lib/types';

// ConstellationForm keeps numbers as strings until submit so the UI can show a
// blank (= NULL / env default) instead of a "0" sentinel.
type ConstellationForm = {
    name: string;
    environment: string;
    mrenclave: string;
    attestation_server: string;
    oidc_issuer: string;
    oidc_audience: string;
    threshold: string;
};

const EMPTY_FORM: ConstellationForm = {
    name: '',
    environment: 'prod',
    mrenclave: '',
    attestation_server: 'https://as.privasys.org/verify',
    oidc_issuer: 'https://privasys.id',
    oidc_audience: 'privasys-platform',
    threshold: ''
};

function toForm(c: VaultConstellation): ConstellationForm {
    return {
        name: c.name,
        environment: c.environment || 'prod',
        mrenclave: c.mrenclave,
        attestation_server: c.attestation_server,
        oidc_issuer: c.oidc_issuer,
        oidc_audience: c.oidc_audience,
        threshold: c.threshold == null ? '' : String(c.threshold)
    };
}

function buildCreate(f: ConstellationForm): CreateConstellationBody | string {
    const body: CreateConstellationBody = {
        name: f.name.trim(),
        environment: f.environment.trim() || 'prod',
        mrenclave: f.mrenclave.trim().toLowerCase(),
        attestation_server: f.attestation_server.trim(),
        oidc_issuer: f.oidc_issuer.trim(),
        oidc_audience: f.oidc_audience.trim()
    };
    if (f.threshold.trim() !== '') {
        const n = Number(f.threshold);
        if (!Number.isInteger(n) || n <= 0) return 'threshold must be a positive integer';
        body.threshold = n;
    }
    return body;
}

function buildUpdate(f: ConstellationForm): UpdateConstellationBody | string {
    const body: UpdateConstellationBody = {
        name: f.name.trim(),
        environment: f.environment.trim() || 'prod',
        mrenclave: f.mrenclave.trim().toLowerCase(),
        attestation_server: f.attestation_server.trim(),
        oidc_issuer: f.oidc_issuer.trim(),
        oidc_audience: f.oidc_audience.trim()
    };
    if (f.threshold.trim() === '') body.clear_threshold = true;
    else {
        const n = Number(f.threshold);
        if (!Number.isInteger(n) || n <= 0) return 'threshold must be a positive integer';
        body.threshold = n;
    }
    return body;
}

export default function AdminVaultsPage() {
    const { session } = useAuth();
    const [cons, setCons] = useState<VaultConstellation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<VaultConstellation | 'new' | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    function reload() {
        if (!session?.accessToken) return;
        setLoading(true);
        listVaultConstellations(session.accessToken)
            .then((r) => setCons(r.constellations ?? []))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        reload();

    }, [session?.accessToken]);

    const isManager = hasManagerRole(session?.roles);
    if (!isManager) {
        return (
            <div className="max-w-4xl">
                <h1 className="text-2xl font-semibold">Access denied</h1>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                    You need the manager role to access this page.
                </p>
            </div>
        );
    }

    async function activate(c: VaultConstellation) {
        if (!session?.accessToken) return;
        if (!confirm(`Activate "${c.name}"? It becomes the live ${c.environment} constellation; any other active ${c.environment} constellation is deactivated.`)) return;
        setBusy(c.id);
        try {
            await adminActivateConstellation(session.accessToken, c.id);
            reload();
        } catch (e) {
            alert(`Activate failed: ${(e as Error).message}`);
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Vault constellations</h1>
                    <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                        A constellation is a versioned set of SGX vaults sharing one MRENCLAVE,
                        attestation server, and OIDC config. A new vault build is a new
                        constellation: register its vaults, then <strong>activate</strong> it.
                        Clients fetch the active constellation&rsquo;s vaults from the directory.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setEditing('new')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80">
                    + Add constellation
                </button>
            </div>

            {loading && (
                <div className="mt-10 text-center py-16">
                    <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div>
                </div>
            )}
            {error && (
                <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div className="mt-6 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                                <th className="text-left px-4 py-3 font-medium">Name</th>
                                <th className="text-left px-4 py-3 font-medium">Env</th>
                                <th className="text-left px-4 py-3 font-medium">MRENCLAVE</th>
                                <th className="text-left px-4 py-3 font-medium">Vaults</th>
                                <th className="text-left px-4 py-3 font-medium">Active</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {cons.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-black/50 dark:text-white/50">
                                        No constellations yet. Click <strong>+ Add constellation</strong> to register one.
                                    </td>
                                </tr>
                            )}
                            {cons.map((c) => (
                                <tr key={c.id} className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/2 dark:hover:bg-white/2">
                                    <td className="px-4 py-3 font-medium">{c.name}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{c.environment}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-black/60 dark:text-white/60" title={c.mrenclave}>
                                        {c.mrenclave ? `${c.mrenclave.slice(0, 12)}…` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{c.vault_count ?? 0}</td>
                                    <td className="px-4 py-3">
                                        {c.active ? (
                                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">active</span>
                                        ) : (
                                            <span className="text-xs text-black/40 dark:text-white/40">inactive</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <Link href={`/dashboard/admin/vaults/${c.id}`} className="text-sm font-medium underline mr-4">
                                            Vaults
                                        </Link>
                                        {!c.active && (
                                            <button
                                                type="button"
                                                disabled={busy === c.id}
                                                onClick={() => activate(c)}
                                                className="text-sm font-medium text-emerald-700 dark:text-emerald-400 underline mr-4 disabled:opacity-50">
                                                Activate
                                            </button>
                                        )}
                                        <button type="button" onClick={() => setEditing(c)} className="text-sm font-medium underline mr-4">
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!session?.accessToken) return;
                                                if (!confirm(`Delete constellation "${c.name}" and all its vaults?`)) return;
                                                try {
                                                    await adminDeleteConstellation(session.accessToken, c.id);
                                                    reload();
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
                <ConstellationEditor
                    constellation={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); reload(); }}
                    token={session?.accessToken ?? ''}
                />
            )}
        </div>
    );
}

function ConstellationEditor({
    constellation,
    onClose,
    onSaved,
    token
}: {
    constellation: VaultConstellation | null;
    onClose: () => void;
    onSaved: () => void;
    token: string;
}) {
    const initial = useMemo<ConstellationForm>(
        () => (constellation ? toForm(constellation) : EMPTY_FORM),
        [constellation]
    );
    const [form, setForm] = useState<ConstellationForm>(initial);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    function set<K extends keyof ConstellationForm>(k: K, v: ConstellationForm[K]) {
        setForm((s) => ({ ...s, [k]: v }));
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!token) { setErr('Not authenticated'); return; }
        if (!form.name.trim() || !form.mrenclave.trim() || !form.attestation_server.trim()) {
            setErr('name, mrenclave, and attestation_server are required');
            return;
        }
        setSaving(true);
        try {
            if (constellation) {
                const body = buildUpdate(form);
                if (typeof body === 'string') { setErr(body); setSaving(false); return; }
                await adminUpdateConstellation(token, constellation.id, body);
            } else {
                const body = buildCreate(form);
                if (typeof body === 'string') { setErr(body); setSaving(false); return; }
                await adminCreateConstellation(token, body);
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
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-black/10 dark:border-white/10">
                <form onSubmit={submit} className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                            {constellation ? `Edit: ${constellation.name}` : 'Add constellation'}
                        </h2>
                        <button type="button" onClick={onClose} className="text-sm text-black/60 dark:text-white/60 hover:underline">
                            Close
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Name *" hint="Unique, e.g. 'prod-v0.20.3'.">
                            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} required />
                        </Field>
                        <Field label="Environment" hint="prod | dev. One active per environment.">
                            <input value={form.environment} onChange={(e) => set('environment', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="MRENCLAVE *" hint="64-hex shared pin for the whole set.">
                            <input value={form.mrenclave} onChange={(e) => set('mrenclave', e.target.value)} className={`${inputCls} font-mono text-xs`} required />
                        </Field>
                        <Field label="Threshold (k)" hint="Optional override; blank = env VAULT_SELECT_COUNT.">
                            <input value={form.threshold} onChange={(e) => set('threshold', e.target.value)} className={inputCls} inputMode="numeric" />
                        </Field>
                        <Field label="Attestation server *" hint="e.g. https://as.privasys.org/verify">
                            <input value={form.attestation_server} onChange={(e) => set('attestation_server', e.target.value)} className={inputCls} required />
                        </Field>
                        <Field label="OIDC issuer" hint="e.g. https://privasys.id">
                            <input value={form.oidc_issuer} onChange={(e) => set('oidc_issuer', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="OIDC audience" hint="e.g. privasys-platform">
                            <input value={form.oidc_audience} onChange={(e) => set('oidc_audience', e.target.value)} className={inputCls} />
                        </Field>
                    </div>

                    {err && (
                        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{err}</div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/80">
                            {saving ? 'Saving…' : constellation ? 'Save changes' : 'Create constellation'}
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
