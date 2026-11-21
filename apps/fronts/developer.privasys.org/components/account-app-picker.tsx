'use client';

// Picks one of the account's monitored apps for the Operate pages. The
// platform monitor watches container apps. An app named in the address
// (?app=<id>, from an app's page) is chosen first.

import { useEffect, useState } from 'react';
import { listApps } from '~/lib/api';
import type { App } from '~/lib/types';

export function useAccountApps(token: string): { apps: App[]; loading: boolean } {
    const [apps, setApps] = useState<App[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!token) return;
        listApps(token)
            .then((list) => setApps(list
                .filter((a) => a.app_type === 'container')
                .sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name))))
            .catch(() => setApps([]))
            .finally(() => setLoading(false));
    }, [token]);
    return { apps, loading };
}

/** The app named in the address, if any. */
export function appFromAddress(): string {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('app') ?? '';
}

export function AccountAppPicker({ apps, value, onChange, label = 'App' }: {
    apps: App[];
    value: string;
    onChange: (id: string) => void;
    label?: string;
}) {
    return (
        <label className="block max-w-sm">
            <span className="text-xs font-medium text-black/50 dark:text-white/50">{label}</span>
            <select
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    const url = new URL(window.location.href);
                    url.searchParams.set('app', e.target.value);
                    window.history.replaceState(null, '', url.toString());
                }}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
            >
                {apps.map((a) => (
                    <option key={a.id} value={a.id}>{a.display_name || a.name}</option>
                ))}
            </select>
        </label>
    );
}
