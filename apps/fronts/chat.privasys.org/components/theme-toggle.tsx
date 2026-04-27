'use client';

import { useEffect, useState } from 'react';

// Sun/moon theme toggle. Light is the default; dark is opt-in and
// persisted in localStorage. The pre-paint script in `app/layout.tsx`
// reads the same key to avoid a flash of the wrong theme.
const STORAGE_KEY = 'privasys-chat-theme';

type Theme = 'light' | 'dark';

function readStored(): Theme {
    if (typeof window === 'undefined') return 'light';
    try {
        return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
}

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('light');

    // Sync from localStorage on mount (server-render is always 'light').
    useEffect(() => {
        setTheme(readStored());
    }, []);

    const apply = (next: Theme) => {
        setTheme(next);
        try {
            if (next === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem(STORAGE_KEY, 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem(STORAGE_KEY, 'light');
            }
        } catch {
            /* localStorage unavailable; theme still applies for the session */
        }
    };

    return (
        <button
            type="button"
            onClick={() => apply(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-primary-blue)]"
        >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
    );
}

function SunIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}
