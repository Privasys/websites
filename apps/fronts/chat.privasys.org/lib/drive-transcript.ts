// Serialisation between the chat's in-memory PersistedMessage objects and
// the Drive conversation transcript, which is stored as JSONL (one
// serialised message object per line, appended turn by turn).
//
// The transcript is the durable source of truth for a conversation once it
// lives in Drive, so the round-trip must be loss-tolerant: a line that
// cannot be parsed is skipped rather than corrupting the whole history.

import type { PersistedMessage } from './conversations';

// Transient UI-only fields that must never be written to the durable
// transcript. Everything else on PersistedMessage is safe to persist.
const TRANSIENT_KEYS = ['streaming', 'reconnecting', 'loadingModel'] as const;

/** Serialise one message into a single JSONL turn line (no newline). */
export function serialiseTurn(message: PersistedMessage): string {
    const copy = { ...(message as unknown as Record<string, unknown>) };
    for (const k of TRANSIENT_KEYS) delete copy[k];
    return JSON.stringify(copy);
}

/** Parse a JSONL transcript into the chat's message list, skipping any
 *  malformed lines. */
export function parseTranscript(jsonl: string): PersistedMessage[] {
    if (!jsonl) return [];
    const out: PersistedMessage[] = [];
    for (const raw of jsonl.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        try {
            const obj = JSON.parse(line) as Partial<PersistedMessage>;
            if (!obj || typeof obj.role !== 'string' || typeof obj.content !== 'string') continue;
            // Backfill an id for older transcripts that predate stable ids.
            const id = typeof obj.id === 'string' && obj.id ? obj.id : `t${out.length}`;
            out.push({ ...(obj as PersistedMessage), id });
        } catch {
            // Skip a corrupt or partially-written line rather than aborting
            // the whole resume.
        }
    }
    return out;
}

/** True when a message represents a completed turn safe to flush to Drive
 *  (i.e. not an in-flight assistant placeholder). */
export function isFinalTurn(message: PersistedMessage & { streaming?: boolean }): boolean {
    if (message.streaming) return false;
    // A user message is always final; an assistant message is final once it
    // has content or a recorded error (an empty, error-less assistant turn
    // is still streaming or was aborted before producing anything).
    if (message.role === 'user') return true;
    return !!(message.content || message.error);
}
