'use client';

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { getApp, listBuilds, listVersions, listDeployments, listEnclaves, deleteApp, deployVersion, stopDeployment, attestApp, verifyQuote, getAppSchema, rpcCall, updateStoreListing } from '~/lib/api';
import type { AppSchema, FunctionSchema, WitType, QuoteVerifyResult, StoreListingUpdate } from '~/lib/api';
import { useSSE } from '~/lib/use-sse';
import type { App, BuildJob, AppVersion, AppDeployment, Enclave, AttestationResult } from '~/lib/types';
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

type Tab = 'overview' | 'deployments' | 'store' | 'attestation' | 'api';

// Terminal states that show the full detail view
const TERMINAL_STATUSES = new Set(['deployed', 'undeployed', 'built']);

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

    const buildDone = ['deploying', 'deployed', 'undeployed', 'built'].includes(s) || (s === 'approved' && !!app.cwasm_hash);
    const buildActive = s === 'building';
    const buildFailed = s === 'failed' && !!latestBuild?.status && latestBuild.status !== 'success';

    const readyDone = buildDone && !buildActive && !buildFailed;

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

            <AppPipelineStep step={4} active={false} done={readyDone} last>
                <h2 className="text-lg font-semibold">Ready</h2>
                <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                    {readyDone
                        ? 'Your application is built and ready to deploy.'
                        : 'Your application will be ready for deployment once the build completes.'}
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
    const [enclaves, setEnclaves] = useState<Enclave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const tab = (searchParams.get('tab') as Tab) || 'overview';
    const setTab = (t: Tab) => router.push(`/dashboard/apps/${id}?tab=${t}`);

    const load = useCallback(async () => {
        if (!session?.accessToken || !id) return;
        try {
            const [appData, buildsData, versionsData, deploymentsData, enclavesData] = await Promise.all([
                getApp(session.accessToken, id),
                listBuilds(session.accessToken, id),
                listVersions(session.accessToken, id),
                listDeployments(session.accessToken, id),
                listEnclaves(session.accessToken)
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
    // 'approved' with a cwasm_hash means the build completed (legacy apps before status fix)
    const effectivelyBuilt = app.status === 'approved' && !!app.cwasm_hash;
    const showPipeline = !TERMINAL_STATUSES.has(app.status) && !effectivelyBuilt;

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

                {/* Actions — always visible in pipeline view so the user is never stuck */}
                <div className="mt-8 p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold mb-2">
                        {app.status === 'failed' ? 'Build failed'
                            : app.status === 'rejected' ? 'Application rejected'
                            : 'Actions'}
                    </h2>
                    <p className="text-sm text-black/50 dark:text-white/50 mb-4">
                        {app.status === 'failed'
                            ? 'The build did not complete successfully. You can delete this application and submit a new one with a fixed commit.'
                            : app.status === 'rejected'
                                ? 'Your application was not approved for deployment. You can delete it and submit a new version.'
                                : app.status === 'building'
                                    ? 'Your application is being built. If the build is stuck, you can delete the application and resubmit.'
                                    : app.status === 'approved'
                                        ? 'Your application has been approved and is waiting for the build to start. You can delete it if you want to resubmit.'
                                        : 'Your application is being processed. You can delete it if you want to start over.'}
                    </p>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {deleting ? 'Deleting…' : 'Delete application'}
                    </button>
                </div>

            </div>
        );
    }

    // Full detail view — shown once the app has reached a terminal state
    const hasActiveDeployment = activeDeployments.length > 0;
    const TABS: { key: Tab; label: string; count?: number; danger?: boolean }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'deployments', label: 'Deployments', count: activeDeployments.length },
        { key: 'store', label: 'App Store' },
        ...(hasActiveDeployment ? [
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
                    <OverviewTab app={app} versions={versions} builds={builds} deployments={deployments} deleting={deleting} onDelete={handleDelete} />
                )}
                {tab === 'deployments' && session?.accessToken && (
                    <DeploymentsTab
                        app={app}
                        deployments={deployments}
                        versions={versions}
                        enclaves={enclaves}
                        token={session.accessToken}
                        onRefresh={load}
                    />
                )}
                {tab === 'store' && session?.accessToken && (
                    <AppStoreTab app={app} token={session.accessToken} deployments={activeDeployments} onSave={(updated) => setApp(updated)} />
                )}
                {tab === 'attestation' && session?.accessToken && (
                    <AttestationTab appId={app.id} token={session.accessToken} deployments={activeDeployments} versions={versions} />
                )}
                {tab === 'api' && session?.accessToken && (
                    <ApiTestingTab appId={app.id} token={session.accessToken} deployments={activeDeployments} versions={versions} />
                )}

            </div>
        </div>
    );
}

// ------- Overview Tab -------
function OverviewTab({ app, versions, builds, deployments, deleting, onDelete }: { app: App; versions: AppVersion[]; builds: BuildJob[]; deployments: AppDeployment[]; deleting: boolean; onDelete: () => void }) {
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
                    {app.cwasm_hash && (
                        <div className="col-span-2">
                            <div className="text-xs text-black/50 dark:text-white/50">WASM module SHA-256</div>
                            <code className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded break-all block mt-1 font-mono">{app.cwasm_hash}</code>
                        </div>
                    )}
                    {app.cwasm_size != null && (
                        <div>
                            <div className="text-xs text-black/50 dark:text-white/50">Module size</div>
                            <div className="mt-0.5">{(app.cwasm_size / 1024).toFixed(1)} KB</div>
                        </div>
                    )}
                </div>
            </section>

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
            {/* Danger zone */}
            <DangerZone app={app} deleting={deleting} onDelete={onDelete} />
        </div>
    );
}

// ------- Danger Zone -------
function DangerZone({ app, deleting, onDelete }: { app: App; deleting: boolean; onDelete: () => void }) {
    const [confirmName, setConfirmName] = useState('');
    const confirmed = confirmName === app.name;
    const isDeployed = app.status === 'deployed' || app.status === 'deploying';

    return (
        <section className="pt-6">
            <div className="border-t border-red-200 dark:border-red-800/40 pt-6">
                <h3 className="text-sm font-medium text-red-700 dark:text-red-400">Delete this application</h3>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50 leading-relaxed">
                    Once deleted, the application, all versions, build history, and deployment records are permanently removed. This action cannot be undone.
                    {isDeployed && <> Active deployments will be automatically stopped before deletion.</>}
                </p>

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
                        onClick={onDelete}
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
function AttestationTab({ appId, token, deployments, versions }: { appId: string; token: string; deployments: AppDeployment[]; versions: AppVersion[] }) {
    const versionMap = Object.fromEntries(versions.map(v => [v.id, v]));
    const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>(deployments[0]?.id ?? '');
    const selectedDeployment = deployments.find(d => d.id === selectedDeploymentId);
    const selectedVersion = selectedDeployment ? versionMap[selectedDeployment.version_id] : undefined;

    const [result, setResult] = useState<AttestationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [challenge, setChallenge] = useState<string>('');

    async function inspect() {
        setLoading(true);
        setError(null);
        setVerifyResult(null);
        setQuoteVerifyResult(null);
        setQuoteVerifyError(null);
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

    // Quote verification via attestation server
    const [quoteVerifyResult, setQuoteVerifyResult] = useState<QuoteVerifyResult | null>(null);
    const [quoteVerifying, setQuoteVerifying] = useState(false);
    const [quoteVerifyError, setQuoteVerifyError] = useState<string | null>(null);

    async function verifyQuoteSignature() {
        const raw = result?.quote?.raw_base64;
        if (!raw) return;
        setQuoteVerifying(true);
        setQuoteVerifyError(null);
        try {
            const res = await verifyQuote(token, raw);
            setQuoteVerifyResult(res);
        } catch (e) {
            setQuoteVerifyError(e instanceof Error ? e.message : 'Quote verification failed');
        } finally {
            setQuoteVerifying(false);
        }
    }

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

    // Auto-verify quote signature via attestation server
    useEffect(() => {
        if (result?.quote?.raw_base64 && !result.quote.is_mock) {
            verifyQuoteSignature();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {/* Deployment / version selector */}
            {deployments.length > 1 && (
                <section className="flex items-center gap-3">
                    <label className="text-xs font-medium text-black/50 dark:text-white/50 shrink-0">Target deployment</label>
                    <select
                        value={selectedDeploymentId}
                        onChange={(e) => { setSelectedDeploymentId(e.target.value); setResult(null); }}
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
                                {quoteVerifying && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50">
                                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                                        Verifying…
                                    </span>
                                )}
                                {quoteVerifyResult?.success && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                        ✓ Verified — {quoteVerifyResult.message || `${quoteVerifyResult.teeType?.toUpperCase()} signature valid`}
                                    </span>
                                )}
                                {quoteVerifyResult && !quoteVerifyResult.success && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                        ✗ {quoteVerifyResult.error || 'Verification failed'}
                                    </span>
                                )}
                                {quoteVerifyError && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                        ⚠ {quoteVerifyError}
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

                    {/* Quote Verification Console Snippet */}
                    {result.quote?.raw_base64 && !result.quote.is_mock && (
                        <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold">Quote Verification Code</h2>
                                <button
                                    onClick={() => {
                                        const snippet = `// SGX/TDX Quote signature verification — paste in browser console
// This sends the raw quote to the Privasys Attestation Server for cryptographic verification.
const ATTESTATION_SERVER = "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/verify-quote";
const TOKEN = "YOUR_ACCESS_TOKEN"; // Replace with your bearer token

const quoteBase64 = "${result.quote!.raw_base64}";

(async () => {
  console.log("Verifying quote with attestation server...");
  console.log("Quote (first 80 chars):", quoteBase64.substring(0, 80) + "...");
  const resp = await fetch(ATTESTATION_SERVER, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN },
    body: JSON.stringify({ quote: quoteBase64 })
  });
  const result = await resp.json();
  if (result.success) {
    console.log("%c✓ QUOTE VERIFIED", "color: green; font-weight: bold");
    console.log("TEE type:   ", result.teeType);
    if (result.mrenclave) console.log("MRENCLAVE:  ", result.mrenclave);
    if (result.mrsigner)  console.log("MRSIGNER:   ", result.mrsigner);
    if (result.mrtd)      console.log("MRTD:       ", result.mrtd);
    console.log("Status:     ", result.status);
    if (result.message)   console.log("Message:    ", result.message);
  } else {
    console.log("%c✗ VERIFICATION FAILED", "color: red; font-weight: bold");
    console.log("Status:", result.status);
    console.log("Error: ", result.error);
  }
})();`;
                                        navigator.clipboard.writeText(snippet);
                                        setCopied('quote-verify-snippet');
                                        setTimeout(() => setCopied(null), 2000);
                                    }}
                                    className="text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                                >
                                    {copied === 'quote-verify-snippet' ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-xs text-black/40 dark:text-white/40 mb-3">
                                Copy this snippet and paste it in your browser&apos;s developer console to independently verify the SGX/TDX quote signature and certificate chain via the Privasys Attestation Server.
                            </p>
                            <pre className="text-[11px] bg-black/5 dark:bg-white/5 p-3 rounded-lg font-mono break-all whitespace-pre-wrap max-h-56 overflow-y-auto">
                                {[
                                    `const ATTESTATION_SERVER = "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/verify-quote";`,
                                    `const TOKEN = "YOUR_ACCESS_TOKEN";`,
                                    `const quoteBase64 = "${result.quote!.raw_base64!.substring(0, 40)}...";`,
                                    '',
                                    'const resp = await fetch(ATTESTATION_SERVER, {',
                                    '  method: "POST",',
                                    '  headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN },',
                                    '  body: JSON.stringify({ quote: quoteBase64 })',
                                    '});',
                                    'const result = await resp.json();',
                                    'console.log(result.success ? "✓ VERIFIED" : "✗ FAILED", result);'
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
        case 'option': return null;
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

    const [history, setHistory] = useState<CallHistoryEntry[]>([]);
    const [historyCounter, setHistoryCounter] = useState(0);

    // Ctrl+Enter to send
    useEffect(() => {
        function handleKeydown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                sendCall();
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
        if (!schema) return;
        const fn = getAllFunctions(schema).find(f => f.name === name);
        if (fn) initParamValues(fn);
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
            const data = await rpcCall(token, appId, fn.name, paramValues);
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
                    <button
                        onClick={sendCall}
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
                                        <div className="flex items-center gap-1.5 pt-2 min-w-[120px] shrink-0">
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
                                    200 OK
                                </span>
                            )}
                            {responseStatus === 'error' && (
                                <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Error
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
const STORE_CATEGORIES = [
    'Productivity', 'Finance', 'Healthcare', 'AI & Machine Learning',
    'Security & Privacy', 'Communication', 'Developer Tools', 'Data Analytics',
    'Education', 'Entertainment', 'Business', 'Social', 'Utilities', 'Other'
];

function AppStoreTab({ app, token, deployments, onSave }: { app: App; token: string; deployments: AppDeployment[]; onSave: (updated: App) => void }) {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    const [newScreenshot, setNewScreenshot] = useState('');

    const isDeployed = deployments.length > 0 || app.status === 'deployed';
    const liveHostname = deployments[0]?.hostname || app.hostname;

    async function handleSave() {
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const updated = await updateStoreListing(token, app.id, {
                store_tagline: tagline,
                store_description: description,
                store_category: category,
                store_icon_url: iconURL,
                store_screenshots: screenshots,
                store_privacy_url: privacyURL,
                store_tos_url: tosURL,
                store_website_url: websiteURL,
                store_support_email: supportEmail,
                store_keywords: keywords,
            });
            onSave(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    function addScreenshot() {
        const url = newScreenshot.trim();
        if (url && !screenshots.includes(url)) {
            setScreenshots([...screenshots, url]);
            setNewScreenshot('');
        }
    }

    function removeScreenshot(idx: number) {
        setScreenshots(screenshots.filter((_, i) => i !== idx));
    }

    const labelClass = "text-xs font-medium text-black/60 dark:text-white/60 block mb-1.5";
    const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 placeholder:text-black/25 dark:placeholder:text-white/25";

    return (
        <div className="space-y-6">
            {/* Store visibility notice */}
            {!isDeployed && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/30 text-xs text-amber-700 dark:text-amber-400">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    Your app must be deployed before it can appear on the App Store. You can fill in the listing details now and they will go live once deployed.
                </div>
            )}

            {isDeployed && liveHostname && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 text-xs text-emerald-700 dark:text-emerald-400">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Your app is live. &nbsp;</span>
                    <a href={`https://${liveHostname}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                        View on App Store &rarr;
                    </a>
                </div>
            )}

            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

            {/* Icon & identity */}
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold mb-4">App Identity</h2>
                <div className="flex gap-6">
                    {/* Icon preview */}
                    <div className="shrink-0">
                        <label className={labelClass}>App Icon</label>
                        <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
                            {iconURL ? (
                                <img src={iconURL} alt="App icon" className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <svg className="w-8 h-8 text-black/15 dark:text-white/15" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                </svg>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 space-y-3">
                        <div>
                            <label className={labelClass}>Icon URL</label>
                            <input type="text" value={iconURL} onChange={e => setIconURL(e.target.value)} placeholder="https://example.com/icon.png" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Tagline</label>
                            <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="A short description of your app" maxLength={120} className={inputClass} />
                            <div className="mt-1 text-[10px] text-black/30 dark:text-white/30 text-right">{tagline.length}/120</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Description */}
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold mb-4">Description</h2>
                <div>
                    <label className={labelClass}>About this app</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Tell users what your app does, what problems it solves, and why they should use it. Describe the key features and privacy guarantees…"
                        rows={6}
                        maxLength={4000}
                        className={`${inputClass} resize-y`}
                    />
                    <div className="mt-1 text-[10px] text-black/30 dark:text-white/30 text-right">{description.length}/4000</div>
                </div>
            </section>

            {/* Screenshots */}
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold mb-4">Screenshots</h2>
                <p className="text-xs text-black/40 dark:text-white/40 mb-3">
                    Add up to 8 screenshot URLs to showcase your app.
                </p>

                {screenshots.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pb-3 mb-3">
                        {screenshots.map((url, i) => (
                            <div key={i} className="group relative shrink-0 w-48 h-28 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
                                <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeScreenshot(i)}
                                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {screenshots.length < 8 && (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newScreenshot}
                            onChange={e => setNewScreenshot(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addScreenshot()}
                            placeholder="https://example.com/screenshot.png"
                            className={`flex-1 ${inputClass}`}
                        />
                        <button
                            onClick={addScreenshot}
                            disabled={!newScreenshot.trim()}
                            className="px-3 py-2 text-sm font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                        >
                            Add
                        </button>
                    </div>
                )}
            </section>

            {/* Category & Keywords */}
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold mb-4">Categorization</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                            <option value="">Select a category…</option>
                            {STORE_CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Keywords</label>
                        <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="privacy, encryption, ai, health…" className={inputClass} />
                        <div className="mt-1 text-[10px] text-black/30 dark:text-white/30">Comma-separated tags to help users find your app</div>
                    </div>
                </div>
            </section>

            {/* Links & Contact */}
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold mb-4">Links &amp; Support</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Website</label>
                        <input type="url" value={websiteURL} onChange={e => setWebsiteURL(e.target.value)} placeholder="https://yourapp.com" className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Support Email</label>
                        <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="support@yourapp.com" className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Privacy Policy</label>
                        <input type="url" value={privacyURL} onChange={e => setPrivacyURL(e.target.value)} placeholder="https://yourapp.com/privacy" className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Terms of Service</label>
                        <input type="url" value={tosURL} onChange={e => setTosURL(e.target.value)} placeholder="https://yourapp.com/terms" className={inputClass} />
                    </div>
                </div>
            </section>

            {/* Save */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                >
                    {saving ? 'Saving…' : 'Save Listing'}
                </button>
                {saved && (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Saved
                    </span>
                )}
            </div>
        </div>
    );
}

// ------- Deployments Tab -------
function DeploymentsTab({ app, deployments, versions, enclaves, token, onRefresh }: {
    app: App; deployments: AppDeployment[]; versions: AppVersion[]; enclaves: Enclave[]; token: string; onRefresh: () => void;
}) {
    const versionMap = Object.fromEntries(versions.map(v => [v.id, v]));
    const readyVersions = versions.filter(v => v.status === 'ready');
    const activeEnclaves = enclaves.filter(e => e.status === 'active');
    const [selectedVersion, setSelectedVersion] = useState('');
    const [selectedEnclave, setSelectedEnclave] = useState('');
    const [deploying, setDeploying] = useState(false);
    const [stopping, setStopping] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleDeploy() {
        if (!selectedVersion || !selectedEnclave) return;
        setDeploying(true);
        setError(null);
        try {
            await deployVersion(token, app.id, selectedVersion, selectedEnclave);
            setSelectedVersion('');
            setSelectedEnclave('');
            onRefresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Deployment failed');
        } finally {
            setDeploying(false);
        }
    }

    async function handleStop(depId: string) {
        setStopping(depId);
        setError(null);
        try {
            await stopDeployment(token, app.id, depId);
            onRefresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to stop deployment');
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

            {/* Deploy new version */}
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold mb-1">Deploy a version</h2>
                <p className="text-xs text-black/40 dark:text-white/40 mb-4">
                    Select a built version and a location to deploy your application to an enclave.
                </p>

                {readyVersions.length === 0 ? (
                    <div className="text-xs text-black/40 dark:text-white/40 py-2">
                        No deployable versions yet. Submit a version and wait for the build to complete.
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Version</label>
                                <select
                                    value={selectedVersion}
                                    onChange={e => setSelectedVersion(e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                >
                                    <option value="">Select version…</option>
                                    {readyVersions.map(v => (
                                        <option key={v.id} value={v.id}>
                                            v{v.version_number} — {v.github_commit?.slice(0, 8) || 'upload'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Location</label>
                                <select
                                    value={selectedEnclave}
                                    onChange={e => setSelectedEnclave(e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                >
                                    <option value="">Select location…</option>
                                    {activeEnclaves.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.name} — {e.region || e.country || 'Unknown'}
                                            {e.provider ? ` (${e.provider})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={handleDeploy}
                            disabled={deploying || !selectedVersion || !selectedEnclave}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                        >
                            {deploying ? 'Deploying…' : 'Deploy'}
                        </button>
                    </div>
                )}
            </section>

            {/* Existing deployments */}
            {deployments.length === 0 ? (
                <div className="text-center py-8 text-sm text-black/40 dark:text-white/40">
                    No deployments yet.
                </div>
            ) : (
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold">Deployment history</h2>
                    {deployments.map((dep) => {
                        const version = versionMap[dep.version_id];
                        const isActive = dep.status === 'active' || dep.status === 'deploying';
                        return (
                            <section key={dep.id} className={`p-5 rounded-xl border ${isActive ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-900/5' : 'border-black/10 dark:border-white/10'}`}>
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
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={dep.status} labels={DEPLOYMENT_STATUS_LABELS} colors={DEPLOYMENT_STATUS_COLORS} />
                                        {isActive && (
                                            <button
                                                onClick={() => handleStop(dep.id)}
                                                disabled={stopping === dep.id}
                                                className="px-3 py-1 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                                            >
                                                {stopping === dep.id ? 'Stopping…' : 'Stop'}
                                            </button>
                                        )}
                                    </div>
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
                                {isActive && dep.hostname && (
                                    <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                                        <a
                                            href={`https://${dep.hostname}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                                        >
                                            https://{dep.hostname} &rarr;
                                        </a>
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
