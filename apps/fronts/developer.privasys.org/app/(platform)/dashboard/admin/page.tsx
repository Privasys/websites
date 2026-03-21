'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { adminListApps } from '~/lib/api';
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

const TABS = ['all', 'submitted', 'approved', 'deployed', 'rejected'] as const;

export default function AdminPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [apps, setApps] = useState<App[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<string>('submitted');

    useEffect(() => {
        if (!session?.accessToken) return;
        setLoading(true);
        adminListApps(session.accessToken, tab === 'all' ? undefined : tab)
            .then(setApps)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [session?.accessToken, tab]);

    const isManager = session?.roles?.some(r => r.endsWith(':manager') || r === 'privasys-platform:admin') ?? false;

    if (!isManager) {
        return (
            <div className="max-w-4xl">
                <h1 className="text-2xl font-semibold">Access denied</h1>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                    You need the manager role to access this page.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl">
            <h1 className="text-2xl font-semibold">Review applications</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Review, approve, and deploy applications submitted by developers.
            </p>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 border-b border-black/5 dark:border-white/5">
                {TABS.map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            tab === t
                                ? 'border-black dark:border-white text-black dark:text-white'
                                : 'border-transparent text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70'
                        }`}
                    >
                        {t === 'all' ? 'All' : STATUS_LABELS[t as AppStatus] ?? t}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="mt-10 text-center py-16">
                    <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div>
                </div>
            )}

            {error && (
                <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {!loading && !error && apps.length === 0 && (
                <div className="mt-10 text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
                    <h2 className="text-lg font-medium">No applications</h2>
                    <p className="mt-2 text-sm text-black/50 dark:text-white/50">
                        {tab === 'submitted' ? 'No apps pending review.' : `No apps with status "${tab}".`}
                    </p>
                </div>
            )}

            {!loading && !error && apps.length > 0 && (
                <div className="mt-4 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                                <th className="text-left px-4 py-3 font-medium">Name</th>
                                <th className="text-left px-4 py-3 font-medium">Type</th>
                                <th className="text-left px-4 py-3 font-medium">Owner</th>
                                <th className="text-left px-4 py-3 font-medium">Source</th>
                                <th className="text-left px-4 py-3 font-medium">Status</th>
                                <th className="text-left px-4 py-3 font-medium">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apps.map((app) => (
                                <tr key={app.id}
                                    onClick={() => router.push(`/dashboard/admin/apps/${app.id}`)}
                                    className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/2 dark:hover:bg-white/2 transition-colors cursor-pointer">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{app.display_name || app.name}</div>
                                        <div className="text-xs text-black/40 dark:text-white/40">{app.name}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${app.app_type === 'container' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                                            {app.app_type === 'container' ? 'Container' : 'WASM'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">
                                        {app.owner_name || app.owner_email || app.owner_sub.slice(0, 8) + '…'}
                                    </td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">
                                        {app.source_type === 'github' ? (
                                            <span className="flex items-center gap-1.5">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
                                                GitHub
                                            </span>
                                        ) : 'Upload'}
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
