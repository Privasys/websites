'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import {
    listFleets,
    adminCreateFleet,
    adminUpdateFleet,
    adminDeleteFleet,
} from '~/lib/api';
import type {
    Fleet,
    AvailableModel,
    CreateFleetBody,
    UpdateFleetBody,
} from '~/lib/types';

// FleetForm captures every editable column on the fleets table.
// Numbers and JSON are kept as strings until submit so the UI can show
// blanks (= NULL) instead of "0" sentinels.
type FleetForm = {
    name: string;
    alias: string;
    owner: string;
    zone: string;
    vllm_mode: string;
    quota_tokens_per_day: string;
    quota_rpm: string;
    multi_model: boolean;
    endpoint: string;
    attestation_server: string;
    auth_required: boolean;
    auth_issuer: string;
    available_models_json: string;
};

const EMPTY_FORM: FleetForm = {
    name: '',
    alias: '',
    owner: '',
    zone: '',
    vllm_mode: 'single_gpu',
    quota_tokens_per_day: '',
    quota_rpm: '',
    multi_model: false,
    endpoint: '',
    attestation_server: '',
    auth_required: false,
    auth_issuer: '',
    available_models_json: '[]',
};

function fleetToForm(f: Fleet): FleetForm {
    return {
        name: f.name,
        alias: f.alias ?? '',
        owner: f.owner,
        zone: f.zone ?? '',
        vllm_mode: f.vllm_mode || 'single_gpu',
        quota_tokens_per_day:
            f.quota_tokens_per_day == null ? '' : String(f.quota_tokens_per_day),
        quota_rpm: f.quota_rpm == null ? '' : String(f.quota_rpm),
        multi_model: !!f.multi_model,
        endpoint: f.endpoint ?? '',
        attestation_server: f.attestation_server ?? '',
        auth_required: !!f.auth_required,
        auth_issuer: f.auth_issuer ?? '',
        available_models_json: JSON.stringify(f.available_models ?? [], null, 2),
    };
}

// parseModels validates the JSON textarea. Returns either the parsed list
// or an error message; never throws.
function parseModels(raw: string): AvailableModel[] | string {
    const trimmed = raw.trim();
    if (trimmed === '') return [];
    let parsed: unknown;
    try {
        parsed = JSON.parse(trimmed);
    } catch (e) {
        return `available_models is not valid JSON: ${(e as Error).message}`;
    }
    if (!Array.isArray(parsed)) return 'available_models must be a JSON array';
    return parsed as AvailableModel[];
}

function buildCreateBody(f: FleetForm): CreateFleetBody | string {
    const models = parseModels(f.available_models_json);
    if (typeof models === 'string') return models;
    const body: CreateFleetBody = {
        name: f.name.trim(),
        alias: f.alias.trim() || null,
        owner: f.owner.trim(),
        zone: f.zone.trim(),
        vllm_mode: f.vllm_mode.trim() || 'single_gpu',
        multi_model: f.multi_model,
        endpoint: f.endpoint.trim(),
        attestation_server: f.attestation_server.trim(),
        auth_required: f.auth_required,
        auth_issuer: f.auth_issuer.trim(),
        available_models: models,
    };
    if (f.quota_tokens_per_day.trim() !== '') {
        const n = Number(f.quota_tokens_per_day);
        if (!Number.isFinite(n)) return 'quota_tokens_per_day must be a number';
        body.quota_tokens_per_day = n;
    }
    if (f.quota_rpm.trim() !== '') {
        const n = Number(f.quota_rpm);
        if (!Number.isFinite(n)) return 'quota_rpm must be a number';
        body.quota_rpm = n;
    }
    return body;
}

// buildUpdateBody mirrors buildCreateBody but emits the partial-update shape
// expected by PATCH (with the explicit clear_* flags for nullable columns).
function buildUpdateBody(f: FleetForm): UpdateFleetBody | string {
    const models = parseModels(f.available_models_json);
    if (typeof models === 'string') return models;
    const body: UpdateFleetBody = {
        name: f.name.trim(),
        owner: f.owner.trim(),
        zone: f.zone.trim(),
        vllm_mode: f.vllm_mode.trim() || 'single_gpu',
        multi_model: f.multi_model,
        endpoint: f.endpoint.trim(),
        attestation_server: f.attestation_server.trim(),
        auth_required: f.auth_required,
        auth_issuer: f.auth_issuer.trim(),
        available_models: models,
    };
    const aliasTrim = f.alias.trim();
    if (aliasTrim === '') body.clear_alias = true;
    else body.alias = aliasTrim;
    if (f.quota_tokens_per_day.trim() === '') body.clear_quota_tokens_per_day = true;
    else {
        const n = Number(f.quota_tokens_per_day);
        if (!Number.isFinite(n)) return 'quota_tokens_per_day must be a number';
        body.quota_tokens_per_day = n;
    }
    if (f.quota_rpm.trim() === '') body.clear_quota_rpm = true;
    else {
        const n = Number(f.quota_rpm);
        if (!Number.isFinite(n)) return 'quota_rpm must be a number';
        body.quota_rpm = n;
    }
    return body;
}

export default function AdminFleetsPage() {
    const { session } = useAuth();
    const [fleets, setFleets] = useState<Fleet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<Fleet | 'new' | null>(null);

    function reload() {
        if (!session?.accessToken) return;
        setLoading(true);
        listFleets(session.accessToken)
            .then((r) => setFleets(r.fleets ?? []))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    return (
        <div className="max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">AI fleets</h1>
                    <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                        Fleets group GPU enclaves that share a model menu, quota,
                        and orchestrator endpoint. Pick a fleet to manage its AI
                        tools (MCP catalogue) shown to chat users.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setEditing('new')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80">
                    + Add fleet
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
                                <th className="text-left px-4 py-3 font-medium">Alias</th>
                                <th className="text-left px-4 py-3 font-medium">Owner</th>
                                <th className="text-left px-4 py-3 font-medium">Zone</th>
                                <th className="text-left px-4 py-3 font-medium">Mode</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {fleets.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-black/50 dark:text-white/50">
                                        No fleets yet. Click <strong>+ Add fleet</strong> to create one.
                                    </td>
                                </tr>
                            )}
                            {fleets.map((f) => (
                                <tr key={f.id} className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/2 dark:hover:bg-white/2">
                                    <td className="px-4 py-3 font-medium">{f.name}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{f.alias ?? '—'}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{f.owner}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{f.zone ?? '—'}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{f.vllm_mode}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <Link
                                            href={`/dashboard/admin/fleets/${f.id}/tools`}
                                            className="text-sm font-medium underline mr-4">
                                            Tools
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setEditing(f)}
                                            className="text-sm font-medium underline mr-4">
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!session?.accessToken) return;
                                                if (!confirm(`Delete fleet "${f.name}"? Enclaves will be unassigned and per-fleet AI tools removed.`)) return;
                                                try {
                                                    await adminDeleteFleet(session.accessToken, f.id);
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
                <FleetEditor
                    fleet={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        reload();
                    }}
                    token={session?.accessToken ?? ''}
                />
            )}
        </div>
    );
}

function FleetEditor({
    fleet,
    onClose,
    onSaved,
    token,
}: {
    fleet: Fleet | null;
    onClose: () => void;
    onSaved: () => void;
    token: string;
}) {
    const initial = useMemo<FleetForm>(
        () => (fleet ? fleetToForm(fleet) : EMPTY_FORM),
        [fleet],
    );
    const [form, setForm] = useState<FleetForm>(initial);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    function set<K extends keyof FleetForm>(k: K, v: FleetForm[K]) {
        setForm((s) => ({ ...s, [k]: v }));
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!token) {
            setErr('Not authenticated');
            return;
        }
        if (!form.name.trim() || !form.owner.trim() || !form.zone.trim()) {
            setErr('name, owner, and zone are required');
            return;
        }
        setSaving(true);
        try {
            if (fleet) {
                const body = buildUpdateBody(form);
                if (typeof body === 'string') {
                    setErr(body);
                    setSaving(false);
                    return;
                }
                await adminUpdateFleet(token, fleet.id, body);
            } else {
                const body = buildCreateBody(form);
                if (typeof body === 'string') {
                    setErr(body);
                    setSaving(false);
                    return;
                }
                await adminCreateFleet(token, body);
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
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-black/10 dark:border-white/10">
                <form onSubmit={submit} className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                            {fleet ? `Edit fleet: ${fleet.name}` : 'Add fleet'}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-sm text-black/60 dark:text-white/60 hover:underline">
                            Close
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Name *" hint="Unique fleet name (also acts as the URL slug if no alias is set).">
                            <input
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                className={inputCls}
                                required
                            />
                        </Field>
                        <Field label="Alias" hint="Optional short URL key, e.g. 'demo'.">
                            <input
                                value={form.alias}
                                onChange={(e) => set('alias', e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Owner *" hint="Owning org / tenant ID.">
                            <input
                                value={form.owner}
                                onChange={(e) => set('owner', e.target.value)}
                                className={inputCls}
                                required
                            />
                        </Field>
                        <Field label="Zone *" hint="GCP zone, e.g. europe-west4-c.">
                            <input
                                value={form.zone}
                                onChange={(e) => set('zone', e.target.value)}
                                className={inputCls}
                                required
                            />
                        </Field>
                        <Field label="vLLM mode" hint="single_gpu | multi_gpu | external">
                            <input
                                value={form.vllm_mode}
                                onChange={(e) => set('vllm_mode', e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Multi-model" hint="True if the fleet can hot-swap between models in the menu.">
                            <label className="inline-flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    checked={form.multi_model}
                                    onChange={(e) => set('multi_model', e.target.checked)}
                                />
                                <span className="text-sm">multi_model</span>
                            </label>
                        </Field>
                        <Field label="Quota: tokens / day" hint="Blank = unlimited.">
                            <input
                                value={form.quota_tokens_per_day}
                                onChange={(e) => set('quota_tokens_per_day', e.target.value)}
                                className={inputCls}
                                inputMode="numeric"
                            />
                        </Field>
                        <Field label="Quota: requests / minute" hint="Blank = unlimited.">
                            <input
                                value={form.quota_rpm}
                                onChange={(e) => set('quota_rpm', e.target.value)}
                                className={inputCls}
                                inputMode="numeric"
                            />
                        </Field>
                        <Field label="Endpoint" hint="Public chat orchestrator URL (e.g. https://confidential-ai.apps-test.privasys.org).">
                            <input
                                value={form.endpoint}
                                onChange={(e) => set('endpoint', e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Attestation server" hint="URL of the attestation-server vouching for the fleet.">
                            <input
                                value={form.attestation_server}
                                onChange={(e) => set('attestation_server', e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Auth required" hint="If true, the chat UI must obtain a JWT before talking to the fleet.">
                            <label className="inline-flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    checked={form.auth_required}
                                    onChange={(e) => set('auth_required', e.target.checked)}
                                />
                                <span className="text-sm">auth_required</span>
                            </label>
                        </Field>
                        <Field label="Auth issuer" hint="OIDC issuer URL (e.g. https://privasys.id).">
                            <input
                                value={form.auth_issuer}
                                onChange={(e) => set('auth_issuer', e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field label="Available models (JSON array)" hint="Each entry: {name, label?, digest, modality, loaded, loadable, load_time_seconds?}.">
                        <textarea
                            value={form.available_models_json}
                            onChange={(e) => set('available_models_json', e.target.value)}
                            className={`${inputCls} font-mono text-xs h-48`}
                            spellCheck={false}
                        />
                    </Field>

                    {err && (
                        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                            {err}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md text-sm font-medium border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/80">
                            {saving ? 'Saving…' : fleet ? 'Save changes' : 'Create fleet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const inputCls =
    'w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';

function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="block text-sm font-medium mb-1">{label}</span>
            {children}
            {hint && (
                <span className="block text-xs text-black/50 dark:text-white/50 mt-1">{hint}</span>
            )}
        </label>
    );
}
