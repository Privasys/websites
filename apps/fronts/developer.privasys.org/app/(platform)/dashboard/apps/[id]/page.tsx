'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { getApp, listBuilds, deleteApp } from '~/lib/api';
import { useSSE } from '~/lib/use-sse';
import type { App, AppStatus, BuildJob } from '~/lib/types';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';

function StatusBadge({ status }: { status: string }) {
    const s = status as AppStatus;
    return (
        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-800'}`}>
            {STATUS_LABELS[s] ?? status}
        </span>
    );
}

function BuildStatusDot({ status }: { status: string }) {
    const color =
        status === 'success' ? 'bg-emerald-500' :
            status === 'failed' ? 'bg-red-500' :
                status === 'running' ? 'bg-blue-500 animate-pulse' :
                    'bg-yellow-500';
    return <span className={`w-2 h-2 rounded-full inline-block ${color}`} />;
}

export default function AppDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: session } = useSession();
    const [app, setApp] = useState<App | null>(null);
    const [builds, setBuilds] = useState<BuildJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        if (!session?.accessToken || !id) return;
        try {
            const [appData, buildsData] = await Promise.all([
                getApp(session.accessToken, id),
                listBuilds(session.accessToken, id)
            ]);
            setApp(appData);
            setBuilds(buildsData);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, id]);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh when there's an active build
    useEffect(() => {
        const hasActiveBuild = builds.some(b =>
            b.status === 'pending' || b.status === 'dispatched' || b.status === 'running'
        );
        if (!hasActiveBuild) return;
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [builds, load]);

    // SSE: refresh on app/build updates for this app
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
            <div className="max-w-3xl">
                <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div>
            </div>
        );
    }

    if (!app) {
        return (
            <div className="max-w-3xl">
                <Link href="/dashboard" className="text-sm text-black/50 dark:text-white/50 hover:underline">
                    ← Back to applications
                </Link>
                <p className="mt-4 text-red-600">{error || 'App not found.'}</p>
            </div>
        );
    }

    const canDelete = app.status !== 'deployed' && app.status !== 'deploying';

    return (
        <div className="max-w-3xl">
            <Link href="/dashboard" className="text-sm text-black/50 dark:text-white/50 hover:underline">
                ← Back to applications
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

            {/* Details */}
            <section className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-3">
                <h2 className="text-sm font-semibold">Details</h2>
                <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                    <div>
                        <div className="text-xs text-black/50 dark:text-white/50">Source</div>
                        <div className="mt-0.5">{app.source_type === 'github' ? 'GitHub' : 'Upload'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-black/50 dark:text-white/50">Created</div>
                        <div className="mt-0.5">{new Date(app.created_at).toLocaleString()}</div>
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
                                <a
                                    href={`https://${app.hostname}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs mt-0.5 block text-emerald-700 dark:text-emerald-300 hover:underline"
                                >
                                    {app.hostname}
                                </a>
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

            {/* Build history */}
            {builds.length > 0 && (
                <section className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-sm font-semibold mb-3">Build history</h2>
                    <div className="space-y-2">
                        {builds.map((build) => (
                            <div key={build.id} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <BuildStatusDot status={build.status} />
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

            {/* Delete */}
            {canDelete && (
                <section className="mt-8 p-5 rounded-xl border border-red-200 dark:border-red-800/50">
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
