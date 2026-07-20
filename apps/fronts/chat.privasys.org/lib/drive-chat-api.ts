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

import type { SealedSession } from '@privasys/auth';
import {
    DriveError,
    bytesToBase64,
    driveHostFromEnv,
    json,
    ok,
    decodeError,
    timed,
    uploadFileStreaming,
    REQUEST_TIMEOUT_MS,
    TRANSFER_TIMEOUT_MS
} from '@privasys/drive-client';

// The sealed-transport core (DriveError, timed, json, ok, timeouts) and the
// upload helpers live in the shared @privasys/drive-client lib so they never
// drift from drive.privasys.org. This module keeps only the CHAT-specific
// Drive surface: conversations, attachment intents, memory + RAG tools.
export { DriveError, bytesToBase64 };

/** Bare host of the Drive enclave backend (no scheme), or '' when unset. */
export function driveHost(): string {
    return driveHostFromEnv(process.env.NEXT_PUBLIC_DRIVE_APP_HOST);
}

/** True when this deployment is wired to a Drive enclave. Gates every
 *  Drive-backed behaviour in the chat UI, mirroring how drive.privasys.org
 *  gates `driveEnabled` on the presence of its app host. */
export function driveEnabled(): boolean {
    return driveHost() !== '';
}

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

// ---- AI scope (what the assistant may draw on) ------------------------

/** One directory the assistant is explicitly allowed to search (a grant). */
export interface AIScopeEntry {
    grant_id: string;
    node_id: string;
    name: string;
}

/** The tenant's assistant scope: explicit directory grants plus the
 *  always-scoped defaults (Memory/), and whether whole-Drive scope is on. */
export interface AIScopeView {
    scoped: AIScopeEntry[];
    always_scoped: string[];
    all_scoped: boolean;
}

export async function listAIScope(session: SealedSession, tenantID: string): Promise<AIScopeView> {
    const data = await json<Partial<AIScopeView>>(session, 'GET', `/v1/tenants/${tenantID}/ai-scope`);
    return {
        scoped: data.scoped ?? [],
        always_scoped: data.always_scoped ?? [],
        all_scoped: data.all_scoped ?? false
    };
}

/** Grant the assistant read access to a directory subtree ("Enable for AI"). */
export function enableAIScope(
    session: SealedSession,
    tenantID: string,
    nodeID: string
): Promise<{ grant_id: string; already?: boolean }> {
    return json(session, 'POST', `/v1/tenants/${tenantID}/nodes/${nodeID}/ai-scope`);
}

/** Revoke the assistant's access to a directory subtree. */
export function disableAIScope(
    session: SealedSession,
    tenantID: string,
    nodeID: string
): Promise<{ disabled: boolean }> {
    return json(session, 'DELETE', `/v1/tenants/${tenantID}/nodes/${nodeID}/ai-scope`);
}

/** Enable/disable whole-Drive assistant scope (every directory, including
 *  ones added later — the scope is recomputed per search). */
export function setEntireDriveAIScope(
    session: SealedSession,
    tenantID: string,
    on: boolean
): Promise<unknown> {
    return json(session, on ? 'POST' : 'DELETE', `/v1/tenants/${tenantID}/ai-scope/all`);
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

/**
 * Attach a LARGE file (over the 8 MiB single-request `attach` cap) to a
 * conversation by streaming it into the conversation's `files/` folder via
 * the chunked upload path. The file is uploaded indexed (knowledge intent) —
 * a session file can never exceed the model context budget, so large files
 * are always knowledge (§8.7, decided 2026-07-19). Returns the created node.
 */
export function attachLargeFileToConversation(
    session: SealedSession,
    tenantID: string,
    filesFolderID: string,
    file: File,
    onProgress?: (sentBytes: number, totalBytes: number) => void
): Promise<DriveNodeRef> {
    return uploadFileStreaming<DriveNodeRef>(session, tenantID, filesFolderID, file, onProgress);
}

// ---- Sharing (read-only conversation links) ---------------------------
//
// A conversation is a Drive folder, so sharing one is just minting a share
// link on that folder node. Two modes (§7.6 sharing model):
//   - 'open'       : anyone with a Wallet and the link gets read on sign-in.
//   - 'restricted' : the visitor must present the required attributes and the
//                    owner approves each request before a read grant is cut.
// The recipient lands on the Drive front's existing /l page (resolve + redeem
// + attribute prompt), which grants read on the conversation folder — from
// there they can read the transcript and fork it into their own drive. We
// deliberately do not expose write/share scope: recipients are read-only.

export type ShareMode = 'open' | 'restricted';

/** A freshly minted share link. `secret` is returned exactly once — it rides
 *  in the URL fragment and is never persisted server-side in the clear. */
export interface CreatedShareLink {
    id: string;
    secret: string;
    mode: ShareMode;
    scope: string[];
    node_id: string;
    required_attributes?: string[];
    expires_at?: string;
}

/** A pending restricted-link access request awaiting the owner's decision. */
export interface ShareRequest {
    id: string;
    node_id: string;
    node_name: string;
    requester_sub: string;
    attributes: Record<string, string>;
    scope: string[];
    status: string;
    created_at: string;
}

/**
 * Mint a read-only share link on a conversation. `open` grants read to anyone
 * with a Wallet who opens the link; `restricted` gates on `requiredAttributes`
 * and holds each visitor as a pending request until the owner approves. The
 * scope is always read — a shared conversation is never writable by the
 * recipient (they fork it to make it their own).
 */
export function shareConversation(
    session: SealedSession,
    tenantID: string,
    conversationID: string,
    opts: { mode: ShareMode; requiredAttributes?: string[]; expiresUnix?: number; label?: string }
): Promise<CreatedShareLink> {
    return json<CreatedShareLink>(
        session,
        'POST',
        `/v1/tenants/${tenantID}/nodes/${conversationID}/links`,
        {
            mode: opts.mode,
            scope: ['read'],
            required_attributes: opts.mode === 'restricted' ? opts.requiredAttributes ?? [] : undefined,
            expires_unix: opts.expiresUnix,
            label: opts.label
        }
    );
}

/** Owner: list restricted-link access requests (default pending only). */
export async function listShareRequests(
    session: SealedSession,
    tenantID: string,
    status = 'pending'
): Promise<ShareRequest[]> {
    const data = await json<{ requests: ShareRequest[] }>(
        session,
        'GET',
        `/v1/tenants/${tenantID}/link-requests?status=${encodeURIComponent(status)}`
    );
    return data.requests ?? [];
}

/** Owner: approve or deny a pending restricted-link request. Approval cuts the
 *  requester's read grant; either decision notifies their wallet. */
export function decideShareRequest(
    session: SealedSession,
    tenantID: string,
    requestID: string,
    decision: 'approve' | 'deny'
): Promise<{ status: string }> {
    return json(
        session,
        'POST',
        `/v1/tenants/${tenantID}/link-requests/${requestID}/${decision}`
    );
}

/** The Drive front web origin that hosts the /l recipient landing (distinct
 *  from the sealed Drive service host). Configured, with a sane default. */
export function driveWebOrigin(): string {
    return (process.env.NEXT_PUBLIC_DRIVE_WEB_ORIGIN || 'https://drive.privasys.org').replace(
        /\/+$/,
        ''
    );
}

/**
 * Build the recipient URL for a share link. The secret rides in the fragment
 * (never sent to a server) and the Drive front's /l page redeems it: the
 * visitor signs in with their Wallet, presents any required attributes, and
 * is granted read on the conversation folder.
 */
export function shareLinkURL(link: CreatedShareLink, driveOrigin?: string): string {
    const base = (driveOrigin ?? driveWebOrigin()).replace(/\/+$/, '');
    return `${base}/l?id=${encodeURIComponent(link.id)}#${encodeURIComponent(link.secret)}`;
}

// ---- helpers ----------------------------------------------------------

/** Today's date as YYYY-MM-DD in the caller's locale-neutral calendar. */
export function todayISODate(): string {
    return new Date().toISOString().slice(0, 10);
}
