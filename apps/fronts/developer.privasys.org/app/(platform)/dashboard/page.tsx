'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback } from 'react';
import { isApiStatus, listApps } from '~/lib/api';
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

const BENEFITS = [
    {
        icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
        title: 'Hardware-level security',
        desc: 'Your application runs inside an Intel SGX enclave — isolated from the host OS, hypervisor, and even the cloud provider.'
    },
    {
        icon: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z',
        title: 'Remote attestation',
        desc: 'Cryptographic proof that your code is running unmodified in a genuine enclave. Verify it anytime with RA-TLS.'
    },
    {
        icon: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5',
        title: 'Reproducible builds',
        desc: 'Your WASM module is compiled via auditable GitHub Actions — anyone can verify the binary matches the source.'
    },
    {
        icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
        title: 'Global deployment',
        desc: 'Deploy to enclaves across multiple regions. Your users get low-latency access while data stays protected.'
    },
    {
        icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605',
        title: 'App Store distribution',
        desc: 'Publish your confidential application to the Privasys App Store and reach customers instantly.'
    },
    {
        icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5',
        title: 'Interactive API testing',
        desc: 'Test your WASM application endpoints directly from the developer portal with our built-in API explorer.'
    }
];

function WelcomePage() {
    return (
        <div className="max-w-3xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Welcome to the Developer Platform
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Build confidential applications
                </h1>
                <p className="mt-4 text-base text-black/60 dark:text-white/60 max-w-xl mx-auto leading-relaxed">
                    Deploy your WebAssembly applications on hardware-secured enclaves with cryptographic attestation, reproducible builds, and global distribution.
                </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
                <Link
                    href="/dashboard/new"
                    className="group p-6 rounded-xl border-2 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 transition-all"
                >
                    <div className="w-10 h-10 rounded-lg bg-black dark:bg-white flex items-center justify-center mb-4">
                        <svg className="w-5 h-5 text-white dark:text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold group-hover:underline">Create a new App</h2>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Submit a GitHub commit or upload a WASM module to get started with your first confidential application.
                    </p>
                </Link>

                <Link
                    href="/dashboard/settings"
                    className="group p-6 rounded-xl border-2 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 transition-all"
                >
                    <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center mb-4">
                        <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold group-hover:underline">Organisation settings</h2>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Tell us about yourself or your company. This information is shown on the App Store.
                    </p>
                </Link>
            </div>

            {/* Benefits grid */}
            <div>
                <h2 className="text-lg font-semibold mb-6 text-center">Why Privasys?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {BENEFITS.map((b) => (
                        <div key={b.title} className="p-5 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.02]">
                            <svg className="w-6 h-6 text-black/40 dark:text-white/40 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={b.icon} />
                            </svg>
                            <h3 className="text-sm font-semibold">{b.title}</h3>
                            <p className="mt-1.5 text-xs text-black/50 dark:text-white/50 leading-relaxed">{b.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { session } = useAuth();
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
            if (isApiStatus(e, 401)) return;
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => { loadApps(); }, [loadApps]);

    useSSE(session?.accessToken, useCallback(() => { loadApps(); }, [loadApps]));

    if (loading) {
        return (
            <div className="max-w-4xl">
                <div className="mt-16 text-center py-20">
                    <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl">
                <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            </div>
        );
    }

    // Welcome page for new users
    if (apps.length === 0) {
        return <WelcomePage />;
    }

    // Apps list view
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
                                    {app.source_type === 'upload' ? 'Upload' : app.source_type === 'package' ? 'Package' : app.source_type === 'cloud_image' ? 'Cloud image' : 'GitHub'}
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
        </div>
    );
}
