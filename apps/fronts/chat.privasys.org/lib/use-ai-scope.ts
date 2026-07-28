'use client';

// Assistant knowledge scope (§8.7 AI scope). Loads what the assistant is
// allowed to draw on — the always-scoped Memory/, per-directory grants, and
// the whole-Drive flag — and exposes toggles backed by the Drive
// enable_ai/disable_ai grants. Product defaults (server-enforced): Memory ON
// (always-scoped, not removable here), past conversations OFF, everything
// else opt-in.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    disableAIScope,
    enableAIScope,
    getFolderTree,
    listAIScope,
    setEntireDriveAIScope,
    type AIScopeView,
    type FolderTreeNode
} from './drive-chat-api';

/** A top-level directory the user can cherry-pick for AI scope. */
export interface ScopeFolder {
    id: string;
    name: string;
    scoped: boolean;
}

/**
 * What the assistant may recall beyond the always-on `Memory/` folder. This is
 * a READ-OUT of the grant, not a second source of truth: the grant is the only
 * state, and both retrieval paths (enclave and client fallback) read it.
 *
 *   off          — nothing but Memory/
 *   past-chats   — previous conversations
 *   folders      — one or more cherry-picked Drive folders
 *   entire-drive — the whole Drive (supersedes the rest)
 */
export type MemoryMode = 'off' | 'past-chats' | 'folders' | 'entire-drive';

export interface AIScopeState {
    loading: boolean;
    busyNodeId: string | null;
    error: string | null;
    allScoped: boolean;
    /** Node id of Memory/, when present (always in scope). */
    memoryId: string | null;
    /** Node id of Chat conversations/, when it exists yet. */
    conversationsId: string | null;
    conversationsScoped: boolean;
    /** Top-level folders excluding Memory/ + Chat conversations/. */
    folders: ScopeFolder[];
    refresh: () => Promise<void>;
    setFolder: (_nodeId: string, _on: boolean) => Promise<void>;
    setConversations: (_on: boolean) => Promise<void>;
    setEntireDrive: (_on: boolean) => Promise<void>;
    /** Derived read-out of the grant for the composer's Memory control. */
    memoryMode: MemoryMode;
    /** One-line state for the Memory pill, e.g. "past chats", "3 folders". */
    memorySummary: string;
    /** Set the grant so it matches `mode`. 'folders' is managed in the Memory
     *  view (there is no single folder to pick here), so it is a no-op. */
    setMemoryMode: (_mode: MemoryMode) => Promise<void>;
}

const MEMORY_NAME = 'Memory';
const CONVERSATIONS_NAME = 'Chat conversations';

export function useAIScope(session: SealedSession | null, tenantId: string | null): AIScopeState {
    const [loading, setLoading] = useState(false);
    const [busyNodeId, setBusyNodeId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scope, setScope] = useState<AIScopeView | null>(null);
    const [tree, setTree] = useState<FolderTreeNode[]>([]);
    const loadedRef = useRef(false);

    const refresh = useCallback(async () => {
        if (!session || !tenantId) return;
        setLoading(true);
        setError(null);
        try {
            const [sc, tr] = await Promise.all([
                listAIScope(session, tenantId),
                getFolderTree(session, tenantId)
            ]);
            setScope(sc);
            setTree(tr);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load knowledge settings.');
        } finally {
            setLoading(false);
        }
    }, [session, tenantId]);

    useEffect(() => {
        if (!session || !tenantId || loadedRef.current) return;
        loadedRef.current = true;
        void refresh();
    }, [session, tenantId, refresh]);

    // Reset when the session/tenant goes away (sign-out / disconnect).
    useEffect(() => {
        if (!session || !tenantId) {
            loadedRef.current = false;
            setScope(null);
            setTree([]);
        }
    }, [session, tenantId]);

    const topFolders = tree.filter((n) => n.kind === 'folder');
    const memoryNode = topFolders.find((n) => n.name === MEMORY_NAME);
    const conversationsNode = topFolders.find((n) => n.name === CONVERSATIONS_NAME);
    const scopedIds = new Set((scope?.scoped ?? []).map((s) => s.node_id));
    const allScoped = scope?.all_scoped ?? false;

    const folders: ScopeFolder[] = topFolders
        .filter((n) => n.name !== MEMORY_NAME && n.name !== CONVERSATIONS_NAME)
        .map((n) => ({ id: n.id, name: n.name, scoped: scopedIds.has(n.id) }));

    const mutate = useCallback(
        async (nodeId: string, fn: () => Promise<unknown>) => {
            setBusyNodeId(nodeId);
            setError(null);
            try {
                await fn();
                await refresh();
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not update knowledge settings.');
            } finally {
                setBusyNodeId(null);
            }
        },
        [refresh]
    );

    const setFolder = useCallback(
        (nodeId: string, on: boolean) =>
            mutate(nodeId, () =>
                on
                    ? enableAIScope(session as SealedSession, tenantId as string, nodeId)
                    : disableAIScope(session as SealedSession, tenantId as string, nodeId)
            ),
        [mutate, session, tenantId]
    );

    const setConversations = useCallback(
        (on: boolean) => {
            if (!conversationsNode) return Promise.resolve();
            return setFolder(conversationsNode.id, on);
        },
        [conversationsNode, setFolder]
    );

    const setEntireDrive = useCallback(
        (on: boolean) =>
            mutate('__all__', () =>
                setEntireDriveAIScope(session as SealedSession, tenantId as string, on)
            ),
        [mutate, session, tenantId]
    );

    // Broadest wins: whole-Drive supersedes folders, which supersede past chats.
    const scopedFolders = folders.filter((f) => f.scoped);
    const conversationsScoped = conversationsNode ? scopedIds.has(conversationsNode.id) : false;
    const memoryMode: MemoryMode = allScoped
        ? 'entire-drive'
        : scopedFolders.length > 0
            ? 'folders'
            : conversationsScoped
                ? 'past-chats'
                : 'off';
    const memorySummary =
        memoryMode === 'entire-drive'
            ? 'entire Drive'
            : memoryMode === 'folders'
                ? scopedFolders.length === 1
                    ? scopedFolders[0].name
                    : `${scopedFolders.length} folders`
                : memoryMode === 'past-chats'
                    ? 'past chats'
                    : 'off';

    // Make the grant match the requested mode. Turning memory OFF withdraws
    // everything the assistant could recall beyond Memory/ — that is what the
    // user is asking for, so it clears folders too rather than leaving silent
    // grants behind.
    const setMemoryMode = useCallback(
        async (mode: MemoryMode) => {
            switch (mode) {
                case 'entire-drive':
                    await setEntireDrive(true);
                    return;
                case 'past-chats':
                    if (allScoped) await setEntireDrive(false);
                    await setConversations(true);
                    return;
                case 'off':
                    if (allScoped) await setEntireDrive(false);
                    if (conversationsScoped) await setConversations(false);
                    for (const f of scopedFolders) await setFolder(f.id, false);
                    return;
                default:
                    // 'folders' is picked per-folder in the Memory view.
                    return;
            }
        },
        [allScoped, conversationsScoped, scopedFolders, setEntireDrive, setConversations, setFolder]
    );

    return {
        memoryMode,
        memorySummary,
        setMemoryMode,
        loading,
        busyNodeId,
        error,
        allScoped,
        memoryId: memoryNode?.id ?? null,
        conversationsId: conversationsNode?.id ?? null,
        conversationsScoped: conversationsNode ? scopedIds.has(conversationsNode.id) : false,
        folders,
        refresh,
        setFolder,
        setConversations,
        setEntireDrive
    };
}
