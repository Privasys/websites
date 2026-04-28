'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Conversation,
    PersistedMessage,
    deriveTitle,
    loadConversations,
    newConversationId,
    saveConversations
} from './conversations';

// React-side conversation state machine.
//
// Holds the current conversation list, the selected conversation id,
// and exposes mutations that ChatShell / ChatPanel call. All writes
// are persisted synchronously to localStorage via saveConversations
// so a tab reload picks up where we left off.
//
// `sub` should be the JWT `sub` claim of the active session (i.e.
// the per-app derived user id). Conversations are partitioned per
// (instanceId, sub) so two users on the same device do not see each
// other's history.
export function useConversations(args: {
    instanceId: string;
    sub: string | null;
    modelLabel?: string;
}) {
    const { instanceId, sub, modelLabel } = args;

    // We only persist when we have a real `sub`. While anonymous
    // we still let the user chat in-memory; the moment they sign in
    // the next persist call writes the conversation under their key.
    const persistKey = sub ?? '';

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from storage when we know who the user is.
    useEffect(() => {
        if (!persistKey) {
            setConversations([]);
            setCurrentId(null);
            setHydrated(true);
            return;
        }
        const list = loadConversations(instanceId, persistKey);
        setConversations(list);
        setCurrentId(list[0]?.id ?? null);
        setHydrated(true);
    }, [instanceId, persistKey]);

    const persist = useCallback(
        (next: Conversation[]) => {
            setConversations(next);
            if (persistKey) saveConversations(instanceId, persistKey, next);
        },
        [instanceId, persistKey]
    );

    const current = useMemo(
        () => conversations.find((c) => c.id === currentId) ?? null,
        [conversations, currentId]
    );

    /** Start a brand-new in-memory conversation. It is NOT persisted
     *  until the first message is appended. */
    const startNew = useCallback(() => {
        setCurrentId(null);
    }, []);

    const select = useCallback((id: string) => {
        setCurrentId(id);
    }, []);

    const remove = useCallback(
        (id: string) => {
            const next = conversations.filter((c) => c.id !== id);
            persist(next);
            if (currentId === id) setCurrentId(next[0]?.id ?? null);
        },
        [conversations, currentId, persist]
    );

    const rename = useCallback(
        (id: string, title: string) => {
            const trimmed = title.trim() || 'Untitled chat';
            persist(
                conversations.map((c) =>
                    c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c
                )
            );
        },
        [conversations, persist]
    );

    /** Replace the message list of the current conversation, creating
     *  one on the fly if none is selected. Returns the conversation id
     *  the messages were written to (so the caller can keep state in
     *  sync). */
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
                persist([conv, ...conversations]);
                setCurrentId(id);
                return id;
            }
            persist(
                conversations.map((c) =>
                    c.id === currentId
                        ? {
                            ...c,
                            messages,
                            updatedAt: now,
                            // If the title was still the default and we
                            // now have a user message, derive a real one.
                            title:
                                c.title === 'New chat' || !c.title
                                    ? deriveTitle(
                                        messages.find((m) => m.role === 'user')?.content
                                            ?? c.title
                                    )
                                    : c.title
                        }
                        : c
                )
            );
            return currentId;
        },
        [conversations, currentId, instanceId, modelLabel, persist]
    );

    /** Fork the conversation that contains `messageId` into a new
     *  conversation rooted at and including that message. The new
     *  conversation is selected and persisted; the source is left
     *  untouched. Returns the new conversation id, or null when the
     *  message could not be located.
     *
     *  This mirrors the server-side `POST /api/v1/messages/<id>/branch`
     *  endpoint exposed by `private-rag`. While the chat front-end is
     *  still localStorage-backed we run the same operation on the
     *  client; the moment the front-end starts persisting through
     *  `private-rag` this hook will swap to a network call without
     *  changing its public shape.
     */
    const branchFromMessage = useCallback(
        (messageId: string, title?: string): string | null => {
            const src = conversations.find((c) =>
                c.messages.some((m) => m.id === messageId)
            );
            if (!src) return null;
            const cut = src.messages.findIndex((m) => m.id === messageId);
            if (cut < 0) return null;
            const now = Date.now();
            const id = newConversationId();
            const branched: Conversation = {
                id,
                instanceId: src.instanceId,
                title:
                    (title ?? '').trim() ||
                    `${src.title || 'Untitled chat'} (branch)`,
                createdAt: now,
                updatedAt: now,
                modelLabel: src.modelLabel ?? modelLabel,
                // Copy messages with fresh ids so feedback / tool
                // invocations attached to the originals are not
                // accidentally aliased between the two conversations.
                messages: src.messages.slice(0, cut + 1).map((m) => ({
                    ...m,
                    id: newConversationId(),
                    rating: undefined,
                    ratingComment: undefined
                }))
            };
            persist([branched, ...conversations]);
            setCurrentId(id);
            return id;
        },
        [conversations, modelLabel, persist]
    );

    return {
        hydrated,
        conversations,
        currentId,
        current,
        startNew,
        select,
        remove,
        rename,
        setCurrentMessages,
        branchFromMessage
    };
}
