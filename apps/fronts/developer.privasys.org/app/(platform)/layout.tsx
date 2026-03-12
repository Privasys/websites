'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
    { label: 'Applications', href: '/dashboard', icon: 'M4 6h16M4 12h16M4 18h7' },
    { label: 'Deployments', href: '/dashboard/deployments', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' }
];

function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-black/5 dark:border-white/10 h-[calc(100vh-3.5rem)] sticky top-14">
            <nav className="flex-1 py-4 px-3 space-y-1">
                {NAV_ITEMS.map((item) => {
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
            <div className="px-3 py-4 border-t border-black/5 dark:border-white/10 text-xs text-black/40 dark:text-white/40">
                Privasys Developer Platform
            </div>
        </aside>
    );
}

function DashboardHeader() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
                <Image src="/favicon/favicon.svg" alt="" width={20} height={20} aria-hidden />
                Privasys
                <span className="text-sm font-normal text-black/40 dark:text-white/40">Developer</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
                <Link href="https://docs.privasys.org" className="hidden sm:inline hover:underline text-black/60 dark:text-white/60" target="_blank" rel="noopener noreferrer">
                    Docs
                </Link>
                <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10" title="Account" />
            </div>
        </header>
    );
}

export default function PlatformLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <DashboardHeader />
            <div className="flex pt-14 min-h-screen">
                <Sidebar />
                <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                    {children}
                </main>
            </div>
        </>
    );
}
