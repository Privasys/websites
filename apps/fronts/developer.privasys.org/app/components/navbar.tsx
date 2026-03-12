'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5 font-semibold">
                    <Image src="/favicon/favicon.svg" alt="" width={20} height={20} aria-hidden />
                    Privasys
                    <span className="text-sm font-normal text-black/40 dark:text-white/40">Developer</span>
                </Link>
                <div className="flex items-center gap-6 text-sm">
                    <Link href="https://docs.privasys.org" className="hover:underline" target="_blank" rel="noopener noreferrer">
                        Docs
                    </Link>
                    <Link href="https://privasys.org" className="hover:underline" target="_blank" rel="noopener noreferrer">
                        Website
                    </Link>
                    <Link href="https://github.com/Privasys" className="hover:underline" target="_blank" rel="noopener noreferrer">
                        GitHub
                    </Link>
                    <Link
                        href="/login"
                        className="px-4 py-1.5 font-medium rounded-full bg-black text-white dark:bg-white dark:text-black text-sm hover:opacity-80 transition-opacity"
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        </nav>
    );
}
