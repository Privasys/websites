'use client';

// Pending-feedback queue.
//
// User ratings (good / bad / comment) on assistant messages
// belong in the per-fleet `private-rag` enclave (Phase 7.3 Task 3),
// where the developer portal can aggregate them per fleet.
//
// Until the REST API exists, we queue ratings in localStorage so:
//
//   - the UI feels responsive (the badge flips immediately),
//   - nothing is lost across refreshes,
//   - the future flush job has a clear shape to send.
//
// Each entry is keyed by message id; rating a message a second time
// replaces the previous entry rather than appending.

import type { Rating } from './conversations';

export interface FeedbackEntry {
    /** Persisted message id (stable across refreshes). */
    messageId: string;
    /** Conversation the message belongs to. */
    conversationId: string;
    /** Instance the conversation lives in. */
    instanceId: string;
    rating: Rating;
    comment?: string;
    /** Wall-clock when the user clicked the rating. */
    createdAt: number;
}

const STORAGE_VERSION = 1;
const STORAGE_KEY = `privasys:feedback:v${STORAGE_VERSION}`;

function load(): FeedbackEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as { entries?: FeedbackEntry[] };
        return Array.isArray(parsed?.entries) ? parsed.entries : [];
    } catch {
        return [];
    }
}

function save(entries: FeedbackEntry[]): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: STORAGE_VERSION, entries })
        );
    } catch {
        /* quota or disabled - drop silently */
    }
}

/** Upsert a rating for a single message. */
export function recordFeedback(entry: FeedbackEntry): void {
    const entries = load().filter((e) => e.messageId !== entry.messageId);
    entries.push(entry);
    save(entries);
}

/** Remove a rating (used when the user un-rates a message). */
export function clearFeedback(messageId: string): void {
    save(load().filter((e) => e.messageId !== messageId));
}

/** Read the entire pending queue. Used by the (future) flush job
 *  that POSTs entries to private-rag. */
export function listPendingFeedback(): FeedbackEntry[] {
    return load();
}
