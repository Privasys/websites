'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Navbar } from '@privasys/ui';
import { useSession, signOut } from 'next-auth/react';

const SIDEBAR_ITEMS = [
    { label: 'Applications', href: '/dashboard', icon: 'M4 6h16M4 12h16M4 18h7' },
    { label: 'Deployments', href: '/dashboard/deployments', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' }
];

const NAVBAR_ITEMS = [
    { label: 'Docs', href: 'https://docs.privasys.org', external: true },
];

function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-black/5 dark:border-white/10 h-[calc(100vh-3.5rem)] sticky top-14">
            <nav className="flex-1 py-4 px-3 space-y-1">
                {SIDEBAR_ITEMS.map((item) => {
                    const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
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
            </nav>
            <div className="px-3 py-4 border-t border-black/5 dark:border-white/10">
                {session?.user && (
                    <div className="flex items-center gap-2 mb-3">
                        {session.user.image ? (
                            <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs font-medium">
                                {(session.user.name?.[0] ?? session.user.email?.[0] ?? '?').toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate">{session.user.name ?? session.user.email}</div>
                        </div>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-colors"
                >
                    Sign out
                </button>
            </div>
        </aside>
    );
}

export default function PlatformLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Navbar brandSuffix="Developer" items={NAVBAR_ITEMS} />
            <div className="flex pt-14 min-h-screen">
                <Sidebar />
                <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                    {children}
                </main>
            </div>
        </>
    );
}
