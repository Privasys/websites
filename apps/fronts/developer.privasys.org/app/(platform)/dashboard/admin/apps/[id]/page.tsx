'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import {
    adminGetApp,
    adminReviewApp,
    adminDeployApp,
    adminUndeployApp,
    adminGetDeploymentLogs,
    adminTriggerBuild,
    adminListBuilds
} from '~/lib/api';
import { useSSE } from '~/lib/use-sse';
import type { App, AppStatus, DeploymentLog, BuildJob } from '~/lib/types';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';

function StatusBadge({ status }: { status: string }) {
    const s = status as AppStatus;
    return (
        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-800'}`}>
            {STATUS_LABELS[s] ?? status}
        </span>
    );
}

export default function AdminAppDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: session } = useSession();
    const [app, setApp] = useState<App | null>(null);
    const [logs, setLogs] = useState<DeploymentLog[]>([]);
    const [builds, setBuilds] = useState<BuildJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState('');

    const load = useCallback(async () => {
        if (!session?.accessToken || !id) return;
        try {
            const [appData, logsData, buildsData] = await Promise.all([
                adminGetApp(session.accessToken, id),
                adminGetDeploymentLogs(session.accessToken, id),
                adminListBuilds(session.accessToken, id)
            ]);
            setApp(appData);
            setLogs(logsData);
            setBuilds(buildsData);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, id]);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh when there's an active build or deploying status
    useEffect(() => {
        const hasActiveBuild = builds.some(b =>
            b.status === 'pending' || b.status === 'dispatched' || b.status === 'running'
        );
        const isDeploying = app?.status === 'building' || app?.status === 'deploying';
        if (!hasActiveBuild && !isDeploying) return;
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [builds, app?.status, load]);

    // SSE: refresh on app/build updates for this app
    useSSE(session?.accessToken, useCallback((ev) => {
        if (ev.data.app_id === id) load();
    }, [id, load]));

    async function handleReview(decision: 'approve' | 'reject') {
        if (!session?.accessToken || !id) return;
        setActionLoading(decision);
        setError(null);
        try {
            const updated = await adminReviewApp(session.accessToken, id, {
                decision,
                note: reviewNote || undefined
            });
            setApp(updated);
            setReviewNote('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Review failed');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDeploy() {
        if (!session?.accessToken || !id) return;
        setActionLoading('deploy');
        setError(null);
        try {
            const updated = await adminDeployApp(session.accessToken, id);
            setApp(updated);
            await load(); // refresh logs
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Deploy failed');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleUndeploy() {
        if (!session?.accessToken || !id) return;
        setActionLoading('undeploy');
        setError(null);
        try {
            const updated = await adminUndeployApp(session.accessToken, id);
            setApp(updated);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Undeploy failed');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleBuild() {
        if (!session?.accessToken || !id) return;
        setActionLoading('build');
        setError(null);
        try {
            await adminTriggerBuild(session.accessToken, id);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Build trigger failed');
        } finally {
            setActionLoading(null);
        }
    }

    if (loading) {
        return (
            <div className="max-w-3xl">
                <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div>
            </div>
        );
    }

    if (!app) {
        return (
            <div className="max-w-3xl">
                <p className="text-red-600">App not found.</p>
            </div>
        );
    }

    const canReview = app.status === 'submitted' || app.status === 'under_review';
    const canDeploy = app.status === 'approved' || app.status === 'undeployed' || app.status === 'failed';
    const canUndeploy = app.status === 'deployed';
    const canBuild = app.source_type === 'github' && app.commit_url &&
        (app.status === 'submitted' || app.status === 'failed');

    return (
        <div className="max-w-3xl">
            <Link href="/dashboard/admin" className="text-sm text-black/50 dark:text-white/50 hover:underline">
                ← Back to review
            </Link>

            {/* Header */}
            <div className="mt-4 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{app.display_name || app.name}</h1>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">{app.name}</p>
                </div>
                <StatusBadge status={app.status} />
            </div>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* App details */}
            <section className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-3">
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
                    {app.commit_url && (
                        <div className="col-span-2">
                            <div className="text-xs text-black/50 dark:text-white/50">Commit URL</div>
                            <a
                                href={app.commit_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-0.5 text-blue-600 dark:text-blue-400 hover:underline break-all"
                            >
                                {app.commit_url}
                            </a>
                        </div>
                    )}
                    {app.github_commit && (
                        <div>
                            <div className="text-xs text-black/50 dark:text-white/50">Commit SHA</div>
                            <code className="text-xs mt-0.5 block">{app.github_commit.slice(0, 12)}</code>
                        </div>
                    )}
                    {app.github_commit && (
                        <div>
                            <div className="text-xs text-black/50 dark:text-white/50">GPG signature</div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                                {app.gpg_verified ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-xs text-emerald-700 dark:text-emerald-300">Verified</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-xs text-red-700 dark:text-red-300">Not verified</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    {app.description && (
                        <div className="col-span-2">
                            <div className="text-xs text-black/50 dark:text-white/50">Description</div>
                            <div className="mt-0.5">{app.description}</div>
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

            {/* CWASM info */}
            {app.cwasm_hash && (
                <section className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-2">
                    <h2 className="text-sm font-semibold">WASM module</h2>
                    <div className="text-sm">
                        <div className="text-xs text-black/50 dark:text-white/50">SHA-256</div>
                        <code className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded break-all block mt-1">{app.cwasm_hash}</code>
                    </div>
                    {app.cwasm_size != null && (
                        <div className="text-sm">
                            <div className="text-xs text-black/50 dark:text-white/50">Size</div>
                            <div className="mt-0.5">{(app.cwasm_size / 1024).toFixed(1)} KB</div>
                        </div>
                    )}
                </section>
            )}

            {/* Deployment info */}
            {app.status === 'deployed' && (
                <section className="mt-4 p-5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-2">
                    <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Live deployment</h2>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
                        {app.hostname && (
                            <div>
                                <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Hostname</div>
                                <code className="text-xs mt-0.5 block">{app.hostname}</code>
                            </div>
                        )}
                        {app.deployed_at && (
                            <div>
                                <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Deployed at</div>
                                <div className="mt-0.5">{new Date(app.deployed_at).toLocaleString()}</div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Review note */}
            {app.review_note && (
                <section className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold">Review note</h2>
                    <p className="mt-1 text-sm text-black/60 dark:text-white/60">{app.review_note}</p>
                    {app.reviewed_at && (
                        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                            Reviewed {new Date(app.reviewed_at).toLocaleString()}
                        </p>
                    )}
                </section>
            )}

            {/* Actions */}
            <section className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-4">
                <h2 className="text-sm font-semibold">Actions</h2>

                {/* Review */}
                {canReview && (
                    <div className="space-y-3">
                        <textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Review note (optional)"
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleReview('approve')}
                                disabled={actionLoading !== null}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                            >
                                {actionLoading === 'approve' ? 'Approving…' : 'Approve'}
                            </button>
                            <button
                                onClick={() => handleReview('reject')}
                                disabled={actionLoading !== null}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
                            >
                                {actionLoading === 'reject' ? 'Rejecting…' : 'Reject'}
                            </button>
                        </div>
                        {!app.cwasm_hash && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                No .cwasm uploaded yet — approval requires a compiled module.
                            </p>
                        )}
                    </div>
                )}

                {/* Deploy */}
                {canDeploy && (
                    <button
                        onClick={handleDeploy}
                        disabled={actionLoading !== null}
                        className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                    >
                        {actionLoading === 'deploy' ? 'Deploying…' : 'Deploy to enclave'}
                    </button>
                )}

                {/* Undeploy */}
                {canUndeploy && (
                    <button
                        onClick={handleUndeploy}
                        disabled={actionLoading !== null}
                        className="px-5 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                    >
                        {actionLoading === 'undeploy' ? 'Undeploying…' : 'Undeploy'}
                    </button>
                )}

                {/* Build trigger */}
                {canBuild && (
                    <button
                        onClick={handleBuild}
                        disabled={actionLoading !== null}
                        className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                    >
                        {actionLoading === 'build' ? 'Triggering build…' : 'Build .cwasm via GitHub Actions'}
                    </button>
                )}

                {!canReview && !canDeploy && !canUndeploy && !canBuild && (
                    <p className="text-sm text-black/50 dark:text-white/50">
                        No actions available for apps in <strong>{app.status}</strong> status.
                    </p>
                )}
            </section>

            {/* Build history */}
            {builds.length > 0 && (
                <section className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold mb-3">Build history</h2>
                    <div className="space-y-2">
                        {builds.map((build) => (
                            <div key={build.id} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${
                                        build.status === 'success' ? 'bg-emerald-500' :
                                        build.status === 'failed' ? 'bg-red-500' :
                                        build.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                        'bg-yellow-500'
                                    }`} />
                                    <span className="text-sm font-medium capitalize">{build.status}</span>
                                    <code className="text-xs text-black/40 dark:text-white/40">{build.github_commit.slice(0, 8)}</code>
                                    {build.run_url && (
                                        <a href={build.run_url} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                            View run →
                                        </a>
                                    )}
                                    {build.error_message && (
                                        <span className="text-xs text-red-600 dark:text-red-400 truncate max-w-xs">{build.error_message}</span>
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

            {/* Deployment logs */}
            {logs.length > 0 && (
                <section className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold mb-3">Deployment history</h2>
                    <div className="space-y-2">
                        {logs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <span className="text-sm font-medium capitalize">{log.action}</span>
                                    {log.details && (
                                        <span className="text-xs text-black/40 dark:text-white/40 truncate max-w-xs">{log.details}</span>
                                    )}
                                </div>
                                <span className="text-xs text-black/40 dark:text-white/40">
                                    {new Date(log.created_at).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
