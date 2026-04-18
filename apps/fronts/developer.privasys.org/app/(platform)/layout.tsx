'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Navbar, Footer } from '@privasys/ui';
import { useAuth } from '~/lib/privasys-auth';
import { listApps } from '~/lib/api';
import { useSSE } from '~/lib/use-sse';
import type { App } from '~/lib/types';
import { UserMenu } from '~/components/user-menu';

const STATUS_DOT: Record<string, string> = {
    deployed: 'bg-emerald-500',
    building: 'bg-indigo-500 animate-pulse',
    approved: 'bg-green-500',
    built: 'bg-emerald-500',
    submitted: 'bg-yellow-500',
    failed: 'bg-red-500',
    rejected: 'bg-red-400',
    undeployed: 'bg-gray-400',
    deploying: 'bg-blue-500 animate-pulse'
};

const ADMIN_ITEMS = [
    { label: 'Review apps', href: '/dashboard/admin', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Enclave', href: '/dashboard/admin/enclave', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2' },
    { label: 'Users', href: '/dashboard/admin/users', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', adminOnly: true },
    { label: 'Platform settings', href: '/dashboard/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', adminOnly: true }
];

const NAVBAR_ITEMS = [
    { label: 'Docs', href: 'https://docs.privasys.org', external: true }
];

function Sidebar() {
    const pathname = usePathname();
    const { session } = useAuth();
    const isManager = session?.roles?.some(r => r.endsWith(':manager') || r === 'privasys-platform:admin' || r === 'privasys-platform:manager') ?? false;
    const isAdmin = session?.roles?.includes('privasys-platform:admin') ?? false;
    const [apps, setApps] = useState<App[]>([]);

    const loadApps = useCallback(async () => {
        if (!session?.accessToken) return;
        try {
            const data = await listApps(session.accessToken);
            setApps(data);
        } catch { /* ignore */ }
    }, [session?.accessToken]);

    useEffect(() => { loadApps(); }, [loadApps]);
    useSSE(session?.accessToken, useCallback(() => { loadApps(); }, [loadApps]));

    useEffect(() => {
        const handler = () => { loadApps(); };
        window.addEventListener('apps:changed', handler);
        return () => window.removeEventListener('apps:changed', handler);
    }, [loadApps]);

    return (
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-black/5 dark:border-white/10 h-[calc(100vh-3.5rem)] sticky top-14">
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {/* Overview link */}
                <Link
                    href="/dashboard"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        pathname === '/dashboard'
                            ? 'bg-black/5 dark:bg-white/10 font-medium'
                            : 'hover:bg-black/3 dark:hover:bg-white/5 text-black/60 dark:text-white/60'
                    }`}
                >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Overview
                </Link>

                {/* Applications section */}
                <div className="pt-4 pb-1 px-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-black/30 dark:text-white/30">Applications</span>
                    <Link
                        href="/dashboard/new"
                        className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                        title="New application"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M12 4v16m8-8H4" />
                        </svg>
                    </Link>
                </div>

                {apps.length === 0 && (
                    <div className="px-3 py-3 text-xs text-black/30 dark:text-white/30">
                        No applications yet
                    </div>
                )}

                {apps.map((app) => {
                    const active = pathname.startsWith(`/dashboard/apps/${app.id}`);
                    return (
                        <Link
                            key={app.id}
                            href={`/dashboard/apps/${app.id}`}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
                                active
                                    ? 'bg-black/5 dark:bg-white/10 font-medium'
                                    : 'hover:bg-black/3 dark:hover:bg-white/5 text-black/60 dark:text-white/60'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[app.status] ?? 'bg-gray-400'}`} />
                            <span className="truncate">{app.display_name || app.name}</span>
                        </Link>
                    );
                })}

                {/* Settings */}
                <Link
                    href="/dashboard/settings"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        pathname === '/dashboard/settings'
                            ? 'bg-black/5 dark:bg-white/10 font-medium'
                            : 'hover:bg-black/3 dark:hover:bg-white/5 text-black/60 dark:text-white/60'
                    }`}
                >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Settings
                </Link>

                {/* Resources section */}
                <div className="pt-4 pb-1 px-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-black/30 dark:text-white/30">Resources</span>
                </div>
                <a
                    href="https://docs.privasys.org/solutions/enclave-os/enclave-os-mini/mcp-tools"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/3 dark:hover:bg-white/5 text-black/60 dark:text-white/60"
                >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    MCP Tools Guide
                </a>
                <a
                    href="https://docs.privasys.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/3 dark:hover:bg-white/5 text-black/60 dark:text-white/60"
                >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Documentation
                </a>

                {isManager && (
                    <>
                        <div className="pt-4 pb-1 px-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-black/30 dark:text-white/30">Admin</span>
                        </div>
                        {ADMIN_ITEMS.filter(item => !item.adminOnly || isAdmin).map((item) => {
                            const active = pathname === item.href || (item.href !== '/dashboard/admin' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                        active
                                            ? 'bg-black/5 dark:bg-white/10 font-medium'
                                            : 'hover:bg-black/3 dark:hover:bg-white/5 text-black/60 dark:text-white/60'
                                    }`}
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d={item.icon} />
                                    </svg>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </>
                )}
            </nav>
        </aside>
    );
}

const FOOTER_LINKS = [
    { label: 'Legal', href: 'https://privasys.org/legal', external: true },
    { label: 'Privacy', href: 'https://privasys.org/legal/privacy', external: true },
    { label: 'Terms', href: 'https://privasys.org/legal/terms', external: true },
    { label: 'Modern Slavery', href: 'https://privasys.org/legal/modern-slavery', external: true },
    { label: 'GitHub', href: 'https://github.com/Privasys', external: true }
];

function buildVersionString(): string | undefined {
    const version = process.env.NEXT_PUBLIC_APP_VERSION;
    const sha = process.env.NEXT_PUBLIC_GIT_SHA;
    if (!version) return undefined;
    return `v${version}${sha ? ` (${sha})` : ''}`;
}

export default function PlatformLayout({ children }: { children: ReactNode }) {
    const { session, loading, signIn, expired } = useAuth();
    const triggered = useRef(false);

    // Auto-trigger sign-in modal on first visit (no prior session).
    // Skip when session expired mid-use — show a banner instead.
    useEffect(() => {
        if (loading || session || triggered.current || expired) return;
        triggered.current = true;
        signIn().catch(() => {
            window.location.href = '/';
        });
    }, [loading, session, signIn, expired]);

    // Reset trigger when session is cleared (e.g. token expired then re-auth).
    useEffect(() => {
        if (!session) triggered.current = false;
    }, [session]);

    // Session expired mid-use — show a banner instead of silently popping auth.
    if (expired && !session) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="max-w-sm text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Session expired</h2>
                    <p className="text-sm text-black/50 dark:text-white/50">
                        Your session has expired. Please sign in again to continue.
                    </p>
                    <button
                        onClick={() => signIn().catch(() => { window.location.href = '/'; })}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                    >
                        Sign in
                    </button>
                </div>
            </div>
        );
    }

    if (loading || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div>
            </div>
        );
    }

    return (
        <>
            <Navbar brandSuffix="Developer" items={NAVBAR_ITEMS} fullWidth trailing={<UserMenu />} />
            <div className="flex flex-1 pt-14">
                <Sidebar />
                <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                    {children}
                </main>
            </div>
            <Footer
                companyLine="Privasys Ltd. Registered Company UK-16866500."
                links={FOOTER_LINKS}
                version={buildVersionString()}
                className="!mt-0"
            />
        </>
    );
}
