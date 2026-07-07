'use client';

import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import { useCallback, useEffect, useState } from 'react';
import { adminListAttributeProviders, adminReviewAttributeProvider } from '~/lib/api';
import type { AttributeProvider, AttributeProviderStatus } from '~/lib/api';

const STATUS_STYLE: Record<AttributeProviderStatus, string> = {
    approved: 'bg-green-500/10 text-green-700 dark:text-green-400',
    pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    suspended: 'bg-red-500/10 text-red-700 dark:text-red-400'
};

export default function AdminProvidersPage() {
    const { session } = useAuth();
    const token = session?.accessToken ?? null;
    const isManager = hasManagerRole(session?.roles);
    const [providers, setProviders] = useState<AttributeProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await adminListAttributeProviders(token);
            setProviders(res.providers ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load providers.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    const review = async (namespace: string, status: AttributeProviderStatus) => {
        if (!token) return;
        setBusy(namespace);
        try {
            await adminReviewAttributeProvider(token, namespace, status);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Review failed.');
        } finally {
            setBusy(null);
        }
    };

    if (!isManager) {
        return <div className="p-8 text-black/50 dark:text-white/50">Platform admin access required.</div>;
    }
    if (loading) {
        return <div className="p-8 text-black/50 dark:text-white/50">Loading attribute providers…</div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl font-semibold">Attribute providers</h1>
                <p className="mt-1 text-black/60 dark:text-white/60">
                    Review who may publish attested attributes. Approve to make a provider&apos;s
                    attributes consumable; suspend to withdraw them.
                </p>
            </header>

            {error && (
                <div className="rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-3 text-sm">{error}</div>
            )}

            {providers.length === 0 ? (
                <p className="text-black/50 dark:text-white/50 text-sm">No providers registered yet.</p>
            ) : (
                <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="text-left text-black/50 dark:text-white/50">
                            <tr>
                                <th className="px-4 py-2 font-normal">Namespace</th>
                                <th className="px-4 py-2 font-normal">Display name</th>
                                <th className="px-4 py-2 font-normal">Status</th>
                                <th className="px-4 py-2 font-normal text-right">Review</th>
                            </tr>
                        </thead>
                        <tbody>
                            {providers.map((p) => (
                                <tr key={p.namespace} className="border-t border-black/5 dark:border-white/5">
                                    <td className="px-4 py-2 font-mono">{p.namespace}</td>
                                    <td className="px-4 py-2">{p.display_name || '—'}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex gap-2 justify-end">
                                            {p.status !== 'approved' && (
                                                <button onClick={() => review(p.namespace, 'approved')} disabled={busy === p.namespace}
                                                    className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-medium disabled:opacity-50">
                                                    Approve
                                                </button>
                                            )}
                                            {p.status !== 'suspended' && (
                                                <button onClick={() => review(p.namespace, 'suspended')} disabled={busy === p.namespace}
                                                    className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-medium disabled:opacity-50">
                                                    Suspend
                                                </button>
                                            )}
                                        </div>
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
