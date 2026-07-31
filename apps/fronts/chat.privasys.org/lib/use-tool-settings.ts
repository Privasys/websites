'use client';

// Hooks for the generic MCP tool-settings contract (lib/tool-settings.ts).
// useToolServers discovers which configured servers advertise a settings
// surface; useToolSettings loads and edits one server's per-user document.
// Both talk to the ENCLAVE over the sealed session — the tool itself
// stores and enforces the values, so a change here applies immediately, on
// every device, on both retrieval paths.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    fetchToolServers,
    fetchToolSettings,
    putToolSettings,
    type ToolServerInfo,
    type ToolSettingsDoc
} from './tool-settings';

export function useToolServers(session: SealedSession | null | undefined): {
    servers: ToolServerInfo[];
    loading: boolean;
} {
    const [servers, setServers] = useState<ToolServerInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const loadedRef = useRef(false);
    useEffect(() => {
        if (!session) {
            loadedRef.current = false;
            setServers([]);
            return;
        }
        if (loadedRef.current) return;
        loadedRef.current = true;
        let cancelled = false;
        setLoading(true);
        fetchToolServers(session)
            .then((s) => {
                if (!cancelled) setServers(s);
            })
            .catch(() => {
                // Older enclave without /v1/tools: no settings surfaces.
                if (!cancelled) setServers([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [session]);
    return { servers, loading };
}

export interface ToolSettingsState {
    doc: ToolSettingsDoc | null;
    loading: boolean;
    error: string | null;
    /** Field key currently being written (for per-row busy states). */
    busyKey: string | null;
    /** Write one field (optimistic; reconciled from the server's response). */
    setValue: (key: string, value: unknown) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useToolSettings(
    session: SealedSession | null | undefined,
    server: string | null
): ToolSettingsState {
    const [doc, setDoc] = useState<ToolSettingsDoc | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const loadedForRef = useRef<string | null>(null);

    const refresh = useCallback(async () => {
        if (!session || !server) return;
        setLoading(true);
        setError(null);
        try {
            setDoc(await fetchToolSettings(session, server));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load tool settings.');
        } finally {
            setLoading(false);
        }
    }, [session, server]);

    useEffect(() => {
        if (!session || !server) {
            loadedForRef.current = null;
            setDoc(null);
            return;
        }
        if (loadedForRef.current === server) return;
        loadedForRef.current = server;
        void refresh();
    }, [session, server, refresh]);

    const setValue = useCallback(
        async (key: string, value: unknown) => {
            if (!session || !server) return;
            setBusyKey(key);
            setError(null);
            // Optimistic: flip locally, reconcile from the server's response.
            setDoc((prev) =>
                prev ? { ...prev, values: { ...(prev.values ?? {}), [key]: value } } : prev
            );
            try {
                setDoc(await putToolSettings(session, server, { [key]: value }));
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not update tool settings.');
                await refresh();
            } finally {
                setBusyKey(null);
            }
        },
        [session, server, refresh]
    );

    return { doc, loading, error, busyKey, setValue, refresh };
}
