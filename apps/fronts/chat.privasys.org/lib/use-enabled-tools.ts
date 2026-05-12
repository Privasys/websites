'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AvailableTool } from './types';

const KEY_PREFIX = 'privasys:chat:enabled-tools:';

// useEnabledTools persists, per-instance, the user's per-tool on/off
// choice. The first time an instance is loaded, every tool with
// `enabled_default === true` starts in the "on" set; subsequent toggles
// are kept in localStorage. Tools that disappear from `available` (e.g.
// the manager removed them) are dropped from storage on the next read.
export function useEnabledTools(instanceId: string, available: AvailableTool[] | undefined) {
    const key = KEY_PREFIX + instanceId;
    const [enabled, setEnabled] = useState<Set<string>>(() => initial(key, available));

    // Re-sync when the instance or its tool set changes.
    useEffect(() => {
        setEnabled(initial(key, available));
    }, [key, fingerprint(available)]);

    const toggle = useCallback((name: string, on: boolean) => {
        setEnabled(prev => {
            const next = new Set(prev);
            if (on) next.add(name); else next.delete(name);
            try {
                window.localStorage.setItem(key, JSON.stringify([...next]));
            } catch {
                /* private mode / storage disabled */
            }
            return next;
        });
    }, [key]);

    return { enabled, toggle };
}

function fingerprint(tools: AvailableTool[] | undefined): string {
    if (!tools || tools.length === 0) return '';
    return tools.map(t => `${t.name}:${t.enabled_default ? 1 : 0}`).join(',');
}

function initial(key: string, available: AvailableTool[] | undefined): Set<string> {
    const names = new Set((available ?? []).map(t => t.name));
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
            const arr = JSON.parse(raw) as string[];
            return new Set(arr.filter(n => names.has(n)));
        }
    } catch {
        /* fall through to defaults */
    }
    return new Set((available ?? []).filter(t => t.enabled_default).map(t => t.name));
}
