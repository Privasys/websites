// Client for the Privasys Drive enclave backend.
//
// The browser reaches Drive over a DEDICATED SEALED SESSION (PrivasysSession
// from @privasys/auth) - never plain fetch. File bytes and metadata are
// sealed browser->enclave (CBOR-AES-GCM); the gateway only ever sees
// ciphertext. Drive authenticates the sealed session itself: the enclave
// relay asserts the wallet-vouched sub (X-Privasys-Sub) toward the app, so
// no bearer travels in the clear. Mirrors chat's lib/chat-service-api.ts.

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

const decoder = new TextDecoder();

export type NodeKind = 'folder' | 'file';

export interface DriveNode {
    id: string;
    tenant_id: string;
    parent_id?: string;
    kind: NodeKind;
    name: string;
    mime_hint?: string;
    size_bytes: number;
    merkle_root_hex?: string;
    manifest_ref?: string;
}

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

export type Scope = 'read' | 'write' | 'share' | 'delete';

export interface GrantView {
    id: string;
    subject: string; // "subject:<sub>" | "link" | "app:<mrtd>"
    scope: Scope[];
    created_by: string;
    expires_at?: string;
    revoked: boolean;
}

export interface NodePermissions {
    node: { id: string; name: string; kind: NodeKind; parent_id: string };
    grants: GrantView[];
    acl_override: string[] | null; // this node's own folder ACL, or null (inherits)
    effective_acl: string[] | null; // nearest-ancestor override in force, or null
}

export interface SharedItem {
    grant_id: string;
    tenant_id: string;
    node_id: string;
    name: string;
    kind: NodeKind;
    scope: string;
    shared_by: string;
    size_bytes: number;
}

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
    body?: unknown
): Promise<T> {
    const res = await timed(session, method, path, body, REQUEST_TIMEOUT_MS);
    if (!ok(res)) throw decodeError(res);
    const text = res.body && res.body.byteLength ? decoder.decode(res.body) : '';
    return (text ? JSON.parse(text) : {}) as T;
}

// ---- Identity + workspace --------------------------------------------

export function getMe(session: SealedSession): Promise<Me> {
    return json<Me>(session, 'GET', '/v1/me');
}

/** Get-or-create the caller's personal drive (User tenant). Idempotent. */
export function ensurePersonalTenant(session: SealedSession): Promise<Tenant> {
    return json<Tenant>(session, 'POST', '/v1/me/tenant');
}

// ---- Browse ----------------------------------------------------------

/** List a folder's children; pass null/'' for the tenant root. */
export function listChildren(
    session: SealedSession,
    tenantID: string,
    folderID: string | null
): Promise<DriveNode[]> {
    const path = folderID
        ? `/v1/tenants/${tenantID}/folders/${folderID}`
        : `/v1/tenants/${tenantID}/root`;
    return json<DriveNode[]>(session, 'GET', path);
}

export function createFolder(
    session: SealedSession,
    tenantID: string,
    parentID: string | null,
    name: string
): Promise<DriveNode> {
    return json<DriveNode>(session, 'POST', `/v1/tenants/${tenantID}/folders`, {
        parent_id: parentID ?? '',
        name
    });
}

/** Upload a file's bytes (sealed). Small-file path (single request). */
export async function uploadFile(
    session: SealedSession,
    tenantID: string,
    parentID: string | null,
    name: string,
    mime: string,
    bytes: Uint8Array
): Promise<DriveNode> {
    const qs = new URLSearchParams({ name });
    if (mime) qs.set('mime', mime);
    if (parentID) qs.set('parent_id', parentID);
    const res = await timed(
        session,
        'POST',
        `/v1/tenants/${tenantID}/files?${qs.toString()}`,
        bytes,
        TRANSFER_TIMEOUT_MS
    );
    if (!ok(res)) throw decodeError(res);
    const text = res.body && res.body.byteLength ? decoder.decode(res.body) : '';
    return JSON.parse(text) as DriveNode;
}

/** Download a file's plaintext bytes (decrypted inside the enclave). */
export async function downloadFile(
    session: SealedSession,
    tenantID: string,
    fileID: string
): Promise<Uint8Array> {
    const res = await timed(
        session,
        'GET',
        `/v1/tenants/${tenantID}/files/${fileID}`,
        undefined,
        TRANSFER_TIMEOUT_MS
    );
    if (!ok(res)) throw decodeError(res);
    return res.body ?? new Uint8Array(0);
}

export async function deleteNode(
    session: SealedSession,
    tenantID: string,
    nodeID: string
): Promise<void> {
    const res = await timed(session, 'DELETE', `/v1/tenants/${tenantID}/nodes/${nodeID}`, undefined, REQUEST_TIMEOUT_MS);
    if (!ok(res)) throw decodeError(res);
}

/** Reparent a node under parentID (null/'' moves it to the tenant root). */
export async function moveNode(
    session: SealedSession,
    tenantID: string,
    nodeID: string,
    parentID: string | null
): Promise<void> {
    const res = await timed(session, 'POST', `/v1/tenants/${tenantID}/nodes/${nodeID}/move`, {
        parent_id: parentID ?? ''
    }, REQUEST_TIMEOUT_MS);
    if (!ok(res)) throw decodeError(res);
}

// ---- Permissioning ---------------------------------------------------

export function getPermissions(
    session: SealedSession,
    tenantID: string,
    nodeID: string
): Promise<NodePermissions> {
    return json<NodePermissions>(
        session,
        'GET',
        `/v1/tenants/${tenantID}/nodes/${nodeID}/permissions`
    );
}

/** Share a node with a person (Google-Drive style). scope e.g. ['read'] or ['read','write']. */
export function shareWithUser(
    session: SealedSession,
    tenantID: string,
    nodeID: string,
    granteeSub: string,
    scope: Scope[],
    expiresUnix?: number
): Promise<GrantView> {
    return json<GrantView>(session, 'POST', `/v1/tenants/${tenantID}/nodes/${nodeID}/grants`, {
        subject: `subject:${granteeSub}`,
        scope,
        expires_unix: expiresUnix
    });
}

export async function revokeGrant(
    session: SealedSession,
    tenantID: string,
    grantID: string
): Promise<void> {
    const res = await timed(session, 'DELETE', `/v1/tenants/${tenantID}/grants/${grantID}`, undefined, REQUEST_TIMEOUT_MS);
    if (!ok(res)) throw decodeError(res);
}

/** Set/clear a folder's ACL override (SharePoint-style). Empty roles clears it (inherit). */
export function setNodeACL(
    session: SealedSession,
    tenantID: string,
    nodeID: string,
    roles: string[]
): Promise<{ node_id: string; roles: string[] }> {
    return json(session, 'PUT', `/v1/tenants/${tenantID}/nodes/${nodeID}/acl`, { roles });
}

/** The caller's inbound shares across all tenants ("Shared with me"). */
export async function listShared(session: SealedSession): Promise<SharedItem[]> {
    const data = await json<{ shared: SharedItem[] }>(session, 'GET', '/v1/shared');
    return data.shared ?? [];
}

// ---- Share links -----------------------------------------------------

export type LinkMode = 'open' | 'restricted';

export interface ShareLink {
    id: string;
    mode: LinkMode;
    scope: string[];
    label?: string;
    required_attributes?: string[];
    created_at: string;
    expires_at?: string;
    revoked: boolean;
}

export interface CreatedLink {
    id: string;
    secret: string; // returned exactly once
    mode: LinkMode;
    scope: string[];
    node_id: string;
    required_attributes?: string[];
    expires_at?: string;
}

export interface ResolvedLink {
    link_id: string;
    mode: LinkMode;
    scope: string[];
    required_attributes?: string[];
    tenant_id: string;
    owner_name: string;
    already_granted: boolean;
    request_status: string; // '' | 'pending' | 'approved' | 'denied'
    node: { id: string; name: string; kind: NodeKind; size_bytes: number };
}

export interface RedeemResult {
    status: 'granted' | 'pending';
    tenant_id: string;
    node_id: string;
    name: string;
    kind: NodeKind;
    request_id?: string;
}

export interface LinkRequest {
    id: string;
    node_id: string;
    node_name: string;
    requester_sub: string;
    attributes: Record<string, string>;
    scope: string[];
    status: string;
    created_at: string;
}

/** Owner: mint a share link on a node. Secret is returned once. */
export function createLink(
    session: SealedSession,
    tenantID: string,
    nodeID: string,
    opts: {
        mode: LinkMode;
        scope?: string[];
        requiredAttributes?: string[];
        expiresUnix?: number;
        label?: string;
    }
): Promise<CreatedLink> {
    return json<CreatedLink>(session, 'POST', `/v1/tenants/${tenantID}/nodes/${nodeID}/links`, {
        mode: opts.mode,
        scope: opts.scope ?? ['read'],
        required_attributes: opts.requiredAttributes,
        expires_unix: opts.expiresUnix,
        label: opts.label
    });
}

/** Owner: list a node's active links (no secrets). */
export async function listLinks(
    session: SealedSession,
    tenantID: string,
    nodeID: string
): Promise<ShareLink[]> {
    const data = await json<{ links: ShareLink[] }>(
        session,
        'GET',
        `/v1/tenants/${tenantID}/nodes/${nodeID}/links`
    );
    return (data.links ?? []).filter((l) => !l.revoked);
}

/** Recipient: fetch a link's target metadata (requires the secret). */
export function resolveLink(
    session: SealedSession,
    linkID: string,
    secret: string
): Promise<ResolvedLink> {
    return json<ResolvedLink>(session, 'POST', `/v1/links/${linkID}/resolve`, { secret });
}

/** Recipient: redeem a link. Open -> granted; restricted -> pending request. */
export function redeemLink(
    session: SealedSession,
    linkID: string,
    secret: string,
    attributes?: Record<string, string>
): Promise<RedeemResult> {
    return json<RedeemResult>(session, 'POST', `/v1/links/${linkID}/redeem`, { secret, attributes });
}

/** Owner: list restricted-link access requests (default pending). */
export async function listLinkRequests(
    session: SealedSession,
    tenantID: string,
    status = 'pending'
): Promise<LinkRequest[]> {
    const data = await json<{ requests: LinkRequest[] }>(
        session,
        'GET',
        `/v1/tenants/${tenantID}/link-requests?status=${encodeURIComponent(status)}`
    );
    return data.requests ?? [];
}

/** Owner: approve or deny a restricted-link request. */
export function decideLinkRequest(
    session: SealedSession,
    tenantID: string,
    requestID: string,
    decision: 'approve' | 'deny'
): Promise<{ status: string }> {
    return json(session, 'POST', `/v1/tenants/${tenantID}/link-requests/${requestID}/${decision}`);
}
