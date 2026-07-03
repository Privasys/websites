'use client';

import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { adminEnclaveHealth, adminInspectEnclave, adminEnclaveMeasurements, adminListEnclaves, adminCreateEnclave, adminUpdateEnclave, adminDeleteEnclave, adminListCloudProviders, adminListCloudRegions, adminMatchCloudRegion, adminRefreshCloudRegions } from '~/lib/api';
import { useSSE } from '~/lib/sse-context';
import { COUNTRIES, regionForCountry, displayCountryName } from '~/lib/countries';
import type { Enclave, CreateEnclaveRequest, TeeType, EnclaveMeasurements, CloudProvider, CloudRegion, CloudRegionsMeta } from '~/lib/types';

const EMPTY_FORM: CreateEnclaveRequest = {
    name: '', port: 8445, gateway_host: '', tee_type: 'sgx', mr_enclave: '', country: '', region: '', zone: '', provider: '', owner: '',
    city: '', country_code: '', continent: '', cloud_region_code: '', max_apps: 10, os_release_url: '',
};

// OTHER_PROVIDER marks a provider outside the cloud-regions dataset: the
// admin types the name and fills the location manually.
const OTHER_PROVIDER = '__other__';

// FieldLabel: label + optional required marker + a "?" toggle that reveals the
// field's help text on demand (descriptions stay hidden by default so they
// don't dwarf the field labels).
function FieldLabel({ label, required, help }: { label: string; required?: boolean; help?: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="mb-1">
            <span className="inline-flex items-center gap-1.5">
                <label className="text-xs font-medium">{label}{required ? ' *' : ''}</label>
                {help && (
                    <button type="button" onClick={() => setOpen(o => !o)} title={open ? 'Hide help' : 'What is this?'}
                        className={`w-4 h-4 flex items-center justify-center rounded-full border text-[10px] leading-none transition-colors ${open
                            ? 'border-black/40 text-black/70 dark:border-white/40 dark:text-white/70'
                            : 'border-black/20 text-black/40 dark:border-white/20 dark:text-white/40 hover:border-black/40 hover:text-black/70 dark:hover:border-white/40 dark:hover:text-white/70'}`}>
                        ?
                    </button>
                )}
            </span>
            {help && open && <p className="mt-1 text-[11px] leading-snug text-black/40 dark:text-white/40">{help}</p>}
        </div>
    );
}

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
    // null = loading, undefined-key = not fetched yet
    const [measurements, setMeasurements] = useState<Record<string, EnclaveMeasurements | null>>({});

    // Cloud-region reference data: providers dropdown + per-provider regions +
    // the zone→region match that pre-fills the location fields.
    const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([]);
    const [regionsMeta, setRegionsMeta] = useState<CloudRegionsMeta | null>(null);
    const [providerSel, setProviderSel] = useState<string>('');   // '' | provider id | OTHER_PROVIDER
    const [cloudRegions, setCloudRegions] = useState<CloudRegion[]>([]);
    const [matched, setMatched] = useState<CloudRegion | null>(null);
    const [matchState, setMatchState] = useState<'idle' | 'checking' | 'matched' | 'none'>('idle');
    const [refreshing, setRefreshing] = useState(false);
    const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterCountry, setFilterCountry] = useState('');
    const [filterProvider, setFilterProvider] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterOwner, setFilterOwner] = useState('');
    const [filterTeeType, setFilterTeeType] = useState('');
    const [page, setPage] = useState(0);

    const isManager = hasManagerRole(session?.roles);

    // Location fields (country/city/GPS) are dataset-managed while a known
    // provider's region is selected; "Custom location…" in Region unlocks them.
    const regionLocked = !!providerSel && providerSel !== OTHER_PROVIDER && !!form.cloud_region_code?.trim();

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
    useSSE(useCallback(() => { load(); }, [load]));

    // Load the cloud-provider reference list once (drives the Provider dropdown).
    useEffect(() => {
        if (!session?.accessToken) return;
        adminListCloudProviders(session.accessToken)
            .then(r => { setCloudProviders(r.providers); setRegionsMeta(r.meta); })
            .catch(() => { /* dropdown falls back to Other/manual */ });
    }, [session?.accessToken]);

    // Load the selected provider's regions (drives the Region dropdown).
    useEffect(() => {
        if (!session?.accessToken || !providerSel || providerSel === OTHER_PROVIDER) { setCloudRegions([]); return; }
        let alive = true;
        adminListCloudRegions(session.accessToken, providerSel)
            .then(r => { if (alive) setCloudRegions(r.regions); })
            .catch(() => { if (alive) setCloudRegions([]); });
        return () => { alive = false; };
    }, [session?.accessToken, providerSel]);

    // applyRegion pre-fills the location fields from a matched/selected region.
    // The admin can still edit any field afterwards; a new match overwrites.
    const applyRegion = useCallback((m: CloudRegion, seedZone?: boolean) => {
        setMatched(m);
        setMatchState('matched');
        setForm(f => ({
            ...f,
            country: m.country_code,
            country_code: m.country_code,
            region: m.region_label,
            city: m.city,
            continent: m.continent,
            cloud_region_code: m.region_code,
            gps_lat: m.latitude,
            gps_lon: m.longitude,
            ...(seedZone ? { zone: m.region_code } : {})
        }));
    }, []);

    // Debounced zone→region match: typing a zone (e.g. europe-west4-c) resolves
    // it to the provider's region and pre-fills the location metadata.
    useEffect(() => {
        if (!session?.accessToken || !showForm) return;
        const zone = form.zone?.trim() ?? '';
        if (!providerSel || providerSel === OTHER_PROVIDER || !zone) { setMatchState('idle'); setMatched(null); return; }
        setMatchState('checking');
        const t = setTimeout(() => {
            adminMatchCloudRegion(session.accessToken!, providerSel, zone)
                .then(m => applyRegion(m))
                .catch(() => { setMatched(null); setMatchState('none'); });
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accessToken, showForm, providerSel, form.zone]);

    async function handleRefreshRegions() {
        if (!session?.accessToken) return;
        setRefreshing(true);
        setRefreshMsg(null);
        try {
            const r = await adminRefreshCloudRegions(session.accessToken);
            setRegionsMeta(r.meta);
            setRefreshMsg(`${r.providers} providers · ${r.regions} regions · source v${r.meta.source_version} (${r.meta.source_updated})`);
            const p = await adminListCloudProviders(session.accessToken);
            setCloudProviders(p.providers);
        } catch (e) {
            setRefreshMsg(e instanceof Error ? e.message : 'Refresh failed');
        } finally {
            setRefreshing(false);
        }
    }

    async function checkHealth(enc: Enclave) {
        if (!session?.accessToken) return;
        setEnclaveHealth(prev => ({ ...prev, [enc.id]: null })); // loading state
        try {
            const h = await adminEnclaveHealth(session.accessToken, enc.gateway_host || '', enc.port, enc.tee_type);
            setEnclaveHealth(prev => ({ ...prev, [enc.id]: h }));
        } catch {
            setEnclaveHealth(prev => ({ ...prev, [enc.id]: { status: 'unreachable', error: 'Could not reach enclave' } }));
        }
    }

    // Load the attested measurements an enclave has reported (TDX MRTD/RTMRs;
    // SGX MRENCLAVE). Cached per enclave; fetched when a row is first expanded.
    const loadMeasurements = useCallback(async (id: string) => {
        if (!session?.accessToken) return;
        setMeasurements(prev => ({ ...prev, [id]: null })); // loading
        try {
            const m = await adminEnclaveMeasurements(session.accessToken, id);
            setMeasurements(prev => ({ ...prev, [id]: m }));
        } catch {
            setMeasurements(prev => ({ ...prev, [id]: { tee_type: 'sgx' } }));
        }
    }, [session?.accessToken]);

    function toggleExpand(id: string) {
        const opening = expandedId !== id;
        setExpandedId(opening ? id : null);
        if (opening && !(id in measurements)) loadMeasurements(id);
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
            if (q && !e.name.toLowerCase().includes(q) && !(e.gateway_host ?? '').toLowerCase().includes(q)
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

    // resolveProviderSel maps a stored provider string back to a dataset
    // provider id ("GCP"→gcp, "OVHcloud"→ovh) or OTHER_PROVIDER.
    function resolveProviderSel(provider: string): string {
        const p = provider.trim().toLowerCase();
        if (!p) return '';
        const hit = cloudProviders.find(cp => cp.id.toLowerCase() === p || cp.name.toLowerCase() === p);
        return hit ? hit.id : OTHER_PROVIDER;
    }

    function openCreate() {
        setForm({ ...EMPTY_FORM });
        setProviderSel('');
        setMatched(null);
        setMatchState('idle');
        setEditingId(null);
        setShowForm(true);
    }

    function openEdit(enc: Enclave) {
        setForm({
            name: enc.name, port: enc.port, gateway_host: enc.gateway_host ?? '', tee_type: enc.tee_type || 'sgx', mr_enclave: enc.mr_enclave,
            country: enc.country, region: enc.region, zone: enc.zone ?? '', gps_lat: enc.gps_lat, gps_lon: enc.gps_lon,
            provider: enc.provider, owner: enc.owner,
            city: enc.city ?? '', country_code: enc.country_code ?? '', continent: enc.continent ?? '', cloud_region_code: enc.cloud_region_code ?? '',
            max_apps: enc.max_apps, os_release_url: enc.os_release_url ?? '',
        });
        setProviderSel(resolveProviderSel(enc.provider));
        setMatched(null);
        setMatchState('idle');
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
        if (!form.owner?.trim()) {
            setError('Owner is required.');
            return;
        }
        if (!form.provider?.trim()) {
            setError('Provider is required.');
            return;
        }
        if (!form.os_release_url?.trim()) {
            setError('Enclave OS release is required — link the GitHub release this enclave runs.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            // Region: the matched region label when a cloud-region match filled it,
            // else derived from the country (the pre-dataset behaviour).
            const payload = {
                ...form,
                region: form.region?.trim() || regionForCountry(form.country ?? ''),
                zone: form.zone?.trim() || undefined,
                gateway_host: form.gateway_host || undefined
            };
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
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <button onClick={handleRefreshRegions} disabled={refreshing}
                            title="Re-import the cloud provider/region reference data from the upstream dataset"
                            className="px-3 py-2 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors">
                            {refreshing ? 'Refreshing…' : 'Refresh cloud regions'}
                        </button>
                        {(refreshMsg || regionsMeta?.source_version) && (
                            <div className="mt-1 text-[10px] text-black/35 dark:text-white/35">
                                {refreshMsg ?? `regions dataset v${regionsMeta!.source_version} (${regionsMeta!.source_updated})`}
                            </div>
                        )}
                    </div>
                    <button onClick={openCreate}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity">
                        Add enclave
                    </button>
                </div>
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
                            <FieldLabel label="IP address" required
                                help="The management service connects to this IP directly. For Spot VMs with rotating IPs, just edit this field and save — no restart needed." />
                            <input required value={form.gateway_host ?? ''} onChange={e => setForm(f => ({ ...f, gateway_host: e.target.value }))}
                                placeholder="e.g. 34.32.151.96"
                                className={INPUT_CLS} />
                        </div>
                        <div>
                            <FieldLabel label="Max apps (0 = unlimited)"
                                help="Default 10. A single-GPU node typically tops out at ~3 model containers; raise for multi-tenant nodes." />
                            <input type="number" value={form.max_apps ?? 10} onChange={e => setForm(f => ({ ...f, max_apps: parseInt(e.target.value) || 0 }))}
                                className={INPUT_CLS} />
                        </div>
                        <div className="col-span-3">
                            <FieldLabel label="Enclave OS release" required
                                help="Link to the official GitHub release this enclave runs. On save, the management service verifies the enclave's measurements against the release (SGX: MRENCLAVE vs the mrenclave.txt asset; TDX: reported RTMR[1]/[2] vs the Predicted RTMRs in the notes — a TDX enclave that hasn't booted yet is accepted and verified on its next save). Stamped onto every attestation. Use enclave-os-mini for SGX/WASM, enclave-os-virtual for TDX/containers." />
                            <input required value={form.os_release_url ?? ''} onChange={e => setForm(f => ({ ...f, os_release_url: e.target.value }))}
                                placeholder="https://github.com/Privasys/enclave-os-mini/releases/tag/v0.20.3"
                                className={`${INPUT_CLS} font-mono text-xs`} />
                        </div>
                        <div>
                            <FieldLabel label="Owner" required help="Who operates this enclave (shown to app owners when they pick a deployment location)." />
                            <input required value={form.owner ?? ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                                placeholder="e.g. Privasys, Acme Corp"
                                className={INPUT_CLS} />
                        </div>
                        <div>
                            <FieldLabel label="Provider" required
                                help="The cloud the machine runs on. Picking a known provider lets the cloud zone pre-fill the location metadata; pick Other for anything outside the list and fill the location manually." />
                            <select required value={providerSel} onChange={e => {
                                const sel = e.target.value;
                                setProviderSel(sel);
                                setMatched(null);
                                setMatchState('idle');
                                if (sel && sel !== OTHER_PROVIDER) {
                                    const p = cloudProviders.find(cp => cp.id === sel);
                                    setForm(f => ({ ...f, provider: p?.name ?? sel }));
                                } else {
                                    setForm(f => ({ ...f, provider: '' }));
                                }
                            }} className={INPUT_CLS}>
                                <option value="">Select a provider…</option>
                                {cloudProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                <option value={OTHER_PROVIDER}>Other…</option>
                            </select>
                            {providerSel === OTHER_PROVIDER && (
                                <input required value={form.provider ?? ''} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                                    placeholder="Provider name"
                                    className={`${INPUT_CLS} mt-2`} />
                            )}
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
                            <FieldLabel label="Region"
                                help="The provider region: picking one fills country, city, GPS and continent from the regions dataset (those fields lock; choose 'Custom location…' to edit them manually). The region label shown on enclaves derives automatically: Europe (EU) for EU member states, else the continent." />
                            {providerSel && providerSel !== OTHER_PROVIDER && cloudRegions.length > 0 ? (
                                <select value={form.cloud_region_code ?? ''} onChange={e => {
                                    const rc = e.target.value;
                                    if (!rc) {
                                        // Custom location: unlock the linked fields, keep current values.
                                        setForm(f => ({ ...f, cloud_region_code: '' }));
                                        setMatched(null);
                                        setMatchState('idle');
                                        return;
                                    }
                                    const r = cloudRegions.find(cr => cr.region_code === rc);
                                    if (r) applyRegion(r, form.tee_type === 'tdx' && !form.zone?.trim());
                                }} className={INPUT_CLS}>
                                    <option value="">Custom location…</option>
                                    {cloudRegions.map(r => (
                                        <option key={r.region_code} value={r.region_code}>
                                            {r.region_code} — {r.city}, {r.country}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="px-3 py-2 text-sm text-black/60 dark:text-white/60">
                                    {form.region || (form.country ? regionForCountry(form.country) : <span className="text-black/30 dark:text-white/30">— (derived)</span>)}
                                </div>
                            )}
                        </div>
                        {form.tee_type === 'tdx' && (
                            <div>
                                <FieldLabel label="Cloud zone" required
                                    help="The zonal value this TDX machine runs in — cloud-image deployments resolve a zonal GCE disk from it, so the region alone is not enough. Typing it selects the matching region automatically." />
                                <input required value={form.zone ?? ''} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                                    placeholder="e.g. europe-west4-c"
                                    className={INPUT_CLS} />
                                {matchState === 'checking' && (
                                    <p className="mt-1 text-[11px] text-black/35 dark:text-white/35 animate-pulse">Looking up zone…</p>
                                )}
                                {matchState === 'matched' && matched && (
                                    <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                                        Matched {matched.provider}/{matched.region_code} — {matched.city}, {matched.display_country}
                                    </p>
                                )}
                                {matchState === 'none' && (
                                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                                        Unknown zone for this provider — pick a region or fill the location manually.
                                    </p>
                                )}
                            </div>
                        )}
                        <div>
                            <FieldLabel label="Country" help="Filled from the region for known providers (locked while a region is selected); EU member states show with an (EU) postfix." />
                            <select value={form.country ?? ''} disabled={regionLocked} onChange={e => {
                                const code = e.target.value;
                                setForm(f => ({ ...f, country: code, country_code: code, region: regionForCountry(code) }));
                            }} className={`${INPUT_CLS} disabled:opacity-60 disabled:cursor-not-allowed`}>
                                <option value="">Select a country…</option>
                                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{displayCountryName(c.code)}</option>)}
                            </select>
                        </div>
                        <div>
                            <FieldLabel label="City" help="Datacentre city; filled from the region for known providers (locked while a region is selected)." />
                            <input value={form.city ?? ''} readOnly={regionLocked} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                                placeholder="e.g. Eemshaven"
                                className={`${INPUT_CLS} ${regionLocked ? 'opacity-60 cursor-not-allowed' : ''}`} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel label="GPS Lat" />
                                <input type="number" step="any" value={form.gps_lat ?? ''} readOnly={regionLocked} onChange={e => setForm(f => ({ ...f, gps_lat: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                    className={`${INPUT_CLS} ${regionLocked ? 'opacity-60 cursor-not-allowed' : ''}`} />
                            </div>
                            <div>
                                <FieldLabel label="GPS Lon" />
                                <input type="number" step="any" value={form.gps_lon ?? ''} readOnly={regionLocked} onChange={e => setForm(f => ({ ...f, gps_lon: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                    className={`${INPUT_CLS} ${regionLocked ? 'opacity-60 cursor-not-allowed' : ''}`} />
                            </div>
                        </div>
                        {regionLocked && (
                            <div className="col-span-3 -mt-2 text-[11px] text-black/35 dark:text-white/35">
                                Location fields are filled from the selected region. Choose &ldquo;Custom location…&rdquo; in Region to edit them manually.
                            </div>
                        )}
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
                                            onClick={() => toggleExpand(enc.id)}
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
                                                <code className="text-xs">{enc.gateway_host || '—'}:{enc.port}</code>
                                            </td>
                                            <td className="px-4 py-3 text-black/60 dark:text-white/60">
                                                {enc.city ? `${enc.city}, ` : ''}{enc.country ? displayCountryName(enc.country) : '—'}{enc.region ? ` · ${enc.region}` : ''}
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
                                                        {/* Attested measurements: MRENCLAVE (SGX) or MRTD + RTMR0-3 (TDX, reported on boot). */}
                                                        {(() => {
                                                            const m = measurements[enc.id];
                                                            const hexRow = (label: string, val: string) => (
                                                                <div className="col-span-3">
                                                                    <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
                                                                    <code className="text-xs mt-0.5 bg-black/5 dark:bg-white/5 px-2 py-1 rounded break-all block">{val}</code>
                                                                </div>
                                                            );
                                                            if (enc.tee_type !== 'tdx') {
                                                                const mrenclave = enc.mr_enclave || m?.mrenclave;
                                                                return mrenclave
                                                                    ? hexRow('MRENCLAVE', mrenclave)
                                                                    : <div className="col-span-3 text-xs text-amber-600 dark:text-amber-400">No MRENCLAVE recorded</div>;
                                                            }
                                                            if (m === null) {
                                                                return <div className="col-span-3 text-xs text-black/40 dark:text-white/40 animate-pulse">Loading measurements…</div>;
                                                            }
                                                            if (!m || !m.latest) {
                                                                return <div className="col-span-3 text-xs text-amber-600 dark:text-amber-400">No measurements reported yet — the manager posts its TDX quote on boot</div>;
                                                            }
                                                            return (
                                                                <>
                                                                    {hexRow('MRTD', m.latest.mrtd)}
                                                                    {hexRow('RTMR0', m.latest.rtmr0)}
                                                                    {hexRow('RTMR1', m.latest.rtmr1)}
                                                                    {hexRow('RTMR2', m.latest.rtmr2)}
                                                                    {hexRow('RTMR3', m.latest.rtmr3)}
                                                                    <div className="col-span-3 text-xs text-black/40 dark:text-white/40">
                                                                        Reported {new Date(m.latest.recorded_at).toLocaleString()} ({m.latest.source})
                                                                        {typeof m.recorded_count === 'number' ? ` · ${m.recorded_count} set(s) logged` : ''}
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                        <div className="col-span-3">
                                                            <div className="text-xs text-black/50 dark:text-white/50">Enclave OS release</div>
                                                            {enc.os_release_url ? (
                                                                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                                                                    <a href={enc.os_release_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                                                        className="text-xs inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline break-all">
                                                                        {enc.os_release_tag || enc.os_release_url} ↗
                                                                    </a>
                                                                    {/* Measurement-verification badge: set on admin save and
                                                                        re-checked on every boot quote that changes measurements. */}
                                                                    {enc.os_release_status === 'verified' && (
                                                                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ measurements match</span>
                                                                    )}
                                                                    {enc.os_release_status === 'mismatch' && (
                                                                        <span className="text-[11px] font-medium text-red-600 dark:text-red-400">✗ measurements do NOT match this release</span>
                                                                    )}
                                                                    {enc.os_release_status === 'unverified' && (
                                                                        <span className="text-[11px] text-amber-600 dark:text-amber-400">not yet verified (no quote reported)</span>
                                                                    )}
                                                                    {enc.os_release_checked_at && (
                                                                        <span className="text-[10px] text-black/30 dark:text-white/30">checked {new Date(enc.os_release_checked_at).toLocaleString()}</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Not set — edit the enclave to link its GitHub release</div>
                                                            )}
                                                        </div>
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
