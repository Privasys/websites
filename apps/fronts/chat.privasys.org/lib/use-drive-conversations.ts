'use client';

// Drive-backed conversation store (§8.7 "conversations live in Drive").
//
// Public shape is identical to `useConversations` so the shell can swap
// between the two based on the `driveEnabled()` flag. The difference is
// durability: this store syncs each conversation into the caller's Drive
// (create-on-first-turn, append-per-completed-turn), lists past
// conversations from Drive, and resumes them by loading the transcript.
//
// It ALSO caches to the same localStorage the local store uses, so:
//   - the sidebar list is instant on load (before Drive answers), and
//   - nothing is lost when a Drive sealed session is not available yet
//     (a user who has never approved Drive has no voucher; we do not fire
//     an intrusive wallet push on load - conversations persist locally and
//     start syncing to Drive as soon as a session exists, e.g. after the
//     user attaches a file and approves the Drive voucher once).
//
// KNOWN LIMITATION (documented, not faked): the Drive transcript is
// append-only via POST /turns. Editing an earlier message or otherwise
// truncating history cannot rewrite what was already appended, so a resumed
// transcript may contain superseded turns. Branching creates a fresh Drive
// conversation and is unaffected. Rename and delete have no Drive endpoints
// yet and are local-only (see TODOs).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    Conversation,
    PersistedMessage,
    deriveTitle,
    loadConversations,
    newConversationId,
    saveConversations
} from './conversations';
import {
    appendTurn,
    createConversation,
    getConversation,
    listConversations,
    todayISODate
} from './drive-chat-api';
import { isFinalTurn, parseTranscript, serialiseTurn } from './drive-transcript';

interface ConvMeta {
    driveId?: string;
    /** Number of messages already appended to the Drive transcript. */
    syncedCount: number;
    /** Transcript has been loaded (true for locally-created conversations,
     *  false for Drive stubs until resumed). */
    loaded: boolean;
    finalized: boolean;
    /** True while a create is in flight, so concurrent syncs don't create
     *  the conversation twice. */
    creating?: boolean;
}

export interface DriveConversations {
    hydrated: boolean;
    conversations: Conversation[];
    currentId: string | null;
    current: Conversation | null;
    /** Local id currently loading its Drive transcript, for a spinner. */
    loadingId: string | null;
    startNew: () => void;
    select: (id: string) => void;
    remove: (id: string) => void;
    rename: (id: string, title: string) => void;
    setCurrentMessages: (messages: PersistedMessage[]) => string | null;
    branchFromMessage: (messageId: string, title?: string) => string | null;
    /** Mark a conversation finalised locally after a successful digest. */
    markFinalized: (id: string, digestId: string) => void;
    /**
     * Ensure a Drive conversation exists for the current selection (minting a
     * fresh local + Drive conversation when none is selected) and return its
     * Drive conversation id. Used by the attach flow, which needs a
     * conversation id before any turn has been sent. `session`/`tenantId` are
     * passed explicitly so the freshly-established handles are used without
     * waiting for React state to settle.
     */
    ensureDriveConversationId: (
        session: SealedSession,
        tenantId: string,
        titleHint?: string
    ) => Promise<{ localId: string; driveId: string } | null>;
}

export function useDriveConversations(args: {
    instanceId: string;
    sub: string | null;
    modelLabel?: string;
    session: SealedSession | null;
    tenantId: string | null;
}): DriveConversations {
    const { instanceId, sub, modelLabel, session, tenantId } = args;
    const persistKey = sub ?? '';

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const metaRef = useRef<Map<string, ConvMeta>>(new Map());
    // Per-conversation promise chain so appends land in order and a create
    // never races with a later append.
    const chainRef = useRef<Map<string, Promise<void>>>(new Map());
    const hydratedForRef = useRef<string | null>(null);

    // Keep a live mirror of the drive handles so the sync closures always
    // read the current session/tenant (they can arrive after the first
    // in-memory turn).
    const sessionRef = useRef(session);
    const tenantRef = useRef(tenantId);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);
    useEffect(() => {
        tenantRef.current = tenantId;
    }, [tenantId]);

    // Durable local cache: persist on every change (keyed per instance+user,
    // like the local-only store). Drive is the network sync target on top.
    const persist = useCallback(
        (next: Conversation[]) => {
            setConversations(next);
            if (persistKey) saveConversations(instanceId, persistKey, next);
        },
        [instanceId, persistKey]
    );

    const enqueue = useCallback((localId: string, fn: () => Promise<void>) => {
        const prev = chainRef.current.get(localId) ?? Promise.resolve();
        const next = prev.then(fn).catch((e) => {
            console.warn('[chat-drive] conversation sync failed:', (e as Error)?.message ?? e);
        });
        chainRef.current.set(localId, next);
        return next;
    }, []);

    // Sync a conversation's completed turns to Drive. Best effort; no-op when
    // no Drive session is available (conversations still persist to the local
    // cache and will sync once a session exists).
    const scheduleSync = useCallback(
        (localId: string, messages: PersistedMessage[], titleHint: string) => {
            const s = sessionRef.current;
            const tid = tenantRef.current;
            if (!s || !tid) return;
            void enqueue(localId, async () => {
                const meta = metaRef.current.get(localId) ?? {
                    syncedCount: 0,
                    loaded: true,
                    finalized: false
                };
                metaRef.current.set(localId, meta);
                if (meta.finalized || meta.creating) return;

                // Create the Drive conversation on the first user turn.
                if (!meta.driveId) {
                    const firstUser = messages.find((m) => m.role === 'user');
                    if (!firstUser) return; // nothing worth persisting yet
                    meta.creating = true;
                    try {
                        const created = await createConversation(
                            s,
                            tid,
                            deriveTitle(firstUser.content || titleHint || 'New chat'),
                            todayISODate()
                        );
                        meta.driveId = created.conversation_id;
                        meta.syncedCount = 0;
                    } finally {
                        meta.creating = false;
                    }
                    setConversations((prev) => {
                        const nxt = prev.map((c) =>
                            c.id === localId
                                ? { ...c, driveConversationId: meta.driveId }
                                : c
                        );
                        if (persistKey) saveConversations(instanceId, persistKey, nxt);
                        return nxt;
                    });
                }

                // Append-only guard: an edit/truncation shrank the history.
                // The transcript cannot be rewritten via these endpoints, so
                // we resync the counter and continue appending new turns; the
                // resumed transcript may retain superseded turns (see file
                // header). TODO(server-side): a transcript-rewrite/branch
                // endpoint would let edits replace history cleanly.
                if (messages.length < meta.syncedCount) {
                    meta.syncedCount = messages.length;
                }

                let i = meta.syncedCount;
                while (i < messages.length && isFinalTurn(messages[i])) {
                    await appendTurn(s, tid, meta.driveId, serialiseTurn(messages[i]));
                    i += 1;
                }
                meta.syncedCount = i;
            });
        },
        [enqueue, instanceId, persistKey]
    );

    // Hydrate: local cache first (instant), then merge the Drive list.
    useEffect(() => {
        if (!persistKey) {
            setConversations([]);
            setCurrentId(null);
            setHydrated(true);
            hydratedForRef.current = null;
            metaRef.current.clear();
            return;
        }
        // Load the durable local cache immediately.
        const cached = loadConversations(instanceId, persistKey);
        metaRef.current.clear();
        for (const c of cached) {
            metaRef.current.set(c.id, {
                driveId: c.driveConversationId,
                // Cached conversations carry their full message list, so they
                // are already fully synced up to their last message.
                syncedCount: c.messages.length,
                loaded: true,
                finalized: !!c.finalized
            });
        }
        setConversations(cached);
        setCurrentId(null); // start on the new-chat hero
        setHydrated(true);

        // Merge Drive's authoritative list once a session is available. Guard
        // so we only do the network merge once per (instance, user, tenant).
        const mergeKey = `${instanceId}:${persistKey}:${tenantId ?? ''}`;
        if (!session || !tenantId || hydratedForRef.current === mergeKey) return;
        hydratedForRef.current = mergeKey;
        let cancelled = false;
        void (async () => {
            try {
                const remote = await listConversations(session, tenantId);
                if (cancelled) return;
                setConversations((prev) => {
                    const known = new Set(
                        prev.map((c) => c.driveConversationId).filter(Boolean) as string[]
                    );
                    const stubs: Conversation[] = [];
                    for (const r of remote) {
                        if (known.has(r.conversation_id)) continue;
                        const localId = newConversationId();
                        metaRef.current.set(localId, {
                            driveId: r.conversation_id,
                            syncedCount: 0,
                            loaded: false,
                            finalized: !!r.finalized
                        });
                        stubs.push({
                            id: localId,
                            instanceId,
                            title: r.name || 'Conversation',
                            createdAt: r.created_at ? Date.parse(r.created_at) || Date.now() : Date.now(),
                            updatedAt: r.created_at ? Date.parse(r.created_at) || Date.now() : Date.now(),
                            messages: [],
                            driveConversationId: r.conversation_id,
                            finalized: !!r.finalized
                        });
                    }
                    if (stubs.length === 0) return prev;
                    const nxt = [...prev, ...stubs].sort((a, b) => b.updatedAt - a.updatedAt);
                    if (persistKey) saveConversations(instanceId, persistKey, nxt);
                    return nxt;
                });
            } catch (e) {
                console.warn('[chat-drive] listing Drive conversations failed:', (e as Error)?.message ?? e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [instanceId, persistKey, session, tenantId]);

    const current = useMemo(
        () => conversations.find((c) => c.id === currentId) ?? null,
        [conversations, currentId]
    );

    const startNew = useCallback(() => setCurrentId(null), []);

    const select = useCallback(
        (id: string) => {
            const meta = metaRef.current.get(id);
            const s = sessionRef.current;
            const tid = tenantRef.current;
            // Already loaded, or nothing to load from Drive: switch straight in.
            if (!meta || meta.loaded || !meta.driveId || !s || !tid) {
                setCurrentId(id);
                return;
            }
            // Load the transcript BEFORE switching so the panel hydrates from a
            // populated message list (it resets its state on a currentId
            // change, so a later async fill would be missed).
            setLoadingId(id);
            void enqueue(id, async () => {
                try {
                    const detail = await getConversation(s, tid, meta.driveId as string);
                    const msgs = parseTranscript(detail.transcript);
                    meta.loaded = true;
                    meta.syncedCount = msgs.length;
                    meta.finalized = !!detail.conversation.finalized;
                    setConversations((prev) =>
                        prev.map((c) =>
                            c.id === id
                                ? { ...c, messages: msgs, finalized: meta.finalized }
                                : c
                        )
                    );
                } finally {
                    setLoadingId((cur) => (cur === id ? null : cur));
                    setCurrentId(id);
                }
            });
        },
        [enqueue]
    );

    const remove = useCallback(
        (id: string) => {
            // TODO(server-side): no delete-conversation endpoint yet; this
            // hides the conversation locally but it reappears on a full reload
            // that re-lists Drive. Add DELETE /conversations/{id} to make it
            // durable.
            const next = conversations.filter((c) => c.id !== id);
            metaRef.current.delete(id);
            persist(next);
            if (currentId === id) setCurrentId(null);
        },
        [conversations, currentId, persist]
    );

    const rename = useCallback(
        (id: string, title: string) => {
            // TODO(server-side): no rename endpoint; the Drive `name` is set at
            // creation. This updates the local title only.
            const trimmed = title.trim() || 'Untitled chat';
            persist(
                conversations.map((c) =>
                    c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c
                )
            );
        },
        [conversations, persist]
    );

    const setCurrentMessages = useCallback(
        (messages: PersistedMessage[]): string | null => {
            if (messages.length === 0 && !currentId) return null;
            const now = Date.now();
            if (!currentId) {
                const firstUserMsg = messages.find((m) => m.role === 'user');
                const id = newConversationId();
                const conv: Conversation = {
                    id,
                    instanceId,
                    title: deriveTitle(firstUserMsg?.content ?? 'New chat'),
                    createdAt: now,
                    updatedAt: now,
                    messages,
                    modelLabel
                };
                metaRef.current.set(id, { syncedCount: 0, loaded: true, finalized: false });
                persist([conv, ...conversations]);
                setCurrentId(id);
                scheduleSync(id, messages, conv.title);
                return id;
            }
            const title =
                (() => {
                    const c = conversations.find((x) => x.id === currentId);
                    if (!c) return undefined;
                    return c.title === 'New chat' || !c.title
                        ? deriveTitle(messages.find((m) => m.role === 'user')?.content ?? c.title)
                        : c.title;
                })() ?? 'New chat';
            persist(
                conversations.map((c) =>
                    c.id === currentId ? { ...c, messages, updatedAt: now, title } : c
                )
            );
            scheduleSync(currentId, messages, title);
            return currentId;
        },
        [conversations, currentId, instanceId, modelLabel, persist, scheduleSync]
    );

    const branchFromMessage = useCallback(
        (messageId: string, title?: string): string | null => {
            const src = conversations.find((c) => c.messages.some((m) => m.id === messageId));
            if (!src) return null;
            const cut = src.messages.findIndex((m) => m.id === messageId);
            if (cut < 0) return null;
            const now = Date.now();
            const id = newConversationId();
            const messages = src.messages.slice(0, cut + 1).map((m) => ({
                ...m,
                id: newConversationId(),
                rating: undefined,
                ratingComment: undefined
            }));
            const branched: Conversation = {
                id,
                instanceId: src.instanceId,
                title: (title ?? '').trim() || `${src.title || 'Untitled chat'} (branch)`,
                createdAt: now,
                updatedAt: now,
                modelLabel: src.modelLabel ?? modelLabel,
                messages
            };
            metaRef.current.set(id, { syncedCount: 0, loaded: true, finalized: false });
            persist([branched, ...conversations]);
            setCurrentId(id);
            // Branch is a fresh Drive conversation (append-only friendly).
            scheduleSync(id, messages, branched.title);
            return id;
        },
        [conversations, modelLabel, persist, scheduleSync]
    );

    const markFinalized = useCallback(
        (id: string, digestId: string) => {
            const meta = metaRef.current.get(id);
            if (meta) meta.finalized = true;
            persist(
                conversations.map((c) =>
                    c.id === id ? { ...c, finalized: true, digestId } : c
                )
            );
        },
        [conversations, persist]
    );

    const ensureDriveConversationId = useCallback(
        async (
            s: SealedSession,
            tid: string,
            titleHint?: string
        ): Promise<{ localId: string; driveId: string } | null> => {
            let localId = currentId;
            if (!localId) {
                localId = newConversationId();
                metaRef.current.set(localId, { syncedCount: 0, loaded: true, finalized: false });
                const conv: Conversation = {
                    id: localId,
                    instanceId,
                    title: (titleHint ?? '').trim() || 'New chat',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    messages: [],
                    modelLabel
                };
                persist([conv, ...conversations]);
                setCurrentId(localId);
            }
            const targetId = localId;
            let driveId: string | null = null;
            await enqueue(targetId, async () => {
                const meta = metaRef.current.get(targetId) ?? {
                    syncedCount: 0,
                    loaded: true,
                    finalized: false
                };
                metaRef.current.set(targetId, meta);
                if (meta.driveId) {
                    driveId = meta.driveId;
                    return;
                }
                const created = await createConversation(
                    s,
                    tid,
                    deriveTitle(titleHint || 'New chat'),
                    todayISODate()
                );
                meta.driveId = created.conversation_id;
                driveId = created.conversation_id;
                setConversations((prev) => {
                    const nxt = prev.map((c) =>
                        c.id === targetId ? { ...c, driveConversationId: created.conversation_id } : c
                    );
                    if (persistKey) saveConversations(instanceId, persistKey, nxt);
                    return nxt;
                });
            });
            return driveId ? { localId: targetId, driveId } : null;
        },
        [currentId, conversations, instanceId, modelLabel, persist, persistKey, enqueue]
    );

    return {
        hydrated,
        conversations,
        currentId,
        current,
        loadingId,
        startNew,
        select,
        remove,
        rename,
        setCurrentMessages,
        branchFromMessage,
        markFinalized,
        ensureDriveConversationId
    };
}
