'use client';

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback } from 'react';
import {
    adminGetApp,
    adminListBuilds,
    adminListEnclaves,
    listVersions,
    listDeployments,
    adminReviewVersion,
    adminBuildVersion,
    adminDeployVersion,
    adminStopDeployment,
    adminDeleteApp,
} from '~/lib/api';
import { useSSE } from '~/lib/use-sse';
import type { App, BuildJob, AppVersion, AppDeployment, Enclave } from '~/lib/types';
import { STATUS_LABELS, STATUS_COLORS, VERSION_STATUS_LABELS, VERSION_STATUS_COLORS, DEPLOYMENT_STATUS_LABELS, DEPLOYMENT_STATUS_COLORS } from '~/lib/types';

function StatusBadge({ status, labels, colors }: { status: string; labels: Record<string, string>; colors: Record<string, string> }) {
    return (
        <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}>
            {labels[status] ?? status}
        </span>
    );
}

function VersionPipeline({ version, builds }: { version: AppVersion; builds: BuildJob[] }) {
    const versionBuilds = builds.filter(b => b.version_id === version.id);
    const latestBuild = versionBuilds[0];
    const steps = [
        { label: 'Submitted', done: true, active: version.status === 'submitted', failed: false },
        { label: 'Approved', done: ['approved', 'building', 'ready'].includes(version.status), active: version.status === 'approved', failed: version.status === 'failed' && !latestBuild },
        { label: 'Building', done: version.status === 'ready', active: version.status === 'building', failed: version.status === 'failed' && !!latestBuild },
        { label: 'Ready', done: version.status === 'ready', active: false, failed: false },
    ];
    return (
        <div className="flex items-center gap-0">
            {steps.map((step, i) => (
                <div key={step.label} className="flex items-center">
                    <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                            step.failed ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                            step.done ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                            step.active ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                            'border-black/10 dark:border-white/10'
                        }`}>
                            {step.failed ? (
                                <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : step.done ? (
                                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                            ) : step.active ? (
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-black/10 dark:bg-white/10" />
                            )}
                        </div>
                        <span className={`text-[10px] mt-1 ${
                            step.failed ? 'text-red-600 dark:text-red-400 font-medium' :
                            step.done || step.active ? 'text-black/70 dark:text-white/70 font-medium' :
                            'text-black/30 dark:text-white/30'
                        }`}>{step.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`w-10 h-0.5 mb-4 mx-1 ${
                            step.done ? 'bg-emerald-500' : step.active ? 'bg-blue-500' : step.failed ? 'bg-red-500' : 'bg-black/10 dark:bg-white/10'
                        }`} />
                    )}
                </div>
            ))}
        </div>
    );
}

type Tab = 'overview' | 'versions' | 'deployments';

export default function AdminAppDetailPage() {
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
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const tab = (searchParams.get('tab') as Tab) || 'overview';
    const setTab = (t: Tab) => router.push(`/dashboard/admin/apps/${id}?tab=${t}`);

    const load = useCallback(async () => {
        if (!session?.accessToken || !id) return;
        try {
            const [appData, buildsData, versionsData, deploymentsData, enclavesData] = await Promise.all([
                adminGetApp(session.accessToken, id),
                adminListBuilds(session.accessToken, id),
                listVersions(session.accessToken, id),
                listDeployments(session.accessToken, id),
                adminListEnclaves(session.accessToken).catch(() => [] as Enclave[]),
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
        if (!transitional) return;
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [app?.status, load]);

    useSSE(session?.accessToken, useCallback((ev) => {
        if (ev.data.app_id === id) load();
    }, [id, load]));

    // --- Version actions ---
    async function handleVersionReview(versionId: string, decision: 'approve' | 'reject') {
        if (!session?.accessToken || !id) return;
        setActionLoading(`review-${versionId}`);
        setError(null);
        try {
            await adminReviewVersion(session.accessToken, id, versionId, decision);
            await load();
        } catch (e) { setError(e instanceof Error ? e.message : 'Version review failed'); }
        finally { setActionLoading(null); }
    }

    async function handleVersionBuild(versionId: string) {
        if (!session?.accessToken || !id) return;
        setActionLoading(`build-${versionId}`);
        setError(null);
        try {
            await adminBuildVersion(session.accessToken, id, versionId);
            await load();
        } catch (e) { setError(e instanceof Error ? e.message : 'Build trigger failed'); }
        finally { setActionLoading(null); }
    }

    async function handleVersionDeploy(versionId: string, enclaveId?: string) {
        if (!session?.accessToken || !id) return;
        setActionLoading(`deploy-${versionId}`);
        setError(null);
        try {
            await adminDeployVersion(session.accessToken, id, versionId, enclaveId);
            await load();
        } catch (e) { setError(e instanceof Error ? e.message : 'Deploy failed'); }
        finally { setActionLoading(null); }
    }

    async function handleStopDeployment(deploymentId: string, force = false) {
        if (!session?.accessToken || !id) return;
        const label = force ? 'Force-remove this deployment? This contacts the enclave even if the deployment is recorded as stopped or failed.' : null;
        if (force && !window.confirm(label!)) return;
        setActionLoading(`stop-${deploymentId}`);
        setError(null);
        try {
            await adminStopDeployment(session.accessToken, id, deploymentId, force);
            await load();
        } catch (e) { setError(e instanceof Error ? e.message : 'Stop failed'); }
        finally { setActionLoading(null); }
    }

    async function handleDeleteApp() {
        if (!session?.accessToken || !id || !app) return;
        const msg = `Delete app "${app.name}" permanently?\n\nThis undeploys any active deployments and removes all rows (versions, builds, deployments). Cannot be undone.`;
        if (!window.confirm(msg)) return;
        setActionLoading('delete-app');
        setError(null);
        try {
            await adminDeleteApp(session.accessToken, id);
            router.push('/dashboard/admin');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed');
            setActionLoading(null);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl">
                <div className="animate-pulse text-sm text-black/50 dark:text-white/50 py-12 text-center">Loading…</div>
            </div>
        );
    }

    if (!app) {
        return (
            <div className="max-w-4xl">
                <Link href="/dashboard/admin" className="text-sm text-black/50 dark:text-white/50 hover:underline">← Back to review</Link>
                <p className="mt-4 text-red-600">App not found.</p>
            </div>
        );
    }

    const activeDeployments = deployments.filter(d => d.status === 'active');
    const TABS: { key: Tab; label: string; count?: number }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'versions', label: 'Versions', count: versions.length },
        { key: 'deployments', label: 'Deployments', count: activeDeployments.length },
    ];

    return (
        <div className="max-w-4xl">
<Link href="/dashboard/admin" className="text-sm text-black/50 dark:text-white/50 hover:underline">← Back to review</Link>

            <div className="mt-4 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{app.display_name || app.name}</h1>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                        {app.name} &middot; {app.source_type === 'github' ? 'GitHub' : 'Upload'} &middot; Owner: {app.owner_name || app.owner_email || app.owner_sub}
                        {app.app_type === 'container' && <span className="ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Container</span>}
                        {app.app_type !== 'container' && <span className="ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">WASM</span>}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={app.status} labels={STATUS_LABELS} colors={STATUS_COLORS} />
                    <button
                        onClick={handleDeleteApp}
                        disabled={actionLoading !== null}
                        title="Permanently delete this app and undeploy any active deployments"
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                    >
                        {actionLoading === 'delete-app' ? 'Deleting…' : 'Delete app'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

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
                                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-black/5 dark:bg-white/10">{t.count}</span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-6">
                {tab === 'overview' && <OverviewTab app={app} versions={versions} builds={builds} deployments={deployments} />}
                {tab === 'versions' && (
                    <VersionsTab
                        app={app} versions={versions} builds={builds} enclaves={enclaves}
                        actionLoading={actionLoading}
                        onReview={handleVersionReview} onBuild={handleVersionBuild} onDeploy={handleVersionDeploy}
                    />
                )}
                {tab === 'deployments' && (
                    <DeploymentsTab deployments={deployments} versions={versions} actionLoading={actionLoading} onStop={handleStopDeployment} />
                )}
            </div>
        </div>
    );
}

// ------- Overview Tab -------
function OverviewTab({ app, versions, builds, deployments }: { app: App; versions: AppVersion[]; builds: BuildJob[]; deployments: AppDeployment[] }) {
    const activeDeployments = deployments.filter(d => d.status === 'active');
    const latestVersion = versions[0];

    return (
        <div className="space-y-6">
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-3">
                <h2 className="text-sm font-semibold">Details</h2>
                <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                    <div>
                        <div className="text-xs text-black/50 dark:text-white/50">Owner</div>
                        <div className="mt-0.5">{app.owner_name || app.owner_email || app.owner_sub}</div>
                    </div>
                    <div>
                        <div className="text-xs text-black/50 dark:text-white/50">Source</div>
                        <div className="mt-0.5">{app.source_type === 'github' ? 'GitHub' : 'Upload'}</div>
                    </div>
                    {app.description && (
                        <div className="col-span-2">
                            <div className="text-xs text-black/50 dark:text-white/50">Description</div>
                            <div className="mt-0.5">{app.description}</div>
                        </div>
                    )}
                    {app.commit_url && (
                        <div className="col-span-2">
                            <div className="text-xs text-black/50 dark:text-white/50">Commit URL</div>
                            <a href={app.commit_url} target="_blank" rel="noopener noreferrer" className="mt-0.5 text-blue-600 dark:text-blue-400 hover:underline break-all text-xs">{app.commit_url}</a>
                        </div>
                    )}
                    <div>
                        <div className="text-xs text-black/50 dark:text-white/50">Created</div>
                        <div className="mt-0.5">{new Date(app.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-xs text-black/50 dark:text-white/50">Updated</div>
                        <div className="mt-0.5">{new Date(app.updated_at).toLocaleString()}</div>
                    </div>
                </div>
            </section>

            {latestVersion && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold">Latest version &middot; v{latestVersion.version_number}</h2>
                        <StatusBadge status={latestVersion.status} labels={VERSION_STATUS_LABELS} colors={VERSION_STATUS_COLORS} />
                    </div>
                    <VersionPipeline version={latestVersion} builds={builds} />
                    {latestVersion.github_commit && (
                        <div className="mt-3 text-xs text-black/40 dark:text-white/40">
                            Commit: <code className="font-mono">{latestVersion.github_commit.slice(0, 12)}</code>
                            {latestVersion.gpg_verified && <span className="ml-2 text-emerald-600 dark:text-emerald-400">GPG verified</span>}
                        </div>
                    )}
                </section>
            )}

            {activeDeployments.length > 0 && (
                <section className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-3">Live deployments ({activeDeployments.length})</h2>
                    <div className="space-y-2">
                        {activeDeployments.map((dep) => {
                            const ver = versions.find(v => v.id === dep.version_id);
                            return (
                                <div key={dep.id} className="flex items-center justify-between py-2 text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span>{dep.hostname || `${dep.enclave_host}:${dep.enclave_port}`}</span>
                                        {ver && <span className="text-xs text-emerald-600/60">v{ver.version_number}</span>}
                                    </div>
                                    {dep.deployed_at && <span className="text-xs text-emerald-600/60">{new Date(dep.deployed_at).toLocaleString()}</span>}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {app.status === 'deployed' && activeDeployments.length === 0 && app.hostname && (
                <section className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-2">
                    <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Live deployment (legacy)</h2>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
                        <div><div className="text-xs text-emerald-600/70">Hostname</div><code className="text-xs mt-0.5 block">{app.hostname}</code></div>
                        {app.deployed_at && <div><div className="text-xs text-emerald-600/70">Deployed at</div><div className="mt-0.5">{new Date(app.deployed_at).toLocaleString()}</div></div>}
                    </div>
                </section>
            )}

            {app.app_type === 'container' && app.container_image && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-2">
                    <h2 className="text-sm font-semibold">Container configuration</h2>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                        <div>
                            <div className="text-xs text-black/50 dark:text-white/50">Image</div>
                            <code className="text-xs mt-0.5 block">{app.container_image}</code>
                        </div>
                        {app.container_port != null && (
                            <div>
                                <div className="text-xs text-black/50 dark:text-white/50">Port</div>
                                <div className="mt-0.5">{app.container_port}</div>
                            </div>
                        )}
                        <div>
                            <div className="text-xs text-black/50 dark:text-white/50">Persistent storage</div>
                            <div className="mt-0.5">{app.container_storage ? 'Yes' : 'No'}</div>
                        </div>
                    </div>
                </section>
            )}

            {app.cwasm_hash && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-2">
                    <h2 className="text-sm font-semibold">WASM module (app-level)</h2>
                    <div className="text-sm">
                        <div className="text-xs text-black/50 dark:text-white/50">SHA-256</div>
                        <code className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded break-all block mt-1">{app.cwasm_hash}</code>
                    </div>
                    {app.cwasm_size != null && <div className="text-sm"><div className="text-xs text-black/50 dark:text-white/50">Size</div><div className="mt-0.5">{(app.cwasm_size / 1024).toFixed(1)} KB</div></div>}
                </section>
            )}

            {app.review_note && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold">Review note</h2>
                    <p className="mt-1 text-sm text-black/60 dark:text-white/60">{app.review_note}</p>
                    {app.reviewed_at && <p className="mt-2 text-xs text-black/40 dark:text-white/40">Reviewed {new Date(app.reviewed_at).toLocaleString()}</p>}
                </section>
            )}

            {builds.length > 0 && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold mb-3">Recent builds</h2>
                    <div className="space-y-2">
                        {builds.slice(0, 5).map((build) => (
                            <div key={build.id} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${build.status === 'success' ? 'bg-emerald-500' : build.status === 'failed' ? 'bg-red-500' : build.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'}`} />
                                    <span className="text-sm font-medium capitalize">{build.status}</span>
                                    <code className="text-xs text-black/40 dark:text-white/40 font-mono">{build.github_commit.slice(0, 8)}</code>
                                    {build.run_url && <a href={build.run_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View run &rarr;</a>}
                                </div>
                                <span className="text-xs text-black/40 dark:text-white/40">{new Date(build.created_at).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

// ------- Versions Tab (admin: review, build, deploy) -------
function VersionsTab({ app, versions, builds, enclaves, actionLoading, onReview, onBuild, onDeploy }: {
    app: App; versions: AppVersion[]; builds: BuildJob[]; enclaves: Enclave[];
    actionLoading: string | null;
    onReview: (vid: string, decision: 'approve' | 'reject') => void;
    onBuild: (vid: string) => void;
    onDeploy: (vid: string, enclaveId?: string) => void;
}) {
    const [deployEnclaveId, setDeployEnclaveId] = useState<Record<string, string>>({});

    if (versions.length === 0) {
        return <div className="text-center py-12 text-sm text-black/40 dark:text-white/40">No versions submitted yet.</div>;
    }

    return (
        <div className="space-y-4">
            {versions.map((version) => {
                const canReview = version.status === 'submitted';
                const canBuild = version.status === 'approved' && app.source_type === 'github' && app.app_type !== 'container';
                const canDeploy = version.status === 'ready';
                const selectedEnclave = deployEnclaveId[version.id] || '';
                const compatibleTeeType = app.app_type === 'container' ? 'tdx' : 'sgx';
                const activeEnclaves = enclaves.filter(e => e.status === 'active' && (!e.tee_type || e.tee_type === compatibleTeeType));

                return (
                    <section key={version.id} className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-semibold">v{version.version_number}</h3>
                                {version.github_commit && <code className="text-xs text-black/40 dark:text-white/40 font-mono">{version.github_commit.slice(0, 12)}</code>}
                                {version.gpg_verified && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />GPG
                                    </span>
                                )}
                            </div>
                            <StatusBadge status={version.status} labels={VERSION_STATUS_LABELS} colors={VERSION_STATUS_COLORS} />
                        </div>

                        <VersionPipeline version={version} builds={builds} />

                        <div className="mt-3 text-xs text-black/50 dark:text-white/50 space-y-1">
                            {version.commit_url && (
                                <div><a href={version.commit_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">{version.commit_url}</a></div>
                            )}
                            <div>Created: {new Date(version.created_at).toLocaleString()}</div>
                            {version.cwasm_hash && (
                                <div>Module: <code className="font-mono">{version.cwasm_hash.slice(0, 16)}…</code>{version.cwasm_size != null && ` (${(version.cwasm_size / 1024).toFixed(1)} KB)`}</div>
                            )}
                        </div>

                        {(canReview || canBuild || canDeploy) && (
                            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center gap-3">
                                {canReview && (
                                    <>
                                        <button onClick={() => onReview(version.id, 'approve')} disabled={actionLoading !== null}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                                            {actionLoading === `review-${version.id}` ? 'Approving…' : 'Approve'}
                                        </button>
                                        <button onClick={() => onReview(version.id, 'reject')} disabled={actionLoading !== null}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors">
                                            Reject
                                        </button>
                                    </>
                                )}
                                {canBuild && (
                                    <button onClick={() => onBuild(version.id)} disabled={actionLoading !== null}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                                        {actionLoading === `build-${version.id}` ? 'Triggering…' : 'Build .cwasm'}
                                    </button>
                                )}
                                {canDeploy && (
                                    <div className="flex items-center gap-2">
                                        {activeEnclaves.length > 0 && (
                                            <select value={selectedEnclave} onChange={(e) => setDeployEnclaveId({ ...deployEnclaveId, [version.id]: e.target.value })}
                                                className="px-2 py-1.5 text-xs rounded-lg border border-black/10 dark:border-white/10 bg-transparent">
                                                <option value="">Select enclave…</option>
                                                {activeEnclaves.map(e => <option key={e.id} value={e.id}>{e.name} ({e.country}){e.tee_type ? ` [${e.tee_type.toUpperCase()}]` : ''}</option>)}
                                            </select>
                                        )}
                                        <button onClick={() => onDeploy(version.id, selectedEnclave || undefined)} disabled={actionLoading !== null}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity">
                                            {actionLoading === `deploy-${version.id}` ? 'Deploying…' : 'Deploy'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}

// ------- Deployments Tab -------
function DeploymentsTab({ deployments, versions, actionLoading, onStop }: {
    deployments: AppDeployment[]; versions: AppVersion[];
    actionLoading: string | null; onStop: (id: string, force?: boolean) => void;
}) {
    const versionMap = Object.fromEntries(versions.map(v => [v.id, v]));

    if (deployments.length === 0) {
        return <div className="text-center py-12 text-sm text-black/40 dark:text-white/40">No deployments yet.</div>;
    }

    return (
        <div className="space-y-4">
            {deployments.map((dep) => {
                const version = versionMap[dep.version_id];
                const canStop = dep.status === 'active' || dep.status === 'deploying';
                const canForce = dep.status !== 'stopped';
                return (
                    <section key={dep.id} className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full ${
                                    dep.status === 'active' ? 'bg-emerald-500' :
                                    dep.status === 'deploying' ? 'bg-blue-500 animate-pulse' :
                                    dep.status === 'failed' ? 'bg-red-500' :
                                    dep.status === 'stopped' ? 'bg-gray-400' : 'bg-yellow-500'
                                }`} />
                                <span className="text-sm font-medium">{dep.hostname || `${dep.enclave_host}:${dep.enclave_port}`}</span>
                                {version && <span className="text-xs text-black/40 dark:text-white/40">v{version.version_number}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <StatusBadge status={dep.status} labels={DEPLOYMENT_STATUS_LABELS} colors={DEPLOYMENT_STATUS_COLORS} />
                                {canStop && (
                                    <button onClick={() => onStop(dep.id)} disabled={actionLoading !== null}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors">
                                        {actionLoading === `stop-${dep.id}` ? 'Stopping…' : 'Stop'}
                                    </button>
                                )}
                                {!canStop && canForce && (
                                    <button onClick={() => onStop(dep.id, true)} disabled={actionLoading !== null}
                                        title="Contact the enclave to remove this route, then mark the deployment stopped. Use when a deployment is stuck or recorded as failed but the route still exists."
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 transition-colors">
                                        {actionLoading === `stop-${dep.id}` ? 'Removing…' : 'Force remove'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-xs text-black/50 dark:text-white/50">
                            <div><span className="text-black/30 dark:text-white/30">Enclave:</span> {dep.enclave_host}:{dep.enclave_port}</div>
                            <div><span className="text-black/30 dark:text-white/30">Deployed by:</span> {dep.deployed_by}</div>
                            {dep.deployed_at && <div><span className="text-black/30 dark:text-white/30">Started:</span> {new Date(dep.deployed_at).toLocaleString()}</div>}
                            {dep.stopped_at && <div><span className="text-black/30 dark:text-white/30">Stopped:</span> {new Date(dep.stopped_at).toLocaleString()}</div>}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

