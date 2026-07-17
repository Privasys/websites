// Client for the Privasys Drive enclave, used by Privasys Chat.
//
// This is the §8.7 integration: conversations live in Drive, files attach
// from/to Drive, and the agent uses Drive as its RAG memory. The browser
// reaches Drive over a DEDICATED SEALED SESSION (PrivasysSession from
// @privasys/auth) - never plain fetch. Bytes and metadata are sealed
// browser->enclave (CBOR-AES-GCM); the gateway only ever sees ciphertext,
// and Drive authenticates the sealed session itself (the enclave relay
// asserts the wallet-vouched sub toward the app). Mirrors the request
// conventions in drive.privasys.org/lib/drive-api.ts and this app's own
// lib/chat-service-api.ts.

import type { SealedResponse, SealedSession } from '@privasys/auth';

/** Bare host of the Drive enclave backend (no scheme), or '' when unset. */
export function driveHost(): string {
    const raw = process.env.NEXT_PUBLIC_DRIVE_APP_HOST ?? '';
    if (!raw) return '';
    try {
        return raw.includes('://') ? new URL(raw).host : raw;
    } catch {
        return raw;
    }
}

/** True when this deployment is wired to a Drive enclave. Gates every
 *  Drive-backed behaviour in the chat UI, mirroring how drive.privasys.org
 *  gates `driveEnabled` on the presence of its app host. */
export function driveEnabled(): boolean {
    return driveHost() !== '';
}

const decoder = new TextDecoder();

// ---- Shared identity/workspace types (subset mirrored from drive-api) --

export type TenantKind = 'user' | 'enterprise';
export type MemberRole = 'owner' | 'admin' | 'contributor' | 'reader' | string;

export interface Tenant {
    id: string;
    kind: TenantKind;
    name: string;
    role?: MemberRole;
}

export interface Me {
    sub: string;
    email?: string;
    tenants: Tenant[];
}

/** A Drive node reference returned by the attach endpoint. */
export interface DriveNodeRef {
    id: string;
    tenant_id?: string;
    parent_id?: string;
    kind?: 'folder' | 'file';
    name: string;
    mime_hint?: string;
    size_bytes?: number;
    index_status?: string;
}

// ---- Conversation types (the new §8.7 Drive endpoints) -----------------

/** A conversation as returned in the list view. */
export interface DriveConversationSummary {
    conversation_id: string;
    name: string;
    transcript_id?: string;
    digest_id?: string;
    finalized: boolean;
    created_at?: string;
}

/** The record returned when creating a conversation. */
export interface CreatedConversation {
    conversation_id: string;
    transcript_id: string;
    files_folder_id: string;
    name: string;
    finalized: boolean;
}

/** A conversation fetched with its transcript (JSONL text). */
export interface DriveConversationDetail {
    conversation: DriveConversationSummary & Record<string, unknown>;
    /** Newline-delimited JSON, one serialised message object per line. */
    transcript: string;
}

/** Intent for a file attached to a conversation (§8.7). */
export type AttachIntent = 'session' | 'knowledge';

export interface AttachResult {
    node: DriveNodeRef;
    intent: AttachIntent;
}

/** One citation used when finalising a conversation into a digest. */
export interface ProvenanceRef {
    node_id: string;
    section_id?: string;
}

export interface FinalizeResult {
    digest_id: string;
    regenerated: boolean;
    cited: number;
}

/** Memory exposed to the assistant at conversation start. */
export interface MemoryEntry {
    node_id: string;
    name: string;
    summary: string;
    body?: string;
}

export interface MemoryView {
    mode: 'full' | 'tree';
    memories: MemoryEntry[];
}

/** One hit from the agent's semantic search tool. */
export interface SemanticHit {
    node_id: string;
    name: string;
    section_id?: string;
    section_path?: string[];
    snippet: string;
    score: number;
    char_start?: number;
    char_end?: number;
}

// ---- Error handling + timed sealed requests ---------------------------

/** A Drive API error carrying the enclave's HTTP status + message. */
export class DriveError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.name = 'DriveError';
    }
}

function decodeError(res: SealedResponse): DriveError {
    // A reply without a numeric status is not an HTTP error but a sealed
    // channel hiccup (typically the enclave session still settling right
    // after a fresh ceremony) - name it, and mark it retryable.
    if (typeof res.status !== 'number') {
        return new DriveError(0, 'The sealed channel is not ready yet. Retrying usually fixes this.');
    }
    const text = res.body && res.body.byteLength ? decoder.decode(res.body) : '';
    let msg = `HTTP ${res.status}`;
    try {
        const j = text ? (JSON.parse(text) as { error?: string; code?: string }) : null;
        if (j?.error) msg = j.error;
    } catch {
        if (text) msg = text;
    }
    return new DriveError(res.status, msg);
}

function ok(res: SealedResponse): boolean {
    return typeof res.status === 'number' && res.status >= 200 && res.status < 300;
}

// A sealed request to an unreachable enclave can otherwise hang forever
// (the iframe RPC has no deadline of its own), leaving the UI silently
// stuck. Cap every call so the failure surfaces and can be retried.
const REQUEST_TIMEOUT_MS = 30_000;
const TRANSFER_TIMEOUT_MS = 180_000; // uploads/downloads of larger files

function timed(
    session: SealedSession,
    method: string,
    path: string,
    body: unknown,
    ms: number
): Promise<SealedResponse> {
    return new Promise<SealedResponse>((resolve, reject) => {
        const t = setTimeout(
            () =>
                reject(
                    new DriveError(
                        0,
                        'The Drive enclave is not responding. It may be restarting or unreachable.'
                    )
                ),
            ms
        );
        session.request(method, path, body).then(
            (r) => {
                clearTimeout(t);
                resolve(r);
            },
            (e: unknown) => {
                clearTimeout(t);
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        );
    });
}

/** JSON request over the sealed session; throws DriveError on non-2xx. */
async function json<T>(
    session: SealedSession,
    method: string,
    path: string,
    body?: unknown,
    ms: number = REQUEST_TIMEOUT_MS
): Promise<T> {
    const res = await timed(session, method, path, body, ms);
    if (!ok(res)) throw decodeError(res);
    const text = res.body && res.body.byteLength ? decoder.decode(res.body) : '';
    return (text ? JSON.parse(text) : {}) as T;
}

// ---- Identity + workspace ---------------------------------------------

export function getMe(session: SealedSession): Promise<Me> {
    return json<Me>(session, 'GET', '/v1/me');
}

/** Get-or-create the caller's personal drive (User tenant). Idempotent. */
export function ensurePersonalTenant(session: SealedSession): Promise<Tenant> {
    return json<Tenant>(session, 'POST', '/v1/me/tenant');
}

// ---- Conversations ----------------------------------------------------

/** Create a conversation. `date` is a plain YYYY-MM-DD (today by default). */
export function createConversation(
    session: SealedSession,
    tenantID: string,
    title: string,
    date: string
): Promise<CreatedConversation> {
    return json<CreatedConversation>(session, 'POST', `/v1/tenants/${tenantID}/conversations`, {
        title,
        date
    });
}

/**
 * Append one turn (a single serialised JSON message object) to the
 * conversation transcript. `turn` is stringified by the caller so the
 * exact on-disk JSONL shape is under our control.
 */
export async function appendTurn(
    session: SealedSession,
    tenantID: string,
    conversationID: string,
    turn: string
): Promise<void> {
    const res = await timed(
        session,
        'POST',
        `/v1/tenants/${tenantID}/conversations/${conversationID}/turns`,
        { turn },
        REQUEST_TIMEOUT_MS
    );
    if (!ok(res)) throw decodeError(res);
}

export async function listConversations(
    session: SealedSession,
    tenantID: string
): Promise<DriveConversationSummary[]> {
    const data = await json<{ conversations: DriveConversationSummary[] }>(
        session,
        'GET',
        `/v1/tenants/${tenantID}/conversations`
    );
    return data.conversations ?? [];
}

export function getConversation(
    session: SealedSession,
    tenantID: string,
    conversationID: string
): Promise<DriveConversationDetail> {
    return json<DriveConversationDetail>(
        session,
        'GET',
        `/v1/tenants/${tenantID}/conversations/${conversationID}`
    );
}

/** Attach a freshly uploaded file to a conversation with an intent. */
export function attachToConversation(
    session: SealedSession,
    tenantID: string,
    conversationID: string,
    input: {
        name: string;
        mime: string;
        contentBase64: string;
        intent: AttachIntent;
        expiresUnix?: number;
    }
): Promise<AttachResult> {
    return json<AttachResult>(
        session,
        'POST',
        `/v1/tenants/${tenantID}/conversations/${conversationID}/attach`,
        {
            name: input.name,
            mime: input.mime,
            content_base64: input.contentBase64,
            intent: input.intent,
            ...(input.expiresUnix ? { expires_unix: input.expiresUnix } : {})
        },
        TRANSFER_TIMEOUT_MS
    );
}

/** Finalise a conversation into a digest, citing the accumulated provenance. */
export function finalizeConversation(
    session: SealedSession,
    tenantID: string,
    conversationID: string,
    provenance: ProvenanceRef[]
): Promise<FinalizeResult> {
    return json<FinalizeResult>(
        session,
        'POST',
        `/v1/tenants/${tenantID}/conversations/${conversationID}/finalize`,
        { provenance }
    );
}

// ---- Memory + agent RAG tools -----------------------------------------

export function getMemory(session: SealedSession, tenantID: string): Promise<MemoryView> {
    return json<MemoryView>(session, 'GET', `/v1/tenants/${tenantID}/memory`);
}

/**
 * Assistant-scoped semantic search over the tenant's indexed Drive content
 * (the agent's RAG retrieval leg). `assistant_scope` limits the search to
 * material the assistant is allowed to draw on.
 */
export async function searchSemantic(
    session: SealedSession,
    tenantID: string,
    query: string,
    topK = 6
): Promise<SemanticHit[]> {
    const data = await json<{ hits: SemanticHit[] }>(session, 'POST', '/tools/search_semantic', {
        tenant_id: tenantID,
        query,
        top_k: topK,
        assistant_scope: true
    });
    return data.hits ?? [];
}

/** One node in the Drive folder tree returned to the agent. */
export interface FolderTreeNode {
    id: string;
    name: string;
    kind: 'folder' | 'file';
    children?: FolderTreeNode[];
}

/**
 * Fetch the tenant's folder tree (the agent uses this to navigate the Chat
 * `conversations/` folder and the knowledge base). `root` scopes the tree to
 * a subtree when given.
 */
export async function getFolderTree(
    session: SealedSession,
    tenantID: string,
    root?: string
): Promise<FolderTreeNode[]> {
    const data = await json<{ tree?: FolderTreeNode[]; nodes?: FolderTreeNode[] }>(
        session,
        'POST',
        '/tools/get_folder_tree',
        { tenant_id: tenantID, ...(root ? { root } : {}) }
    );
    return data.tree ?? data.nodes ?? [];
}

/** Read a single section of a file by its stable section anchor. */
export async function readSection(
    session: SealedSession,
    tenantID: string,
    fileID: string,
    sectionID: string
): Promise<string> {
    const data = await json<{ text?: string; content?: string }>(session, 'POST', '/tools/read_section', {
        tenant_id: tenantID,
        file_id: fileID,
        section_id: sectionID
    });
    return data.text ?? data.content ?? '';
}

/** Read a whole file's plaintext (decrypted inside the enclave). */
export async function readFile(
    session: SealedSession,
    tenantID: string,
    fileID: string
): Promise<string> {
    const data = await json<{ text?: string; content?: string }>(
        session,
        'POST',
        '/tools/read_file',
        { tenant_id: tenantID, file_id: fileID },
        TRANSFER_TIMEOUT_MS
    );
    return data.text ?? data.content ?? '';
}

// ---- helpers ----------------------------------------------------------

/** Today's date as YYYY-MM-DD in the caller's locale-neutral calendar. */
export function todayISODate(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Base64-encode raw bytes (browser-safe, chunked to avoid arg limits). */
export function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}
