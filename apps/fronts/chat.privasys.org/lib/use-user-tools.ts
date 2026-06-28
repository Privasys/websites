'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    addUserTool,
    deleteUserTool,
    fetchUserTools,
    setUserToolEnabled,
    type AddUserToolInput,
    type UserTool
} from './chat-service-api';

// useUserTools loads and mutates the signed-in user's persistent MCP tools
// from chat-service over its dedicated sealed session. The list is the source
// of truth across sessions and devices. When there is no sealed session
// (signed out, or no chat-service voucher yet) the hook stays empty and inert
// — the chat still works with the fleet's admin tools.
export interface UserToolsState {
    tools: UserTool[];
    loading: boolean;
    error?: string;
    add: (input: AddUserToolInput) => Promise<void>;
    remove: (id: string) => Promise<void>;
    setEnabled: (id: string, enabled: boolean) => Promise<void>;
    reload: () => void;
}

export function useUserTools(
    session: SealedSession | null,
    token: string | undefined
): UserToolsState {
    const [tools, setTools] = useState<UserTool[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [nonce, setNonce] = useState(0);
    const ready = !!session && !!token;

    useEffect(() => {
        if (!session || !token) {
            setTools([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(undefined);
        fetchUserTools(session, token)
            .then((t) => {
                if (!cancelled) setTools(t);
            })
            .catch((e) => {
                if (!cancelled) setError(e?.message ?? 'failed to load tools');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [session, token, nonce]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);

    const add = useCallback(
        async (input: AddUserToolInput) => {
            if (!session || !token) throw new Error('sign in to add a tool');
            const created = await addUserTool(session, token, input);
            setTools((prev) => [...prev, created]);
        },
        [session, token]
    );

    const remove = useCallback(
        async (id: string) => {
            if (!session || !token) return;
            await deleteUserTool(session, token, id);
            setTools((prev) => prev.filter((t) => t.id !== id));
        },
        [session, token]
    );

    const setEnabled = useCallback(
        async (id: string, enabled: boolean) => {
            if (!session || !token) return;
            setTools((prev) => prev.map((t) => (t.id === id ? { ...t, enabled } : t)));
            const updated = await setUserToolEnabled(session, token, id, enabled);
            setTools((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        },
        [session, token]
    );

    return { tools, loading: ready && loading, error, add, remove, setEnabled, reload };
}
