'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    addUserTool,
    deleteUserTool,
    fetchUserTools,
    setUserToolEnabled,
    type AddUserToolInput,
    type UserTool
} from './chat-service-api';

// useUserTools loads and mutates the signed-in user's persistent MCP tools
// from chat-service. The list is the source of truth across sessions and
// devices (unlike the admin whitelist, which comes from the instance
// payload and is toggled in localStorage). When there is no token the hook
// stays empty and inert — an anonymous chat only sees the fleet's tools.
export interface UserToolsState {
    tools: UserTool[];
    loading: boolean;
    error?: string;
    add: (input: AddUserToolInput) => Promise<void>;
    remove: (id: string) => Promise<void>;
    setEnabled: (id: string, enabled: boolean) => Promise<void>;
    reload: () => void;
}

export function useUserTools(token: string | undefined): UserToolsState {
    const [tools, setTools] = useState<UserTool[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        if (!token) {
            setTools([]);
            return;
        }
        const ctrl = new AbortController();
        setLoading(true);
        setError(undefined);
        fetchUserTools(token, ctrl.signal)
            .then((t) => setTools(t))
            .catch((e) => {
                if (e?.name !== 'AbortError') setError(e?.message ?? 'failed to load tools');
            })
            .finally(() => setLoading(false));
        return () => ctrl.abort();
    }, [token, nonce]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);

    const add = useCallback(
        async (input: AddUserToolInput) => {
            if (!token) throw new Error('sign in to add a tool');
            const created = await addUserTool(token, input);
            setTools((prev) => [...prev, created]);
        },
        [token]
    );

    const remove = useCallback(
        async (id: string) => {
            if (!token) return;
            await deleteUserTool(token, id);
            setTools((prev) => prev.filter((t) => t.id !== id));
        },
        [token]
    );

    const setEnabled = useCallback(
        async (id: string, enabled: boolean) => {
            if (!token) return;
            // Optimistic; reconcile from the server response.
            setTools((prev) => prev.map((t) => (t.id === id ? { ...t, enabled } : t)));
            const updated = await setUserToolEnabled(token, id, enabled);
            setTools((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        },
        [token]
    );

    return { tools, loading, error, add, remove, setEnabled, reload };
}
