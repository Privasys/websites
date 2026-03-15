'use client';

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { getApp, listBuilds, listVersions, listDeployments, deleteApp, createVersion } from '~/lib/api';
import { useSSE } from '~/lib/use-sse';
import type { App, BuildJob, AppVersion, AppDeployment } from '~/lib/types';
import { STATUS_LABELS, STATUS_COLORS, VERSION_STATUS_LABELS, VERSION_STATUS_COLORS, DEPLOYMENT_STATUS_LABELS, DEPLOYMENT_STATUS_COLORS } from '~/lib/types';

function StatusBadge({ status, labels, colors }: { status: string; labels: Record<string, string>; colors: Record<string, string> }) {
    return (
        <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}>
            {labels[status] ?? status}
        </span>
    );
}

function BuildStatusDot({ status }: { status: string }) {
    const color =
        status === 'success' ? 'bg-emerald-500' :
            status === 'failed' ? 'bg-red-500' :
                status === 'running' || status === 'dispatched' ? 'bg-blue-500 animate-pulse' :
                    'bg-yellow-500';
    return <span className={`w-2 h-2 rounded-full inline-block ${color}`} />;
}

// Build pipeline visualization (like GitHub Actions)
function VersionPipeline({ version, builds }: { version: AppVersion; builds: BuildJob[] }) {
    const versionBuilds = builds.filter(b => b.version_id === version.id);
    const latestBuild = versionBuilds[0];

    const steps = [
        {
            label: 'Submitted',
            done: true,
            active: version.status === 'submitted',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        },
        {
            label: 'Approved',
            done: ['approved', 'building', 'ready'].includes(version.status),
            active: version.status === 'approved',
            failed: version.status === 'failed' && !latestBuild,
            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        {
            label: 'Building',
            done: version.status === 'ready',
            active: version.status === 'building',
            failed: version.status === 'failed' && !!latestBuild,
            icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
            buildUrl: latestBuild?.run_url
        },
        {
            label: 'Ready',
            done: version.status === 'ready',
            active: false,
            icon: 'M5 13l4 4L19 7'
        }
    ];

    return (
        <div className="flex items-center gap-0">
            {steps.map((step, i) => (
                <div key={step.label} className="flex items-center">
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                                step.failed ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                                    step.done ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                                        step.active ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                                            'border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2'
                            }`}
                        >
                            {step.failed ? (
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : step.done ? (
                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M5 13l4 4L19 7" />
                                </svg>
                            ) : step.active ? (
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            ) : (
                                <svg className="w-4 h-4 text-black/20 dark:text-white/20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d={step.icon} />
                                </svg>
                            )}
                        </div>
                        <span className={`text-[10px] mt-1 ${
                            step.failed ? 'text-red-600 dark:text-red-400 font-medium' :
                                step.done || step.active ? 'text-black/70 dark:text-white/70 font-medium' :
                                    'text-black/30 dark:text-white/30'
                        }`}>
                            {step.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`w-12 h-0.5 mb-4 mx-1 ${
                            step.done ? 'bg-emerald-500' :
                                step.active ? 'bg-blue-500' :
                                    step.failed ? 'bg-red-500' :
                                        'bg-black/10 dark:bg-white/10'
                        }`} />
                    )}
                </div>
            ))}
        </div>
    );
}

type Tab = 'overview' | 'versions' | 'deployments';

export default function AppDetailPage() {
    const { id } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [app, setApp] = useState<App | null>(null);
    const [builds, setBuilds] = useState<BuildJob[]>([]);
    const [versions, setVersions] = useState<AppVersion[]>([]);
    const [deployments, setDeployments] = useState<AppDeployment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [newCommitUrl, setNewCommitUrl] = useState('');
    const [submittingVersion, setSubmittingVersion] = useState(false);

    const tab = (searchParams.get('tab') as Tab) || 'overview';
    const setTab = (t: Tab) => router.push(`/dashboard/apps/${id}?tab=${t}`);

    const load = useCallback(async () => {
        if (!session?.accessToken || !id) return;
        try {
            const [appData, buildsData, versionsData, deploymentsData] = await Promise.all([
                getApp(session.accessToken, id),
                listBuilds(session.accessToken, id),
                listVersions(session.accessToken, id),
                listDeployments(session.accessToken, id)
            ]);
            setApp(appData);
            setBuilds(buildsData);
            setVersions(versionsData);
            setDeployments(deploymentsData);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, id]);

    useEffect(() => { load(); }, [load]);

    useSSE(session?.accessToken, useCallback((ev) => {
        if (ev.data.app_id === id) load();
    }, [id, load]));

    async function handleDelete() {
        if (!session?.accessToken || !id || !app) return;
        if (!confirm(`Delete "${app.display_name || app.name}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await deleteApp(session.accessToken, id);
            window.location.href = '/dashboard';
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed');
            setDeleting(false);
        }
    }

    async function handleSubmitVersion() {
        if (!session?.accessToken || !id || !newCommitUrl.trim()) return;
        setSubmittingVersion(true);
        setError(null);
        try {
            await createVersion(session.accessToken, id, newCommitUrl.trim());
            setNewCommitUrl('');
            load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to submit version');
        } finally {
            setSubmittingVersion(false);
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
    const canDelete = app.status !== 'deployed' && app.status !== 'deploying';
    const TABS: { key: Tab; label: string; count?: number }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'versions', label: 'Versions', count: versions.length },
        { key: 'deployments', label: 'Deployments', count: activeDeployments.length }
    ];

    return (
        <div className="max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{app.display_name || app.name}</h1>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                        {app.name} &middot; {app.source_type === 'github' ? 'GitHub' : 'Upload'}
                    </p>
                </div>
                <StatusBadge status={app.status} labels={STATUS_LABELS} colors={STATUS_COLORS} />
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
                {tab === 'overview' && (
                    <OverviewTab app={app} versions={versions} builds={builds} deployments={deployments} />
                )}
                {tab === 'versions' && (
                    <VersionsTab
                        app={app}
                        versions={versions}
                        builds={builds}
                        newCommitUrl={newCommitUrl}
                        onCommitUrlChange={setNewCommitUrl}
                        onSubmitVersion={handleSubmitVersion}
                        submitting={submittingVersion}
                    />
                )}
                {tab === 'deployments' && (
                    <DeploymentsTab deployments={deployments} versions={versions} />
                )}
            </div>

            {/* Danger zone */}
            {canDelete && (
                <section className="mt-12 p-5 rounded-xl border border-red-200 dark:border-red-800/50">
                    <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
                    <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                        Permanently delete this application and all its associated data.
                    </p>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="mt-3 px-4 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                    >
                        {deleting ? 'Deleting…' : 'Delete application'}
                    </button>
                </section>
            )}
        </div>
    );
}

// ------- Overview Tab -------
function OverviewTab({ app, versions, builds, deployments }: { app: App; versions: AppVersion[]; builds: BuildJob[]; deployments: AppDeployment[] }) {
    const activeDeployments = deployments.filter(d => d.status === 'active');
    const latestVersion = versions[0];

    return (
        <div className="space-y-6">
            {/* Details card */}
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-3">
                <h2 className="text-sm font-semibold">Details</h2>
                <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                    <div>
                        <div className="text-xs text-black/50 dark:text-white/50">Owner</div>
                        <div className="mt-0.5">{app.owner_name || app.owner_email}</div>
                    </div>
                    <div>
                        <div className="text-xs text-black/50 dark:text-white/50">Created</div>
                        <div className="mt-0.5">{new Date(app.created_at).toLocaleDateString()}</div>
                    </div>
                    {app.description && (
                        <div className="col-span-2">
                            <div className="text-xs text-black/50 dark:text-white/50">Description</div>
                            <div className="mt-0.5">{app.description}</div>
                        </div>
                    )}
                    {app.commit_url && (
                        <div className="col-span-2">
                            <div className="text-xs text-black/50 dark:text-white/50">Source commit</div>
                            <a
                                href={app.commit_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-0.5 text-blue-600 dark:text-blue-400 hover:underline break-all text-xs"
                            >
                                {app.commit_url}
                            </a>
                        </div>
                    )}
                    {app.github_commit && (
                        <>
                            <div>
                                <div className="text-xs text-black/50 dark:text-white/50">Commit</div>
                                <code className="text-xs mt-0.5 block font-mono">{app.github_commit.slice(0, 12)}</code>
                            </div>
                            <div>
                                <div className="text-xs text-black/50 dark:text-white/50">GPG</div>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${app.gpg_verified ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <span className={`text-xs ${app.gpg_verified ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                                        {app.gpg_verified ? 'Verified' : 'Not verified'}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Latest version pipeline */}
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
                        </div>
                    )}
                </section>
            )}

            {/* Active deployments */}
            {activeDeployments.length > 0 && (
                <section className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-3">
                        Live deployments ({activeDeployments.length})
                    </h2>
                    <div className="space-y-2">
                        {activeDeployments.map((dep) => (
                            <div key={dep.id} className="flex items-center justify-between py-2 text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    {dep.hostname ? (
                                        <a
                                            href={`https://${dep.hostname}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-700 dark:text-emerald-300 hover:underline"
                                        >
                                            {dep.hostname}
                                        </a>
                                    ) : (
                                        <span>{dep.enclave_host}:{dep.enclave_port}</span>
                                    )}
                                </div>
                                {dep.deployed_at && (
                                    <span className="text-xs text-emerald-600/60 dark:text-emerald-400/60">
                                        {new Date(dep.deployed_at).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Legacy deployment info (for apps without the versioning model) */}
            {app.status === 'deployed' && activeDeployments.length === 0 && app.hostname && (
                <section className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-2">
                    <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Live deployment</h2>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
                        <div>
                            <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Hostname</div>
                            <a
                                href={`https://${app.hostname}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs mt-0.5 block text-emerald-700 dark:text-emerald-300 hover:underline"
                            >
                                {app.hostname}
                            </a>
                        </div>
                        {app.deployed_at && (
                            <div>
                                <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Deployed at</div>
                                <div className="mt-0.5">{new Date(app.deployed_at).toLocaleString()}</div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* CWASM info */}
            {app.cwasm_hash && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-2">
                    <h2 className="text-sm font-semibold">WASM module</h2>
                    <div className="text-sm">
                        <div className="text-xs text-black/50 dark:text-white/50">SHA-256</div>
                        <code className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded break-all block mt-1 font-mono">{app.cwasm_hash}</code>
                    </div>
                    {app.cwasm_size != null && (
                        <div className="text-sm">
                            <div className="text-xs text-black/50 dark:text-white/50">Size</div>
                            <div className="mt-0.5">{(app.cwasm_size / 1024).toFixed(1)} KB</div>
                        </div>
                    )}
                </section>
            )}

            {/* Recent builds */}
            {builds.length > 0 && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold mb-3">Recent builds</h2>
                    <div className="space-y-2">
                        {builds.slice(0, 5).map((build) => (
                            <div key={build.id} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <BuildStatusDot status={build.status} />
                                    <span className="text-sm font-medium capitalize">{build.status}</span>
                                    <code className="text-xs text-black/40 dark:text-white/40 font-mono">{build.github_commit.slice(0, 8)}</code>
                                    {build.run_url && (
                                        <a href={build.run_url} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                            View run &rarr;
                                        </a>
                                    )}
                                </div>
                                <span className="text-xs text-black/40 dark:text-white/40">
                                    {new Date(build.created_at).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

// ------- Versions Tab -------
function VersionsTab({ app, versions, builds, newCommitUrl, onCommitUrlChange, onSubmitVersion, submitting }: {
    app: App;
    versions: AppVersion[];
    builds: BuildJob[];
    newCommitUrl: string;
    onCommitUrlChange: (v: string) => void;
    onSubmitVersion: () => void;
    submitting: boolean;
}) {
    return (
        <div className="space-y-6">
            {/* Submit new version */}
            {app.source_type === 'github' && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold mb-3">Submit new version</h2>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newCommitUrl}
                            onChange={(e) => onCommitUrlChange(e.target.value)}
                            placeholder="https://github.com/owner/repo/commit/abc123..."
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                        />
                        <button
                            onClick={onSubmitVersion}
                            disabled={submitting || !newCommitUrl.trim()}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                        >
                            {submitting ? 'Submitting…' : 'Submit'}
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                        Submit a GPG-signed commit URL to create a new version. The commit will be verified automatically.
                    </p>
                </section>
            )}

            {/* Version list */}
            {versions.length === 0 ? (
                <div className="text-center py-12 text-sm text-black/40 dark:text-white/40">
                    No versions yet. Submit a commit to create the first version.
                </div>
            ) : (
                <div className="space-y-4">
                    {versions.map((version) => (
                        <section key={version.id} className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-semibold">v{version.version_number}</h3>
                                    {version.github_commit && (
                                        <code className="text-xs text-black/40 dark:text-white/40 font-mono">
                                            {version.github_commit.slice(0, 12)}
                                        </code>
                                    )}
                                </div>
                                <StatusBadge status={version.status} labels={VERSION_STATUS_LABELS} colors={VERSION_STATUS_COLORS} />
                            </div>

                            {/* Pipeline */}
                            <VersionPipeline version={version} builds={builds} />

                            {/* Version details */}
                            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-black/50 dark:text-white/50">
                                {version.commit_url && (
                                    <div className="col-span-2">
                                        <a
                                            href={version.commit_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                                        >
                                            {version.commit_url}
                                        </a>
                                    </div>
                                )}
                                <div>Created: {new Date(version.created_at).toLocaleString()}</div>
                                {version.gpg_verified && (
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        GPG verified
                                    </div>
                                )}
                                {version.cwasm_hash && (
                                    <div className="col-span-2">
                                        Module: <code className="font-mono">{version.cwasm_hash.slice(0, 16)}…</code>
                                        {version.cwasm_size != null && ` (${(version.cwasm_size / 1024).toFixed(1)} KB)`}
                                    </div>
                                )}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}

// ------- Deployments Tab -------
function DeploymentsTab({ deployments, versions }: { deployments: AppDeployment[]; versions: AppVersion[] }) {
    const versionMap = Object.fromEntries(versions.map(v => [v.id, v]));

    return (
        <div className="space-y-4">
            {deployments.length === 0 ? (
                <div className="text-center py-12 text-sm text-black/40 dark:text-white/40">
                    No deployments yet.
                </div>
            ) : (
                deployments.map((dep) => {
                    const version = versionMap[dep.version_id];
                    return (
                        <section key={dep.id} className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${
                                        dep.status === 'active' ? 'bg-emerald-500' :
                                            dep.status === 'deploying' ? 'bg-blue-500 animate-pulse' :
                                                dep.status === 'failed' ? 'bg-red-500' :
                                                    dep.status === 'stopped' ? 'bg-gray-400' :
                                                        'bg-yellow-500'
                                    }`} />
                                    <span className="text-sm font-medium">
                                        {dep.hostname || `${dep.enclave_host}:${dep.enclave_port}`}
                                    </span>
                                    {version && (
                                        <span className="text-xs text-black/40 dark:text-white/40">
                                            v{version.version_number}
                                        </span>
                                    )}
                                </div>
                                <StatusBadge status={dep.status} labels={DEPLOYMENT_STATUS_LABELS} colors={DEPLOYMENT_STATUS_COLORS} />
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs text-black/50 dark:text-white/50">
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Enclave</div>
                                    <div className="mt-0.5">{dep.enclave_host}:{dep.enclave_port}</div>
                                </div>
                                {dep.deployed_at && (
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Deployed</div>
                                        <div className="mt-0.5">{new Date(dep.deployed_at).toLocaleString()}</div>
                                    </div>
                                )}
                                {dep.stopped_at && (
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Stopped</div>
                                        <div className="mt-0.5">{new Date(dep.stopped_at).toLocaleString()}</div>
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })
            )}
        </div>
    );
}
