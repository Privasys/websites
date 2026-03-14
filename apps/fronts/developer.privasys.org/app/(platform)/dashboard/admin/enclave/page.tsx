'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { adminEnclaveHealth, adminListEnclaveApps, adminListEnclaves, adminCreateEnclave, adminUpdateEnclave, adminDeleteEnclave } from '~/lib/api';
import type { Enclave, CreateEnclaveRequest } from '~/lib/types';

const EMPTY_FORM: CreateEnclaveRequest = {
    name: '', host: '', port: 8445, mr_enclave: '', country: '', region: '', provider: '', max_apps: 0,
};

const ENC_STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    retired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

export default function AdminEnclavePage() {
    const { data: session } = useSession();
    const [health, setHealth] = useState<{ status: string; error?: string } | null>(null);
    const [apps, setApps] = useState<unknown>(null);
    const [enclaves, setEnclaves] = useState<Enclave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<CreateEnclaveRequest>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const isManager = session?.roles?.some((r: string) => r.endsWith(':manager') || r === 'privasys-platform:admin') ?? false;

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setError(null);
        try {
            const [h, a, enc] = await Promise.allSettled([
                adminEnclaveHealth(session.accessToken),
                adminListEnclaveApps(session.accessToken),
                adminListEnclaves(session.accessToken),
            ]);
            setHealth(h.status === 'fulfilled' ? h.value : { status: 'unreachable' });
            setApps(a.status === 'fulfilled' ? a.value : null);
            if (enc.status === 'fulfilled') setEnclaves(enc.value);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => { load(); }, [load]);

    function openCreate() {
        setForm({ ...EMPTY_FORM });
        setEditingId(null);
        setShowForm(true);
    }

    function openEdit(enc: Enclave) {
        setForm({
            name: enc.name, host: enc.host, port: enc.port, mr_enclave: enc.mr_enclave,
            country: enc.country, region: enc.region, gps_lat: enc.gps_lat, gps_lon: enc.gps_lon,
            provider: enc.provider, max_apps: enc.max_apps,
        });
        setEditingId(enc.id);
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!session?.accessToken) return;
        setSaving(true);
        setError(null);
        try {
            if (editingId) {
                await adminUpdateEnclave(session.accessToken, editingId, form);
            } else {
                await adminCreateEnclave(session.accessToken, form);
            }
            setShowForm(false);
            setEditingId(null);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!session?.accessToken) return;
        if (!confirm('Delete this enclave?')) return;
        try {
            await adminDeleteEnclave(session.accessToken, id);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        }
    }

    if (!isManager) {
        return <p className="text-sm text-red-600">Access denied. Manager role required.</p>;
    }

    const healthy = health?.status === 'healthy';

    return (
        <div className="max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Enclave management</h1>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Manage enclave instances, health, and deployed modules.
                    </p>
                </div>
                <button onClick={openCreate}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity">
                    Add enclave
                </button>
            </div>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

            {/* Default enclave health */}
            <section className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Default enclave health</h2>
                    <button onClick={load} disabled={loading}
                        className="text-xs text-black/50 dark:text-white/50 hover:underline disabled:opacity-40">
                        {loading ? 'Checking…' : 'Refresh'}
                    </button>
                </div>
                {loading && !health ? (
                    <div className="mt-3 text-sm text-black/40 dark:text-white/40 animate-pulse">Checking enclave…</div>
                ) : health ? (
                    <div className="mt-3 flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">{healthy ? 'Healthy' : 'Unhealthy'}</span>
                        {health.error && <span className="text-xs text-red-600 dark:text-red-400">{health.error}</span>}
                    </div>
                ) : null}
            </section>

            {/* Deployed modules */}
            <section className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold mb-3">Deployed modules</h2>
                {loading && !apps ? (
                    <div className="text-sm text-black/40 dark:text-white/40 animate-pulse">Loading…</div>
                ) : apps && typeof apps === 'object' ? (
                    <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(apps, null, 2)}
                    </pre>
                ) : (
                    <p className="text-sm text-black/50 dark:text-white/50">No modules or unable to reach enclave.</p>
                )}
            </section>

            {/* Create / Edit form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-4">
                    <h2 className="text-sm font-semibold">{editingId ? 'Edit enclave' : 'Register new enclave'}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1">Name *</label>
                            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Host *</label>
                            <input required value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Port</label>
                            <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) || 8445 }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Provider</label>
                            <input value={form.provider ?? ''} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                                placeholder="e.g. OVH, Azure, AWS"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium mb-1">MR_ENCLAVE</label>
                            <input value={form.mr_enclave ?? ''} onChange={e => setForm(f => ({ ...f, mr_enclave: e.target.value }))}
                                placeholder="Hex-encoded measurement hash"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent font-mono text-xs focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Country</label>
                            <input value={form.country ?? ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                                placeholder="e.g. FR, DE"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Region</label>
                            <input value={form.region ?? ''} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                                placeholder="e.g. europe-west9"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">GPS Latitude</label>
                            <input type="number" step="any" value={form.gps_lat ?? ''} onChange={e => setForm(f => ({ ...f, gps_lat: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">GPS Longitude</label>
                            <input type="number" step="any" value={form.gps_lon ?? ''} onChange={e => setForm(f => ({ ...f, gps_lon: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Max apps (0 = unlimited)</label>
                            <input type="number" value={form.max_apps ?? 0} onChange={e => setForm(f => ({ ...f, max_apps: parseInt(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving}
                            className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity">
                            {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)}
                            className="text-sm text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Registered enclaves */}
            <h2 className="mt-8 text-lg font-semibold">Registered enclaves</h2>
            {enclaves.length === 0 ? (
                <div className="mt-4 text-center py-8 text-black/40 dark:text-white/40 text-sm">
                    No enclaves registered. Click &quot;Add enclave&quot; to register one.
                </div>
            ) : (
                <div className="mt-4 space-y-3">
                    {enclaves.map((enc) => (
                        <div key={enc.id} className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                                onClick={() => setExpandedId(expandedId === enc.id ? null : enc.id)}>
                                <div>
                                    <div className="text-sm font-medium">{enc.name}</div>
                                    <div className="text-xs text-black/50 dark:text-white/50">
                                        {enc.host}:{enc.port}
                                        {enc.country && ` · ${enc.country}`}
                                        {enc.provider && ` · ${enc.provider}`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-black/40 dark:text-white/40">
                                        {enc.app_count} app{enc.app_count !== 1 ? 's' : ''}
                                        {enc.max_apps > 0 ? ` / ${enc.max_apps}` : ''}
                                    </span>
                                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${ENC_STATUS_COLORS[enc.status] ?? ''}`}>
                                        {enc.status}
                                    </span>
                                    <svg className={`w-4 h-4 text-black/30 dark:text-white/30 transition-transform ${expandedId === enc.id ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                            {expandedId === enc.id && (
                                <div className="border-t border-black/5 dark:border-white/5 px-5 py-4">
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                                        <div>
                                            <div className="text-xs text-black/50 dark:text-white/50">Host</div>
                                            <code className="text-xs mt-0.5 block">{enc.host}:{enc.port}</code>
                                        </div>
                                        {enc.mr_enclave && (
                                            <div className="col-span-2">
                                                <div className="text-xs text-black/50 dark:text-white/50">MR_ENCLAVE</div>
                                                <code className="text-xs mt-0.5 bg-black/5 dark:bg-white/5 px-2 py-1 rounded break-all block">{enc.mr_enclave}</code>
                                            </div>
                                        )}
                                        {enc.country && (
                                            <div>
                                                <div className="text-xs text-black/50 dark:text-white/50">Location</div>
                                                <div className="mt-0.5">{enc.country}{enc.region ? ` · ${enc.region}` : ''}</div>
                                            </div>
                                        )}
                                        {(enc.gps_lat != null && enc.gps_lon != null) && (
                                            <div>
                                                <div className="text-xs text-black/50 dark:text-white/50">GPS</div>
                                                <div className="mt-0.5 text-xs">{enc.gps_lat}, {enc.gps_lon}</div>
                                            </div>
                                        )}
                                        {enc.provider && (
                                            <div>
                                                <div className="text-xs text-black/50 dark:text-white/50">Provider</div>
                                                <div className="mt-0.5">{enc.provider}</div>
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-xs text-black/50 dark:text-white/50">Created</div>
                                            <div className="mt-0.5">{new Date(enc.created_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-3">
                                        <button onClick={() => openEdit(enc)}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(enc.id)}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
