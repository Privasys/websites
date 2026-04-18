'use client';

import { useAuth } from '~/lib/privasys-auth';
import { useEffect, useState } from 'react';
import { listApps } from '~/lib/api';
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

export default function DeploymentsPage() {
    const { session } = useAuth();
    const [apps, setApps] = useState<App[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!session?.accessToken) return;
        listApps(session.accessToken)
            .then((all) => setApps(all.filter((a) => a.status === 'deployed' || a.status === 'undeployed' || a.status === 'failed')))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [session?.accessToken]);

    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold">Deployments</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                View the status of your active deployments across Enclave OS Mini and Enclave OS Virtual.
            </p>

            {loading && (
                <div className="mt-10 text-center py-16">
                    <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading deployments…</div>
                </div>
            )}

            {error && (
                <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {!loading && !error && apps.length === 0 && (
                <div className="mt-10 text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
                    <h2 className="text-lg font-medium">No deployments</h2>
                    <p className="mt-2 text-sm text-black/50 dark:text-white/50 max-w-sm mx-auto">
                        Deployments will appear here once you create and deploy an application.
                    </p>
                </div>
            )}

            {!loading && !error && apps.length > 0 && (
                <div className="mt-6 space-y-4">
                    {apps.map((app) => (
                        <div key={app.id} className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{app.display_name}</div>
                                    <div className="text-xs text-black/40 dark:text-white/40 mt-0.5">{app.name}</div>
                                </div>
                                <StatusBadge status={app.status} />
                            </div>

                            {app.status === 'deployed' && (
                                <div className="mt-4 space-y-3">
                                    {app.hostname && (
                                        <div>
                                            <div className="text-xs font-medium text-black/50 dark:text-white/50 mb-1">Hostname</div>
                                            <code className="text-sm bg-black/5 dark:bg-white/5 px-2 py-1 rounded">{app.hostname}</code>
                                        </div>
                                    )}
                                    {app.cwasm_hash && (
                                        <div>
                                            <div className="text-xs font-medium text-black/50 dark:text-white/50 mb-1">Code hash (SHA-256)</div>
                                            <code className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded break-all">{app.cwasm_hash}</code>
                                        </div>
                                    )}
                                    {app.deployed_at && (
                                        <div>
                                            <div className="text-xs font-medium text-black/50 dark:text-white/50 mb-1">Deployed at</div>
                                            <span className="text-sm">{new Date(app.deployed_at).toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-xs font-medium text-black/50 dark:text-white/50 mb-1">Verify attestation</div>
                                        <code className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded block whitespace-pre-wrap">
                                            privasys verify {app.hostname ?? app.name}
                                        </code>
                                    </div>
                                </div>
                            )}

                            {app.status === 'failed' && app.review_note && (
                                <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                                    {app.review_note}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
