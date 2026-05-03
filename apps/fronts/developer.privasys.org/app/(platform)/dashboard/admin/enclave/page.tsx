'use client';

import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { adminEnclaveHealth, adminInspectEnclave, adminListEnclaves, adminCreateEnclave, adminUpdateEnclave, adminDeleteEnclave } from '~/lib/api';
import { useSSE } from '~/lib/use-sse';
import { COUNTRIES, regionForCountry, countryName } from '~/lib/countries';
import type { Enclave, CreateEnclaveRequest, TeeType } from '~/lib/types';

const EMPTY_FORM: CreateEnclaveRequest = {
    name: '', host: '', port: 8445, gateway_host: '', tee_type: 'sgx', mr_enclave: '', country: '', region: '', zone: '', provider: '', owner: '', max_apps: 10,
};

const ENC_STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    retired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const PAGE_SIZE = 50;

const INPUT_CLS = 'w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';

export default function AdminEnclavePage() {
    const { session } = useAuth();
    const [enclaves, setEnclaves] = useState<Enclave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<CreateEnclaveRequest>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [fetchingMr, setFetchingMr] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [enclaveHealth, setEnclaveHealth] = useState<Record<string, { status: string; error?: string } | null>>({});

    // Filters
    const [search, setSearch] = useState('');
    const [filterCountry, setFilterCountry] = useState('');
    const [filterProvider, setFilterProvider] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterOwner, setFilterOwner] = useState('');
    const [filterTeeType, setFilterTeeType] = useState('');
    const [page, setPage] = useState(0);

    const isManager = hasManagerRole(session?.roles);

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setError(null);
        try {
            const enc = await adminListEnclaves(session.accessToken);
            setEnclaves(enc);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => { load(); }, [load]);

    // SSE: refresh enclave list on any enclave update
    useSSE(session?.accessToken, useCallback(() => { load(); }, [load]));

    async function checkHealth(enc: Enclave) {
        if (!session?.accessToken) return;
        setEnclaveHealth(prev => ({ ...prev, [enc.id]: null })); // loading state
        try {
            const h = await adminEnclaveHealth(session.accessToken, enc.gateway_host || enc.host, enc.port, enc.tee_type);
            setEnclaveHealth(prev => ({ ...prev, [enc.id]: h }));
        } catch {
            setEnclaveHealth(prev => ({ ...prev, [enc.id]: { status: 'unreachable', error: 'Could not reach enclave' } }));
        }
    }

    // Derive unique filter options from data
    const countries = useMemo(() => [...new Set(enclaves.map(e => e.country).filter(Boolean))].sort(), [enclaves]);
    const providers = useMemo(() => [...new Set(enclaves.map(e => e.provider).filter(Boolean))].sort(), [enclaves]);
    const owners = useMemo(() => [...new Set(enclaves.map(e => e.owner).filter(Boolean))].sort(), [enclaves]);

    // Filter + search
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return enclaves.filter(e => {
            if (filterCountry && e.country !== filterCountry) return false;
            if (filterProvider && e.provider !== filterProvider) return false;
            if (filterStatus && e.status !== filterStatus) return false;
            if (filterOwner && e.owner !== filterOwner) return false;
            if (filterTeeType && e.tee_type !== filterTeeType) return false;
            if (q && !e.name.toLowerCase().includes(q) && !e.host.toLowerCase().includes(q)
                && !e.country.toLowerCase().includes(q) && !e.provider.toLowerCase().includes(q)
                && !e.owner.toLowerCase().includes(q) && !e.mr_enclave.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [enclaves, search, filterCountry, filterProvider, filterStatus, filterOwner, filterTeeType]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageEnclaves = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Reset page when filters change
    useEffect(() => { setPage(0); }, [search, filterCountry, filterProvider, filterStatus, filterOwner, filterTeeType]);

    function openCreate() {
        setForm({ ...EMPTY_FORM });
        setEditingId(null);
        setShowForm(true);
    }

    function openEdit(enc: Enclave) {
        setForm({
            name: enc.name, host: enc.host, port: enc.port, gateway_host: enc.gateway_host ?? '', tee_type: enc.tee_type || 'sgx', mr_enclave: enc.mr_enclave,
            country: enc.country, region: enc.region, zone: enc.zone ?? '', gps_lat: enc.gps_lat, gps_lon: enc.gps_lon,
            provider: enc.provider, owner: enc.owner, max_apps: enc.max_apps,
        });
        setEditingId(enc.id);
        setShowForm(true);
    }

    async function fetchMrEnclave() {
        if (!session?.accessToken || !form.gateway_host || !form.tee_type) return;
        setFetchingMr(true);
        setError(null);
        try {
            const info = await adminInspectEnclave(session.accessToken, form.gateway_host, form.port || 8445, form.tee_type);
            if (info.mr_enclave) {
                setForm(f => ({ ...f, mr_enclave: info.mr_enclave! }));
            } else {
                setError('No MR_ENCLAVE found in enclave certificate');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to inspect enclave');
        } finally {
            setFetchingMr(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!session?.accessToken) return;
        // Client-side validation: cloud-image deploys need a zone; the field used to
        // be advertised as optional but the server rejects deploys without it.
        if (form.tee_type === 'tdx' && !form.zone?.trim()) {
            setError('Cloud zone is required for TDX enclaves (cloud-image deployments need a zonal disk reference).');
            return;
        }
        if (!form.gateway_host?.trim()) {
            setError('IP address is required — the management service connects to the enclave by IP, not by DNS name.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const payload = { ...form, region: regionForCountry(form.country ?? ''), zone: form.zone?.trim() || undefined, gateway_host: form.gateway_host || undefined };
            if (editingId) {
                await adminUpdateEnclave(session.accessToken, editingId, payload);
            } else {
                await adminCreateEnclave(session.accessToken, payload);
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
        if (!confirm('Delete this enclave? All apps assigned to it will be unlinked.')) return;
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

    return (
        <div className="max-w-6xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Enclave management</h1>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                        {enclaves.length} enclave{enclaves.length !== 1 ? 's' : ''} registered
                        {filtered.length !== enclaves.length && ` · ${filtered.length} shown`}
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

            {/* Create / Edit form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-4">
                    <h2 className="text-sm font-semibold">{editingId ? 'Edit enclave' : 'Register new enclave'}</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1">Name *</label>
                            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">TEE type</label>
                            <select value={form.tee_type ?? 'sgx'} onChange={e => setForm(f => ({ ...f, tee_type: e.target.value as TeeType }))}
                                className={INPUT_CLS}>
                                <option value="sgx">SGX</option>
                                <option value="tdx">TDX</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Port</label>
                            <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) || 8445 }))}
                                className={INPUT_CLS} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium mb-1">IP address *</label>
                            <input required value={form.gateway_host ?? ''} onChange={e => setForm(f => ({ ...f, gateway_host: e.target.value }))}
                                placeholder="e.g. 34.32.151.96"
                                className={INPUT_CLS} />
                            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                                The management service connects to this IP directly. For Spot VMs
                                with rotating IPs, just edit this field and save — no restart needed.
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1" title="Default 10. Higher for multi-tenant nodes. 0 = unlimited (use with care: a single 1-GPU box typically can't run more than ~3 model containers).">
                                Max apps <span className="text-black/40 dark:text-white/40">(0 = unlimited)</span>
                            </label>
                            <input type="number" value={form.max_apps ?? 10} onChange={e => setForm(f => ({ ...f, max_apps: parseInt(e.target.value) || 0 }))}
                                className={INPUT_CLS} />
                            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                                Default 10. A single-GPU node typically tops out at ~3 model
                                containers; raise for multi-tenant nodes.
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Owner</label>
                            <input value={form.owner ?? ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                                placeholder="e.g. Privasys, Acme Corp"
                                className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Provider</label>
                            <input value={form.provider ?? ''} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                                placeholder="e.g. OVH, Azure, AWS"
                                className={INPUT_CLS} />
                        </div>
                        {form.tee_type !== 'tdx' && (
                            <div className="col-span-3">
                                <label className="block text-xs font-medium mb-1">MR_ENCLAVE</label>
                                <div className="flex gap-2">
                                    <input value={form.mr_enclave ?? ''} onChange={e => setForm(f => ({ ...f, mr_enclave: e.target.value }))}
                                        placeholder="Hex-encoded measurement hash"
                                        className={`${INPUT_CLS} font-mono text-xs flex-1`} />
                                    <button type="button" onClick={fetchMrEnclave} disabled={fetchingMr || !form.gateway_host}
                                        className="px-3 py-2 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors whitespace-nowrap">
                                        {fetchingMr ? 'Fetching…' : 'Fetch from enclave'}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium mb-1">Country</label>
                            <select value={form.country ?? ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                                className={INPUT_CLS}>
                                <option value="">Select a country…</option>
                                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="text-xs font-medium mb-1">Region</div>
                            <div className="px-3 py-2 text-sm text-black/60 dark:text-white/60">
                                {form.country ? regionForCountry(form.country) : <span className="text-black/30 dark:text-white/30">— (derived from country)</span>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">
                                Cloud zone {form.tee_type === 'tdx' ? '*' : '(optional for SGX)'}
                            </label>
                            <input required={form.tee_type === 'tdx'} value={form.zone ?? ''} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                                placeholder="e.g. europe-west4-c"
                                className={INPUT_CLS} />
                            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                                Required for TDX enclaves: cloud-image deployments use a zonal
                                GCE disk and need this hint to find it.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium mb-1">GPS Lat</label>
                                <input type="number" step="any" value={form.gps_lat ?? ''} onChange={e => setForm(f => ({ ...f, gps_lat: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                    className={INPUT_CLS} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">GPS Lon</label>
                                <input type="number" step="any" value={form.gps_lon ?? ''} onChange={e => setForm(f => ({ ...f, gps_lon: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                    className={INPUT_CLS} />
                            </div>
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

            {/* Search + Filters */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, host, country, provider, owner…"
                    className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                />
                {countries.length > 1 && (
                    <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent">
                        <option value="">All countries</option>
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                )}
                {providers.length > 1 && (
                    <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent">
                        <option value="">All providers</option>
                        {providers.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}
                {owners.length > 1 && (
                    <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent">
                        <option value="">All owners</option>
                        {owners.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                )}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent">
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                </select>
                <select value={filterTeeType} onChange={e => setFilterTeeType(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent">
                    <option value="">All TEE types</option>
                    <option value="sgx">SGX</option>
                    <option value="tdx">TDX</option>
                </select>
            </div>

            {/* Enclave table */}
            {loading && enclaves.length === 0 ? (
                <div className="mt-8 text-center py-12 text-sm text-black/40 dark:text-white/40 animate-pulse">Loading enclaves…</div>
            ) : filtered.length === 0 ? (
                <div className="mt-8 text-center py-12 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
                    <div className="text-sm text-black/40 dark:text-white/40">
                        {enclaves.length === 0 ? 'No enclaves registered. Click "Add enclave" to register one.' : 'No enclaves match your filters.'}
                    </div>
                </div>
            ) : (
                <>
                    <div className="mt-4 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                                    <th className="text-left px-4 py-3 font-medium">Name</th>
                                    <th className="text-left px-4 py-3 font-medium">TEE</th>
                                    <th className="text-left px-4 py-3 font-medium">IP : Port</th>
                                    <th className="text-left px-4 py-3 font-medium">Location</th>
                                    <th className="text-left px-4 py-3 font-medium">Owner</th>
                                    <th className="text-left px-4 py-3 font-medium">Provider</th>
                                    <th className="text-left px-4 py-3 font-medium">Apps</th>
                                    <th className="text-left px-4 py-3 font-medium">Status</th>
                                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageEnclaves.map((enc) => (
                                    <>
                                        <tr
                                            key={enc.id}
                                            className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                                            onClick={() => setExpandedId(expandedId === enc.id ? null : enc.id)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{enc.name}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${enc.tee_type === 'tdx' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                                                    {(enc.tee_type || 'sgx').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <code className="text-xs">{enc.gateway_host || enc.host}:{enc.port}</code>
                                            </td>
                                            <td className="px-4 py-3 text-black/60 dark:text-white/60">
                                                {enc.country ? countryName(enc.country) : '—'}{enc.region ? ` · ${enc.region}` : ''}
                                            </td>
                                            <td className="px-4 py-3 text-black/60 dark:text-white/60">
                                                {enc.owner || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-black/60 dark:text-white/60">
                                                {enc.provider || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs">
                                                    {enc.app_count}{enc.max_apps > 0 ? ` / ${enc.max_apps}` : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${ENC_STATUS_COLORS[enc.status] ?? ''}`}>
                                                    {enc.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={e => { e.stopPropagation(); openEdit(enc); }}
                                                    className="text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white mr-3">
                                                    Edit
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); handleDelete(enc.id); }}
                                                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === enc.id && (
                                            <tr key={`${enc.id}-detail`}>
                                                <td colSpan={9} className="bg-black/[0.01] dark:bg-white/[0.01] px-6 py-4 border-b border-black/5 dark:border-white/5">
                                                    <div className="grid grid-cols-3 gap-y-3 gap-x-8 text-sm">
                                                        <div className="col-span-3 flex items-center gap-3">
                                                            <button onClick={(e) => { e.stopPropagation(); checkHealth(enc); }}
                                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                                Check health
                                                            </button>
                                                            {enc.id in enclaveHealth && (
                                                                enclaveHealth[enc.id] === null ? (
                                                                    <span className="text-xs text-black/40 dark:text-white/40 animate-pulse">Checking…</span>
                                                                ) : (
                                                                    <span className="flex items-center gap-2">
                                                                        <span className={`w-2.5 h-2.5 rounded-full ${enclaveHealth[enc.id]?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                                        <span className="text-xs font-medium">{enclaveHealth[enc.id]?.status === 'healthy' ? 'Healthy' : 'Unhealthy'}</span>
                                                                        {enclaveHealth[enc.id]?.error && <span className="text-xs text-red-600 dark:text-red-400">{enclaveHealth[enc.id]?.error}</span>}
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                        {enc.mr_enclave && (
                                                            <div className="col-span-3">
                                                                <div className="text-xs text-black/50 dark:text-white/50">MR_ENCLAVE</div>
                                                                <code className="text-xs mt-0.5 bg-black/5 dark:bg-white/5 px-2 py-1 rounded break-all block">{enc.mr_enclave}</code>
                                                            </div>
                                                        )}
                                                        {enc.gateway_host && (
                                                            <div className="col-span-3">
                                                                <div className="text-xs text-black/50 dark:text-white/50">IP address</div>
                                                                <code className="text-xs mt-0.5">{enc.gateway_host}</code>
                                                            </div>
                                                        )}
                                                        {(enc.gps_lat != null && enc.gps_lon != null) && (
                                                            <div>
                                                                <div className="text-xs text-black/50 dark:text-white/50">GPS</div>
                                                                <div className="mt-0.5 text-xs">{enc.gps_lat}, {enc.gps_lon}</div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-xs text-black/50 dark:text-white/50">Max apps</div>
                                                            <div className="mt-0.5">{enc.max_apps === 0 ? 'Unlimited' : enc.max_apps}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-black/50 dark:text-white/50">Created</div>
                                                            <div className="mt-0.5">{new Date(enc.created_at).toLocaleString()}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-black/50 dark:text-white/50">Updated</div>
                                                            <div className="mt-0.5">{new Date(enc.updated_at).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-black/50 dark:text-white/50">
                                Page {page + 1} of {totalPages} · {filtered.length} enclave{filtered.length !== 1 ? 's' : ''}
                            </span>
                            <div className="flex gap-2">
                                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                                    className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    Previous
                                </button>
                                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                                    className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
