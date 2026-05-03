'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import { adminGatewayRoutes, type GatewayRoute, type GatewayPoller } from '~/lib/api';

function relativeTime(iso: string): string {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return iso;
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    return new Date(iso).toLocaleString();
}

export default function GatewayAdminPage() {
    const { session } = useAuth();
    const [routes, setRoutes] = useState<GatewayRoute[]>([]);
    const [pollers, setPollers] = useState<GatewayPoller[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedSni, setExpandedSni] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setError(null);
        try {
            const data = await adminGatewayRoutes(session.accessToken);
            setRoutes(data.routes ?? []);
            setPollers(data.pollers ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load gateway state');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [session?.accessToken]);

    useEffect(() => { load(); }, [load]);

    // Refresh "X seconds ago" labels every 5s without re-fetching.
    useEffect(() => {
        const id = window.setInterval(() => setTick(t => t + 1), 5000);
        return () => window.clearInterval(id);
    }, []);
    void tick;

    const isManager = hasManagerRole(session?.roles);
    if (!isManager) {
        return (
            <div className="max-w-4xl">
                <h1 className="text-2xl font-semibold">Access denied</h1>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">You need the manager role to access this page.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Gateway</h1>
                    <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                        Read-only view of the L4 gateway route map. Gateways pull this list from
                        <code className="mx-1 px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded text-xs">/internal/routes</code>
                        every few seconds and re-load Caddy when the version hash changes.
                    </p>
                </div>
                <button onClick={() => { setRefreshing(true); load(); }}
                    disabled={refreshing}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors whitespace-nowrap">
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Pollers / "registered" gateways */}
            <section className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                    Active gateways ({pollers.length})
                </h2>
                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                    Tracked from <code>/internal/routes</code> calls in the last hour. Gateways are
                    stateless pullers; this list is best-effort and reset on mgmt-service restart.
                </p>
                {loading ? (
                    <div className="mt-3 text-sm text-black/40 dark:text-white/40">Loading…</div>
                ) : pollers.length === 0 ? (
                    <div className="mt-3 p-4 rounded-lg border border-dashed border-black/10 dark:border-white/10 text-sm text-black/50 dark:text-white/50">
                        No gateway has polled <code>/internal/routes</code> recently.
                    </div>
                ) : (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-black/5 dark:border-white/5">
                        <table className="w-full text-sm">
                            <thead className="bg-black/[0.02] dark:bg-white/[0.02] text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                                <tr>
                                    <th className="text-left px-4 py-2 font-medium">Remote IP</th>
                                    <th className="text-left px-4 py-2 font-medium">User agent</th>
                                    <th className="text-left px-4 py-2 font-medium">Last poll</th>
                                    <th className="text-left px-4 py-2 font-medium">Last response</th>
                                    <th className="text-left px-4 py-2 font-medium">Polls (this process)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pollers.map(p => (
                                    <tr key={p.remote_addr} className="border-t border-black/5 dark:border-white/5">
                                        <td className="px-4 py-2"><code className="text-xs">{p.remote_addr}</code></td>
                                        <td className="px-4 py-2 text-xs text-black/60 dark:text-white/60">{p.user_agent || '—'}</td>
                                        <td className="px-4 py-2 text-xs">{relativeTime(p.last_seen_at)}</td>
                                        <td className="px-4 py-2 text-xs">
                                            {p.last_modified ? (
                                                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">200 routes</span>
                                            ) : (
                                                <span className="inline-block px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60">304 unchanged</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-xs">{p.poll_count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Route map */}
            <section className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                    Materialised route map ({routes.length})
                </h2>
                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                    Every active app deployment becomes a hostname → enclave_ip:port mapping. The
                    gateway uses these to splice TLS connections directly to the enclave Caddy.
                </p>
                {loading ? (
                    <div className="mt-3 text-sm text-black/40 dark:text-white/40">Loading…</div>
                ) : routes.length === 0 ? (
                    <div className="mt-3 p-4 rounded-lg border border-dashed border-black/10 dark:border-white/10 text-sm text-black/50 dark:text-white/50">
                        No active deployments — the gateway has nothing to route.
                    </div>
                ) : (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-black/5 dark:border-white/5">
                        <table className="w-full text-sm">
                            <thead className="bg-black/[0.02] dark:bg-white/[0.02] text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                                <tr>
                                    <th className="text-left px-4 py-2 font-medium">Hostname (SNI)</th>
                                    <th className="text-left px-4 py-2 font-medium">Upstream</th>
                                    <th className="text-left px-4 py-2 font-medium">Attestation policy</th>
                                </tr>
                            </thead>
                            <tbody>
                                {routes.map(rt => {
                                    const isExpanded = expandedSni === rt.sni;
                                    const hasPolicy = rt.attestation_policy !== undefined && rt.attestation_policy !== null;
                                    return (
                                        <tr key={rt.sni}
                                            className={`border-t border-black/5 dark:border-white/5 ${hasPolicy ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]' : ''}`}
                                            onClick={() => hasPolicy && setExpandedSni(isExpanded ? null : rt.sni)}>
                                            <td className="px-4 py-2"><code className="text-xs">{rt.sni}</code></td>
                                            <td className="px-4 py-2"><code className="text-xs">{rt.upstream}</code></td>
                                            <td className="px-4 py-2 text-xs">
                                                {hasPolicy ? (
                                                    <span className="text-black/60 dark:text-white/60">
                                                        {isExpanded ? '▼' : '▶'} {Object.keys(rt.attestation_policy as object).length} field(s)
                                                    </span>
                                                ) : (
                                                    <span className="text-black/30 dark:text-white/30">splice (no policy)</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {expandedSni && (() => {
                    const rt = routes.find(r => r.sni === expandedSni);
                    if (!rt?.attestation_policy) return null;
                    return (
                        <div className="mt-3 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                            <div className="text-xs text-black/50 dark:text-white/50 mb-1">Attestation policy for <code>{rt.sni}</code></div>
                            <pre className="text-xs overflow-x-auto"><code>{JSON.stringify(rt.attestation_policy, null, 2)}</code></pre>
                        </div>
                    );
                })()}
            </section>
        </div>
    );
}
