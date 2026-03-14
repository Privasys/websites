'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { listApps } from '~/lib/api';
import { useSSE } from '~/lib/use-sse';
import type { App, AppStatus } from '~/lib/types';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';

function StatusBadge({ status }: { status: string }) {
    const s = status as AppStatus;
    return (
        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-800'}`}>
            {STATUS_LABELS[s] ?? status}
        </span>
    );
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [apps, setApps] = useState<App[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadApps = useCallback(async () => {
        if (!session?.accessToken) return;
        try {
            const data = await listApps(session.accessToken);
            setApps(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => { loadApps(); }, [loadApps]);

    // Auto-refresh when any app is in a transitional state
    useEffect(() => {
        const hasActive = apps.some(a =>
            a.status === 'building' || a.status === 'deploying'
        );
        if (!hasActive) return;
        const interval = setInterval(loadApps, 5000);
        return () => clearInterval(interval);
    }, [apps, loadApps]);

    // SSE: refresh on app/build updates
    useSSE(session?.accessToken, useCallback(() => { loadApps(); }, [loadApps]));

    return (
        <div className="max-w-4xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Applications</h1>
                <Link
                    href="/dashboard/new"
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                >
                    New application
                </Link>
            </div>

            {loading && (
                <div className="mt-16 text-center py-20">
                    <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading applications…</div>
                </div>
            )}

            {error && (
                <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {!loading && !error && apps.length === 0 && (
                <div className="mt-16 text-center py-20 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
                    <div className="text-4xl mb-4">&#x1F680;</div>
                    <h2 className="text-lg font-medium">No applications yet</h2>
                    <p className="mt-2 text-sm text-black/50 dark:text-white/50 max-w-sm mx-auto">
                        Create your first application to deploy a WASM module or container on confidential infrastructure.
                    </p>
                    <Link
                        href="/dashboard/new"
                        className="inline-block mt-6 px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                    >
                        Create application
                    </Link>
                </div>
            )}

            {!loading && !error && apps.length > 0 && (
                <div className="mt-6 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                                <th className="text-left px-4 py-3 font-medium">Name</th>
                                <th className="text-left px-4 py-3 font-medium">Source</th>
                                <th className="text-left px-4 py-3 font-medium">Status</th>
                                <th className="text-left px-4 py-3 font-medium">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apps.map((app) => (
                                <tr
                                    key={app.id}
                                    onClick={() => router.push(`/dashboard/apps/${app.id}`)}
                                    className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/2 dark:hover:bg-white/2 transition-colors cursor-pointer"
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{app.display_name}</div>
                                        <div className="text-xs text-black/40 dark:text-white/40">{app.name}</div>
                                    </td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">
                                        {app.source_type === 'upload' ? 'Upload' : 'GitHub'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={app.status} />
                                    </td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">
                                        {new Date(app.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
