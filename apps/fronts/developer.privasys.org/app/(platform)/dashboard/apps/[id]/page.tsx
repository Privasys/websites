'use client';

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { getApp, listBuilds, listVersions, listDeployments, deleteApp, createVersion, attestApp, sendToApp } from '~/lib/api';
import { useSSE } from '~/lib/use-sse';
import type { App, BuildJob, AppVersion, AppDeployment, AttestationResult } from '~/lib/types';
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

type Tab = 'overview' | 'versions' | 'deployments' | 'attestation' | 'api';

// Terminal states that show the full detail view
const TERMINAL_STATUSES = new Set(['deployed', 'undeployed']);

// App-level pipeline (vertical, like the wizard)
function AppPipelineStep({ step, active, done, failed, last, children }: {
    step: number; active: boolean; done: boolean; failed?: boolean; last?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    failed
                        ? 'border-red-500 bg-red-500 text-white'
                        : done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : active
                                ? 'border-black dark:border-white bg-transparent'
                                : 'border-black/15 dark:border-white/15 bg-transparent'
                }`}>
                    {failed ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : done ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <span className={`text-xs font-semibold ${active ? 'text-black dark:text-white' : 'text-black/25 dark:text-white/25'}`}>
                            {step}
                        </span>
                    )}
                </div>
                {!last && (
                    <div className={`w-0.5 flex-1 min-h-[24px] transition-colors ${
                        failed ? 'bg-red-500' : done ? 'bg-emerald-500' : 'bg-black/10 dark:bg-white/10'
                    }`} />
                )}
            </div>
            <div className={`pb-8 flex-1 ${!active && !done && !failed ? 'opacity-40' : ''}`}>
                {children}
            </div>
        </div>
    );
}

function AppPipeline({ app, builds }: { app: App; builds: BuildJob[] }) {
    const s = app.status;
    const latestBuild = builds[0];

    // Compute step states
    const submitted = true; // Always done — we're viewing the app
    const reviewDone = s !== 'submitted' && s !== 'under_review';
    const reviewActive = s === 'submitted' || s === 'under_review';
    const reviewFailed = s === 'rejected';

    const buildDone = ['deploying', 'deployed', 'undeployed'].includes(s) || (s === 'approved' && !!app.cwasm_hash);
    const buildActive = s === 'building';
    const buildFailed = s === 'failed' && !!latestBuild?.status && latestBuild.status !== 'success';

    const deployReady = !!app.cwasm_hash || buildDone;
    const deployDone = s === 'deployed' || s === 'deploying';
    const deployActive = s === 'deploying';

    const liveDone = s === 'deployed';

    // What should the user know / do next?
    const needsBuild = s === 'approved' && !app.cwasm_hash && builds.length === 0;

    return (
        <div className="max-w-xl">
            <AppPipelineStep step={1} active={false} done={submitted}>
                <h2 className="text-lg font-semibold">Application submitted</h2>
                <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                    {app.source_type === 'github' ? (
                        <>Created from <a href={app.commit_url || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">GitHub commit</a> &middot; {app.github_commit?.slice(0, 12)}</>
                    ) : 'Uploaded manually'}
                </div>
            </AppPipelineStep>

            <AppPipelineStep step={2} active={reviewActive} done={reviewDone && !reviewFailed} failed={reviewFailed}>
                <h2 className="text-lg font-semibold">Application review</h2>
                <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                    {reviewFailed
                        ? <span className="text-red-600 dark:text-red-400">Application was rejected.{app.review_note ? ` Reason: ${app.review_note}` : ''}</span>
                        : reviewActive
                            ? 'Your application is queued for review.'
                            : 'Approved.'}
                </div>
            </AppPipelineStep>

            <AppPipelineStep step={3} active={buildActive || needsBuild} done={buildDone} failed={buildFailed}>
                <h2 className="text-lg font-semibold">Reproducible build</h2>
                <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                    {buildFailed
                        ? <span className="text-red-600 dark:text-red-400">Build failed.{latestBuild?.run_url && <> <a href={latestBuild.run_url} target="_blank" rel="noopener noreferrer" className="underline">View build log</a></>}</span>
                        : buildActive
                            ? <>Building CWASM module…{latestBuild?.run_url && <> <a href={latestBuild.run_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View build</a></>}</>
                            : buildDone
                                ? <>
                                    CWASM compiled.
                                    {app.cwasm_hash && <code className="text-xs font-mono ml-1">{app.cwasm_hash.slice(0, 16)}…</code>}
                                    {latestBuild?.run_url && <> &middot; <a href={latestBuild.run_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View build</a></>}
                                </>
                                : needsBuild
                                    ? 'Waiting for build to be triggered.'
                                    : 'Compile your application into a .cwasm artifact.'}
                </div>
            </AppPipelineStep>

            <AppPipelineStep step={4} active={deployReady && !deployDone && !buildActive && !needsBuild && reviewDone && !reviewFailed && !buildFailed} done={deployDone}>
                <h2 className="text-lg font-semibold">Deploy to enclave</h2>
                <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                    {deployActive
                        ? 'Deploying to enclave…'
                        : deployDone
                            ? 'Deployed successfully.'
                            : 'Select a deployment location for your enclave.'}
                </div>
            </AppPipelineStep>

            <AppPipelineStep step={5} active={false} done={liveDone} last>
                <h2 className="text-lg font-semibold">Live &amp; attested</h2>
                <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                    {liveDone
                        ? <>Your application is live.{app.hostname && <> <a href={`https://${app.hostname}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">{app.hostname}</a></>}</>
                        : 'Your application will be live and remotely attested.'}
                </div>
            </AppPipelineStep>
        </div>
    );
}

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
    const showPipeline = !TERMINAL_STATUSES.has(app.status);

    // Pipeline view — shown while the app is still progressing through the flow
    if (showPipeline) {
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

                <div className="mt-8">
                    <AppPipeline app={app} builds={builds} />
                </div>

                {/* Build details card */}
                {builds.length > 0 && (() => {
                    const b = builds[0];
                    return (
                        <section className="mt-8 p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <h2 className="text-sm font-semibold mb-3">Build details</h2>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-black/50 dark:text-white/50">Status</span>
                                    <div className="mt-0.5 font-medium capitalize">{b.status}</div>
                                </div>
                                <div>
                                    <span className="text-black/50 dark:text-white/50">Commit</span>
                                    <div className="mt-0.5 font-mono text-xs">{b.github_commit?.slice(0, 12)}</div>
                                </div>
                                {b.run_url && (
                                    <div className="col-span-2">
                                        <span className="text-black/50 dark:text-white/50">GitHub Actions</span>
                                        <div className="mt-0.5">
                                            <a href={b.run_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                                                {b.run_url}
                                            </a>
                                        </div>
                                    </div>
                                )}
                                {app.cwasm_hash && (
                                    <div className="col-span-2">
                                        <span className="text-black/50 dark:text-white/50">CWASM hash</span>
                                        <div className="mt-0.5 font-mono text-xs break-all">{app.cwasm_hash}</div>
                                    </div>
                                )}
                                {b.completed_at && b.created_at && (
                                    <div>
                                        <span className="text-black/50 dark:text-white/50">Duration</span>
                                        <div className="mt-0.5">{Math.round((new Date(b.completed_at).getTime() - new Date(b.created_at).getTime()) / 1000)}s</div>
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })()}

                {/* Delete option for non-deployed apps */}
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

    // Full detail view — shown once the app has reached a terminal state
    const isDeployed = app.status === 'deployed';
    const TABS: { key: Tab; label: string; count?: number }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'versions', label: 'Versions', count: versions.length },
        { key: 'deployments', label: 'Deployments', count: activeDeployments.length },
        ...(isDeployed ? [
            { key: 'attestation' as Tab, label: 'Attestation' },
            { key: 'api' as Tab, label: 'API Testing' }
        ] : [])
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
                {tab === 'attestation' && session?.accessToken && (
                    <AttestationTab appId={app.id} token={session.accessToken} />
                )}
                {tab === 'api' && session?.accessToken && (
                    <ApiTestingTab appId={app.id} token={session.accessToken} />
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
                    {app.github_commit && app.commit_url &&(
                        <>
                            <div>
                                <div className="text-xs text-black/50 dark:text-white/50">Commit</div>
                                <a
                                    href={app.commit_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-0.5 text-blue-600 dark:text-blue-400 hover:underline break-all text-xs"
                                >
                                    {app.github_commit.slice(0, 12)}
                                </a>
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

// ------- Attestation Tab -------
function AttestationTab({ appId, token }: { appId: string; token: string }) {
    const [result, setResult] = useState<AttestationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [challenge, setChallenge] = useState<string>(() => {
        const bytes = new Uint8Array(32);
        if (typeof window !== 'undefined') crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    });

    async function inspect() {
        setLoading(true);
        setError(null);
        setVerifyResult(null);
        try {
            const trimmed = challenge.trim();
            if (trimmed && !/^[0-9a-fA-F]{32,128}$/.test(trimmed)) {
                throw new Error('Challenge must be 32-128 hex characters (16-64 bytes)');
            }
            const data = await attestApp(token, appId, trimmed || undefined);
            setResult(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Attestation failed');
        } finally {
            setLoading(false);
        }
    }

    function regenerateChallenge() {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        setChallenge(Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''));
    }

    function copyToClipboard(text: string, label: string) {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    }

    const [verifyResult, setVerifyResult] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [verifyDebug, setVerifyDebug] = useState<{ computed: string; actual: string } | null>(null);

    function downloadPem() {
        if (!result?.pem) return;
        const blob = new Blob([result.pem], { type: 'application/x-pem-file' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'enclave-certificate.pem';
        a.click();
        URL.revokeObjectURL(url);
    }

    /** Decode hex string to UTF-8 text. Returns null if not valid UTF-8. */
    function hexToText(hex: string): string | null {
        try {
            const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
            const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            // Only show as text if all chars are printable ASCII/UTF-8
            if (/^[\x20-\x7e]+$/.test(text)) return text;
            return null;
        } catch { return null; }
    }

    /** OIDs whose values are UTF-8 strings, not hashes */
    const TEXT_OIDS = new Set(['1.3.6.1.4.1.65230.3.3', '1.3.6.1.4.1.65230.3.4']);

    /** Verify ReportData using SubtleCrypto */
    async function verifyReportData() {
        if (!result?.quote?.report_data || !result.certificate?.public_key_sha256 || !result.challenge) return;
        setVerifying(true);
        setVerifyResult(null);
        setVerifyDebug(null);
        try {
            const pubKeySha256 = new Uint8Array(result.certificate.public_key_sha256.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
            const nonce = new Uint8Array(result.challenge.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
            const concat = new Uint8Array(pubKeySha256.length + nonce.length);
            concat.set(pubKeySha256);
            concat.set(nonce, pubKeySha256.length);
            const hash = await crypto.subtle.digest('SHA-512', concat);
            const computed = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
            const actual = result.quote.report_data.toLowerCase();
            setVerifyDebug({ computed, actual });
            if (computed === actual) {
                setVerifyResult('match');
            } else {
                setVerifyResult('mismatch');
            }
        } catch (e) {
            setVerifyResult('error');
        } finally {
            setVerifying(false);
        }
    }

    // Auto-verify ReportData when results arrive in challenge mode
    useEffect(() => {
        if (result?.challenge_mode && result?.quote?.report_data && result?.certificate?.public_key_sha256 && result?.challenge) {
            verifyReportData();
        }

    }, [result]);

    const OID_DESCRIPTIONS: Record<string, string> = {
        'Config Merkle Root': 'Hash of the enclave configuration tree. Changes if any config parameter is modified.',
        'Egress CA Hash': 'Hash of the CA certificate used for egress TLS connections from the enclave.',
        'Runtime Version Hash': 'Hash identifying the exact runtime version running inside the enclave.',
        'Combined Workloads Hash': 'Aggregate hash of all loaded WASM workloads. Proves which code is running.',
        'DEK Origin': 'Data Encryption Key origin — indicates how the enclave\'s encryption key was derived.',
        'Attestation Servers Hash': 'Hash of the attestation server list the enclave trusts for quote verification.',
        'Workload Config Merkle Root': 'Merkle root of this specific workload\'s configuration.',
        'Workload Code Hash': 'SHA-256 hash of the compiled WASM bytecode for this workload.',
        'Workload Image Ref': 'Container image reference from which the workload was loaded.',
        'Workload Key Source': 'Indicates how the workload\'s encryption keys are sourced and managed.',
        'Workload Permissions Hash': 'Hash of the security permissions granted to this workload (network access, storage, etc.).'
    };

    return (
        <div className="space-y-6">
            {/* Challenge input + Inspect button */}
            {!result && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <div className="text-center mb-5">
                        <svg className="w-10 h-10 mx-auto text-black/20 dark:text-white/20 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                        <h2 className="text-lg font-semibold mb-1">Remote Attestation</h2>
                        <p className="text-sm text-black/50 dark:text-white/50 max-w-lg mx-auto">
                            Connect to the enclave via RA-TLS and inspect the x.509 certificate, SGX quote, and all custom attestation extensions.
                        </p>
                    </div>

                    {/* Challenge nonce */}
                    <div className="max-w-lg mx-auto mb-5">
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium">Challenge Nonce</label>
                            <button
                                onClick={regenerateChallenge}
                                className="text-[11px] text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                            >
                                Regenerate
                            </button>
                        </div>
                        <input
                            type="text"
                            value={challenge}
                            onChange={e => setChallenge(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                            placeholder="32-128 hex characters (leave empty for deterministic mode)"
                            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20"
                            maxLength={128}
                        />
                        <p className="text-[11px] text-black/35 dark:text-white/35 mt-1.5">
                            Provide a random nonce to prove the certificate was generated <em>just now</em> for your request. Leave empty for deterministic mode.
                        </p>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={inspect}
                            disabled={loading}
                            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                        >
                            {loading ? 'Connecting…' : 'Inspect Certificate'}
                        </button>
                    </div>
                </section>
            )}

            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {result && (
                <>
                    {/* Challenge mode banner */}
                    {result.challenge_mode && result.challenge && (
                        <section className={`p-4 rounded-xl border ${
                            verifyResult === 'match'
                                ? 'border-emerald-200/50 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-900/10'
                                : verifyResult === 'mismatch' || verifyResult === 'error'
                                    ? 'border-red-200/50 dark:border-red-500/20 bg-red-50/40 dark:bg-red-900/10'
                                    : 'border-amber-200/50 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-900/10'
                        }`}>
                            <div className="flex items-start gap-3">
                                <span className={`mt-0.5 ${verifyResult === 'match' ? 'text-emerald-600 dark:text-emerald-400' : verifyResult === 'mismatch' || verifyResult === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>🔐</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`text-xs font-semibold ${verifyResult === 'match' ? 'text-emerald-800 dark:text-emerald-300' : verifyResult === 'mismatch' || verifyResult === 'error' ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>Challenge Mode Active</h3>
                                        {verifying && (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50">
                                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                                                Verifying…
                                            </span>
                                        )}
                                        {verifyResult === 'match' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                ✓ Match — freshness verified
                                            </span>
                                        )}
                                        {verifyResult === 'mismatch' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                ✗ Mismatch
                                            </span>
                                        )}
                                        {verifyResult === 'error' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                ✗ Verification error
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-[11px] mb-2 ${verifyResult === 'match' ? 'text-emerald-700/70 dark:text-emerald-300/60' : verifyResult === 'mismatch' || verifyResult === 'error' ? 'text-red-700/70 dark:text-red-300/60' : 'text-amber-700/70 dark:text-amber-300/60'}`}>
                                        This certificate was freshly generated in response to your challenge nonce. The enclave bound your nonce into the SGX quote&apos;s ReportData field.
                                    </p>
                                    <div className={`text-[11px] mb-1 ${verifyResult === 'match' ? 'text-emerald-700/70 dark:text-emerald-300/60' : verifyResult === 'mismatch' || verifyResult === 'error' ? 'text-red-700/70 dark:text-red-300/60' : 'text-amber-700/70 dark:text-amber-300/60'}`}>Challenge sent:</div>
                                    <code className={`text-[11px] px-2 py-1 rounded block font-mono break-all ${verifyResult === 'match' ? 'bg-emerald-100/50 dark:bg-emerald-900/20' : verifyResult === 'mismatch' || verifyResult === 'error' ? 'bg-red-100/50 dark:bg-red-900/20' : 'bg-amber-100/50 dark:bg-amber-900/20'}`}>
                                        {result.challenge}
                                    </code>
                                </div>
                            </div>
                        </section>
                    )}
                    {result.challenge_mode === false && (
                        <section className="p-3 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                            <p className="text-[11px] text-black/40 dark:text-white/40 text-center">
                                <strong>Deterministic mode</strong> — certificate may be reused across connections (timestamp-based binding). Use challenge mode for proof of freshness.
                            </p>
                        </section>
                    )}

                    {/* Actions bar */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={inspect}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
                        >
                            {loading ? 'Refreshing…' : 'Refresh'}
                        </button>
                        <button
                            onClick={downloadPem}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            Download PEM
                        </button>
                        <button
                            onClick={() => { setResult(null); regenerateChallenge(); }}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ml-auto"
                        >
                            New Challenge
                        </button>
                    </div>

                    {/* TLS Connection */}
                    <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                        <h2 className="text-sm font-semibold mb-3">TLS Connection</h2>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <div className="text-xs text-black/50 dark:text-white/50">Protocol</div>
                                <div className="mt-0.5 font-mono text-xs">{result.tls.version}</div>
                            </div>
                            <div>
                                <div className="text-xs text-black/50 dark:text-white/50">Cipher Suite</div>
                                <div className="mt-0.5 font-mono text-xs">{result.tls.cipher_suite}</div>
                            </div>
                        </div>
                    </section>

                    {/* Certificate */}
                    <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                        <h2 className="text-sm font-semibold mb-3">x.509 Certificate</h2>
                        <div className="space-y-3">
                            {[
                                { label: 'Subject', value: result.certificate.subject, desc: 'The entity this certificate identifies.' },
                                { label: 'Issuer', value: result.certificate.issuer, desc: 'Certificate authority that issued the cert. Self-signed for enclaves.' },
                                { label: 'Serial Number', value: result.certificate.serial_number, desc: 'Unique identifier assigned by the issuer.' },
                                { label: 'Valid From', value: result.certificate.not_before, desc: 'Certificate validity start date.' },
                                { label: 'Valid Until', value: result.certificate.not_after, desc: 'Certificate expiration date.' },
                                { label: 'Signature Algorithm', value: result.certificate.signature_algorithm, desc: 'Cryptographic algorithm used to sign the certificate.' },
                                { label: 'Public Key SHA-256', value: result.certificate.public_key_sha256, desc: 'SHA-256 fingerprint of the subject\'s public key.' }
                            ].map((field) => (
                                <div key={field.label}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-black/50 dark:text-white/50">{field.label}</span>
                                        <button
                                            onClick={() => copyToClipboard(field.value, field.label)}
                                            className="text-[10px] text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
                                            title="Copy"
                                        >
                                            {copied === field.label ? '✓' : '⧉'}
                                        </button>
                                    </div>
                                    <code className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded block mt-1 font-mono break-all">
                                        {field.value}
                                    </code>
                                    <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">{field.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* SGX Quote */}
                    {result.quote && (
                        <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <h2 className="text-sm font-semibold">SGX Quote</h2>
                                {result.quote.is_mock && (
                                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                        Mock
                                    </span>
                                )}
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Quote Type', value: result.quote.type, desc: 'The attestation quote format embedded in the certificate.' },
                                    ...(result.quote.format ? [{ label: 'Format', value: result.quote.format, desc: 'Detected binary format of the SGX report.' }] : []),
                                    ...(result.quote.version != null ? [{ label: 'Version', value: String(result.quote.version), desc: 'Quote structure version number.' }] : []),
                                    ...(result.quote.mr_enclave ? [{ label: 'MRENCLAVE', value: result.quote.mr_enclave, desc: 'Hash of the enclave code and initial data. Uniquely identifies the enclave build.' }] : []),
                                    ...(result.quote.mr_signer ? [{ label: 'MRSIGNER', value: result.quote.mr_signer, desc: 'Hash of the enclave signer\'s public key. Identifies who built the enclave.' }] : []),
                                    ...(result.quote.report_data ? [{ label: 'Report Data', value: result.quote.report_data, desc: result.challenge_mode
                                        ? 'SHA-512( SHA-256(public_key_DER) ‖ challenge_nonce ). A match proves the certificate was generated for your specific request.'
                                        : 'SHA-512( SHA-256(public_key_DER) ‖ timestamp ). Deterministic binding — the certificate\'s NotBefore timestamp is the nonce.' }] : []),
                                    { label: 'OID', value: result.quote.oid, desc: 'Object Identifier of the x.509 extension containing the quote.' }
                                ].map((field) => (
                                    <div key={field.label}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-black/50 dark:text-white/50">{field.label}</span>
                                            <button
                                                onClick={() => copyToClipboard(field.value, field.label)}
                                                className="text-[10px] text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
                                                title="Copy"
                                            >
                                                {copied === field.label ? '✓' : '⧉'}
                                            </button>
                                        </div>
                                        <code className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded block mt-1 font-mono break-all">
                                            {field.value}
                                        </code>
                                        <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">{field.desc}</p>
                                        {field.label === 'Report Data' && result.challenge_mode && result.challenge && (
                                            <div className="mt-1.5 flex items-center gap-2">
                                                {verifying && (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50">
                                                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                                                        Verifying…
                                                    </span>
                                                )}
                                                {verifyResult === 'match' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                                                        ✓ Verified
                                                    </span>
                                                )}
                                                {verifyResult === 'mismatch' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                                                        ✗ Mismatch
                                                    </span>
                                                )}
                                                {verifyResult === 'error' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                                                        ✗ Error
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {field.label === 'Report Data' && verifyDebug && verifyResult === 'mismatch' && (
                                            <div className="mt-2 p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30 space-y-1.5">
                                                <div className="text-[11px] font-medium text-red-700 dark:text-red-400">Debug — hash comparison</div>
                                                <div>
                                                    <span className="text-[10px] text-red-600/60 dark:text-red-400/60">Computed: SHA-512(pubkey_sha256 ‖ challenge)</span>
                                                    <code className="text-[10px] bg-red-100/50 dark:bg-red-900/20 px-1.5 py-0.5 rounded block mt-0.5 font-mono break-all text-red-800 dark:text-red-300">{verifyDebug.computed}</code>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-red-600/60 dark:text-red-400/60">Actual: quote.report_data</span>
                                                    <code className="text-[10px] bg-red-100/50 dark:bg-red-900/20 px-1.5 py-0.5 rounded block mt-0.5 font-mono break-all text-red-800 dark:text-red-300">{verifyDebug.actual}</code>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Custom OID Extensions */}
                    {result.extensions.length > 0 && (
                        <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <h2 className="text-sm font-semibold mb-3">Platform Attestation Extensions</h2>
                            <p className="text-xs text-black/40 dark:text-white/40 mb-4">
                                Platform-level x.509 extensions (OIDs 1.x/2.x) from the enclave certificate. These bind the enclave configuration and runtime to the attestation.
                            </p>
                            <div className="space-y-4">
                                {result.extensions.map((ext) => (
                                    <div key={ext.oid} className="border-b border-black/5 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">{ext.label}</span>
                                            <button
                                                onClick={() => copyToClipboard(ext.value_hex, ext.oid)}
                                                className="text-[10px] text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
                                                title="Copy"
                                            >
                                                {copied === ext.oid ? '✓' : '⧉'}
                                            </button>
                                        </div>
                                        <code className="text-[11px] bg-black/5 dark:bg-white/5 px-2 py-1 rounded block mt-1 font-mono break-all">
                                            {TEXT_OIDS.has(ext.oid) && hexToText(ext.value_hex)
                                                ? <><span className="text-black/70 dark:text-white/70">{hexToText(ext.value_hex)}</span> <span className="text-black/25 dark:text-white/25">({ext.value_hex})</span></>
                                                : ext.value_hex}
                                        </code>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-black/30 dark:text-white/30 font-mono">{ext.oid}</span>
                                        </div>
                                        {OID_DESCRIPTIONS[ext.label] && (
                                            <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">{OID_DESCRIPTIONS[ext.label]}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Per-Workload OID Extensions (from SNI connection) */}
                    {result.app_extensions && result.app_extensions.length > 0 && (
                        <section className="p-5 rounded-xl border border-emerald-200/50 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-900/10">
                            <h2 className="text-sm font-semibold mb-3">Workload Attestation Extensions</h2>
                            <p className="text-xs text-black/40 dark:text-white/40 mb-4">
                                Per-workload x.509 extensions (OIDs 3.x) from the workload-specific certificate. Retrieved via SNI routing — these bind the specific WASM application code and permissions to a dedicated attestation.
                            </p>
                            <div className="space-y-4">
                                {result.app_extensions.map((ext) => (
                                    <div key={ext.oid} className="border-b border-emerald-200/30 dark:border-emerald-500/10 pb-3 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">{ext.label}</span>
                                            <button
                                                onClick={() => copyToClipboard(ext.value_hex, 'app-' + ext.oid)}
                                                className="text-[10px] text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
                                                title="Copy"
                                            >
                                                {copied === 'app-' + ext.oid ? '✓' : '⧉'}
                                            </button>
                                        </div>
                                        <code className="text-[11px] bg-black/5 dark:bg-white/5 px-2 py-1 rounded block mt-1 font-mono break-all">
                                            {TEXT_OIDS.has(ext.oid) && hexToText(ext.value_hex)
                                                ? <><span className="text-black/70 dark:text-white/70">{hexToText(ext.value_hex)}</span> <span className="text-black/25 dark:text-white/25">({ext.value_hex})</span></>
                                                : ext.value_hex}
                                        </code>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-black/30 dark:text-white/30 font-mono">{ext.oid}</span>
                                        </div>
                                        {OID_DESCRIPTIONS[ext.label] && (
                                            <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">{OID_DESCRIPTIONS[ext.label]}</p>
                                        )}
                                        {ext.oid === '1.3.6.1.4.1.65230.3.2' && result.cwasm_hash && (
                                            <div className="mt-1.5 flex items-center gap-2">
                                                {ext.value_hex.toLowerCase() === result.cwasm_hash.toLowerCase() ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                        ✓ Verified — matches uploaded CWASM hash
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                        ✗ Mismatch — does not match uploaded CWASM hash
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* PEM Certificate */}
                    {result.pem && (
                        <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold">Platform PEM Certificate</h2>
                                <button
                                    onClick={() => copyToClipboard(result.pem, 'pem')}
                                    className="text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                                >
                                    {copied === 'pem' ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <pre className="text-[11px] bg-black/5 dark:bg-white/5 p-3 rounded-lg font-mono break-all whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {result.pem}
                            </pre>
                        </section>
                    )}

                    {/* Per-Workload PEM Certificate */}
                    {result.app_pem && (
                        <section className="p-5 rounded-xl border border-emerald-200/50 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-900/10">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold">Workload PEM Certificate</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const blob = new Blob([result.app_pem!], { type: 'application/x-pem-file' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = 'workload-certificate.pem';
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                                    >
                                        Download
                                    </button>
                                    <button
                                        onClick={() => copyToClipboard(result.app_pem!, 'app-pem')}
                                        className="text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                                    >
                                        {copied === 'app-pem' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                            <pre className="text-[11px] bg-black/5 dark:bg-white/5 p-3 rounded-lg font-mono break-all whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {result.app_pem}
                            </pre>
                        </section>
                    )}

                    {/* Console Verification Snippet */}
                    {result.challenge_mode && result.challenge && result.certificate?.public_key_sha256 && (
                        <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold">Verification Code</h2>
                                <button
                                    onClick={() => {
                                        const snippet = `// Report Data verification — paste in browser console
const pubkeySha256 = "${result.certificate.public_key_sha256}";
const challenge   = "${result.challenge}";
const reportData  = "${result.quote?.report_data ?? ''}";

const hex2buf = h => new Uint8Array(h.match(/.{2}/g).map(b => parseInt(b, 16)));
const buf2hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');

(async () => {
  const input = new Uint8Array([...hex2buf(pubkeySha256), ...hex2buf(challenge)]);
  const hash  = await crypto.subtle.digest('SHA-512', input);
  const computed = buf2hex(hash);
  const actual   = reportData.toLowerCase();
  console.log("pubkey_sha256:", pubkeySha256);
  console.log("challenge:    ", challenge);
  console.log("computed:     ", computed);
  console.log("report_data:  ", actual);
  if (computed === actual)
    console.log('%c✓%c MATCH', 'color: green', 'color: normal');
  else {
    console.log('%c✗%c MISMATCH', 'color: red', 'color: normal');
    for (let i = 0; i < Math.max(computed.length, actual.length); i += 2) {
      if (computed.slice(i, i+2) !== actual.slice(i, i+2)) {
        console.log(\`First diff at byte \${i/2}: computed=\${computed.slice(i, i+2)} actual=\${actual.slice(i, i+2)}\`);
        break;
      }
    }
  }
})();`;
                                        navigator.clipboard.writeText(snippet);
                                        setCopied('console-snippet');
                                        setTimeout(() => setCopied(null), 2000);
                                    }}
                                    className="text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                                >
                                    {copied === 'console-snippet' ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-xs text-black/40 dark:text-white/40 mb-3">
                                Copy this snippet and paste it in your browser&apos;s developer console to independently verify that <code className="text-[11px]">SHA-512(pubkey_sha256 ‖ challenge) == report_data</code>.
                            </p>
                            <pre className="text-[11px] bg-black/5 dark:bg-white/5 p-3 rounded-lg font-mono break-all whitespace-pre-wrap max-h-56 overflow-y-auto">
                                {[
                                    `const pubkeySha256 = "${result.certificate.public_key_sha256}";`,
                                    `const challenge   = "${result.challenge}";`,
                                    `const reportData  = "${result.quote?.report_data ?? ''}";`,
                                    '',
                                    'const hex2buf = h => new Uint8Array(h.match(/.{2}/g).map(b => parseInt(b, 16)));',
                                    'const buf2hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, \'0\')).join(\'\');',
                                    '',
                                    '(async () => {',
                                    '  const input = new Uint8Array([...hex2buf(pubkeySha256), ...hex2buf(challenge)]);',
                                    '  const hash  = await crypto.subtle.digest(\'SHA-512\', input);',
                                    '  const computed = buf2hex(hash);',
                                    '  const actual   = reportData.toLowerCase();',
                                    '  console.log("pubkey_sha256:", pubkeySha256);',
                                    '  console.log("challenge:    ", challenge);',
                                    '  console.log("computed:     ", computed);',
                                    '  console.log("report_data:  ", actual);',
                                    '  console.log(computed === actual ? "✓ MATCH" : "✗ MISMATCH");',
                                    '})();'
                                ].join('\n')}
                            </pre>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

// ------- API Testing Tab -------
function ApiTestingTab({ appId, token }: { appId: string; token: string }) {
    const [payload, setPayload] = useState('{"wasm_list": {}}');
    const [response, setResponse] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [elapsed, setElapsed] = useState<number | null>(null);

    const PRESETS = [
        { label: 'List WASM modules', payload: '{"wasm_list": {}}' },
        { label: 'Health check', payload: '{"healthz": {}}' }
    ];

    async function send() {
        setSending(true);
        setError(null);
        setResponse(null);
        setElapsed(null);
        try {
            JSON.parse(payload);
        } catch {
            setError('Invalid JSON payload');
            setSending(false);
            return;
        }
        const start = performance.now();
        try {
            const data = await sendToApp(token, appId, JSON.parse(payload));
            setElapsed(Math.round(performance.now() - start));
            setResponse(JSON.stringify(data, null, 2));
        } catch (e) {
            setElapsed(Math.round(performance.now() - start));
            setError(e instanceof Error ? e.message : 'Request failed');
        } finally {
            setSending(false);
        }
    }

    function formatPayload() {
        try {
            const parsed = JSON.parse(payload);
            setPayload(JSON.stringify(parsed, null, 2));
        } catch { /* ignore */ }
    }

    return (
        <div className="space-y-6">
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold mb-1">Send command to enclave</h2>
                <p className="text-xs text-black/40 dark:text-white/40 mb-4">
                    Send a JSON payload to your WASM application via RA-TLS. The request is proxied through the management service.
                </p>

                {/* Presets */}
                <div className="flex gap-2 mb-3">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => setPayload(preset.payload)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Payload editor */}
                <div className="relative">
                    <textarea
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                        onBlur={formatPayload}
                        rows={8}
                        spellCheck={false}
                        className="w-full px-3 py-2.5 text-xs font-mono rounded-lg border border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/3 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 resize-y"
                        placeholder='{"wasm_list": {}}'
                    />
                </div>

                {/* Send button */}
                <div className="flex items-center gap-3 mt-3">
                    <button
                        onClick={send}
                        disabled={sending || !payload.trim()}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                    >
                        {sending ? 'Sending…' : 'Send'}
                    </button>
                    {elapsed != null && (
                        <span className="text-xs text-black/40 dark:text-white/40">{elapsed}ms</span>
                    )}
                </div>
            </section>

            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {response && (
                <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold">Response</h2>
                        <button
                            onClick={() => { navigator.clipboard.writeText(response); }}
                            className="text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                        >
                            Copy
                        </button>
                    </div>
                    <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-lg font-mono break-all whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {response}
                    </pre>
                </section>
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
