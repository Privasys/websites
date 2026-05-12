'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import {
    adminListFleetTools,
    adminCreateFleetTool,
    adminUpdateFleetTool,
    adminDeleteFleetTool,
} from '~/lib/api';
import type { AITool, CreateAIToolBody } from '~/lib/types';

const TOOL_NAME_RE = /^[a-zA-Z0-9_]+$/;

const EMPTY: CreateAIToolBody = {
    name: '',
    label: '',
    description: '',
    icon: '',
    transport: 'mcp_sse',
    base_url: '',
    app_id: '',
    auth_mode: 'exchange',
    auth_audience: '',
    auth_scopes: [],
    requires_user_confirmation: true,
    enabled_default: true,
    expected_digest: '',
};

function normalizeBody(b: CreateAIToolBody): CreateAIToolBody {
    const out: CreateAIToolBody = { ...b };
    out.icon = out.icon?.trim() || null;
    out.app_id = out.app_id?.trim() || null;
    out.expected_digest = out.expected_digest?.trim() || null;
    out.auth_audience = out.auth_audience?.trim() || null;
    out.auth_scopes = (b.auth_scopes ?? [])
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    return out;
}

export default function AdminFleetToolsPage() {
    const { session } = useAuth();
    const params = useParams<{ id: string }>();
    const fleetId = params.id;
    const [tools, setTools] = useState<AITool[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<AITool | 'new' | null>(null);

    function reload() {
        if (!session?.accessToken) return;
        setLoading(true);
        adminListFleetTools(session.accessToken, fleetId)
            .then((r) => setTools(r.tools ?? []))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(reload, [session?.accessToken, fleetId]);

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
            <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
                <Link href="/dashboard/admin/fleets" className="underline">Fleets</Link>
                <span>/</span>
                <span>{fleetId.slice(0, 8)}…</span>
                <span>/</span>
                <span>Tools</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">AI tools</h1>
                    <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                        Tools listed here are offered to chat users connecting to
                        this fleet. Enabled-by-default tools are pushed to the
                        AI inference container automatically as MCP_SERVERS
                        (manager hot-reload).
                    </p>
                </div>
                <button
                    onClick={() => setEditing('new')}
                    className="text-sm px-3 py-1.5 rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90">
                    + Add tool
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

            {!loading && !error && tools.length === 0 && (
                <div className="mt-10 text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
                    <h2 className="text-lg font-medium">No tools yet</h2>
                    <p className="mt-2 text-sm text-black/50 dark:text-white/50">
                        Add a tool to expose it through this fleet's chat instance.
                    </p>
                </div>
            )}

            {!loading && !error && tools.length > 0 && (
                <div className="mt-6 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                                <th className="text-left px-4 py-3 font-medium">Name</th>
                                <th className="text-left px-4 py-3 font-medium">Label</th>
                                <th className="text-left px-4 py-3 font-medium">Transport</th>
                                <th className="text-left px-4 py-3 font-medium">Auth</th>
                                <th className="text-left px-4 py-3 font-medium">URL</th>
                                <th className="text-left px-4 py-3 font-medium">Default</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {tools.map((t) => (
                                <tr key={t.id} className="border-b border-black/5 dark:border-white/5 last:border-b-0">
                                    <td className="px-4 py-3 font-mono text-xs">{t.name}</td>
                                    <td className="px-4 py-3">{t.label}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{t.transport}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">
                                        {t.auth_mode}
                                        {t.auth_mode === 'exchange' && t.auth_audience && (
                                            <span className="ml-1 text-xs text-black/40 dark:text-white/40">→ {t.auth_audience}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-black/60 dark:text-white/60 truncate max-w-xs">{t.base_url}</td>
                                    <td className="px-4 py-3">
                                        {t.enabled_default ? (
                                            <span className="text-green-600 dark:text-green-400">on</span>
                                        ) : (
                                            <span className="text-black/40 dark:text-white/40">off</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => setEditing(t)}
                                            className="text-sm font-medium underline">
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && session?.accessToken && (
                <ToolEditor
                    fleetId={fleetId}
                    token={session.accessToken}
                    initial={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        reload();
                    }}
                />
            )}
        </div>
    );
}

function ToolEditor({
    fleetId,
    token,
    initial,
    onClose,
    onSaved,
}: {
    fleetId: string;
    token: string;
    initial: AITool | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [body, setBody] = useState<CreateAIToolBody>(() => {
        if (!initial) return EMPTY;
        return {
            name: initial.name,
            label: initial.label,
            description: initial.description,
            icon: initial.icon ?? '',
            transport: initial.transport,
            base_url: initial.base_url,
            app_id: initial.app_id ?? '',
            auth_mode: initial.auth_mode,
            auth_audience: initial.auth_audience ?? '',
            auth_scopes: initial.auth_scopes ?? [],
            requires_user_confirmation: initial.requires_user_confirmation,
            enabled_default: initial.enabled_default,
            expected_digest: initial.expected_digest ?? '',
        };
    });
    const [scopesText, setScopesText] = useState(
        (initial?.auth_scopes ?? []).join(' '),
    );
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const isNew = initial === null;
    const nameValid = TOOL_NAME_RE.test(body.name);

    async function save() {
        setSaving(true);
        setErr(null);
        try {
            const finalBody = normalizeBody({
                ...body,
                auth_scopes: scopesText.split(/\s+/).filter(Boolean),
            });
            if (isNew) {
                await adminCreateFleetTool(token, fleetId, finalBody);
            } else {
                await adminUpdateFleetTool(token, fleetId, initial.id, finalBody);
            }
            onSaved();
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setSaving(false);
        }
    }

    async function destroy() {
        if (!initial) return;
        if (!confirm(`Delete tool "${initial.name}"? This cannot be undone.`)) return;
        setSaving(true);
        setErr(null);
        try {
            await adminDeleteFleetTool(token, fleetId, initial.id);
            onSaved();
        } catch (e) {
            setErr((e as Error).message);
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-xl">
                <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{isNew ? 'Add tool' : `Edit ${initial.name}`}</h2>
                    <button onClick={onClose} className="text-sm text-black/60 dark:text-white/60 hover:underline">Close</button>
                </div>

                <div className="px-6 py-4 space-y-4 text-sm">
                    <Field label="Name (a-zA-Z0-9_)" hint="Becomes the LLM-visible server name">
                        <input
                            value={body.name}
                            disabled={!isNew}
                            onChange={(e) => setBody({ ...body, name: e.target.value })}
                            className={`w-full px-3 py-2 rounded-md border bg-transparent ${nameValid ? 'border-black/10 dark:border-white/10' : 'border-red-500'}`} />
                    </Field>
                    <Field label="Label" hint="Shown to chat users">
                        <input
                            value={body.label}
                            onChange={(e) => setBody({ ...body, label: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent" />
                    </Field>
                    <Field label="Description">
                        <textarea
                            rows={2}
                            value={body.description}
                            onChange={(e) => setBody({ ...body, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent" />
                    </Field>
                    <Field label="Icon URL">
                        <input
                            value={body.icon ?? ''}
                            onChange={(e) => setBody({ ...body, icon: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent" />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Transport">
                            <select
                                value={body.transport}
                                onChange={(e) => setBody({ ...body, transport: e.target.value as 'privasys_http' | 'mcp_sse' })}
                                className="w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent">
                                <option value="mcp_sse">mcp_sse</option>
                                <option value="privasys_http">privasys_http</option>
                            </select>
                        </Field>
                        <Field label="Auth mode">
                            <select
                                value={body.auth_mode}
                                onChange={(e) => setBody({ ...body, auth_mode: e.target.value as CreateAIToolBody['auth_mode'] })}
                                className="w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent">
                                <option value="exchange">exchange</option>
                                <option value="forward">forward</option>
                                <option value="static">static</option>
                                <option value="none">none</option>
                            </select>
                        </Field>
                    </div>
                    <Field label="Base URL">
                        <input
                            value={body.base_url}
                            onChange={(e) => setBody({ ...body, base_url: e.target.value })}
                            placeholder="https://example.com/mcp"
                            className="w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent font-mono text-xs" />
                    </Field>
                    <Field label="App ID (UUID, optional)" hint="Links to a Privasys app for attestation">
                        <input
                            value={body.app_id ?? ''}
                            onChange={(e) => setBody({ ...body, app_id: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent font-mono text-xs" />
                    </Field>
                    {body.auth_mode === 'exchange' && (
                        <Field label="Auth audience" hint="Required for exchange; goes into the per-tool JWT 'aud' claim">
                            <input
                                value={body.auth_audience ?? ''}
                                onChange={(e) => setBody({ ...body, auth_audience: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent" />
                        </Field>
                    )}
                    <Field label="Auth scopes (space-separated)">
                        <input
                            value={scopesText}
                            onChange={(e) => setScopesText(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent" />
                    </Field>
                    <Field label="Expected digest (sha256, optional)">
                        <input
                            value={body.expected_digest ?? ''}
                            onChange={(e) => setBody({ ...body, expected_digest: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent font-mono text-xs" />
                    </Field>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2">
                            <input type="checkbox"
                                checked={body.requires_user_confirmation}
                                onChange={(e) => setBody({ ...body, requires_user_confirmation: e.target.checked })} />
                            <span>Require user confirmation per call</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox"
                                checked={body.enabled_default}
                                onChange={(e) => setBody({ ...body, enabled_default: e.target.checked })} />
                            <span>Enabled by default (pushed to inference container)</span>
                        </label>
                    </div>
                    {err && <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">{err}</div>}
                </div>

                <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 flex justify-between">
                    <div>
                        {!isNew && (
                            <button
                                onClick={destroy}
                                disabled={saving}
                                className="text-sm px-3 py-1.5 rounded-md text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            disabled={saving}
                            className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/10 disabled:opacity-50">
                            Cancel
                        </button>
                        <button
                            onClick={save}
                            disabled={saving || !nameValid || !body.label || !body.base_url}
                            className="text-sm px-3 py-1.5 rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50">
                            {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
        <div>
            <label className="block text-xs font-medium text-black/70 dark:text-white/70">{label}</label>
            {hint && <div className="mt-0.5 text-xs text-black/40 dark:text-white/40">{hint}</div>}
            <div className="mt-1">{children}</div>
        </div>
    );
}
