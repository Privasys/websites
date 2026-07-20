// Drive-backed RAG memory for the chat agent (§8.7 "the agent uses Drive
// as RAG memory").
//
// IDEAL DESIGN: the confidential-ai agent calls the Drive MCP tools itself
// (search_semantic with assistant_scope, get_folder_tree over the Chat
// conversations folder, read_section, read_file) inside its agentic loop,
// with a signed tool-grant, so retrieval happens inside the TEE and the
// browser never sees the retrieved bytes.
//
// That server-side hookup is owned by `platform/confidential-ai` and cannot
// be changed from this (websites) repo. Until it lands, we run the retrieval
// leg CLIENT-SIDE over the same sealed Drive session the rest of the chat
// uses, and inject the retrieved context + inlined Memory into the prompt as
// extra system messages. The retrieved text is decrypted inside the Drive
// enclave and travels to the browser over the sealed channel, then back to
// the inference enclave over its own sealed channel - it never crosses the
// gateway in the clear. Provenance (node_id + section_id) from the hits we
// actually use is accumulated so the conversation can be finalised into a
// cited digest.
//
// STATUS (2026-07-19): the server-side hookup has landed. When the inference
// enclave advertises the built-in `drive__*` tools (DRIVE_MCP_URL configured
// on confidential-ai), the agent calls Drive's RAG tools itself under the
// user's identity (Assistant credential + X-Privasys-On-Behalf-Of), and this
// CLIENT-SIDE module STANDS DOWN — chat-shell only wires buildAugmentation
// when the enclave does NOT advertise Drive tools. So this is now the
// FALLBACK path for deployments whose inference enclave has no Drive grant.

import type { SealedSession } from '@privasys/auth';
import type { ChatMessage } from './chat-stream';
import {
    getMemory,
    searchSemantic,
    type ProvenanceRef,
    type SemanticHit
} from './drive-chat-api';

/** Result of augmenting a single turn with Drive retrieval. */
export interface Augmentation {
    /** Extra system messages to prepend (memory + retrieved context). */
    messages: ChatMessage[];
    /** Provenance for the hits actually surfaced, to accumulate for finalise. */
    provenance: ProvenanceRef[];
}

const EMPTY: Augmentation = { messages: [], provenance: [] };

// Keep the injected context compact so it never crowds out the user's own
// turn. These are deliberately small: retrieval is a hint, not the whole
// context window.
const MAX_HITS = 6;
const MAX_SNIPPET_CHARS = 700;
const MIN_SCORE = 0.15;

function citation(hit: SemanticHit): string {
    const path = hit.section_path?.length ? hit.section_path.join(' > ') : hit.name;
    return path || hit.name || hit.node_id;
}

/** Fetch the caller's inlined Memory as a single system message. Best effort:
 *  returns an empty augmentation on any failure (Drive is a nicety here). */
export async function fetchMemoryContext(
    session: SealedSession,
    tenantId: string
): Promise<Augmentation> {
    try {
        const view = await getMemory(session, tenantId);
        const entries = (view.memories ?? []).filter((m) => m.summary || m.body);
        if (entries.length === 0) return EMPTY;
        const lines = entries.map((m) => {
            const text = (m.body || m.summary || '').trim();
            return `- ${m.name}: ${text}`;
        });
        const body =
            'The following are notes the user has saved to their private ' +
            'knowledge base (Memory). Use them when relevant, but do not ' +
            'repeat them verbatim unless asked:\n' +
            lines.join('\n');
        return {
            messages: [{ role: 'system', content: body }],
            provenance: entries.map((m) => ({ node_id: m.node_id }))
        };
    } catch {
        return EMPTY;
    }
}

/** Retrieve relevant Drive context for a user turn and format it for the
 *  prompt. Best effort: returns an empty augmentation on any failure. */
export async function retrieveContext(
    session: SealedSession,
    tenantId: string,
    query: string
): Promise<Augmentation> {
    const q = query.trim();
    if (!q) return EMPTY;
    let hits: SemanticHit[];
    try {
        hits = await searchSemantic(session, tenantId, q, MAX_HITS);
    } catch {
        return EMPTY;
    }
    const useful = hits.filter((h) => (h.score ?? 0) >= MIN_SCORE && h.snippet).slice(0, MAX_HITS);
    if (useful.length === 0) return EMPTY;

    const blocks = useful.map((h, i) => {
        const snippet = h.snippet.slice(0, MAX_SNIPPET_CHARS).trim();
        return `[[${i + 1}]] ${citation(h)}\n${snippet}`;
    });
    const body =
        'Relevant excerpts retrieved from the user\'s private Drive ' +
        '(end-to-end encrypted, retrieved inside a confidential enclave). ' +
        'Ground your answer in these when they apply and cite the bracketed ' +
        'reference number when you use one. If they are not relevant, ignore ' +
        'them.\n\n' +
        blocks.join('\n\n');

    return {
        messages: [{ role: 'system', content: body }],
        provenance: useful.map((h) => ({
            node_id: h.node_id,
            ...(h.section_id ? { section_id: h.section_id } : {})
        }))
    };
}

/** Merge provenance refs, de-duplicating on node_id + section_id. */
export function mergeProvenance(
    existing: ProvenanceRef[],
    incoming: ProvenanceRef[]
): ProvenanceRef[] {
    const seen = new Set(existing.map((p) => `${p.node_id}::${p.section_id ?? ''}`));
    const out = [...existing];
    for (const p of incoming) {
        const key = `${p.node_id}::${p.section_id ?? ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            out.push(p);
        }
    }
    return out;
}
