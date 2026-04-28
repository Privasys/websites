'use client';

// Client-side conversation store.
//
// This is a TRANSITIONAL store: long-term, conversations live in
// the per-fleet `private-rag` enclave. Until that backend is up,
// we persist them in localStorage so the user at least gets:
//
//   - a left-rail list of past chats,
//   - resume across browser tabs / refreshes,
//   - the data structures the future REST API will mirror.
//
// PRIVACY NOTE: localStorage is plaintext on the client device. We
// still consider this acceptable because (a) the chat content
// already left a local origin, (b) the user can clear it from the
// sidebar at any time, and (c) the backend swap (Phase 7.3 Task 3)
// is the real durable store. We also key entries by
// `chat:${instanceId}:${sub}` so two users on the same device do
// not see each other's history.

import type { ChatMessage, Reproducibility } from './chat-stream';
import type { SamplingParams } from './sampling';

export type Rating = 'up' | 'down';

/**
 * One tool invocation surfaced inline in an assistant turn. Mirrors the
 * Copilot Chat ChatToolInvocationPart: a small expandable card showing
 * what the agent called, with what arguments, what came back, and how
 * long it took. Persisted alongside the message so a reload reproduces
 * the same view.
 */
export interface ToolInvocation {
    id: string;
    name: string;        // "<server>__<tool>"
    args: unknown;
    status: 'running' | 'ok' | 'error';
    result?: unknown;
    error?: string;
    startedAt: number;
    finishedAt?: number;
    durationMs?: number;
    /** Server-side flag: this tool was tagged as a write/privileged
     *  action and the UI should make that obvious. */
    requiresConfirmation?: boolean;
    /** Tracks the user's response to the consent prompt for write
     *  tools. Unset until they click; once set, the card hides the
     *  Allow/Deny buttons and shows the chosen state. */
    consent?: 'allowed' | 'denied';
}

export interface PersistedMessage extends ChatMessage {
    id: string;
    /** Wall-clock when the assistant turn started (ms since epoch). */
    startedAt?: number;
    /** Wall-clock when the assistant turn finished. */
    finishedAt?: number;
    /** Reproducibility metadata sent by the model proxy. */
    meta?: Reproducibility;
    /** Sampling snapshot used for this turn. */
    sampling?: SamplingParams;
    /** Streaming or send error surfaced to the user. */
    error?: string;
    /** Optional user feedback on assistant turns. */
    rating?: Rating;
    ratingComment?: string;
    /** MCP tool calls the agent made on this turn (live updated, then frozen). */
    toolInvocations?: ToolInvocation[];
}

export interface Conversation {
    id: string;
    instanceId: string;
    /** First-line summary; auto-generated from the first user turn. */
    title: string;
    createdAt: number;
    updatedAt: number;
    messages: PersistedMessage[];
    /** Friendly name of the model that was active when the conversation
     *  started; used by the sidebar to disambiguate similarly titled
     *  chats. May be undefined for very old entries. */
    modelLabel?: string;
}

const STORAGE_VERSION = 1;
const KEY_PREFIX = `privasys:chat:v${STORAGE_VERSION}:`;
const MAX_TITLE_CHARS = 60;
const MAX_CONVERSATIONS = 200; // Soft cap; oldest pruned beyond this.

function storageKey(instanceId: string, sub: string): string {
    return `${KEY_PREFIX}${instanceId}:${sub}`;
}

/** Generate a short opaque conversation id. */
export function newConversationId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Truncate text to a sensible sidebar title. */
export function deriveTitle(firstUserMessage: string): string {
    const cleaned = firstUserMessage.replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'New chat';
    if (cleaned.length <= MAX_TITLE_CHARS) return cleaned;
    return cleaned.slice(0, MAX_TITLE_CHARS - 1).trimEnd() + '\u2026';
}

/** Load all conversations for an (instance, user) pair, newest first. */
export function loadConversations(instanceId: string, sub: string): Conversation[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(storageKey(instanceId, sub));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as { conversations?: Conversation[] };
        const list = Array.isArray(parsed?.conversations) ? parsed.conversations : [];
        return list
            .filter((c): c is Conversation =>
                !!c && typeof c.id === 'string' && Array.isArray(c.messages))
            .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
        return [];
    }
}

/** Persist the full conversation list (replacing existing). */
export function saveConversations(
    instanceId: string,
    sub: string,
    conversations: Conversation[]
): void {
    if (typeof window === 'undefined') return;
    try {
        const trimmed = conversations
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, MAX_CONVERSATIONS);
        window.localStorage.setItem(
            storageKey(instanceId, sub),
            JSON.stringify({ version: STORAGE_VERSION, conversations: trimmed })
        );
    } catch {
        // Quota exceeded or storage disabled - silently drop. The
        // user still sees the in-memory state for this tab.
    }
}

/** Drop all conversations for this (instance, user). */
export function clearConversations(instanceId: string, sub: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(storageKey(instanceId, sub));
    } catch {
        /* ignore */
    }
}
