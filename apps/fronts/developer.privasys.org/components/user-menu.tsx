'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '~/lib/privasys-auth';
import { getUserInfo } from '~/lib/api';

export function UserMenu() {
    const { session, signOut } = useAuth();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const [profileName, setProfileName] = useState<string | null>(null);
    const [profileEmail, setProfileEmail] = useState<string | null>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    // Fetch profile from backend to fill in any missing session data
    const fetchProfile = useCallback(async () => {
        if (!session?.accessToken) return;
        try {
            const info = await getUserInfo(session.accessToken);
            if (info.display_name || info.name) setProfileName(info.display_name || info.name);
            if (info.display_email || info.email) setProfileEmail(info.display_email || info.email);
        } catch { /* ignore */ }
    }, [session?.accessToken]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/';
    };

    if (!session) return null;

    const displayName = profileName || '';
    const displayEmail = profileEmail || '';
    const initials = (displayName?.[0] ?? displayEmail?.[0] ?? '?').toUpperCase();

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs font-medium hover:bg-black/20 dark:hover:bg-white/20 transition-colors overflow-hidden"
                title={displayName || displayEmail || ''}
            >
                {initials}
            </button>

            {open && (
                <div className="absolute top-10 right-0 w-64 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
                        {displayName && <div className="text-sm font-medium truncate">{displayName}</div>}
                        {displayEmail && (
                            <div className="text-xs text-black/50 dark:text-white/50 truncate mt-0.5">{displayEmail}</div>
                        )}
                    </div>
                    <div className="py-1">
                        <Link
                            href="/dashboard/settings"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <svg className="w-4 h-4 text-black/40 dark:text-white/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                        </Link>
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
