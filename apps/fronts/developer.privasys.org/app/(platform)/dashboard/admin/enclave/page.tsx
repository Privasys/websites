'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { adminEnclaveHealth, adminListEnclaveApps } from '~/lib/api';

export default function AdminEnclavePage() {
    const { data: session } = useSession();
    const [health, setHealth] = useState<{ status: string; error?: string } | null>(null);
    const [apps, setApps] = useState<unknown>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const [h, a] = await Promise.allSettled([
                adminEnclaveHealth(session.accessToken),
                adminListEnclaveApps(session.accessToken)
            ]);
            setHealth(h.status === 'fulfilled' ? h.value : { status: 'unreachable' });
            setApps(a.status === 'fulfilled' ? a.value : null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => { load(); }, [load]);

    const isManager = session?.roles?.some((r: string) => r.endsWith(':manager'));
    if (!isManager) {
        return <p className="text-sm text-red-600">Access denied. Manager role required.</p>;
    }

    const healthy = health?.status === 'healthy';

    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold">Enclave</h1>
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">Health status and deployed modules.</p>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Health card */}
            <section className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">SGX enclave health</h2>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="text-xs text-black/50 dark:text-white/50 hover:underline disabled:opacity-40"
                    >
                        {loading ? 'Checking…' : 'Refresh'}
                    </button>
                </div>
                {loading && !health ? (
                    <div className="mt-3 text-sm text-black/40 dark:text-white/40 animate-pulse">Checking enclave…</div>
                ) : health ? (
                    <div className="mt-3 flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">{healthy ? 'Healthy' : 'Unhealthy'}</span>
                        {health.error && (
                            <span className="text-xs text-red-600 dark:text-red-400">{health.error}</span>
                        )}
                    </div>
                ) : null}
            </section>

            {/* Enclave apps */}
            <section className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold mb-3">Deployed modules</h2>
                {loading && !apps ? (
                    <div className="text-sm text-black/40 dark:text-white/40 animate-pulse">Loading…</div>
                ) : apps && typeof apps === 'object' ? (
                    <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(apps, null, 2)}
                    </pre>
                ) : (
                    <p className="text-sm text-black/50 dark:text-white/50">No modules or unable to reach enclave.</p>
                )}
            </section>
        </div>
    );
}
