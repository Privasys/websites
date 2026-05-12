'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import { listFleets } from '~/lib/api';
import type { Fleet } from '~/lib/types';

export default function AdminFleetsPage() {
    const { session } = useAuth();
    const [fleets, setFleets] = useState<Fleet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!session?.accessToken) return;
        setLoading(true);
        listFleets(session.accessToken)
            .then((r) => setFleets(r.fleets ?? []))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [session?.accessToken]);

    const isManager = hasManagerRole(session?.roles);
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
            <h1 className="text-2xl font-semibold">AI fleets</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Pick a fleet to manage its AI tools (MCP catalogue) shown to
                chat users for that inference instance.
            </p>

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

            {!loading && !error && (
                <div className="mt-6 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                                <th className="text-left px-4 py-3 font-medium">Name</th>
                                <th className="text-left px-4 py-3 font-medium">Alias</th>
                                <th className="text-left px-4 py-3 font-medium">Owner</th>
                                <th className="text-left px-4 py-3 font-medium">Zone</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {fleets.map((f) => (
                                <tr key={f.id} className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/2 dark:hover:bg-white/2">
                                    <td className="px-4 py-3 font-medium">{f.name}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{f.alias ?? '—'}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{f.owner}</td>
                                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{f.zone ?? '—'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={`/dashboard/admin/fleets/${f.id}/tools`}
                                            className="text-sm font-medium underline">
                                            Manage tools →
                                        </Link>
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
