'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Navbar, Footer } from '@privasys/ui';
import { useSession } from 'next-auth/react';
import { listApps } from '~/lib/api';
import { useSSE } from '~/lib/use-sse';
import type { App } from '~/lib/types';
import { UserMenu } from '~/components/user-menu';

const STATUS_DOT: Record<string, string> = {
    deployed: 'bg-emerald-500',
    building: 'bg-indigo-500 animate-pulse',
    approved: 'bg-green-500',
    submitted: 'bg-yellow-500',
    failed: 'bg-red-500',
    rejected: 'bg-red-400',
    undeployed: 'bg-gray-400',
    deploying: 'bg-blue-500 animate-pulse'
};

const ADMIN_ITEMS = [
    { label: 'Review apps', href: '/dashboard/admin', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Enclave', href: '/dashboard/admin/enclave', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2' },
    { label: 'Platform settings', href: '/dashboard/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', adminOnly: true }
];

const NAVBAR_ITEMS = [
    { label: 'Docs', href: 'https://docs.privasys.org', external: true }
];

function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
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
    { label: 'GitHub', href: 'https://github.com/Privasys', external: true },
];

function buildVersionString(): string | undefined {
    const version = process.env.NEXT_PUBLIC_APP_VERSION;
    const sha = process.env.NEXT_PUBLIC_GIT_SHA;
    if (!version) return undefined;
    return `v${version}${sha ? ` (${sha})` : ''}`;
}

export default function PlatformLayout({ children }: { children: ReactNode }) {
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
