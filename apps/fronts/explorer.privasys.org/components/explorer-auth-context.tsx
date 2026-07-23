// Shared auth surface for the top navigation: the connected app's auth state
// is registered here by ExplorerApp so the Navbar's trailing slot (the usual
// top-right account control) can show Sign in / the Authenticated badge, and
// toggle the auth panel rendered by the connected view.

'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export interface NavAuthState {
    connected: boolean;
    authed: boolean;
    signingIn: boolean;
    signOut: () => void;
}

interface ExplorerAuthCtx {
    nav: NavAuthState | null;
    setNav: (_s: NavAuthState | null) => void;
    authOpen: boolean;
    setAuthOpen: (_o: boolean | ((_prev: boolean) => boolean)) => void;
}

const ExplorerAuthContext = createContext<ExplorerAuthCtx | null>(null);

export function ExplorerAuthProvider({ children }: { children: ReactNode }) {
    const [nav, setNav] = useState<NavAuthState | null>(null);
    const [authOpen, setAuthOpen] = useState(false);
    return (
        <ExplorerAuthContext.Provider value={{ nav, setNav, authOpen, setAuthOpen }}>
            {children}
        </ExplorerAuthContext.Provider>
    );
}

export function useExplorerAuth(): ExplorerAuthCtx {
    const ctx = useContext(ExplorerAuthContext);
    if (!ctx) throw new Error('useExplorerAuth must be used inside ExplorerAuthProvider');
    return ctx;
}

// The top-nav auth control (rendered in the Navbar's trailing slot). Hidden
// until an app is connected — the auth session is per-app (per RP), so there
// is nothing to sign into before connecting.
export function NavAuth() {
    const { nav, setAuthOpen } = useExplorerAuth();
    if (!nav?.connected) return null;

    if (nav.authed) {
        return (
            <span className='flex items-center gap-2'>
                <button
                    type='button'
                    onClick={() => setAuthOpen((o) => !o)}
                    title='Show session details'
                    className='inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                >
                    ✓ Authenticated
                </button>
                <button
                    type='button'
                    onClick={() => { nav.signOut(); setAuthOpen(false); }}
                    className='rounded-lg border border-black/10 dark:border-white/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5'
                >
                    Sign out
                </button>
            </span>
        );
    }

    return (
        <button
            type='button'
            onClick={() => setAuthOpen((o) => !o)}
            className='rounded-lg bg-black text-white dark:bg-white dark:text-black px-3.5 py-1.5 text-xs font-semibold hover:opacity-90'
        >
            {nav.signingIn ? 'Signing in…' : 'Sign in'}
        </button>
    );
}
