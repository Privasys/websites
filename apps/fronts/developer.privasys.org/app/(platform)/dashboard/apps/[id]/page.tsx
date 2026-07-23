'use client';

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getApp, listBuilds, listVersions, listDeployments, listCompatibleEnclaves, deleteApp, deployDirect, stopDeployment, getAppSchema, rpcCall, updateStoreListing, publishApp, identiconUrl, getAppMcp, updateContainerMcp, detectContainerMcp, retryBuild, listAppOwners, addAppOwner, removeAppOwner, createVersion, stageProfile, promoteProfile, listRegistryTags, uploadAsset, listAppCommits, uploadVersionCwasm, getVersion, listCachedImages, listDeployLocations, listInstances, apiErrorCode } from '~/lib/api';

// Public store base — where a published app is browsable.
const STORE_BASE_URL = 'https://store.privasys.org';
import type { CreateVersionBody } from '~/lib/api';
import { isApiStatus, effectivePrice } from '~/lib/api';
import { versionLabel, versionSemverStr, isStrictlyNewer } from '~/lib/version';
import { displayNameError } from '~/lib/appName';
import type { AppSchema, ConfigureSection, FunctionSchema, JsonSchemaProp, ActionProgress, WitType, McpManifest, AppTeam, AppCommit, DeployLocation, Instance, PriceRule } from '~/lib/api';
import { useSSE } from '~/lib/sse-context';
import { useBalance } from '~/lib/use-balance';
import { getApiBaseUrl } from '~/lib/api-base-url';
import type { App, BuildJob, AppVersion, AppDeployment, Enclave, CachedImage } from '~/lib/types';
import { DEPLOYMENT_STATUS_LABELS, DEPLOYMENT_STATUS_COLORS, CONTAINER_STATE_LABELS, CONTAINER_STATE_COLORS } from '~/lib/types';
import { fetchInstanceSizes, FALLBACK_INSTANCE_SIZES, monthlyGBP } from '~/lib/instance-sizes';
import type { InstanceSize } from '~/lib/instance-sizes';
import { RtmrVerifier } from '~/components/rtmr-verifier';
import { AttestationConnect, AttestationResultView, useAttestation } from '@privasys/attestation-view';

function StatusBadge({ status, labels, colors }: { status: string; labels: Record<string, string>; colors: Record<string, string> }) {
    return (
        <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}>
            {labels[status] ?? status}
        </span>
    );
}

// missingStoreFields returns the required-but-empty App Store fields that block
// deploy (revamp item 3 / D4 = Description + Category). Mirrors the server check
// in DeployVersion so the portal can gate the Deploy/Upgrade action client-side.
function missingStoreFields(app: App): string[] {
    const missing: string[] = [];
    if (!app.store_description?.trim()) missing.push('Description');
    if (!app.store_category?.trim()) missing.push('Category');
    return missing;
}

// instanceSizeLabel renders a container deployment's Confidential-* instance
// size (chosen at deploy time) for the current-instance tile. Falls back to
// the bare slug when it is not in the known catalogue. Sizes price COMPUTE
// only (vCPU + RAM caps on the shared host); the app's storage is its own
// volume, sized separately and billed per GB-hour.
function instanceSizeLabel(slug: string): string {
    const s = FALLBACK_INSTANCE_SIZES.find(x => x.slug === slug);
    if (!s) return slug;
    return `${s.size} · ${s.vcpu} vCPU · ${s.ram_gb} GB RAM · ${priceLabel(s)}`;
}

// sizeOptionLabel is the <option> text for the deploy-time Size picker: the
// resource cap only. Price is shown once, live, in the cost estimate above the
// Deploy button — never per option.
function sizeOptionLabel(s: InstanceSize): string {
    return `${s.size} — ${s.vcpu} vCPU · ${s.ram_gb} GB RAM`;
}

// priceLabel: the meter tick (credits per started hour — billing decision
// 2026-07-13) plus the always-on GBP monthly equivalent, the pair users
// reason with.
function priceLabel(s: InstanceSize): string {
    return `${s.credits_per_hour.toLocaleString('en-GB')} credits/hour ≈ £${monthlyGBP(s).toFixed(2)}/mo`;
}

function BuildStatusDot({ status }: { status: string }) {
    const color =
        status === 'success' ? 'bg-emerald-500' :
            status === 'failed' ? 'bg-red-500' :
                status === 'running' || status === 'dispatched' ? 'bg-blue-500 animate-pulse' :
                    'bg-yellow-500';
    return <span className={`w-2 h-2 rounded-full inline-block ${color}`} />;
}

type Tab = 'deployments' | 'store' | 'attestation' | 'api' | 'mcp' | 'ui' | 'configure' | 'team';

export default function AppDetailPage() {
    const { id } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { session } = useAuth();
    const [app, setApp] = useState<App | null>(null);
    const [builds, setBuilds] = useState<BuildJob[]>([]);
    const [versions, setVersions] = useState<AppVersion[]>([]);
    const [deployments, setDeployments] = useState<AppDeployment[]>([]);
    const [enclaves, setEnclaves] = useState<Enclave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deployProgress, setDeployProgress] = useState<Record<string, { stage: string; totalBytes?: number; downloadedBytes?: number }>>({});

    // 'versions' merged into 'deployments'; 'overview' was removed and its content
    // redistributed. App Store is the first/default tab. Keep old links working.
    const rawTab = searchParams.get('tab');
    const tab: Tab = rawTab === 'versions' ? 'deployments'
        : rawTab === 'overview' ? 'store'
            : (rawTab as Tab) || 'store';
    const setTab = (t: Tab) => router.push(`/dashboard/apps/${id}?tab=${t}`);

    const load = useCallback(async () => {
        if (!session?.accessToken || !id) return;
        try {
            const [appData, buildsData, versionsData, deploymentsData, enclavesData] = await Promise.all([
                getApp(session.accessToken, id),
                listBuilds(session.accessToken, id),
                listVersions(session.accessToken, id),
                listDeployments(session.accessToken, id),
                // For cloud_image apps, only enclaves with a matching cached
                // disk in their zone can serve the deploy; the backend filters.
                listCompatibleEnclaves(session.accessToken, id)
            ]);
            setApp(appData);
            setBuilds(buildsData);
            setVersions(versionsData);
            setDeployments(deploymentsData);
            setEnclaves(enclavesData);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, id]);

    useEffect(() => { load(); }, [load]);

    // Poll every 5s while app is in a transitional state (SSE fallback)
    useEffect(() => {
        const transitional = app && ['building', 'deploying', 'submitted', 'under_review'].includes(app.status);
        // Also poll while any deployment is still settling: initialising
        // (starting/deploying), OR deployed (active) but its readiness probe
        // has not reported yet — container_state unknown ("Not yet probed"),
        // pulling, or auto-redeploying. Without the container_state case the
        // status stuck at "Not yet probed" until a manual refetch (tab change).
        const settling = deployments?.some(d =>
            d.status === 'starting' || d.status === 'deploying' ||
            (d.status === 'active' && !!d.container_state && ['unknown', 'pulling', 'missing'].includes(d.container_state))
        );
        if (!transitional && !settling) return;
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [app?.status, deployments, load]);

    useSSE(useCallback((ev) => {
        if (ev.data.app_id !== id) return;
        if (ev.event === 'deployment_progress') {
            const depId = ev.data.deployment_id;
            if (depId) {
                setDeployProgress(prev => ({
                    ...prev,
                    [depId]: {
                        stage: ev.data.stage || 'unknown',
                        totalBytes: ev.data.pull_total_bytes ? Number(ev.data.pull_total_bytes) : undefined,
                        downloadedBytes: ev.data.pull_downloaded_bytes ? Number(ev.data.pull_downloaded_bytes) : undefined
                    }
                }));
            }
            return;
        }
        if (ev.event === 'deployment_update') {
            // Clear progress for completed/failed deployments.
            const depId = ev.data.deployment_id;
            if (depId) {
                setDeployProgress(prev => {
                    const next = { ...prev };
                    delete next[depId];
                    return next;
                });
            }
        }
        load();
    }, [id, load]));

    // Typing the app name in the danger zone IS the confirmation; withVolume
    // comes from the danger-zone checkbox. No native confirm() dialogs. Volume
    // policy: by default the app's encrypted volume SURVIVES and keeps billing
    // per GB-hour until deleted on the Volumes page.
    async function handleDelete(withVolume: boolean) {
        if (!session?.accessToken || !id || !app) return;
        const hasVolume = app.app_type === 'container' && !!app.container_storage;
        setDeleting(true);
        try {
            await deleteApp(session.accessToken, id, withVolume);
            window.dispatchEvent(new Event('apps:changed'));
            // Send the user to the surviving volume when they kept it, else home.
            router.push(hasVolume && !withVolume ? '/dashboard/volumes' : '/dashboard');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed');
            setDeleting(false);
        }
    }

    const [retrying, setRetrying] = useState(false);
    async function handleRetry() {
        if (!session?.accessToken || !id || !app) return;
        setRetrying(true);
        try {
            await retryBuild(session.accessToken, id);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Retry failed');
        } finally {
            setRetrying(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl">
                <div className="animate-pulse text-sm text-black/50 dark:text-white/50 py-20 text-center">Loading…</div>
            </div>
        );
    }

    if (!app) {
        return (
            <div className="max-w-4xl">
                <Link href="/dashboard" className="text-sm text-black/50 dark:text-white/50 hover:underline">
                    ← Back to applications
                </Link>
                <p className="mt-4 text-red-600">{error || 'App not found.'}</p>
            </div>
        );
    }

    const activeDeployments = deployments.filter(d => d.status === 'active');

    // Full detail view
    const hasActiveDeployment = activeDeployments.length > 0;
    // Config-gated app still behind its freeze gate (reported by the enclave):
    // surface a "Frozen" tag until the owner applies its initial configuration.
    const awaitingConfig = activeDeployments.some(d => d.container_state === 'awaiting_config');
    const hasContainerMcp = app.app_type === 'container' && app.container_mcp;
    const containerUI = app.container_mcp?.ui as { url: string; label?: string } | undefined;
    const TABS: { key: Tab; label: string; count?: number; danger?: boolean }[] = [
        { key: 'store', label: 'App Store' },
        { key: 'deployments', label: 'Deployments', count: activeDeployments.length },
        ...(hasActiveDeployment ? [
            { key: 'attestation' as Tab, label: 'Attestation' },
            ...(app.app_type !== 'container' || hasContainerMcp ? [
                { key: 'api' as Tab, label: 'API Testing' }
            ] : []),
            // AI Tools is shown for any deployed app: it hosts the MCP tool list
            // AND the "Detect AI Tools" action for container apps with no manifest yet.
            { key: 'mcp' as Tab, label: 'AI Tools' },
            ...(containerUI?.url ? [
                { key: 'ui' as Tab, label: containerUI.label || 'App UI' }
            ] : [])
            // Native Configure/Manage (role config/action) now lives inside the
            // Deployments tab, alongside the running instance — no separate tab.
        ] : []),
        { key: 'team', label: 'Team' }
    ];

    return (
        <div className="max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{app.display_name || app.name}</h1>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                        {app.name} &middot; {app.source_type === 'github' ? 'GitHub' : app.source_type === 'package' ? 'Package' : app.source_type === 'cloud_image' ? 'Cloud image' : 'Upload'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {awaitingConfig && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300" title="This app declares a configure gate and is frozen (HTTP 503) until you apply its initial configuration in the Deployments tab.">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 11V7a5 5 0 0110 0v4M5 11h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z" /></svg>
                            Frozen
                        </span>
                    )}
                    {hasActiveDeployment && (app.app_type !== 'container' || hasContainerMcp) && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            MCP
                        </span>
                    )}
                    {/* Type, not the app lifecycle status: "Built" is meaningless for a
                        package/cloud app. Run/build state lives on the Deployments tab. */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        app.app_type === 'container'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                    }`}>
                        {app.app_type === 'container' ? 'Container' : 'WASM'}
                    </span>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="mt-6 border-b border-black/10 dark:border-white/10">
                <nav className="flex gap-6">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                                tab === t.key
                                    ? 'border-black dark:border-white text-black dark:text-white'
                                    : 'border-transparent text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                            }`}
                        >
                            {t.label}
                            {t.count != null && t.count > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-black/5 dark:bg-white/10">
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab content */}
            <div className="mt-6">
                {tab === 'deployments' && session?.accessToken && (
                    <DeploymentsTab
                        app={app}
                        deployments={deployments}
                        versions={versions}
                        enclaves={enclaves}
                        builds={builds}
                        token={session.accessToken}
                        onRefresh={load}
                        retrying={retrying}
                        onRetry={handleRetry}
                        deployProgress={deployProgress}
                    />
                )}
                {tab === 'store' && session?.accessToken && (
                    <AppStoreTab app={app} token={session.accessToken} deployed={hasActiveDeployment} hostname={activeDeployments[0]?.hostname} onSave={(updated) => setApp(updated)} deleting={deleting} onDelete={handleDelete} />
                )}
                {tab === 'attestation' && session?.accessToken && (
                    <AttestationTab appId={app.id} token={session.accessToken} deployments={activeDeployments} versions={versions} />
                )}
                {tab === 'api' && session?.accessToken && (
                    <ApiTestingTab appId={app.id} token={session.accessToken} deployments={activeDeployments} versions={versions} />
                )}
                {tab === 'mcp' && session?.accessToken && (
                    <McpToolsTab app={app} hostname={activeDeployments[0]?.hostname} token={session.accessToken} deployed={hasActiveDeployment} onAppUpdate={(updated) => setApp(updated)} />
                )}
                {tab === 'ui' && session?.accessToken && containerUI?.url && (
                    <AppUITab appId={app.id} appName={app.name} hostname={activeDeployments[0]?.hostname} token={session.accessToken} containerMcp={app.container_mcp as Record<string, unknown>} onMcpUpdate={(updated) => setApp(updated)} />
                )}
                {tab === 'team' && session?.accessToken && (
                    <TeamTab appId={app.id} token={session.accessToken} />
                )}

            </div>
        </div>
    );
}

// ------- Danger Zone -------
function DangerZone({ app, deleting, onDelete }: { app: App; deleting: boolean; onDelete: (withVolume: boolean) => void }) {
    const [confirmName, setConfirmName] = useState('');
    const [deleteVolume, setDeleteVolume] = useState(false);
    const confirmed = confirmName === app.name;
    const hasVolume = app.app_type === 'container' && !!app.container_storage;
    const isDeployed = app.status === 'deployed' || app.status === 'deploying';

    return (
        <section className="pt-6">
            <div className="border-t border-red-200 dark:border-red-800/40 pt-6">
                <h3 className="text-sm font-medium text-red-700 dark:text-red-400">Delete this application</h3>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50 leading-relaxed">
                    Once deleted, the application, all versions, build history, and deployment records are permanently removed. This action cannot be undone.
                    {isDeployed && <> Active deployments will be automatically stopped before deletion.</>}
                </p>

                {hasVolume && (
                    <label className="mt-3 flex items-start gap-2 max-w-xl text-xs text-black/60 dark:text-white/60 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={deleteVolume}
                            onChange={e => setDeleteVolume(e.target.checked)}
                            className="mt-0.5 accent-red-600"
                        />
                        <span>
                            Also delete the app’s encrypted volume. Its data is destroyed permanently — export the key first if you need it.
                            If left unchecked, the volume is kept and keeps billing per GB-hour until you delete it on the Volumes page.
                        </span>
                    </label>
                )}

                <div className="mt-3 flex items-end gap-3">
                    <div className="flex-1 max-w-xs">
                        <label className="text-xs text-black/50 dark:text-white/50 block mb-1.5">
                            Type <strong className="text-black dark:text-white font-mono">{app.name}</strong> to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmName}
                            onChange={e => setConfirmName(e.target.value)}
                            placeholder={app.name}
                            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:focus:ring-red-400/30 placeholder:text-black/20 dark:placeholder:text-white/20"
                        />
                    </div>
                    <button
                        onClick={() => onDelete(hasVolume && deleteVolume)}
                        disabled={!confirmed || deleting}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {deleting ? 'Deleting…' : 'Delete application'}
                    </button>
                </div>
            </div>
        </section>
    );
}

// ------- Attestation Tab -------
function AttestationTab({ appId, token, deployments, versions }: { appId: string; token: string; deployments: AppDeployment[]; versions: AppVersion[] }) {
    const versionMap = Object.fromEntries(versions.map(v => [v.id, v]));
    const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>(deployments[0]?.id ?? '');
    const selectedDeployment = deployments.find(d => d.id === selectedDeploymentId);
    const selectedVersion = selectedDeployment ? versionMap[selectedDeployment.version_id] : undefined;

    // Drives the attestation handshake against the developer-portal API,
    // which proxies to the enclave RA-TLS endpoint.
    const apiBase = getApiBaseUrl();
    const [state, actions] = useAttestation({
        attestUrl: `${apiBase}/api/v1/apps/${encodeURIComponent(appId)}/attest`,
        verifyQuoteUrl: `${apiBase}/api/v1/verify-quote`,
        token
    });

    // Reset state when the user switches between deployments of the same app.
    useEffect(() => {
        actions.reset();

    }, [selectedDeploymentId]);

    // Auto-trigger quote-signature verification once a result arrives,
    // matching the previous inline implementation.
    useEffect(() => {
        if (state.result?.quote?.raw_base64 && !state.result.quote.is_mock) {
            void actions.verifyQuoteSignature();
        }

    }, [state.result]);

    return (
        <div className="space-y-6">
            {deployments.length > 1 && (
                <section className="flex items-center gap-3">
                    <label className="text-xs font-medium text-black/50 dark:text-white/50 shrink-0">Target deployment</label>
                    <select
                        value={selectedDeploymentId}
                        onChange={(e) => setSelectedDeploymentId(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    >
                        {deployments.map(d => {
                            const v = versionMap[d.version_id];
                            return (
                                <option key={d.id} value={d.id}>
                                    {d.hostname || `${d.enclave_host}:${d.enclave_port}`}
                                    {v ? ` (v${v.version_number})` : ''}
                                </option>
                            );
                        })}
                    </select>
                </section>
            )}
            {selectedDeployment && (
                <div className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {selectedDeployment.hostname || `${selectedDeployment.enclave_host}:${selectedDeployment.enclave_port}`}
                    {selectedVersion && <span>&middot; v{selectedVersion.version_number}</span>}
                </div>
            )}

            {!state.result ? (
                <AttestationConnect
                    state={state}
                    actions={actions}
                    title="Remote Attestation"
                    description="Connect to the enclave via RA-TLS and inspect the x.509 certificate, attestation quote, and all custom attestation extensions."
                />
            ) : (
                <AttestationResultView
                    result={state.result}
                    quoteVerify={state.quoteVerify}
                    onRefresh={() => void actions.inspect()}
                    onReset={() => void actions.newChallenge()}
                    extra={(() => {
                        const r = state.result;
                        if (!r.event_log_events || !r.quote) return null;
                        const q = r.quote;
                        if (!q.rtmr0 && !q.rtmr1 && !q.rtmr2 && !q.rtmr3) return null;
                        return (
                            <RtmrVerifier
                                events={r.event_log_events}
                                eventLogSource={r.event_log_source || 'tpm0'}
                                quoteRtmrs={{
                                    rtmr0: q.rtmr0,
                                    rtmr1: q.rtmr1,
                                    rtmr2: q.rtmr2,
                                    rtmr3: q.rtmr3
                                }}
                                appEvents={r.app_events}
                            />
                        );
                    })()}
                />
            )}
        </div>
    );
}

// ------- API Testing Tab -------

function witTypeLabel(ty: WitType): string {
    switch (ty.kind) {
        case 'string': return 'string';
        case 'bool': return 'bool';
        case 'u8': case 'u16': case 'u32': case 'u64':
        case 's8': case 's16': case 's32': case 's64':
            return ty.kind;
        case 'f32': return 'f32';
        case 'f64': return 'f64';
        case 'float32': return 'f32';
        case 'float64': return 'f64';
        case 'char': return 'char';
        case 'list':
            return ty.element ? `list<${witTypeLabel(ty.element)}>` : 'list';
        case 'option':
            return ty.inner ? `option<${witTypeLabel(ty.inner)}>` : 'option';
        case 'result': {
            const ok = ty.ok ? witTypeLabel(ty.ok) : '_';
            const err = ty.err ? witTypeLabel(ty.err) : '_';
            return `result<${ok}, ${err}>`;
        }
        case 'record':
            return 'record';
        case 'tuple':
            return ty.elements ? `tuple<${ty.elements.map(witTypeLabel).join(', ')}>` : 'tuple';
        case 'variant': return 'variant';
        case 'enum': return ty.names ? `enum{${ty.names.join('|')}}` : 'enum';
        case 'flags': return 'flags';
        default: return ty.kind;
    }
}

function defaultValueForType(ty: WitType): unknown {
    switch (ty.kind) {
        case 'string': case 'char': return '';
        case 'bool': return false;
        case 'u8': case 'u16': case 'u32': case 'u64':
        case 's8': case 's16': case 's32': case 's64':
        case 'f32': case 'f64':
        case 'float32': case 'float64':
            return 0;
        case 'list': return [];
        case 'option': return ty.default !== undefined ? ty.default : null;
        case 'enum': return ty.names?.[0] ?? '';
        case 'record':
            if (ty.fields) {
                const obj: Record<string, unknown> = {};
                for (const f of ty.fields) obj[f.name] = defaultValueForType(f.type);
                return obj;
            }
            return {};
        default: return '';
    }
}

/** Type-aware input for a single function parameter */
function ParamInput({ param, value, onChange }: { param: { name: string; type: WitType }; value: unknown; onChange: (v: unknown) => void }) {
    const ty = param.type;
    const inputClass = 'w-full px-3 py-2 text-[13px] font-mono rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30 focus:border-blue-500/50 dark:focus:border-blue-400/50 transition-colors placeholder:text-black/25 dark:placeholder:text-white/25';

    switch (ty.kind) {
        case 'option': {
            const inner = ty.inner || { kind: 'string' };
            const hasDefault = ty.default !== undefined;
            if (hasDefault) {
                // Show the inner input directly, pre-filled with the default
                const effectiveValue = (value === null || value === undefined) ? ty.default : value;
                return (
                    <div className="flex flex-col gap-1">
                        <ParamInput param={{ name: param.name, type: inner }} value={effectiveValue} onChange={onChange} />
                        <span className="text-[10px] text-black/35 dark:text-white/35">optional &middot; default: <span className="font-mono">{String(ty.default)}</span></span>
                    </div>
                );
            }
            // No default: two-step null/set toggle
            const isNull = value === null || value === undefined;
            return (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onChange(isNull ? defaultValueForType(inner) : null)}
                            className={`px-2 py-0.5 text-xs rounded ${isNull ? 'bg-black/10 dark:bg-white/10 text-black/50 dark:text-white/50' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'}`}
                        >
                            {isNull ? 'null' : 'set'}
                        </button>
                        <span className="text-xs text-black/40 dark:text-white/40">click to {isNull ? 'set a value' : 'clear'}</span>
                    </div>
                    {!isNull && <ParamInput param={{ name: param.name, type: inner }} value={value} onChange={onChange} />}
                </div>
            );
        }
        case 'bool':
            return (
                <div className="flex items-center gap-3 py-1">
                    <button
                        type="button"
                        onClick={() => onChange(!value)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-black/15 dark:bg-white/15'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : ''}`} />
                    </button>
                    <span className="text-xs text-black/50 dark:text-white/50">{value ? 'true' : 'false'}</span>
                </div>
            );
        case 'u8': case 'u16': case 'u32': case 'u64':
        case 's8': case 's16': case 's32': case 's64':
        case 'f32': case 'f64':
        case 'float32': case 'float64':
            return (
                <input
                    type="number"
                    value={typeof value === 'number' ? value : 0}
                    onChange={(e) => onChange(ty.kind.startsWith('f') || ty.kind.startsWith('float') ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)}
                    className={inputClass}
                    placeholder="0"
                />
            );
        case 'enum':
            return (
                <select value={String(value || '')} onChange={(e) => onChange(e.target.value)} className={inputClass}>
                    {(ty.names || []).map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            );
        case 'string': case 'char':
            return (
                <input
                    type="text"
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClass}
                    placeholder={ty.kind === 'char' ? 'single character' : `Enter ${param.name}…`}
                />
            );
        default:
            return (
                <textarea
                    value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                    onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { onChange(e.target.value); } }}
                    rows={3}
                    spellCheck={false}
                    className={inputClass + ' resize-y'}
                    placeholder="JSON value"
                />
            );
    }
}

interface CallHistoryEntry {
    id: number;
    func: string;
    params: Record<string, unknown>;
    response: string;
    status: 'ok' | 'error';
    elapsed: number;
    timestamp: Date;
}

// Developer-set per-call API fee (x-privasys.price), shown next to a tool's
// signature so a caller sees the cost before invoking. 1,000,000 credits = £1.
function ToolPrice({ price }: { price?: PriceRule }) {
    const credits = price?.credits ?? 0;
    if (!credits) {
        return <span className="ml-3 inline-flex items-center rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-black/50 dark:text-white/50">Free</span>;
    }
    const gbp = (credits / 1_000_000).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 4 });
    const sponsored = price?.payer === 'sponsor';
    const wallet = !sponsored && price?.free_for?.includes('wallet');
    const label = sponsored
        ? `Sponsored · ${credits.toLocaleString()} credits (${gbp}), paid by ${price?.sponsor_from || 'sponsor'}`
        : `${credits.toLocaleString()} credits (${gbp})${wallet ? ' · free for wallet users' : ''}`;
    return (
        <span
            title="Developer-set API fee, charged to the payer on a successful call"
            className="ml-3 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/25 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300"
        >
            {label}
        </span>
    );
}

function ApiTestingTab({ appId, token, deployments, versions }: { appId: string; token: string; deployments: AppDeployment[]; versions: AppVersion[] }) {
    const versionMap = Object.fromEntries(versions.map(v => [v.id, v]));
    const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>(deployments[0]?.id ?? '');
    const selectedDeployment = deployments.find(d => d.id === selectedDeploymentId);
    const selectedVersion = selectedDeployment ? versionMap[selectedDeployment.version_id] : undefined;

    const [schema, setSchema] = useState<AppSchema | null>(null);
    const [schemaLoading, setSchemaLoading] = useState(true);
    const [schemaError, setSchemaError] = useState<string | null>(null);

    const [selectedFunc, setSelectedFunc] = useState<string>('');
    const [paramValues, setParamValues] = useState<Record<string, unknown>>({});

    const [response, setResponse] = useState<string | null>(null);
    const [responseStatus, setResponseStatus] = useState<'ok' | 'error' | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [elapsed, setElapsed] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [cliCopied, setCliCopied] = useState(false);
    // Consent gate for priced calls (x-privasys.price): true = the charge
    // strip is showing and the next confirm actually sends.
    const [priceConfirm, setPriceConfirm] = useState(false);

    // The exact headers the last call sent (bearer masked) and the HTTP
    // status + billing response headers — surfaced in the request/response
    // tiles so the billing protocol is visible.
    const [reqHeaders, setReqHeaders] = useState<[string, string][] | null>(null);
    const [respMeta, setRespMeta] = useState<{ status: number; headers: [string, string][] } | null>(null);

    const [history, setHistory] = useState<CallHistoryEntry[]>([]);
    const [historyCounter, setHistoryCounter] = useState(0);

    // Ctrl+Enter to send
    useEffect(() => {
        function handleKeydown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                requestSend();
            }
        }
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    });

    // Fetch schema on mount
    useEffect(() => {
        let cancelled = false;
        setSchemaLoading(true);
        setSchemaError(null);
        getAppSchema(token, appId)
            .then((s) => {
                if (cancelled) return;
                setSchema(s);
                const allFuncs = getAllFunctions(s);
                if (allFuncs.length > 0) {
                    setSelectedFunc(allFuncs[0].name);
                    initParamValues(allFuncs[0]);
                }
            })
            .catch((e) => {
                if (cancelled) return;
                setSchemaError(e instanceof Error ? e.message : 'Failed to load schema');
            })
            .finally(() => { if (!cancelled) setSchemaLoading(false); });
        return () => { cancelled = true; };
    }, [appId, token]);

    function getAllFunctions(s: AppSchema): FunctionSchema[] {
        const fns: FunctionSchema[] = [...s.functions];
        if (s.interfaces) {
            for (const iface of s.interfaces) {
                for (const f of iface.functions) {
                    fns.push({ ...f, name: `${iface.name}.${f.name}` });
                }
            }
        }
        return fns;
    }

    function getSelectedFunction(): FunctionSchema | undefined {
        if (!schema) return undefined;
        return getAllFunctions(schema).find(f => f.name === selectedFunc);
    }

    function initParamValues(fn: FunctionSchema) {
        const vals: Record<string, unknown> = {};
        for (const p of fn.params) vals[p.name] = defaultValueForType(p.type);
        setParamValues(vals);
    }

    function handleFuncChange(name: string) {
        setSelectedFunc(name);
        setResponse(null);
        setResponseStatus(null);
        setError(null);
        setElapsed(null);
        setPriceConfirm(false);
        if (!schema) return;
        const fn = getAllFunctions(schema).find(f => f.name === name);
        if (fn) initParamValues(fn);
    }

    // Whether the signed-in caller is exempt from a price rule: their access
    // token carries the IdP's wallet-class marker and the rule grants
    // free_for:["wallet"]. Client-side UX only; the enclave is authoritative.
    function callerExempt(fn?: FunctionSchema): boolean {
        const fee = effectivePrice(fn);
        if (!fee?.free_for?.includes('wallet') || !token) return false;
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { wallet?: boolean | string };
            return payload.wallet === true || payload.wallet === 'true';
        } catch {
            return false;
        }
    }

    // Priced calls require explicit consent per send: the first Send reveals
    // the charge strip; only "Charge & send" actually dispatches. Exempt
    // (wallet-class) callers skip the ceremony — they are not charged.
    function requestSend() {
        const fn = getSelectedFunction();
        const fee = effectivePrice(fn);
        if ((fee?.credits ?? 0) > 0 && !callerExempt(fn) && !priceConfirm) {
            setPriceConfirm(true);
            return;
        }
        setPriceConfirm(false);
        void sendCall();
    }

    async function sendCall() {
        const fn = getSelectedFunction();
        if (!fn) return;
        setSending(true);
        setError(null);
        setResponse(null);
        setResponseStatus(null);
        setElapsed(null);
        const start = performance.now();
        try {
            // A priced call carries the user's exact-price approval (given via
            // the charge strip) as X-Billing-Approved; the attested runtime
            // refuses priced calls without it. Exempt (wallet-class) callers
            // send no approval — they are not charged.
            const fee = effectivePrice(fn);
            const approved = (fee?.credits ?? 0) > 0 && !callerExempt(fn) ? `${fee?.credits} credits` : undefined;
            setReqHeaders([
                ['Authorization', 'Bearer ●●●●' + token.slice(-6)],
                ['Content-Type', 'application/json'],
                ...(approved ? [['X-Billing-Approved', approved] as [string, string]] : [])
            ]);
            setRespMeta(null);
            const data = await rpcCall(token, appId, fn.name, paramValues, approved, (status, h) => {
                const interesting: [string, string][] = [];
                for (const name of ['x-billing-charged', 'x-billing-price', 'content-type']) {
                    const v = h.get(name);
                    if (v) interesting.push([name.replace(/\b[a-z]/g, (c) => c.toUpperCase()), v]);
                }
                setRespMeta({ status, headers: interesting });
            });
            const ms = Math.round(performance.now() - start);
            const json = JSON.stringify(data, null, 2);
            setElapsed(ms);
            setResponse(json);
            setResponseStatus('ok');
            setHistory(prev => [{ id: historyCounter, func: fn.name, params: { ...paramValues }, response: json, status: 'ok' as const, elapsed: ms, timestamp: new Date() }, ...prev].slice(0, 20));
            setHistoryCounter(c => c + 1);
        } catch (e) {
            const ms = Math.round(performance.now() - start);
            const msg = e instanceof Error ? e.message : 'Request failed';
            setElapsed(ms);
            setError(msg);
            setResponseStatus('error');
            setHistory(prev => [{ id: historyCounter, func: fn.name, params: { ...paramValues }, response: msg, status: 'error' as const, elapsed: ms, timestamp: new Date() }, ...prev].slice(0, 20));
            setHistoryCounter(c => c + 1);
        } finally {
            setSending(false);
        }
    }

    function loadFromHistory(entry: CallHistoryEntry) {
        setSelectedFunc(entry.func);
        setParamValues(entry.params);
        setResponse(entry.response);
        setResponseStatus(entry.status);
        setElapsed(entry.elapsed);
        setError(entry.status === 'error' ? entry.response : null);
    }

    function handleCopy(text: string) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    const allFuncs = schema ? getAllFunctions(schema) : [];
    const currentFunc = getSelectedFunction();
    const hasParams = currentFunc && currentFunc.params.length > 0;

    // The equivalent CLI invocation for the current query — same function, same
    // body — so the tab doubles as a copy-paste teacher for `privasys apps call`
    // (which goes direct to the enclave over RA-TLS, attestation verified first).
    const cliCommand = (() => {
        if (!currentFunc) return '';
        const target = schema?.name || appId;
        if (currentFunc.params.length === 0) return `privasys apps call ${target} ${currentFunc.name}`;
        // Single-quote the JSON for the shell; escape embedded single quotes.
        const json = JSON.stringify(paramValues).replace(/'/g, '\'\\\'\'');
        return `privasys apps call ${target} ${currentFunc.name} --data '${json}'`;
    })();

    if (schemaLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-sm text-black/40 dark:text-white/40">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                    Discovering API schema…
                </div>
            </div>
        );
    }

    if (schemaError) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-sm text-black/60 dark:text-white/60">Could not load API schema</p>
                <p className="text-xs text-black/30 dark:text-white/30 max-w-sm text-center">{schemaError}</p>
            </div>
        );
    }

    if (allFuncs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <svg className="w-5 h-5 text-black/30 dark:text-white/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <p className="text-sm text-black/60 dark:text-white/60">No exported functions found</p>
                <p className="text-xs text-black/30 dark:text-white/30">Ensure a WASM component with exports is deployed.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Deployment / version selector */}
            {deployments.length > 1 && (
                <section className="flex items-center gap-3">
                    <label className="text-xs font-medium text-black/50 dark:text-white/50 shrink-0">Target deployment</label>
                    <select
                        value={selectedDeploymentId}
                        onChange={(e) => setSelectedDeploymentId(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    >
                        {deployments.map(d => {
                            const v = versionMap[d.version_id];
                            return (
                                <option key={d.id} value={d.id}>
                                    {d.hostname || `${d.enclave_host}:${d.enclave_port}`}
                                    {v ? ` (v${v.version_number})` : ''}
                                </option>
                            );
                        })}
                    </select>
                </section>
            )}
            {selectedDeployment && (
                <div className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {selectedDeployment.hostname || `${selectedDeployment.enclave_host}:${selectedDeployment.enclave_port}`}
                    {selectedVersion && <span>&middot; v{selectedVersion.version_number}</span>}
                </div>
            )}

            {/* ── Request Builder ─────────────────────────────── */}
            <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                {/* Endpoint bar — like Postman URL bar */}
                <div className="flex items-stretch border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center px-3 bg-emerald-50 dark:bg-emerald-900/20 border-r border-black/10 dark:border-white/10">
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">POST</span>
                    </div>
                    <div className="flex-1 flex items-center">
                        <select
                            value={selectedFunc}
                            onChange={(e) => handleFuncChange(e.target.value)}
                            className="w-full px-3 py-3 text-sm font-mono bg-transparent focus:outline-none cursor-pointer"
                        >
                            {allFuncs.map((fn) => (
                                <option key={fn.name} value={fn.name}>
                                    /rpc/{schema?.name}/{fn.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-px bg-black/10 dark:bg-white/10" />
                    <button
                        onClick={requestSend}
                        disabled={sending || !selectedFunc}
                        className="px-6 py-3 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40 transition-colors"
                    >
                        {sending ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                        ) : 'Send'}
                    </button>
                </div>

                {/* Function signature */}
                {currentFunc && (
                    <div className="px-4 py-2.5 bg-black/2 dark:bg-white/2 border-b border-black/5 dark:border-white/5">
                        <code className="text-xs text-black/50 dark:text-white/50">
                            <span className="text-blue-600 dark:text-blue-400">fn</span>{' '}
                            <span className="text-black/80 dark:text-white/80 font-medium">{currentFunc.name}</span>
                            <span className="text-black/40 dark:text-white/40">(</span>
                            {currentFunc.params.map((p, i) => (
                                <span key={p.name}>
                                    {i > 0 && <span className="text-black/30 dark:text-white/30">, </span>}
                                    <span className="text-black/60 dark:text-white/60">{p.name}</span>
                                    <span className="text-black/30 dark:text-white/30">: </span>
                                    <span className="text-purple-600 dark:text-purple-400">{witTypeLabel(p.type)}</span>
                                </span>
                            ))}
                            <span className="text-black/40 dark:text-white/40">)</span>
                            {currentFunc.results.length > 0 && (
                                <>
                                    <span className="text-black/30 dark:text-white/30"> → </span>
                                    {currentFunc.results.map((r, i) => (
                                        <span key={r.name}>
                                            {i > 0 && <span className="text-black/30 dark:text-white/30">, </span>}
                                            <span className="text-emerald-600 dark:text-emerald-400">{witTypeLabel(r.type)}</span>
                                        </span>
                                    ))}
                                </>
                            )}
                        </code>
                        {callerExempt(currentFunc) ? (
                            <span
                                title='This function is priced, but your wallet-class session is exempt: you will not be charged.'
                                className='ml-3 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/25 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300'
                            >
                                Free for you (wallet user)
                            </span>
                        ) : (
                            <ToolPrice price={effectivePrice(currentFunc)} />
                        )}
                    </div>
                )}

                {/* Charge consent — a priced call never fires on the first
                    click; the caller confirms the attested price explicitly. */}
                {priceConfirm && (() => {
                    const fee = effectivePrice(currentFunc);
                    const credits = fee?.credits ?? 0;
                    const gbp = (credits / 1_000_000).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 4 });
                    return (
                        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-500/20">
                            <span className="text-sm text-amber-800 dark:text-amber-300">
                                This call charges <strong>{credits.toLocaleString()} credits</strong> ({gbp}) to your account on success. The app developer earns 85%.
                            </span>
                            <button
                                onClick={() => { setPriceConfirm(false); void sendCall(); }}
                                className="ml-auto shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 text-xs font-semibold"
                            >
                                Charge & send
                            </button>
                            <button
                                onClick={() => setPriceConfirm(false)}
                                className="shrink-0 rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                Cancel
                            </button>
                        </div>
                    );
                })()}

                {/* The exact headers the last Send put on the wire. */}
                {reqHeaders && (
                    <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                        <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-1">Request headers</div>
                        {reqHeaders.map(([k, v]) => (
                            <div key={k}>
                                <code className="text-[11px] text-black/60 dark:text-white/60">
                                    <span className={k === 'X-Billing-Approved' ? 'text-amber-700 dark:text-amber-400 font-semibold' : ''}>{k}</span>: {v}
                                </code>
                            </div>
                        ))}
                    </div>
                )}

                {/* Parameters form */}
                <div className="p-4">
                    {hasParams ? (
                        <div className="space-y-3">
                            <div className="text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium">Parameters</div>
                            <div className="space-y-2.5">
                                {currentFunc!.params.map((p) => (
                                    <div key={p.name} className="flex items-start gap-3">
                                        <div className="flex items-center gap-1.5 min-h-[36px] min-w-[120px] shrink-0">
                                            <span className="text-xs font-mono font-medium text-black/70 dark:text-white/70">{p.name}</span>
                                            <span className="text-[10px] font-mono text-black/25 dark:text-white/25">{witTypeLabel(p.type)}</span>
                                        </div>
                                        <div className="flex-1">
                                            <ParamInput
                                                param={p}
                                                value={paramValues[p.name]}
                                                onChange={(v) => setParamValues(prev => ({ ...prev, [p.name]: v }))}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 py-2 text-xs text-black/30 dark:text-white/30">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            This function takes no parameters
                        </div>
                    )}
                </div>

                {/* Keyboard shortcut hint */}
                <div className="px-4 py-2 border-t border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                    <span className="text-[10px] text-black/25 dark:text-white/25">
                        Press <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">Ctrl+Enter</kbd> to send
                    </span>
                </div>
            </section>

            {/* ── CLI equivalent ──────────────────────────────── */}
            {cliCommand && (
                <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">CLI</span>
                            <span className="text-[10px] text-black/30 dark:text-white/30">the same call from your terminal — direct to the enclave over RA-TLS, attestation verified first</span>
                        </div>
                        <button
                            onClick={() => { navigator.clipboard.writeText(cliCommand); setCliCopied(true); setTimeout(() => setCliCopied(false), 1500); }}
                            className="text-[11px] px-2 py-1 rounded-md border border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
                        >
                            {cliCopied ? 'Copied ✓' : 'Copy'}
                        </button>
                    </div>
                    <pre className="px-4 py-2.5 text-[11px] leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap break-all text-black/70 dark:text-white/70">
                        <span className="select-none text-black/30 dark:text-white/30">$ </span>{cliCommand}
                    </pre>
                </section>
            )}

            {/* ── Response Panel ──────────────────────────────── */}
            {(response || error) && (
                <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                    {/* Response header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold">Response</span>
                            {responseStatus === 'ok' && (
                                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {respMeta ? `${respMeta.status} OK` : '200 OK'}
                                </span>
                            )}
                            {responseStatus === 'error' && (
                                <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {respMeta && respMeta.status >= 400 ? `HTTP ${respMeta.status}` : 'Error'}
                                </span>
                            )}
                            {elapsed != null && (
                                <span className="text-[11px] text-black/30 dark:text-white/30">{elapsed}ms</span>
                            )}
                        </div>
                        <button
                            onClick={() => handleCopy(response || error || '')}
                            className="flex items-center gap-1 text-[11px] text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-colors"
                        >
                            {copied ? (
                                <><svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg> Copied</>
                            ) : (
                                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy</>
                            )}
                        </button>
                    </div>
                    {/* Response headers — mirrors the request tile's section. */}
                    {respMeta && respMeta.headers.length > 0 && (
                        <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                            <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-1">Response headers</div>
                            {respMeta.headers.map(([k, v]) => (
                                <div key={k}>
                                    <code className="text-[11px] text-black/60 dark:text-white/60">
                                        <span className={k.toLowerCase().startsWith('x-billing') ? 'text-amber-700 dark:text-amber-400 font-semibold' : ''}>{k}</span>: {v}
                                    </code>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Response body */}
                    {error ? (
                        <div className="p-4 text-sm text-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-900/10">
                            {error}
                        </div>
                    ) : (
                        <pre className="p-4 text-xs font-mono text-black/80 dark:text-white/80 bg-black/2 dark:bg-white/2 break-all whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
                            {response}
                        </pre>
                    )}
                </section>
            )}

            {/* ── Call History ────────────────────────────────── */}
            {history.length > 0 && (
                <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2">
                        <span className="text-xs font-semibold">History</span>
                        <button onClick={() => setHistory([])} className="text-[11px] text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors">
                            Clear
                        </button>
                    </div>
                    <div className="divide-y divide-black/5 dark:divide-white/5 max-h-48 overflow-y-auto">
                        {history.map((entry) => (
                            <button
                                key={entry.id}
                                onClick={() => loadFromHistory(entry)}
                                className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-black/3 dark:hover:bg-white/3 transition-colors"
                            >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <span className="text-xs font-mono text-black/70 dark:text-white/70 truncate flex-1">{entry.func}</span>
                                <span className="text-[10px] text-black/25 dark:text-white/25 shrink-0">{entry.elapsed}ms</span>
                                <span className="text-[10px] text-black/20 dark:text-white/20 shrink-0">
                                    {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

// ------- App Store Tab -------
// Canonical App Store categories — kept in sync with the management-service
// StoreCategories allow-list, which enforces them on save. Open platform:
// capability categories + consumer verticals + an Other catch-all.
const STORE_CATEGORIES = [
    'AI Tools', 'Developer Tools', 'Data & Storage', 'Identity & KYC', 'Security & Privacy',
    'Finance', 'Healthcare', 'Education', 'Social', 'Entertainment', 'Other'
];

// Recommended App Store asset dimensions, surfaced to the user.
const ICON_DIMS = '512 x 512 px square';
const SHOT_DIMS = '1280 x 800 px (16:10 landscape)';

function AppStoreTab({ app, token, deployed, hostname, onSave, deleting, onDelete }: { app: App; token: string; deployed: boolean; hostname?: string; onSave: (updated: App) => void; deleting: boolean; onDelete: (withVolume: boolean) => void }) {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Title (display_name). Editable, but it must still reduce to the canonical
    // app name (app.name), which is immutable.
    const [title, setTitle] = useState(app.display_name || app.name);
    const titleError = displayNameError(title, app.name);
    const [tagline, setTagline] = useState(app.store_tagline);
    const [description, setDescription] = useState(app.store_description);
    const [category, setCategory] = useState(app.store_category);
    const [iconURL, setIconURL] = useState(app.store_icon_url);
    const [screenshots, setScreenshots] = useState<string[]>(app.store_screenshots || []);
    const [privacyURL, setPrivacyURL] = useState(app.store_privacy_url);
    const [tosURL, setTosURL] = useState(app.store_tos_url);
    const [websiteURL, setWebsiteURL] = useState(app.store_website_url);
    const [supportEmail, setSupportEmail] = useState(app.store_support_email);
    const [keywords, setKeywords] = useState(app.store_keywords);

    // Asset upload (drag-and-drop to GCS); falls back to URL entry when hosting off.
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [uploadingShot, setUploadingShot] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [newScreenshot, setNewScreenshot] = useState('');

    // Publish-to-store state (D1). Published apps appear on store.privasys.org.
    const [published, setPublished] = useState(app.published);
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);

    // Every app has an icon: the custom store icon if set, else its deterministic
    // identicon. previewIcon is what the store will actually show.
    const previewIcon = iconURL.trim() || identiconUrl(app.id);
    const storeUrl = `${STORE_BASE_URL}/apps/${encodeURIComponent(app.name)}`;
    const teeLabel = app.app_type === 'container' ? 'TDX' : 'SGX';
    const targetLabel = app.app_type === 'container' ? 'Container' : 'WASM';

    async function handlePublish(next: boolean) {
        setPublishing(true);
        setPublishError(null);
        try {
            const updated = await publishApp(token, app.id, next);
            setPublished(updated.published);
            onSave(updated);
        } catch (e) {
            setPublishError(isApiStatus(e, 409)
                ? 'Add a Description and Category (and save) before publishing.'
                : (e instanceof Error ? e.message : 'Failed to update publish state'));
        } finally {
            setPublishing(false);
        }
    }

    function addScreenshotUrl() {
        const url = newScreenshot.trim();
        if (url && screenshots.length < 8 && !screenshots.includes(url)) {
            setScreenshots([...screenshots, url]);
            setNewScreenshot('');
        }
    }

    const descMissing = !description.trim();
    const catMissing = !category.trim();

    function uploadErrMsg(e: unknown): string {
        if (isApiStatus(e, 501)) {
            return 'Image hosting is not configured on this environment. Paste an image URL instead.';
        }
        return e instanceof Error ? e.message : 'Upload failed';
    }

    async function handleIconFile(f: File) {
        if (!f.type.startsWith('image/')) return;
        setUploadError(null);
        setUploadingIcon(true);
        try {
            setIconURL(await uploadAsset(token, app.id, f, 'icon'));
        } catch (e) {
            setUploadError(uploadErrMsg(e));
        } finally {
            setUploadingIcon(false);
        }
    }

    async function handleShotFiles(files: FileList | File[]) {
        setUploadError(null);
        setUploadingShot(true);
        try {
            const added: string[] = [];
            for (const f of Array.from(files)) {
                if (screenshots.length + added.length >= 8) break;
                if (!f.type.startsWith('image/')) continue;
                added.push(await uploadAsset(token, app.id, f, 'screenshot'));
            }
            if (added.length) setScreenshots(prev => [...prev, ...added].slice(0, 8));
        } catch (e) {
            setUploadError(uploadErrMsg(e));
        } finally {
            setUploadingShot(false);
        }
    }

    async function handleSave() {
        if (titleError) { setError(titleError); return; }
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const updated = await updateStoreListing(token, app.id, {
                display_name: title.trim() || app.name,
                store_tagline: tagline,
                store_description: description,
                store_category: category,
                store_icon_url: iconURL,
                store_screenshots: screenshots,
                store_privacy_url: privacyURL,
                store_tos_url: tosURL,
                store_website_url: websiteURL,
                store_support_email: supportEmail,
                store_keywords: keywords
            });
            onSave(updated);
            // Refresh the sidebar app list so a title (display_name) change shows
            // immediately, not only on the next page load.
            window.dispatchEvent(new Event('apps:changed'));
            setEditing(null);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    function removeScreenshot(idx: number) {
        setScreenshots(screenshots.filter((_, i) => i !== idx));
    }

    // LinkedIn-style inline editing: one section open at a time. The store
    // presentation IS the section; the pencil flips it into an editor.
    const [editing, setEditing] = useState<null | 'identity' | 'about' | 'media' | 'links'>(null);
    function resetFields() {
        setTitle(app.display_name || app.name);
        setTagline(app.store_tagline);
        setDescription(app.store_description);
        setCategory(app.store_category);
        setIconURL(app.store_icon_url);
        setScreenshots(app.store_screenshots || []);
        setPrivacyURL(app.store_privacy_url);
        setTosURL(app.store_tos_url);
        setWebsiteURL(app.store_website_url);
        setSupportEmail(app.store_support_email);
        setKeywords(app.store_keywords);
    }
    function cancelEdit() {
        resetFields();
        setEditing(null);
        setUploadError(null);
    }
    const hasLinks = Boolean(websiteURL || supportEmail || privacyURL || tosURL);

    const labelClass = 'text-xs font-medium text-black/60 dark:text-white/60 block mb-1.5';
    const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 placeholder:text-black/25 dark:placeholder:text-white/25';
    const req = <span className="text-red-500">*</span>;

    const editFooter = (
        <div className="flex items-center gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || (editing === 'identity' && !!titleError)} className="px-4 py-1.5 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={cancelEdit} disabled={saving} className="px-4 py-1.5 text-sm rounded-lg border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors">Cancel</button>
            {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>}
        </div>
    );

    return (
        <div className="space-y-4">
            {error && (<div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>)}
            {uploadError && (<div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300">{uploadError}</div>)}

            {/* Publish control — first, so it is the primary action */}
            <section className="p-4 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Public store</span>
                        {published ? (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Published</span>
                        ) : (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50">Not published</span>
                        )}
                    </div>
                    <p className="text-xs text-black/45 dark:text-white/45 mt-0.5">
                        {published ? (
                            <>Live at <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{storeUrl.replace('https://', '')} &rarr;</a></>
                        ) : (descMissing || catMissing)
                            ? 'Add a Description and Category (and save) to publish.'
                            : 'Publish to list this app on store.privasys.org for anyone to browse and verify.'}
                    </p>
                    {publishError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{publishError}</p>}
                </div>
                <button
                    onClick={() => handlePublish(!published)}
                    disabled={publishing || (!published && (descMissing || catMissing))}
                    className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-opacity disabled:opacity-40 ${published
                        ? 'border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5'
                        : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-80'}`}
                >
                    {publishing ? 'Saving…' : published ? 'Unpublish' : 'Publish to store'}
                </button>
            </section>

            {/* Identity — the store hero, edited in place */}
            <StoreSection title="Listing" onEdit={editing === 'identity' ? undefined : () => setEditing('identity')}>
                {editing === 'identity' ? (
                    <div className="space-y-4">
                        <div className="flex gap-6">
                            <div className="shrink-0">
                                <label
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleIconFile(f); }}
                                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-black/15 dark:border-white/15 flex items-center justify-center overflow-hidden bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer hover:border-black/30 dark:hover:border-white/30 transition-colors"
                                    title={`Drag an image or click. ${ICON_DIMS}.`}
                                >
                                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleIconFile(f); }} />
                                    {uploadingIcon ? (
                                        <span className="text-[10px] text-black/40 dark:text-white/40">Uploading…</span>
                                    ) : (
                                        <img src={iconURL.trim() || identiconUrl(app.id)} alt="App icon" className="w-full h-full object-cover rounded-2xl" />
                                    )}
                                </label>
                                <div className="mt-1 text-[10px] text-black/30 dark:text-white/30 text-center w-24">{iconURL.trim() ? ICON_DIMS : 'auto identicon'}</div>
                                <input type="text" value={iconURL} onChange={e => setIconURL(e.target.value)} placeholder="or paste URL" className={`${inputClass} mt-1 !text-[11px] !py-1 w-24`} />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div>
                                    <label className={labelClass}>Title</label>
                                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={app.name} maxLength={120}
                                        className={`${inputClass}${titleError ? ' !border-red-400 focus:!ring-red-300' : ''}`} />
                                    {titleError ? (
                                        <p className="mt-1 text-xs text-red-500">{titleError}</p>
                                    ) : (
                                        <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">Shown in the store. Must reduce to the app name <span className="font-mono">{app.name}</span> (lowercase, spaces become hyphens).</p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass}>Tagline</label>
                                    <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="A short, catchy one-liner" maxLength={120} className={inputClass} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>Category {req}</label>
                                        <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                                            <option value="">Select a category…</option>
                                            {STORE_CATEGORIES.map(c => (<option key={c} value={c}>{c}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Keywords</label>
                                        <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="privacy, ai, health…" className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {editFooter}
                    </div>
                ) : (
                    <div className="flex gap-4 items-start">
                        <img src={previewIcon} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-black/10 dark:border-white/10 bg-white dark:bg-white/5" />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base font-semibold truncate">{app.display_name || app.name}</span>
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full border border-black/10 dark:border-white/10">{teeLabel}</span>
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full border border-black/10 dark:border-white/10">{targetLabel}</span>
                            </div>
                            <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                                {app.owner_name || 'You'}{category ? <> &middot; {category}</> : <> &middot; <span className="text-amber-600 dark:text-amber-400">add a category</span></>}
                            </div>
                            {tagline && <p className="text-sm text-black/70 dark:text-white/70 mt-1.5">{tagline}</p>}
                        </div>
                    </div>
                )}
            </StoreSection>

            {/* About / description */}
            {editing === 'about' ? (
                <StoreSection title="About">
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="What your app does, the problems it solves, key features and privacy guarantees…"
                        rows={6}
                        maxLength={4000}
                        className={`${inputClass} resize-y`}
                    />
                    <div className="mt-1 text-[10px] text-black/30 dark:text-white/30 text-right">{description.length}/4000</div>
                    {editFooter}
                </StoreSection>
            ) : description.trim() ? (
                <StoreSection title="About" onEdit={() => setEditing('about')}>
                    <p className="text-sm text-black/70 dark:text-white/70 whitespace-pre-line">{description}</p>
                </StoreSection>
            ) : (
                <EmptySection label="Add a description" hint="Required before publishing — what your app does and how it protects data." onAdd={() => setEditing('about')} />
            )}

            {/* Screenshots & media */}
            {editing === 'media' ? (
                <StoreSection title="Screenshots & images">
                    {screenshots.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-3 mb-3">
                            {screenshots.map((url, i) => (
                                <div key={i} className="group relative shrink-0 w-48 h-28 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
                                    <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                                    <button onClick={() => removeScreenshot(i)} className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                                </div>
                            ))}
                        </div>
                    )}
                    {screenshots.length < 8 && (
                        <label
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.length) handleShotFiles(e.dataTransfer.files); }}
                            className="flex flex-col items-center justify-center gap-1 py-6 rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 cursor-pointer hover:border-black/30 dark:hover:border-white/30 transition-colors text-center"
                        >
                            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={e => { if (e.target.files?.length) handleShotFiles(e.target.files); }} />
                            <span className="text-xs text-black/50 dark:text-white/50">{uploadingShot ? 'Uploading…' : 'Drag images here or click to upload'}</span>
                            <span className="text-[10px] text-black/30 dark:text-white/30">PNG, JPEG or WebP · {SHOT_DIMS}</span>
                        </label>
                    )}
                    {screenshots.length < 8 && (
                        <div className="flex gap-2 mt-2">
                            <input
                                type="text"
                                value={newScreenshot}
                                onChange={e => setNewScreenshot(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addScreenshotUrl()}
                                placeholder="or paste an image URL"
                                className={`flex-1 ${inputClass} !text-xs !py-1.5`}
                            />
                            <button onClick={addScreenshotUrl} disabled={!newScreenshot.trim()} className="px-3 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors">Add</button>
                        </div>
                    )}
                    {editFooter}
                </StoreSection>
            ) : screenshots.length > 0 ? (
                <StoreSection title="Screenshots & images" onEdit={() => setEditing('media')}>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                        {screenshots.map((url, i) => (
                            <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="shrink-0 w-48 h-28 rounded-lg border border-black/10 dark:border-white/10 object-cover bg-black/[0.02] dark:bg-white/[0.02]" />
                        ))}
                    </div>
                </StoreSection>
            ) : (
                <EmptySection label="Add screenshots and images" hint={`Show your app in action. ${SHOT_DIMS}, up to 8.`} onAdd={() => setEditing('media')} />
            )}

            {/* Links & support */}
            {editing === 'links' ? (
                <StoreSection title="Links & support">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Website</label>
                            <input type="url" value={websiteURL} onChange={e => setWebsiteURL(e.target.value)} placeholder="https://yourapp.com" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Support email</label>
                            <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="support@yourapp.com" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Privacy policy</label>
                            <input type="url" value={privacyURL} onChange={e => setPrivacyURL(e.target.value)} placeholder="https://yourapp.com/privacy" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Terms of service</label>
                            <input type="url" value={tosURL} onChange={e => setTosURL(e.target.value)} placeholder="https://yourapp.com/terms" className={inputClass} />
                        </div>
                    </div>
                    {editFooter}
                </StoreSection>
            ) : hasLinks ? (
                <StoreSection title="Links & support" onEdit={() => setEditing('links')}>
                    <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
                        {websiteURL && <a href={websiteURL} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Website</a>}
                        {supportEmail && <a href={`mailto:${supportEmail}`} className="text-blue-600 dark:text-blue-400 hover:underline">Support</a>}
                        {privacyURL && <a href={privacyURL} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy policy</a>}
                        {tosURL && <a href={tosURL} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of service</a>}
                    </div>
                </StoreSection>
            ) : (
                <EmptySection label="Add links and support" hint="Website, support email, privacy policy and terms." onAdd={() => setEditing('links')} />
            )}

            {/* MCP server — usage hint; the full config lives on the AI Tools tab once deployed */}
            {deployed && hostname ? (
                <StoreSection title="MCP server">
                    <p className="text-sm text-black/70 dark:text-white/70">This app is available as an attested MCP server.</p>
                    <div className="mt-3 text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">Endpoint</div>
                    <code className="mt-1 block text-xs bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg break-all font-mono">https://{hostname}</code>
                    <div className="mt-3 text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">MCP config snippet</div>
                    <pre className="mt-1 text-xs bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg font-mono overflow-x-auto">{JSON.stringify({ mcpServers: { [app.name]: { url: `https://${hostname}`, transport: 'sse' } } }, null, 2)}</pre>
                    <p className="mt-2 text-xs text-black/45 dark:text-white/45">The full tool list and verification live on the <strong>AI Tools</strong> tab.</p>
                </StoreSection>
            ) : (
                <section className="p-5 rounded-xl border border-dashed border-black/20 dark:border-white/20">
                    <h2 className="text-sm font-semibold mb-1">MCP server</h2>
                    <p className="text-sm text-black/45 dark:text-white/45">
                        Once this app is deployed it can be used as an attested MCP server. Its endpoint and
                        a copy-paste client config will appear here and on the <strong>AI Tools</strong> tab.
                    </p>
                </section>
            )}

            {/* Danger zone (moved here from the removed Overview tab) */}
            <DangerZone app={app} deleting={deleting} onDelete={onDelete} />
        </div>
    );
}

// A filled App Store section: title, content, and an optional edit pencil in the
// top-right corner (LinkedIn-style inline editing).
function StoreSection({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
    return (
        <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
            <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold">{title}</h2>
                {onEdit && (
                    <button onClick={onEdit} aria-label={`Edit ${title}`} title={`Edit ${title}`} className="shrink-0 -mt-1 -mr-1 w-8 h-8 flex items-center justify-center rounded-full text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                    </button>
                )}
            </div>
            {children}
        </section>
    );
}

// An unfilled App Store section: dashed border + an "Add …" call to action,
// shown only when the section has no content yet.
function EmptySection({ label, hint, onAdd }: { label: string; hint: string; onAdd: () => void }) {
    return (
        <section className="p-5 rounded-xl border border-dashed border-black/20 dark:border-white/20">
            <p className="text-sm text-black/45 dark:text-white/45 mb-3">{hint}</p>
            <button onClick={onAdd} className="px-4 py-1.5 text-sm font-medium rounded-full border border-blue-600/60 text-blue-600 dark:text-blue-400 dark:border-blue-400/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">{label}</button>
        </section>
    );
}

// ------- MCP Tools Tab -------
function McpToolsTab({ app, hostname, token, deployed, onAppUpdate }: { app: App; hostname?: string; token: string; deployed: boolean; onAppUpdate: (app: App) => void }) {
    const appId = app.id;
    const appName = app.name;
    const appType = app.app_type;
    const [manifest, setManifest] = useState<McpManifest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    // Detect AI Tools: a container app can ship a privasys.json / org.privasys.manifest
    // that was added (or missed) after create. Re-detect from the current source.
    // (Moved here from the old Overview tab.)
    const canDetectMcp = appType === 'container' && deployed && !app.container_mcp;
    const [detecting, setDetecting] = useState(false);
    const [detectMsg, setDetectMsg] = useState<string | null>(null);
    const handleDetectMcp = useCallback(async () => {
        if (!token || detecting) return;
        setDetecting(true);
        setDetectMsg(null);
        try {
            const res = await detectContainerMcp(token, appId);
            if (res.detected) {
                onAppUpdate(res.app);
            } else {
                setDetectMsg('No privasys.json / org.privasys.manifest found in this app’s source. Add an MCP manifest to the repo or image, then deploy a new version.');
            }
        } catch {
            setDetectMsg('Could not read the MCP manifest from the app’s source. Check that the repo/image is reachable.');
        } finally {
            setDetecting(false);
        }
    }, [token, detecting, appId, onAppUpdate]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        getAppMcp(token, appId)
            .then((m) => { if (!cancelled) setManifest(m); })
            .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load MCP tools'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [appId, token]);

    function copyText(text: string, label: string) {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    }

    const connectionUrl = hostname ? `https://${hostname}` : undefined;

    if (loading) {
        return (
            <div className="py-12 text-center text-sm text-black/40 dark:text-white/40">
                Loading MCP tools…
            </div>
        );
    }

    // A container app with no manifest yet is not an error here: we show the
    // "Detect AI Tools" prompt instead of a hard failure.
    if (error && !canDetectMcp) {
        return (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                {error}
            </div>
        );
    }

    const tools = manifest?.manifest?.tools ?? [];

    return (
        <div className="space-y-6">
            {/* Detect AI Tools — container app deployed but no MCP manifest recorded yet */}
            {canDetectMcp && (
                <section className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">No AI Tools detected for this app</p>
                            <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mt-0.5">
                                If your source declares MCP tools (a <code>privasys.json</code>, or an
                                <code> org.privasys.manifest</code> image label), re-detect it to enable the API Testing and AI Tools.
                            </p>
                        </div>
                        <button
                            onClick={handleDetectMcp}
                            disabled={detecting || !token}
                            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                            {detecting ? 'Detecting…' : 'Detect AI Tools'}
                        </button>
                    </div>
                    {detectMsg && (<p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-2">{detectMsg}</p>)}
                </section>
            )}

            {/* Intro */}
            <section className="p-5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-900/10">
                <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <h2 className="text-sm font-semibold text-violet-800 dark:text-violet-300">MCP Tool Server</h2>
                </div>
                <p className="text-sm text-violet-700/80 dark:text-violet-300/70">
                    Your app exposes <strong>{tools.length}</strong> MCP {tools.length === 1 ? 'tool' : 'tools'}{appType === 'container' ? ' from its container manifest' : ' derived from your WASM exports'}.
                    AI agents can discover and invoke these tools with full hardware attestation on every connection.
                </p>
            </section>

            {/* Use as an MCP server (item 5) — endpoint + client snippet */}
            {connectionUrl ? (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold mb-1">Use as an MCP server</h2>
                    <p className="text-xs text-black/50 dark:text-white/50 mb-3">
                        Point any MCP client (Claude Desktop, the Privasys CLI, your own agent) at the
                        endpoint below. The connection is RA-TLS attested on every request, and
                        authenticated endpoints take a bearer token from{' '}
                        <a href="https://privasys.id" target="_blank" rel="noopener noreferrer" className="underline">privasys.id</a>.
                    </p>
                    <div className="space-y-3">
                        <div>
                            <div className="text-xs text-black/50 dark:text-white/50 mb-1">Endpoint</div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg font-mono break-all">{connectionUrl}</code>
                                <button
                                    onClick={() => copyText(connectionUrl, 'url')}
                                    className="px-3 py-2 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
                                >
                                    {copied === 'url' ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-black/50 dark:text-white/50 mb-1">MCP config snippet</div>
                            <div className="relative">
                                <pre className="text-xs bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg font-mono overflow-x-auto">{JSON.stringify({
                                    mcpServers: {
                                        [appName]: {
                                            url: connectionUrl,
                                            transport: 'sse'
                                        }
                                    }
                                }, null, 2)}</pre>
                                <button
                                    onClick={() => copyText(JSON.stringify({ mcpServers: { [appName]: { url: connectionUrl, transport: 'sse' } } }, null, 2), 'config')}
                                    className="absolute top-2 right-2 px-2 py-1 text-[10px] font-medium rounded border border-black/10 dark:border-white/10 bg-white dark:bg-black hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                >
                                    {copied === 'config' ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            ) : (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold mb-1">Use as an MCP server</h2>
                    <p className="text-xs text-black/50 dark:text-white/50">
                        Once this app is deployed, its attested MCP endpoint and a copy-paste client
                        config appear here, so any MCP client or agent can connect to it.
                    </p>
                </section>
            )}

            {/* Tool manifest */}
            {tools.length === 0 ? (
                <div className="text-center py-8 text-sm text-black/40 dark:text-white/40">
                    No MCP tools found. {appType === 'container' ? 'Add a container_mcp manifest when creating your app.' : 'Make sure your WASM module exports functions.'}
                </div>
            ) : (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold mb-4">Tools ({tools.length})</h2>
                    <div className="space-y-4">
                        {tools.map((tool) => (
                            <div key={tool.name} className="p-4 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                                <div className="flex items-center gap-2 mb-1">
                                    <code className="text-sm font-semibold font-mono">{tool.name}</code>
                                </div>
                                {tool.description && (
                                    <p className="text-xs text-black/50 dark:text-white/50 mb-3">{tool.description}</p>
                                )}
                                {tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0 && (
                                    <div className="mt-2">
                                        <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 mb-2">Parameters</div>
                                        <div className="space-y-1.5">
                                            {Object.entries(tool.inputSchema.properties).map(([paramName, paramDef]) => (
                                                <div key={paramName} className="flex items-baseline gap-2 text-xs">
                                                    <code className="font-mono text-black/70 dark:text-white/70">{paramName}</code>
                                                    {paramDef.type != null && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-black/40 dark:text-white/40">
                                                            {paramDef.type}
                                                        </span>
                                                    )}
                                                    {tool.inputSchema!.required?.includes(paramName) && (
                                                        <span className="text-[10px] text-red-500">required</span>
                                                    )}
                                                    {paramDef.description && (
                                                        <span className="text-black/40 dark:text-white/40">{paramDef.description}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Raw JSON */}
            {manifest && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold">Raw manifest</h2>
                        <button
                            onClick={() => copyText(JSON.stringify(manifest, null, 2), 'json')}
                            className="px-2 py-1 text-[10px] font-medium rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            {copied === 'json' ? 'Copied' : 'Copy JSON'}
                        </button>
                    </div>
                    <pre className="text-xs bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg font-mono overflow-x-auto max-h-80 overflow-y-auto">
                        {JSON.stringify(manifest, null, 2)}
                    </pre>
                </section>
            )}

            {/* Docs link */}
            <div className="text-xs text-black/40 dark:text-white/40">
                Learn more about MCP tools in the{' '}
                <a href="https://docs.privasys.org/solutions/enclave-os/enclave-os-mini/mcp-tools" target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline">
                    documentation
                </a>.
            </div>
        </div>
    );
}

// ------- Deployments Tab -------
// One place for an app's lifecycle: the current running instance (Stop / Upgrade)
// plus deploy when nothing runs. Versions are listed automatically — for a package
// app straight from the image registry — so the user picks one rather than typing
// image refs. One active deployment per app: deploying replaces the running one
// (the server stops it first). Vault-backed upgrades stage + promote the new
// measurement before the cutover.
function DeploymentsTab({ app, deployments, versions, enclaves, builds, token, onRefresh, retrying, onRetry, deployProgress }: {
    app: App; deployments: AppDeployment[]; versions: AppVersion[]; enclaves: Enclave[]; builds: BuildJob[]; token: string; onRefresh: () => void;
    retrying: boolean; onRetry: () => void;
    deployProgress?: Record<string, { stage: string; totalBytes?: number; downloadedBytes?: number }>;
}) {
    const versionMap = Object.fromEntries(versions.map(v => [v.id, v]));
    // Map by `gateway_host` (the IP) since deployments are keyed by IP.
    const enclaveMap = Object.fromEntries(enclaves.map(e => [`${e.gateway_host ?? ''}:${e.port}`, e]));
    const readyVersions = versions.filter(v => v.status === 'ready');
    const source = app.source_type; // package | github | cloud_image | upload
    const isUpload = source === 'upload';
    // Approval applies only to a vault-backed upgrade (the key handle is present).
    const needsApproval = app.key_provider !== 'external' && !!app.vault_key_handle;

    const isActiveStatus = (s: string) => s === 'active' || s === 'deploying' || s === 'starting';
    const currentDeployment = deployments.find(d => isActiveStatus(d.status));
    // Strictly-live (not deploying/starting): gates the inline Configure section.
    const liveDeployment = deployments.find(d => d.status === 'active');
    const pastDeployments = deployments.filter(d => !isActiveStatus(d.status));

    // Compact build status (moved from the removed Overview tab): a github app's
    // ship triggers a build; surface in-progress / failed here so the user is not
    // left wondering why a new version is not yet deployable.
    const lastBuild = builds[0];
    const buildInProgress = !!lastBuild && (lastBuild.status === 'pending' || lastBuild.status === 'dispatched' || lastBuild.status === 'running');
    const buildFailed = !!lastBuild && (lastBuild.status === 'failed' || lastBuild.status === 'cancelled');
    const buildCanRetry = buildFailed && app.source_type === 'github';

    const [actionsCollapsed, setActionsCollapsed] = useState(true);
    const [stopping, setStopping] = useState<string | null>(null);
    const [stopErrors, setStopErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    // Set when a deploy is refused because the app's .cwasm was AOT-compiled for
    // an older WASM engine than the enclave now runs. The server auto-triggers a
    // recompile, so this drives a calm blue notice instead of a red error.
    const [recompiling, setRecompiling] = useState(false);
    const { enabled: billingEnabled, frozen: balanceEmpty } = useBalance();
    // Only block when we know the balance is empty; "unknown" never gates a deploy.
    const deployBlockedByCredits = billingEnabled && balanceEmpty;
    // App Store gate (item 3): required listing fields must be filled before deploy.
    const storeMissing = missingStoreFields(app);

    // Inline upgrade / deploy (no modal). pickVersion holds the source-specific
    // identifier: registry tag (package), commit sha (github), channel (cloud_image),
    // or an AppVersion id (fallback). Upload apps use cwasmFile instead.
    const [pickVersion, setPickVersion] = useState('');
    // Adopters deploy to a LOCATION (cloud region), not a specific enclave. The
    // management-service picks a compatible enclave in the chosen location.
    const [pickLocation, setPickLocation] = useState('');
    const [locations, setLocations] = useState<DeployLocation[]>([]);
    const [locationsLoaded, setLocationsLoaded] = useState(false);
    // Deploy-time Confidential-* instance size (container apps only). Seeded
    // from the active deployment's size once known (else the app's default);
    // the user is free to change it — a redeploy may resize.
    const [pickSize, setPickSize] = useState(app.instance_size || 'micro');
    const pickSizeSeeded = useRef(false);
    const [sizes, setSizes] = useState<InstanceSize[]>(FALLBACK_INSTANCE_SIZES);
    // Tenancy (container apps, first deploy): 'shared' places onto a mutualised
    // host in the chosen location (default); 'dedicated' provisions a whole
    // confidential VM for this app; 'instance' targets a dedicated VM the
    // owner already runs (multi-app instances, Phase 6).
    const [pickTenancy, setPickTenancy] = useState<'shared' | 'dedicated' | 'instance'>('shared');
    const [pickInstance, setPickInstance] = useState('');
    const [myInstances, setMyInstances] = useState<Instance[]>([]);
    // Volume size for the FIRST deploy (10 GB default). An existing volume
    // keeps its size — growing is the Volumes page's resize, never a deploy
    // side effect — so the input only shows before the first deployment.
    const [pickStorageGB, setPickStorageGB] = useState('10');
    const [cwasmFile, setCwasmFile] = useState<File | null>(null);
    const [working, setWorking] = useState(false);
    const [workMsg, setWorkMsg] = useState<string | null>(null);
    // Live build info while a github commit builds during an upgrade (status + the
    // GitHub Actions run link), so the user can watch the reproducible build.
    const [buildLink, setBuildLink] = useState<{ status: string; url?: string; error?: string } | null>(null);

    // Source-specific upgrade options, listed automatically.
    const [tags, setTags] = useState<string[] | null>(null);            // package
    const [commits, setCommits] = useState<AppCommit[] | null>(null);   // github
    const [ownerRepo, setOwnerRepo] = useState('');
    const [images, setImages] = useState<CachedImage[] | null>(null);   // cloud_image
    const [optLoading, setOptLoading] = useState(false);
    const [optError, setOptError] = useState<string | null>(null);

    // App capabilities (config/action tools) for the live deployment, rendered
    // inline in the Current-instance tile — no separate Configure tab/component.
    const [schema, setSchema] = useState<AppSchema | null>(null);
    useEffect(() => {
        const liveId = liveDeployment?.id;
        if (!liveId) { setSchema(null); return; }
        let alive = true;
        getAppSchema(token, app.id)
            .then(s => { if (alive) setSchema(s); })
            .catch(() => { if (alive) setSchema(null); });
        return () => { alive = false; };
    }, [liveDeployment?.id, app.id, token]);
    // Owner configuration: prefer the dedicated `configure` section; fall back to
    // a legacy role:config tool for apps not yet migrated to the section.
    const configure = schema?.configure;
    const configFns = (schema?.functions ?? []).filter(f => f.role === 'config');
    const actionFns = (schema?.functions ?? []).filter(f => f.role === 'action');

    // Upgrade offers only versions NEWER than the running one (item 1). Package tags
    // are semver-filtered; github commits are already newer-only from the server;
    // cloud-image channels and uploads are not semver-ordered (shown as-is).
    const currentVersion = currentDeployment ? versionMap[currentDeployment.version_id] : undefined;
    const currentSemver = currentVersion ? versionSemverStr(currentVersion) : '';
    // The cloud-image channel the running version was deployed from (cloud-image:name:CHANNEL).
    const deployedChannel = currentVersion?.container_image?.startsWith('cloud-image:')
        ? currentVersion.container_image.split(':').pop() : undefined;
    const tagOptions = (tags ?? []).filter(t => !currentDeployment || isStrictlyNewer(t, currentSemver));
    const versionOptions = readyVersions.filter(v => !currentDeployment || isStrictlyNewer(versionSemverStr(v), currentSemver));
    const imageChannels = Array.from(new Set((images ?? []).filter(i => i.name === app.cloud_image_name).map(i => i.channel)));
    // Resolve a cloud-image channel to its LATEST cached image (by created_at),
    // so labels match what the deploy actually pulls — mgmt resolves a channel
    // to the newest disk for (name, channel, zone), not the first one listed.
    // A new image published on an existing channel reuses the same dropdown row
    // (the row is per-channel), so the label must track the newest digest.
    const latestImageForChannel = (ch: string): CachedImage | undefined =>
        (images ?? [])
            .filter(i => i.name === app.cloud_image_name && i.channel === ch)
            .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0];
    const cloudDigestForChannel = (ch: string): string | undefined =>
        latestImageForChannel(ch)?.digest;
    const cloudDigestForVersion = (v: AppVersion): string | undefined => {
        const img = v.container_image ?? '';
        if (!img.startsWith('cloud-image:')) return undefined;
        const ch = img.split(':').pop();
        return ch ? cloudDigestForChannel(ch) : undefined;
    };
    // The cached image's semver (privasys-version label), when published with one.
    // Lets the cloud-image upgrade list be version-ordered + newer-only, like
    // package/github, instead of always offering the channel.
    const cloudVersionForChannel = (ch: string): string | undefined =>
        latestImageForChannel(ch)?.version || undefined;
    const digest12 = (d: string): string => d.replace(/^sha256:/, '').slice(0, 12);

    // Unified dropdown choices (value + label) per source; upload uses a dropzone.
    const choices: { value: string; label: string; disabled?: boolean }[] =
        source === 'package' ? tagOptions.map(t => ({ value: t, label: t }))
            : source === 'github' ? (commits ?? []).map(c => ({ value: c.sha, label: `${c.sha.slice(0, 7)} · ${c.message}${c.verified ? '' : ' (unsigned — not deployable)'}`, disabled: !c.verified }))
                : source === 'cloud_image' ? imageChannels
                    // Versioned: only offer if strictly newer than what's running.
                    // Unversioned: offer unless it's the currently-deployed channel —
                    // re-deploying the same channel just re-pulls the running image
                    // (that was the "Upgrade shows the deployed version" bug).
                    .filter(ch => {
                        const ver = cloudVersionForChannel(ch);
                        if (ver && currentDeployment) return isStrictlyNewer(ver, currentSemver);
                        return !currentDeployment || ch !== deployedChannel;
                    })
                    .map(ch => {
                        const ver = cloudVersionForChannel(ch);
                        const d = cloudDigestForChannel(ch);
                        const tail = d ? `@${digest12(d)}` : '';
                        return { value: ch, label: ver ? `v${ver.replace(/^v/i, '')} · ${ch}${tail}` : (d ? `${ch} · ${digest12(d)}` : ch) };
                    })
                    : versionOptions.map(v => ({ value: v.id, label: versionLabel(v) }));
    const loaded = source === 'package' ? tags !== null : source === 'github' ? commits !== null : source === 'cloud_image' ? images !== null : true;

    const loadOptions = useCallback(async () => {
        setOptError(null);
        setOptLoading(true);
        try {
            if (source === 'package') setTags(await listRegistryTags(token, app.id));
            else if (source === 'github') { const r = await listAppCommits(token, app.id); setCommits(r.commits); setOwnerRepo(r.ownerRepo); }
            else if (source === 'cloud_image') setImages(await listCachedImages(token));
        } catch (e) {
            setOptError(e instanceof Error ? e.message : 'Failed to list versions');
        } finally {
            setOptLoading(false);
        }
    }, [source, token, app.id]);

    // List versions on tab load (a Refresh button re-lists too). Also re-list
    // when the active deployment changes: a github app's commit picker cuts off
    // at the DEPLOYED commit, so a stale (pre-deploy) list would keep offering
    // the just-deployed commit as an upgrade.
    useEffect(() => { loadOptions(); }, [loadOptions, currentDeployment?.id, currentDeployment?.version_id]);

    // Inline upgrade: prefill the version with the newest option and pin the
    // location to the running instance (an upgrade does not move the app).
    const upgradeTarget = choices[0]?.value ?? '';
    // An inline upgrade stays where the app already runs, so pin the location to
    // the current deployment's cloud region (derived from its enclave).
    const currentLocationCode = currentDeployment
        ? (enclaveMap[`${currentDeployment.enclave_host}:${currentDeployment.enclave_port}`]?.cloud_region_code ?? '')
        : '';
    // The specific enclave the app already runs on. Not an adopter deploy target
    // (they pick a location), but the vault stage/promote control plane still
    // addresses a concrete enclave, so derive it for that path only.
    const currentEnclaveId = currentDeployment
        ? (currentDeployment.enclave_id
            ?? enclaveMap[`${currentDeployment.enclave_host}:${currentDeployment.enclave_port}`]?.id
            ?? '')
        : '';
    useEffect(() => {
        if (currentDeployment) {
            if (!pickVersion && upgradeTarget) setPickVersion(upgradeTarget);
            if (currentLocationCode && pickLocation !== currentLocationCode) setPickLocation(currentLocationCode);
        }
    }, [currentDeployment, upgradeTarget, currentLocationCode, pickVersion, pickLocation]);

    // Load the adopter-facing deploy locations once per tab (like the size
    // catalogue). value = location.code, sent as `location` to deployDirect.
    useEffect(() => {
        let alive = true;
        listDeployLocations(token, app.id)
            .then(locs => { if (alive) { setLocations(locs); setLocationsLoaded(true); } })
            .catch(() => { if (alive) { setLocations([]); setLocationsLoaded(true); } });
        return () => { alive = false; };
    }, [token, app.id]);

    // Preselect a location on a first deploy (nothing to upgrade-pin to): the
    // sole match when there is one, else the first — never leave the field in a
    // dead "Select location…" state, since every listed location is valid.
    useEffect(() => {
        if (currentDeployment) return;
        if (!pickLocation && locations.length > 0) setPickLocation(locations[0].code);
    }, [currentDeployment, locations, pickLocation]);

    // Load the Confidential-* size catalogue once (container apps). Best-effort:
    // fetchInstanceSizes falls back to the static catalogue on any error.
    useEffect(() => {
        if (app.app_type !== 'container') return;
        let alive = true;
        fetchInstanceSizes(token).then(s => { if (alive) setSizes(s); });
        // The owner's running dedicated instances feed the "My instance"
        // tenancy option; best-effort (an empty list simply hides the option).
        listInstances(token)
            .then(list => { if (alive) setMyInstances(list.filter(i => i.state === 'running')); })
            .catch(() => { if (alive) setMyInstances([]); });
        return () => { alive = false; };
    }, [app.app_type, token]);

    // Seed the Size picker from the ACTIVE deployment's size, once it is known
    // (deployments load async). Seed only once so the user's choice sticks.
    const activeDeploymentSize = currentDeployment?.instance_size;
    useEffect(() => {
        if (pickSizeSeeded.current || !activeDeploymentSize) return;
        pickSizeSeeded.current = true;
        setPickSize(activeDeploymentSize);
    }, [activeDeploymentSize]);

    // The image repo without any tag or @digest, used to build the ref to ship.
    const imageRepoBase = (() => {
        let base = app.container_image || '';
        const at = base.indexOf('@');
        if (at >= 0) base = base.slice(0, at);
        const lastSlash = base.lastIndexOf('/');
        const lastColon = base.lastIndexOf(':');
        if (lastColon > lastSlash) base = base.slice(0, lastColon);
        return base;
    })();

    const selectCls = 'w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';
    const enclaveLabel = (e: Enclave) => `${e.name} — ${e.region || e.country || 'Unknown'}${e.provider ? ` (${e.provider})` : ''}${e.tee_type ? ` [${e.tee_type.toUpperCase()}]` : ''}`;
    // Adopter-facing deploy-location label: place + provider, tagged with the TEE.
    const locationLabel = (l: DeployLocation) => `${l.label}${l.provider ? ` (${l.provider})` : ''}${l.tee_type ? ` [${l.tee_type.toUpperCase()}]` : ''}`;

    // Package URL for the IMAGE link (repo without tag), best-effort per registry.
    const packageUrl = (() => {
        const b = imageRepoBase;
        if (b.startsWith('ghcr.io/')) {
            const parts = b.slice('ghcr.io/'.length).split('/');
            if (parts.length >= 2) {
                const owner = parts[0];
                const name = parts[parts.length - 1];
                return `https://github.com/${owner}/${name}/pkgs/container/${name}`;
            }
        }
        const dh = b.replace(/^docker\.io\//, '');
        if (b.startsWith('docker.io/') || !b.includes('/')) return `https://hub.docker.com/r/${dh}`;
        return `https://${b}`;
    })();

    // Poll a freshly-shipped version until it builds (github apps), then return it.
    // Surfaces the live build status + GitHub Actions run link so the user can
    // watch the reproducible build instead of an opaque "Building…".
    async function waitForReady(versionId: string): Promise<string> {
        for (let i = 0; i < 160; i++) { // ~13 min at 5s
            const v = await getVersion(token, app.id, versionId);
            // Find this version's build to surface its run link + status.
            try {
                const b = (await listBuilds(token, app.id)).find(x => x.version_id === versionId);
                if (b) setBuildLink({ status: b.status, url: b.run_url, error: b.error_message });
            } catch { /* keep last known build info */ }
            if (v.status === 'ready') return versionId;
            if (v.status === 'failed') throw new Error('Build failed');
            setWorkMsg(v.status === 'building' ? 'Building the reproducible image…' : 'Waiting for the build to start…');
            await new Promise(r => setTimeout(r, 5000));
        }
        throw new Error('Build is taking longer than expected; it will finish in the background — deploy it from Versions once ready');
    }

    // Effective tenancy for a FIRST deploy: the picker only shows for container
    // apps without a live deployment; everything else stays 'shared' (upgrades
    // pin to the current host server-side).
    const tenancyChoice = app.app_type === 'container' && !currentDeployment ? pickTenancy : 'shared';

    async function handleConfirm() {
        if (tenancyChoice === 'shared' && !pickLocation) return;
        if (tenancyChoice === 'instance' && !pickInstance) return;
        if (isUpload ? !cwasmFile : !pickVersion) return;
        if (deployBlockedByCredits) {
            setError('Your credit balance is empty. Top up credits or redeem a code on the Billing page to deploy.');
            return;
        }
        setWorking(true);
        setError(null);
        setRecompiling(false);
        setBuildLink(null);
        try {
            // Resolve the version to deploy, by source. Package/cloud-image/upload are
            // immediately ready; a github commit must build first.
            let versionId = '';
            if (isUpload) {
                setWorkMsg('Uploading module…');
                versionId = (await uploadVersionCwasm(token, app.id, cwasmFile as File)).id;
            } else if (source === 'package') {
                setWorkMsg(`Shipping ${pickVersion}…`);
                const body: CreateVersionBody = { image: `${imageRepoBase}:${pickVersion}` };
                if (/^v?\d+\.\d+\.\d+$/i.test(pickVersion)) body.version = pickVersion;
                versionId = (await createVersion(token, app.id, body)).id;
            } else if (source === 'github') {
                setWorkMsg('Shipping commit…');
                const v = await createVersion(token, app.id, { commit_url: `https://github.com/${ownerRepo}/commit/${pickVersion}` });
                versionId = await waitForReady(v.id);
            } else if (source === 'cloud_image') {
                setWorkMsg(`Shipping ${pickVersion}…`);
                versionId = (await createVersion(token, app.id, { channel: pickVersion, version: cloudVersionForChannel(pickVersion) })).id;
            } else {
                versionId = pickVersion; // fallback: an existing version id
            }
            // Vault-backed apps gate deploy on the new version's measurement
            // being promoted on the data key. On a first deploy the key does not
            // exist yet — the enclave creates it during deploy — so a plain deploy
            // works. If the key already exists, the deploy is rejected until the
            // new measurement is staged + promoted; do that, then retry. Deploying
            // first (rather than always staging) avoids a "key not found" on the
            // first deploy, since staging needs an existing key.
            // Container deploys carry the chosen Confidential-* size; wasm
            // deploys have no size control.
            const sizeArg = app.app_type === 'container' ? pickSize : undefined;
            // Tenancy → deploy payload: shared = location placement (default);
            // dedicated = the platform provisions a whole VM for this app;
            // instance = deploy onto an owned running dedicated VM.
            const storageGB = app.app_type === 'container' && app.container_storage && !currentDeployment
                ? Math.max(1, Math.floor(Number(pickStorageGB) || 10))
                : undefined;
            const deployOpts = tenancyChoice === 'dedicated'
                ? { tenancy: 'dedicated' as const, storageGB }
                : tenancyChoice === 'instance'
                    ? { instanceId: pickInstance, storageGB }
                    : storageGB ? { storageGB } : undefined;
            setWorkMsg('Deploying…');
            try {
                await deployDirect(token, app.id, versionId, pickLocation, sizeArg, deployOpts);
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (!needsApproval || !/not promoted|approve this version/i.test(msg)) throw e;
                setWorkMsg('Staging measurement…');
                const staged = await stageProfile(token, app.id, versionId, currentEnclaveId);
                // Promote the pending profile the stage just created. The vault
                // assigns its id; a key with prior pending profiles gets a
                // non-zero id, so hardcoding 0 promotes the wrong/absent profile
                // (4/4 denied → 502). Use the id the stage returned.
                const pendingId = staged.vaults?.find(v => v.ok && v.pending_id != null)?.pending_id;
                setWorkMsg('Promoting (releasing data key)…');
                await promoteProfile(token, app.id, versionId, pendingId);
                setWorkMsg('Deploying…');
                await deployDirect(token, app.id, versionId, pickLocation, sizeArg, deployOpts);
            }
            if (!currentDeployment) { setPickVersion(''); setCwasmFile(null); }
        } catch (e) {
            // A .cwasm compiled for a superseded WASM engine: the server has
            // already kicked off a recompile, so show a calm notice (and let the
            // build tile take over) rather than a red failure.
            if (apiErrorCode(e) === 'cwasm_version_mismatch') {
                setRecompiling(true);
            } else {
                setError(e instanceof Error ? e.message : 'Deployment failed');
            }
        } finally {
            setWorking(false);
            setWorkMsg(null);
            setBuildLink(null);
            onRefresh();
        }
    }

    // Build status + GitHub Actions run link, shown while a github commit builds.
    const buildStatusLine = (working && (workMsg || buildLink)) ? (
        <div className="mt-2 text-xs text-black/50 dark:text-white/50 flex items-center flex-wrap gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {workMsg}
            </span>
            {buildLink && (
                <span className="capitalize text-black/40 dark:text-white/40">· build {buildLink.status}</span>
            )}
            {buildLink?.url && (
                <a href={buildLink.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View build run &rarr;</a>
            )}
            {buildLink?.error && (
                <span className="text-red-600 dark:text-red-400">{buildLink.error}</span>
            )}
        </div>
    ) : null;

    // The source-aware version control: a dropzone for upload apps, else a select
    // of the source's choices (registry tags / github commits / cloud-image channels).
    function renderVersionPicker(withBlank: boolean) {
        if (isUpload) {
            return (
                <label
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setCwasmFile(f); }}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-black/15 dark:border-white/15 cursor-pointer hover:border-black/30 dark:hover:border-white/30 transition-colors text-xs text-black/50 dark:text-white/50"
                >
                    <input type="file" accept=".cwasm" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setCwasmFile(f); }} />
                    {cwasmFile ? cwasmFile.name : 'Drop a .cwasm module or click to upload'}
                </label>
            );
        }
        if (optError) return <div className="text-xs text-red-600 dark:text-red-400 py-2">{optError}</div>;
        if (optLoading && !loaded) return <div className="text-xs text-black/40 dark:text-white/40 py-2">Loading versions…</div>;
        if (choices.length === 0) return <div className="text-xs text-black/40 dark:text-white/40 py-2">{currentDeployment ? 'Already on the newest version.' : 'No versions available yet.'}</div>;
        return (
            <select value={pickVersion} onChange={e => setPickVersion(e.target.value)} className={selectCls}>
                {withBlank && <option value="">Select version…</option>}
                {choices.map(c => (<option key={c.value} value={c.value} disabled={c.disabled}>{c.label}</option>))}
            </select>
        );
    }

    // The deploy-time Size control (container apps only; wasm deploys show no
    // size control). Options come from the live catalogue with static fallback.
    //   - shared: the full mutualised catalogue — the size is the CPU/RAM CAP
    //     for your app on the shared host.
    //   - dedicated: only the sizes that map to a whole GCP machine
    //     (Medium → c3-standard-4, Large → c3-standard-8).
    const DEDICATED_SIZE_SLUGS = ['medium', 'large'];
    function renderSizePicker() {
        const opts = tenancyChoice === 'dedicated' ? sizes.filter(s => DEDICATED_SIZE_SLUGS.includes(s.slug)) : sizes;
        return (
            <select value={pickSize} onChange={e => setPickSize(e.target.value)} className={selectCls}>
                {opts.map(s => (<option key={s.slug} value={s.slug}>{sizeOptionLabel(s)}</option>))}
            </select>
        );
    }

    // Live cost estimate for the current picks, shown just above Deploy. Storage
    // is £0.20/GB·month = 278 credits/GB·hour (mirrors the volume meter). Shared:
    // compute (size) + storage volume. Dedicated: the whole-machine hourly (the
    // size's rate), storage included on the machine. Instance: no extra charge.
    const STORAGE_CREDITS_PER_GB_HOUR = 278;
    function renderCostEstimate() {
        if (app.app_type !== 'container') return null;
        const size = sizes.find(s => s.slug === pickSize);
        if (!size) return null;
        const storageGB = app.container_storage ? Math.max(0, Math.floor(Number(pickStorageGB) || 0)) : 0;

        if (tenancyChoice === 'instance') {
            return (
                <div className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3">
                    <div className="text-xs text-black/50 dark:text-white/50">Estimated cost</div>
                    <div className="mt-0.5 text-sm">No extra charge — compute and storage are covered by your instance&apos;s machine bill.</div>
                </div>
            );
        }

        const computeHour = size.credits_per_hour;
        const storageHour = tenancyChoice === 'shared' ? storageGB * STORAGE_CREDITS_PER_GB_HOUR : 0;
        const totalHour = computeHour + storageHour;
        const monthly = (totalHour * 720) / 1_000_000;
        return (
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs text-black/50 dark:text-white/50">Estimated cost</span>
                    <span className="text-sm font-semibold whitespace-nowrap">{totalHour.toLocaleString('en-GB')} credits/hour · ≈ £{monthly.toFixed(2)}/mo</span>
                </div>
                <div className="mt-1 text-[11px] text-black/40 dark:text-white/40">
                    {tenancyChoice === 'dedicated'
                        ? <>Whole {size.size} confidential VM, billed per started hour; the apps and storage on it are included.</>
                        : <>Compute {computeHour.toLocaleString('en-GB')}/h{storageGB > 0 && <> · storage {storageHour.toLocaleString('en-GB')}/h ({storageGB} GB)</>}. Billed per started hour while deployed{storageGB > 0 && <>; the volume keeps billing until you delete it</>}.</>}
                </div>
            </div>
        );
    }

    // Cost line for an in-place upgrade (the deployment already exists, so its
    // tenancy is fixed — we can't key on tenancyChoice, which upgrades force to
    // 'shared'). Shows the new compute rate and the delta vs the running size;
    // storage is on its own volume and unchanged by a size upgrade.
    function renderUpgradeCost(dep: AppDeployment) {
        if (app.app_type !== 'container') return null;
        const newSize = sizes.find(s => s.slug === pickSize);
        if (!newSize) return null;
        const curSlug = dep.instance_size || app.instance_size || 'micro';
        const curSize = sizes.find(s => s.slug === curSlug);
        const newHour = newSize.credits_per_hour;
        const curHour = curSize?.credits_per_hour ?? newHour;
        const delta = newHour - curHour;
        const deltaLabel = delta === 0 ? null : ` (${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('en-GB')}/h vs now)`;

        // Dedicated/instance-hosted deployments are machine-billed; a resize
        // changes the resource envelope, not a per-app compute line, and we
        // can't reliably tell an owned instance (resize free) from a whole
        // dedicated VM (shape rate changes) here — so state it plainly rather
        // than assert a number.
        if ((dep.tenancy || 'mutualised') === 'dedicated') {
            return (
                <div className="mt-2 text-[11px] text-black/40 dark:text-white/40">
                    This deployment is on a dedicated machine (billed per hour); the size sets its resource envelope.
                </div>
            );
        }
        const monthly = (newHour * 720) / 1_000_000;
        return (
            <div className="mt-2 text-[11px] text-black/40 dark:text-white/40">
                Estimated compute after upgrade: {newHour.toLocaleString('en-GB')} credits/hour · ≈ £{monthly.toFixed(2)}/mo{deltaLabel}. Storage is billed separately on its volume.
            </div>
        );
    }

    // Tenancy control (container apps, first deploy). 'My instance' appears
    // only when the owner has a running dedicated instance to target.
    function renderTenancyPicker() {
        const opt = (v: 'shared' | 'dedicated' | 'instance', label: string, hint: string) => (
            <button
                key={v}
                type="button"
                onClick={() => {
                    setPickTenancy(v);
                    // Dedicated VMs come in Medium/Large only — snap the size.
                    if (v === 'dedicated' && !DEDICATED_SIZE_SLUGS.includes(pickSize)) setPickSize('medium');
                    if (v === 'instance' && !pickInstance && myInstances.length > 0) setPickInstance(myInstances[0].id);
                }}
                title={hint}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${pickTenancy === v
                    ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                    : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
                {label}
            </button>
        );
        return (
            <div className="flex flex-wrap gap-2">
                {opt('shared', 'Shared', 'Runs on a shared confidential host in the chosen location — pay per started hour for the size.')}
                {opt('dedicated', 'Dedicated VM', 'Provisions a whole confidential VM for this app — the machine is billed per started hour, apps included.')}
                {myInstances.length > 0 && opt('instance', 'My instance', 'Deploy onto a dedicated VM you already run, alongside your other apps — no extra machine cost.')}
            </div>
        );
    }

    const nothingToDeploy = !isUpload && !optLoading && choices.length === 0;
    const confirmDisabled = working || deployBlockedByCredits || storeMissing.length > 0 || (isUpload ? !cwasmFile : (!pickVersion || nothingToDeploy));

    async function handleStop(depId: string, force = false) {
        setStopping(depId);
        setError(null);
        try {
            await stopDeployment(token, app.id, depId, force);
            setStopErrors(prev => {
                const next = { ...prev };
                delete next[depId];
                return next;
            });
            onRefresh();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to stop deployment';
            setStopErrors(prev => ({ ...prev, [depId]: msg }));
        } finally {
            setStopping(null);
        }
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Calm notice when a deploy triggers an automatic recompile because
                the enclave's WASM engine (wasmtime) was upgraded and the stored
                .cwasm was built for the previous version. */}
            {recompiling && (
                <div className="flex items-start gap-2 p-3 rounded-lg text-xs border bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800/30 text-blue-700 dark:text-blue-300">
                    <span className="w-1.5 h-1.5 mt-1 rounded-full bg-blue-500 animate-pulse shrink-0" />
                    <span>The confidential WASM runtime was upgraded, so this app is being recompiled to match it. It will be deployable again once the build below finishes.</span>
                </div>
            )}

            {/* Build status (github apps): a shipped version builds before it is
                deployable. Surfaced here instead of the removed Overview tab. */}
            {(buildInProgress || buildFailed) && (
                <div className={`flex items-center justify-between gap-3 p-3 rounded-lg text-xs border ${
                    buildInProgress
                        ? 'bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800/30 text-blue-700 dark:text-blue-300'
                        : 'bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'
                }`}>
                    <div className="flex items-center gap-2 min-w-0">
                        <BuildStatusDot status={lastBuild.status} />
                        <span className="font-medium capitalize">{buildInProgress ? 'Building' : lastBuild.status}</span>
                        <code className="font-mono opacity-70">{lastBuild.github_commit.slice(0, 8)}</code>
                        {buildFailed && lastBuild.error_message && (
                            <span className="truncate opacity-80">{lastBuild.error_message}</span>
                        )}
                        {lastBuild.run_url && (
                            <a href={lastBuild.run_url} target="_blank" rel="noopener noreferrer" className="underline shrink-0">View run &rarr;</a>
                        )}
                    </div>
                    {buildCanRetry && (
                        <button onClick={onRetry} disabled={retrying} className="shrink-0 px-2.5 py-1 rounded-md border border-current/30 hover:bg-current/10 disabled:opacity-50">
                            {retrying ? 'Retrying…' : 'Retry build'}
                        </button>
                    )}
                </div>
            )}

            {/* Current instance */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Current instance</h2>
                    <button
                        onClick={() => { onRefresh(); loadOptions(); }}
                        className="text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
                    >
                        ↻ Refresh
                    </button>
                </div>

                {currentDeployment ? (() => {
                    const dep = currentDeployment;
                    const enclave = enclaveMap[`${dep.enclave_host}:${dep.enclave_port}`];
                    const version = versionMap[dep.version_id];
                    const isLive = dep.status === 'active';
                    return (
                        <>
                            <section className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-900/5">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`w-2 h-2 shrink-0 rounded-full ${
                                            dep.status === 'active' ? 'bg-emerald-500' :
                                                dep.status === 'deploying' ? 'bg-blue-500 animate-pulse' :
                                                    dep.status === 'starting' ? 'bg-indigo-500 animate-pulse' :
                                                        'bg-yellow-500'
                                        }`} />
                                        <span className="text-sm font-medium truncate">{dep.hostname || `${dep.enclave_host}:${dep.enclave_port}`}</span>
                                    </div>
                                    {/* One status, not three: container state when live, else the deploy phase.
                                        Stop sits in the tile's top-right corner once the instance is live. */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isLive
                                            ? <StatusBadge status={dep.container_state || 'running'} labels={CONTAINER_STATE_LABELS} colors={CONTAINER_STATE_COLORS} />
                                            : <StatusBadge status={dep.status} labels={DEPLOYMENT_STATUS_LABELS} colors={DEPLOYMENT_STATUS_COLORS} />}
                                        {isLive && (
                                            <button
                                                onClick={() => handleStop(dep.id)}
                                                disabled={stopping === dep.id || working}
                                                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                                            >
                                                {stopping === dep.id ? 'Stopping…' : 'Stop instance'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {/* Pull progress bar */}
                                {(() => {
                                    const progress = deployProgress?.[dep.id];
                                    if (!progress || dep.status === 'active') return null;
                                    const { stage, totalBytes, downloadedBytes } = progress;
                                    const pct = totalBytes && totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes || 0) / totalBytes * 100)) : 0;
                                    const formatBytes = (b: number) => b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(0)} MB` : `${(b / 1e3).toFixed(0)} KB`;
                                    return (
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between text-xs text-black/50 dark:text-white/50 mb-1">
                                                <span>{stage === 'pulling' ? 'Pulling image...' : stage === 'running' ? 'Starting container...' : stage}</span>
                                                {totalBytes && totalBytes > 0 && (<span>{formatBytes(downloadedBytes || 0)} / {formatBytes(totalBytes)}</span>)}
                                            </div>
                                            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                                                {stage === 'running'
                                                    ? <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '100%' }} />
                                                    : <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />}
                                            </div>
                                        </div>
                                    );
                                })()}
                                {/* Non-active deployments: surface the reconciler's own view
                                    (container_state + reconcile_message) so a deployment that is
                                    starting/awaiting/redeploying says what it is doing, instead of
                                    a bare "Starting" badge. The rich per-app activity/progress doc
                                    (app-status-protocol) renders here too once wired. */}
                                {(dep.status !== 'active' || (dep.container_state && dep.container_state !== 'running')) && (dep.reconcile_message || (dep.container_state && dep.container_state !== 'running')) && (
                                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2 text-xs text-black/60 dark:text-white/60">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                                        <span>
                                            {(dep.container_state && CONTAINER_STATE_LABELS[dep.container_state]) || dep.container_state || DEPLOYMENT_STATUS_LABELS[dep.status] || dep.status}
                                            {dep.reconcile_message ? ` — ${dep.reconcile_message}` : ''}
                                            {dep.last_checked_at && (
                                                <span className="text-black/30 dark:text-white/30"> · checked {new Date(dep.last_checked_at).toLocaleTimeString()}</span>
                                            )}
                                        </span>
                                    </div>
                                )}
                                <div className="grid grid-cols-3 gap-3 text-xs text-black/50 dark:text-white/50">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Location</div>
                                        <div className="mt-0.5">{enclave ? enclaveLabel(enclave) : `${dep.enclave_host}:${dep.enclave_port}`}</div>
                                    </div>
                                    {version && (
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Version</div>
                                            <div className="mt-0.5">{versionLabel(version, cloudDigestForVersion(version))}</div>
                                        </div>
                                    )}
                                    {app.app_type === 'container' && app.container_port != null && (
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Port</div>
                                            <div className="mt-0.5">{app.container_port}</div>
                                        </div>
                                    )}
                                    {dep.deployed_at && (
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Deployed</div>
                                            <div className="mt-0.5">{new Date(dep.deployed_at).toLocaleString()}</div>
                                        </div>
                                    )}
                                    {app.app_type === 'container' && (dep.instance_size || app.instance_size) && (
                                        <div className="col-span-3">
                                            <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Size</div>
                                            <div className="mt-0.5">{instanceSizeLabel(dep.instance_size || app.instance_size || '')}</div>
                                        </div>
                                    )}
                                    {app.app_type === 'container' && imageRepoBase && (
                                        <div className="col-span-3">
                                            <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Image</div>
                                            <a href={packageUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 font-mono break-all text-blue-600 dark:text-blue-400 hover:underline">{imageRepoBase}</a>
                                        </div>
                                    )}
                                </div>
                                {dep.hostname && (
                                    <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                                        <a href={`https://${dep.hostname}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">https://{dep.hostname} &rarr;</a>
                                    </div>
                                )}

                                {/* Configuration + Actions live in their own tile below the
                                    instance (see "Configuration and Actions"), not here. */}

                                {/* Upgrade lives inside the tile, separated by the same grey
                                    divider as the endpoint row above. Only once live (item 1). */}
                                {isLive && (
                                    <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                                        <div className="flex items-end gap-3">
                                            <div className="flex-1">
                                                <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Upgrade to</label>
                                                {renderVersionPicker(false)}
                                            </div>
                                            {app.app_type === 'container' && (
                                                <div className="flex-1">
                                                    <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Size</label>
                                                    {renderSizePicker()}
                                                </div>
                                            )}
                                            <button
                                                onClick={handleConfirm}
                                                disabled={confirmDisabled || !pickLocation}
                                                className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                            >
                                                {working ? 'Upgrading…' : 'Upgrade'}
                                            </button>
                                        </div>
                                        {app.app_type === 'container' && renderUpgradeCost(dep)}
                                        {storeMissing.length > 0 && (
                                            <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                                                Complete your App Store listing ({storeMissing.join(', ')}) before upgrading. <Link href={`/dashboard/apps/${app.id}?tab=store`} className="underline font-medium">Open App Store</Link>
                                            </div>
                                        )}
                                        {deployBlockedByCredits && (
                                            <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">Your credit balance is empty. <Link href="/dashboard/billing" className="underline font-medium">Top up or redeem a code</Link>.</div>
                                        )}
                                        {buildStatusLine}
                                        {stopErrors[dep.id] && (
                                            <div className="mt-2 flex items-center gap-3">
                                                <button
                                                    onClick={() => handleStop(dep.id, true)}
                                                    disabled={stopping === dep.id}
                                                    title="Mark this deployment stopped without contacting the enclave. Use when the enclave is gone or unreachable."
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 transition-colors"
                                                >
                                                    Force remove
                                                </button>
                                                <span className="text-xs text-amber-700 dark:text-amber-300">Stop failed: {stopErrors[dep.id]}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>
                        </>
                    );
                })() : (
                    /* No current instance: deploy inline (no modal). */
                    <section className="p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-3">
                        <div className="text-sm text-black/50 dark:text-white/50">No active deployment.</div>
                        {app.app_type === 'container' && (
                            <div>
                                <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Hosting</label>
                                {renderTenancyPicker()}
                                <div className="mt-1.5 text-[11px] text-black/40 dark:text-white/40">
                                    {pickTenancy === 'shared' && 'Shared confidential host — pay per started hour for the size below.'}
                                    {pickTenancy === 'dedicated' && 'A whole confidential VM is provisioned for this app; the machine is billed per started hour, apps included.'}
                                    {pickTenancy === 'instance' && 'Deploys alongside your other apps on the selected instance — no extra machine cost.'}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Version</label>
                                {renderVersionPicker(true)}
                            </div>
                            {tenancyChoice === 'shared' && (
                                <div>
                                    <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Location</label>
                                    {!locationsLoaded
                                        ? <div className="text-xs text-black/40 dark:text-white/40 py-2">Loading locations…</div>
                                        : locations.length === 0
                                            ? <div className="text-xs text-amber-700 dark:text-amber-400 py-2">No shared capacity available for this app.</div>
                                            : locations.length === 1
                                                // Single match: nothing to choose — show it read-only.
                                                ? <div className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-black/60 dark:text-white/60">{locationLabel(locations[0])}</div>
                                                : <select value={pickLocation} onChange={e => setPickLocation(e.target.value)} className={selectCls}>{locations.map(l => (<option key={l.code} value={l.code}>{locationLabel(l)}</option>))}</select>}
                                </div>
                            )}
                            {tenancyChoice === 'dedicated' && (
                                <div>
                                    <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Location</label>
                                    <div className="px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-black/60 dark:text-white/60">Paris, France (gcp) [TDX]</div>
                                </div>
                            )}
                            {tenancyChoice === 'instance' && (
                                <div>
                                    <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Instance</label>
                                    <select value={pickInstance} onChange={e => setPickInstance(e.target.value)} className={selectCls}>
                                        {myInstances.map(i => (<option key={i.id} value={i.id}>{i.name} — {i.shape} · {i.location} · {i.app_count} app{i.app_count === 1 ? '' : 's'}</option>))}
                                    </select>
                                </div>
                            )}
                            {app.app_type === 'container' && (
                                <div>
                                    <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Size</label>
                                    {renderSizePicker()}
                                    <div className="mt-1 text-[11px] text-black/40 dark:text-white/40">
                                        {tenancyChoice === 'shared' && 'Maximum vCPU and memory for your app on the shared host.'}
                                        {tenancyChoice === 'dedicated' && 'The confidential VM provisioned for your app.'}
                                        {tenancyChoice === 'instance' && 'Caps resources on your instance; oversubscription is allowed.'}
                                    </div>
                                </div>
                            )}
                            {app.app_type === 'container' && app.container_storage && (
                                <div>
                                    <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Storage (GB)</label>
                                    <input
                                        type="number" min={1} value={pickStorageGB}
                                        onChange={e => setPickStorageGB(e.target.value)}
                                        className={selectCls}
                                    />
                                    <div className="mt-1 text-[11px] text-black/40 dark:text-white/40">
                                        The app&apos;s encrypted volume. Grow it later on the Volumes page.
                                    </div>
                                </div>
                            )}
                        </div>
                        {app.app_type === 'container' && renderCostEstimate()}
                        {storeMissing.length > 0 && (
                            <div className="text-xs text-amber-700 dark:text-amber-400">Complete your App Store listing ({storeMissing.join(', ')}) before deploying. <Link href={`/dashboard/apps/${app.id}?tab=store`} className="underline font-medium">Open App Store</Link></div>
                        )}
                        {deployBlockedByCredits && (
                            <div className="text-xs text-amber-700 dark:text-amber-400">Your credit balance is empty. <Link href="/dashboard/billing" className="underline font-medium">Top up or redeem a code</Link>.</div>
                        )}
                        {buildStatusLine}
                        <button
                            onClick={handleConfirm}
                            disabled={confirmDisabled
                                || (tenancyChoice === 'shared' && !pickLocation)
                                || (tenancyChoice === 'instance' && !pickInstance)}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                        >
                            {working ? 'Deploying…' : 'Deploy'}
                        </button>
                    </section>
                )}
            </section>

            {/* Configuration and Actions — a dedicated tile below the instance, with
                its own title (like Current instance), so it reads clearly as an
                owner surface rather than a stray label inside the instance card. */}
            {liveDeployment && (configure || configFns.length > 0 || actionFns.length > 0) && (
                <section>
                    <h2 className="text-sm font-semibold mb-3">Configuration and Actions</h2>
                    <div className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                        {configure && (
                            <ConfigureForm cfg={configure} appId={app.id} token={token} frozen={liveDeployment.container_state === 'awaiting_config'} onConfigured={onRefresh} />
                        )}
                        {!configure && configFns.length > 0 && (
                            <div>
                                {liveDeployment.container_state === 'awaiting_config' && (
                                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                                        <svg className="w-3.5 h-3.5 mt-px shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                                        <span>The app stays frozen (HTTP 503 at the routing layer) until configuration is applied.</span>
                                    </div>
                                )}
                                {configFns.map(fn => (
                                    <div key={fn.name} className="mt-3 first:mt-0"><ConfigForm fn={fn} appId={app.id} token={token} /></div>
                                ))}
                            </div>
                        )}
                        {actionFns.length > 0 && (
                            <div className={(configure || configFns.length > 0) ? 'mt-4 pt-4 border-t border-black/5 dark:border-white/5' : ''}>
                                <button type="button" onClick={() => setActionsCollapsed(c => !c)}
                                    className="flex w-full items-center justify-between gap-2 text-left">
                                    <h3 className="text-sm font-semibold">Actions</h3>
                                    <svg className={`w-4 h-4 text-black/40 dark:text-white/40 transition-transform ${actionsCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                                </button>
                                {!actionsCollapsed && (
                                    <div className="mt-3 space-y-3">
                                        {actionFns.map(fn => (
                                            <ActionRunner key={fn.name} fn={fn} appId={app.id} token={token} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Previous deployments (compact) */}
            {pastDeployments.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold mb-3">Previous deployments</h2>
                    <div className="divide-y divide-black/5 dark:divide-white/5 rounded-xl border border-black/10 dark:border-white/10">
                        {pastDeployments.map((dep) => {
                            const version = versionMap[dep.version_id];
                            const enclave = enclaveMap[`${dep.enclave_host}:${dep.enclave_port}`];
                            return (
                                <div key={dep.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                                        <span className="font-medium text-black/70 dark:text-white/70">
                                            {enclave ? (enclave.region || enclave.name) : `${dep.enclave_host}:${dep.enclave_port}`}
                                        </span>
                                        {version && <span className="text-black/40 dark:text-white/40">{versionLabel(version, cloudDigestForVersion(version))}</span>}
                                    </div>
                                    <div className="flex items-center gap-3 text-black/40 dark:text-white/40">
                                        {dep.stopped_at && <span>{new Date(dep.stopped_at).toLocaleDateString()}</span>}
                                        <StatusBadge status={dep.status} labels={DEPLOYMENT_STATUS_LABELS} colors={DEPLOYMENT_STATUS_COLORS} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

        </div>
    );
}

// ------- App UI Tab (iframe) -------
function AppUITab({ appId, appName, hostname, token, containerMcp, onMcpUpdate }: {
    appId: string; appName: string; hostname?: string; token: string;
    containerMcp: Record<string, unknown>; onMcpUpdate: (app: App) => void;
}) {
    const apiUrl = getApiBaseUrl();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const iframeSrc = `${apiUrl}/api/v1/apps/${encodeURIComponent(appId)}/ui`;
    const currentUrl = (containerMcp?.ui as { url?: string })?.url || '';
    const [editUrl, setEditUrl] = useState(currentUrl);
    const [saving, setSaving] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const urlChanged = editUrl !== currentUrl;

    // Fetch UI HTML with auth token (iframe src cannot carry Authorization header)
    useEffect(() => {
        let cancelled = false;
        setHtmlContent(null);
        setFetchError(null);
        fetch(iframeSrc, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async (res) => {
                if (cancelled) return;
                if (!res.ok) {
                    setFetchError(await res.text());
                    return;
                }
                setHtmlContent(await res.text());
            })
            .catch((err) => {
                if (!cancelled) setFetchError(String(err));
            });
        return () => { cancelled = true; };
    }, [iframeSrc, token, iframeKey]);

    // Chat proxy for the sandboxed demo UI. The iframe is intentionally NOT
    // allow-same-origin (it can host an arbitrary app's UI, which must never
    // reach the portal session), so it has a null origin and cannot make
    // authenticated cross-origin calls itself. Instead it postMessages a chat
    // request and the portal — same-origin to the API, owner-authenticated —
    // relays it through the mgmt RPC proxy (no enclave CORS/cert exposure) and
    // posts the reply back. Only messages from THIS iframe are honoured.
    useEffect(() => {
        const onMsg = async (e: MessageEvent) => {
            const d = e.data as { type?: string; id?: unknown; messages?: unknown };
            if (!d || d.type !== 'privasys-chat' || !Array.isArray(d.messages)) return;
            if (e.source !== iframeRef.current?.contentWindow) return;
            const reply = (payload: Record<string, unknown>) =>
                (e.source as Window | null)?.postMessage({ type: 'privasys-chat-response', id: d.id, ...payload }, '*');
            try {
                const r = await rpcCall(token, appId, 'chat', { messages: d.messages, stream: false });
                const doc = r as { choices?: Array<{ message?: { content?: string } }>; error?: unknown };
                if (doc.error) { reply({ error: String(doc.error) }); return; }
                reply({ content: doc.choices?.[0]?.message?.content ?? '' });
            } catch (err) {
                reply({ error: (err as Error).message });
            }
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, [token, appId]);

    const handleIframeLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
        const iframe = e.currentTarget;
        try {
            iframe.contentWindow?.postMessage({
                type: 'privasys-init',
                apiUrl,
                appId,
                appName,
                hostname,
                token
            }, '*');
        } catch {
            // cross-origin - expected if CSP blocks
        }
    }, [apiUrl, appId, appName, hostname, token]);

    const handleSaveUrl = useCallback(async () => {
        if (!urlChanged || saving) return;
        setSaving(true);
        try {
            const updated = await updateContainerMcp(token, appId, {
                ...containerMcp,
                ui: { ...(containerMcp.ui as Record<string, unknown> || {}), url: editUrl }
            });
            onMcpUpdate(updated);
            setIframeKey(k => k + 1);
        } catch {
            // revert on error
            setEditUrl(currentUrl);
        } finally {
            setSaving(false);
        }
    }, [urlChanged, saving, token, appId, containerMcp, editUrl, currentUrl, onMcpUpdate]);

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-black/50 dark:text-white/50">
                        UI fetched on-demand from the URL below. Override it to test a new version without redeploying.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="url"
                        value={editUrl}
                        onChange={e => setEditUrl(e.target.value)}
                        placeholder="https://raw.githubusercontent.com/..."
                        className="flex-1 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm font-mono"
                    />
                    {urlChanged && (
                        <button
                            onClick={handleSaveUrl}
                            disabled={saving || !editUrl.startsWith('https://')}
                            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save & Reload'}
                        </button>
                    )}
                </div>
            </div>
            {fetchError && (
                <p className="text-sm text-red-600 dark:text-red-400">{fetchError}</p>
            )}
            {htmlContent != null && (
                <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    srcDoc={htmlContent}
                    onLoad={handleIframeLoad}
                    sandbox="allow-scripts allow-forms"
                    className="w-full rounded-xl border border-black/10 dark:border-white/10"
                    style={{ minHeight: '600px', height: '80vh' }}
                    title={`${appName} UI`}
                />
            )}
        </div>
    );
}

// ------- Configure / Manage Tab -------
// Native rendering of an app's role-tagged tools from its AppSchema:
// role:config tools become a Configuration form (submitting lifts the
// manager freeze gate); role:action tools become a Manage panel with a
// typed form, dynamic enums (x-privasys.source), and a progress bar
// (x-privasys.progress). Everything is invoked via rpcCall (/rpc/{name}),
// the same surface as the API Test tab. No app-specific code.

// Unwrap a WASM RPC envelope ({returns:[{value:{ok|err}}]}) to the inner
// value; container apps return their JSON directly, so pass it through.
function unwrapRpc(resp: unknown): unknown {
    if (resp && typeof resp === 'object' && 'returns' in resp) {
        const r = (resp as { returns?: { value?: unknown }[] }).returns?.[0]?.value;
        if (r && typeof r === 'object' && 'ok' in r) return (r as { ok: unknown }).ok;
        return r;
    }
    return resp;
}

// Navigate a dotted path ("available", "data.items") to an array of choices.
function selectPath(obj: unknown, path: string): string[] {
    let cur: unknown = obj;
    for (const seg of path.split('.')) {
        if (seg === '' ) continue;
        if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[seg];
        else return [];
    }
    if (Array.isArray(cur)) return cur.map(v => String(v));
    return [];
}

function meta(prop: JsonSchemaProp) {
    return prop['x-privasys'] ?? {};
}

function FieldInput({ name, prop, value, onChange, appId, token, disabled }: {
    name: string; prop: JsonSchemaProp; value: string; onChange: (v: string) => void;
    appId: string; token: string; disabled?: boolean;
}) {
    const m = meta(prop);
    const label = m.label || name;
    const cls = 'w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black/30 disabled:opacity-50';
    const [showDetails, setShowDetails] = useState(false);

    // Dynamic enum: fetch choices from the referenced tool.
    const [dynChoices, setDynChoices] = useState<string[] | null>(null);
    const [dynErr, setDynErr] = useState<string | null>(null);
    useEffect(() => {
        if (!m.source) return;
        let alive = true;
        rpcCall(token, appId, m.source.tool, {})
            .then(r => { if (alive) setDynChoices(selectPath(unwrapRpc(r), m.source!.select)); })
            .catch(e => { if (alive) setDynErr((e as Error).message); });
        return () => { alive = false; };
    }, [appId, token, m.source]);

    const staticEnum = Array.isArray(prop.enum) ? prop.enum.map(v => String(v)) : null;
    const choices = dynChoices ?? staticEnum;

    let input;
    if (choices) {
        input = (
            <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={cls}>
                <option value="">{dynChoices === null && m.source ? 'loading…' : 'select…'}</option>
                {choices.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        );
    } else if (prop.type === 'boolean') {
        input = (
            <input type="checkbox" checked={value === 'true'} disabled={disabled}
                onChange={e => onChange(e.target.checked ? 'true' : 'false')} className="h-4 w-4" />
        );
    } else if (prop.type === 'number' || prop.type === 'integer') {
        input = <input type="number" value={value} disabled={disabled}
            onChange={e => onChange(e.target.value)} className={cls} />;
    } else {
        input = <input type={m.secret ? 'password' : 'text'} value={value} disabled={disabled}
            placeholder={m.secret ? '••••••••' : (m.placeholder || '')} autoComplete="off"
            onChange={e => onChange(e.target.value)} className={cls} />;
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
                <label className="block text-xs font-medium">{label}{prop.type ? <span className="ml-1 text-[10px] text-black/30 dark:text-white/30">{m.secret ? 'secret' : prop.type}</span> : null}</label>
                {m.details && (
                    <button type="button" onClick={() => setShowDetails(s => !s)}
                        className="shrink-0 text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 underline-offset-2 hover:underline">
                        {showDetails ? 'Hide details' : 'Details'}
                    </button>
                )}
            </div>
            {input}
            {(m.help || prop.description) && <p className="text-[10px] leading-snug text-black/40 dark:text-white/40">{m.help || prop.description}</p>}
            {showDetails && m.details && <p className="text-xs text-black/50 dark:text-white/50">{m.details}</p>}
            {dynErr && <p className="text-xs text-red-600 dark:text-red-400">could not load options: {dynErr}</p>}
        </div>
    );
}

function fieldEntries(fn: FunctionSchema): [string, JsonSchemaProp][] {
    const props = fn.input_schema?.properties ?? {};
    return Object.keys(props).sort().map(k => [k, props[k]]);
}

// ConfigureForm renders an app's owner configuration from its dedicated
// `configure` manifest section (not a tool). Owner-facing title + summary, an
// amber warning while the app is frozen, the fields (label + placeholder + a
// "Details" disclosure per field), and Apply — submitting lifts the freeze gate.
function ConfigureForm({ cfg, appId, token, frozen, onConfigured }: { cfg: ConfigureSection; appId: string; token: string; frozen: boolean; onConfigured?: () => void }) {
    const props = cfg.inputSchema?.properties ?? {};
    const entries = Object.keys(props).sort().map(k => [k, props[k]] as [string, JsonSchemaProp]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Once applied, the app is unfrozen immediately even though the reconciler
    // only flips container_state on its next sweep — so clear the warning now.
    const [applied, setApplied] = useState(false);
    // Collapsed by default (the form is large and usually already configured);
    // auto-expanded when the app is frozen and still needs its configuration.
    const [collapsed, setCollapsed] = useState(!frozen);
    const rpcName = cfg.name || cfg.function || (cfg.endpoint ? cfg.endpoint.replace(/^\//, '') : 'configure');

    const submit = async () => {
        setBusy(true); setError(null); setResult(null);
        const payload: Record<string, unknown> = {};
        for (const [k, prop] of entries) {
            if (values[k] !== undefined && values[k] !== '') payload[k] = coerce(prop, values[k]);
        }
        try {
            const r = unwrapRpc(await rpcCall(token, appId, rpcName, payload));
            const errMsg = r && typeof r === 'object' && 'err' in r ? String((r as { err: unknown }).err) : null;
            if (errMsg) { setError(errMsg); return; }
            setResult('Configuration applied.');
            setApplied(true);
            // Reload deployments so the Frozen badge/tile clear immediately: the
            // enclave lifts the freeze on this successful configure return and
            // mgmt clears container_state, but the page holds a stale copy until
            // the next fetch.
            onConfigured?.();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <button type="button" onClick={() => setCollapsed(c => !c)}
                className="flex w-full items-center justify-between gap-2 text-left">
                <h3 className="text-sm font-semibold">{cfg.title || 'Configuration'}</h3>
                <span className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40">
                    {frozen && !applied && <span className="text-amber-600 dark:text-amber-400">needs configuration</span>}
                    <svg className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                </span>
            </button>
            {!collapsed && (
                <>
                    {frozen && !applied && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                            <svg className="w-3.5 h-3.5 mt-px shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                            <span>This app is frozen (HTTP 503) until you apply its configuration below.</span>
                        </div>
                    )}
                    {cfg.description && <p className="mt-2 text-[11px] leading-snug text-black/50 dark:text-white/50">{cfg.description}</p>}
                    <div className="mt-3 space-y-3">
                        {entries.map(([k, prop]) => (
                            <FieldInput key={k} name={k} prop={prop} value={values[k] ?? String(prop.default ?? '')}
                                onChange={v => setValues(s => ({ ...s, [k]: v }))} appId={appId} token={token} disabled={busy} />
                        ))}
                        <button onClick={submit} disabled={busy}
                            className="px-3 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">
                            {busy ? 'Applying…' : 'Apply configuration'}
                        </button>
                        {result && <p className="text-sm text-green-700 dark:text-green-400">{result}</p>}
                        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
                    </div>
                </>
            )}
        </div>
    );
}

function coerce(prop: JsonSchemaProp, raw: string): unknown {
    if (prop.type === 'boolean') return raw === 'true';
    if (prop.type === 'number' || prop.type === 'integer') return raw === '' ? undefined : Number(raw);
    return raw;
}

function ConfigForm({ fn, appId, token }: { fn: FunctionSchema; appId: string; token: string }) {
    const entries = fieldEntries(fn);
    const [values, setValues] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const submit = async () => {
        setBusy(true); setError(null); setResult(null);
        const payload: Record<string, unknown> = {};
        for (const [k, prop] of entries) {
            if (values[k] !== undefined && values[k] !== '') payload[k] = coerce(prop, values[k]);
        }
        try {
            const r = unwrapRpc(await rpcCall(token, appId, fn.name, payload));
            const errMsg = r && typeof r === 'object' && 'err' in r ? String((r as { err: unknown }).err) : null;
            if (errMsg) { setError(errMsg); return; }
            setResult('Configuration applied. The app is now unfrozen.');
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            <div>
                <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold">{fn.name}</h4>
                    {fn.description && (
                        <button type="button" onClick={() => setShowDetails(s => !s)}
                            className="shrink-0 text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 underline-offset-2 hover:underline">
                            {showDetails ? 'Hide details' : 'Details'}
                        </button>
                    )}
                </div>
                {showDetails && fn.description && <p className="mt-1 text-xs text-black/50 dark:text-white/50">{fn.description}</p>}
            </div>
            {entries.map(([k, prop]) => (
                <FieldInput key={k} name={k} prop={prop} value={values[k] ?? String(prop.default ?? '')}
                    onChange={v => setValues(s => ({ ...s, [k]: v }))} appId={appId} token={token} disabled={busy} />
            ))}
            <button onClick={submit} disabled={busy}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">
                {busy ? 'Applying…' : 'Apply configuration'}
            </button>
            {result && <p className="text-sm text-green-700 dark:text-green-400">{result}</p>}
            {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        </div>
    );
}

function ActionRunner({ fn, appId, token }: { fn: FunctionSchema; appId: string; token: string }) {
    const entries = fieldEntries(fn);
    const progress = fn.x_privasys?.progress;
    const [values, setValues] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prog, setProg] = useState<{ state: string; pct: number; message: string } | null>(null);
    const [result, setResult] = useState<string | null>(null);

    const pollProgress = async (p: ActionProgress) => {
        for (let i = 0; i < 600; i++) {
            await new Promise(r => setTimeout(r, 2000));
            let s: Record<string, unknown>;
            try {
                s = (unwrapRpc(await rpcCall(token, appId, p.tool, {})) ?? {}) as Record<string, unknown>;
            } catch (e) { setError((e as Error).message); return; }
            const state = String(s[p.stateField] ?? '');
            const pct = p.progressField ? Math.round(Number(s[p.progressField] ?? 0) * 100) : 0;
            const message = p.messageField ? String(s[p.messageField] ?? '') : '';
            setProg({ state, pct, message });
            if (p.terminal.success.includes(state)) { setResult(`Done${message ? `: ${message}` : ''}`); return; }
            if (p.terminal.failure.includes(state)) { setError(`Failed${message ? `: ${message}` : ''}`); return; }
        }
        setError('Action did not finish in time.');
    };

    const run = async () => {
        setBusy(true); setError(null); setResult(null); setProg(null);
        const payload: Record<string, unknown> = {};
        for (const [k, prop] of entries) {
            if (values[k] !== undefined && values[k] !== '') payload[k] = coerce(prop, values[k]);
        }
        try {
            const r = unwrapRpc(await rpcCall(token, appId, fn.name, payload));
            const errMsg = r && typeof r === 'object' && 'err' in r ? String((r as { err: unknown }).err) : null;
            if (errMsg) { setError(errMsg); setBusy(false); return; }
            if (progress) { await pollProgress(progress); }
            else { setResult('Done.'); }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-lg border border-black/10 dark:border-white/10 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">{fn.name}</code>
                    {fn.description && <p className="mt-1 text-[11px] leading-snug text-black/50 dark:text-white/50">{fn.description}</p>}
                </div>
                <button onClick={run} disabled={busy}
                    className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity">
                    {busy ? 'Running…' : 'Run'}
                </button>
            </div>
            {entries.map(([k, prop]) => (
                <FieldInput key={k} name={k} prop={prop} value={values[k] ?? String(prop.default ?? '')}
                    onChange={v => setValues(s => ({ ...s, [k]: v }))} appId={appId} token={token} disabled={busy} />
            ))}
            {prog && (
                <div>
                    <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${prog.pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-black/50 dark:text-white/50">{prog.state} · {prog.pct}%{prog.message ? ` · ${prog.message}` : ''}</p>
                </div>
            )}
            {result && <p className="text-sm text-green-700 dark:text-green-400">{result}</p>}
            {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        </div>
    );
}

// ------- Team Tab -------
function TeamTab({ appId, token }: { appId: string; token: string }) {
    const [data, setData] = useState<AppTeam | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [newSub, setNewSub] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');

    const load = useCallback(async () => {
        try {
            const resp = await listAppOwners(token, appId);
            setData(resp);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load owners');
        } finally {
            setLoading(false);
        }
    }, [token, appId]);

    useEffect(() => { load(); }, [load]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const sub = newSub.trim();
        if (!sub) return;
        setBusy(true);
        setError(null);
        try {
            const resp = await addAppOwner(token, appId, {
                sub,
                email: newEmail.trim() || undefined,
                name: newName.trim() || undefined
            });
            setData(prev => prev ? { ...prev, owners: resp.owners } : resp);
            setNewSub('');
            setNewEmail('');
            setNewName('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to add owner');
        } finally {
            setBusy(false);
        }
    }

    async function handleRemove(sub: string, label: string) {
        if (!confirm(`Remove ${label} from the owners team?`)) return;
        setBusy(true);
        setError(null);
        try {
            const resp = await removeAppOwner(token, appId, sub);
            setData(prev => prev ? { ...prev, owners: resp.owners } : resp);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to remove owner');
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return <div className="text-sm text-black/50 dark:text-white/50">Loading owners…</div>;
    }

    if (!data) {
        return (
            <div className="text-sm text-red-600 dark:text-red-400">
                {error || 'Failed to load owners.'}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold">Owners team</h2>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                    Owners can deploy this app, call its Owner-only RPCs, and manage the team.
                </p>
                {error && (
                    <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}
                <ul className="mt-4 divide-y divide-black/10 dark:divide-white/10">
                    {data.owners.map((o) => {
                        const isCreator = o.sub === data.creator_sub;
                        const label = o.name || o.email || o.sub;
                        return (
                            <li key={o.sub} className="py-3 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium flex items-center gap-2">
                                        <span className="truncate">{label}</span>
                                        {isCreator && (
                                            <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                                                Creator
                                            </span>
                                        )}
                                    </div>
                                    {o.email && o.email !== label && (
                                        <div className="text-xs text-black/50 dark:text-white/50 mt-0.5 truncate">{o.email}</div>
                                    )}
                                    <div className="text-[11px] font-mono text-black/40 dark:text-white/40 mt-0.5 truncate" title={o.sub}>{o.sub}</div>
                                    <div className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">
                                        Added {new Date(o.added_at).toLocaleDateString()}
                                    </div>
                                </div>
                                {!isCreator && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(o.sub, label)}
                                        disabled={busy}
                                        className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-40"
                                    >
                                        Remove
                                    </button>
                                )}
                            </li>
                        );
                    })}
                    {data.owners.length === 0 && (
                        <li className="py-3 text-sm text-black/50 dark:text-white/50">No owners.</li>
                    )}
                </ul>
            </section>

            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold">Add owner</h2>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                    Ask the new owner for their <span className="font-medium">Subject ID</span> — they can find it in their <Link href="/dashboard/settings" className="underline">Settings</Link> page under Identity.
                </p>
                <form onSubmit={handleAdd} className="mt-4 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-black/60 dark:text-white/60">Subject ID <span className="text-red-600">*</span></label>
                        <input
                            type="text"
                            value={newSub}
                            onChange={(e) => setNewSub(e.target.value)}
                            placeholder="e.g. c59A0b0909bAb1e8R1964cE1e52caKbe086cTeMdTbN"
                            required
                            className="mt-1 w-full px-3 py-2 text-sm font-mono rounded-lg border border-black/15 dark:border-white/15 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-black/60 dark:text-white/60">Email (display only)</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="alice@example.com"
                                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-black/15 dark:border-white/15 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-black/60 dark:text-white/60">Name (display only)</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Alice"
                                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-black/15 dark:border-white/15 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={busy || !newSub.trim()}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40"
                    >
                        {busy ? 'Adding…' : 'Add owner'}
                    </button>
                </form>
            </section>
        </div>
    );
}
