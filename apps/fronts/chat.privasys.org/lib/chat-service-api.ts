// Client for the chat-service back-end (api.chat.privasys.org).
//
// chat-service owns the user's persistent MCP tool list and mints the signed
// tool-grant the chat forwards to the confidential-ai enclave. It is a
// separate enclave from the inference instance and sits behind the gateway's
// terminate marker, so the browser reaches its authenticated API over a
// DEDICATED sealed session (PrivasysSession) — never plain fetch — and carries
// the user's bearer INSIDE the sealed envelope so the gateway never sees it.
// See chat-stream.ts for the equivalent sealed transport to confidential-ai.

import type { SealedResponse, SealedSession } from '@privasys/auth';

// Empty unless explicitly configured for this deployment. BYO-MCP stays fully
// dormant (no sealed-session bootstrap, no calls) until a chat-service host is
// set — so environments without a chat-service deployed make zero attempts.
const CHAT_SERVICE_URL = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL ?? '';

/** Bare host (no scheme) of chat-service, or '' when not configured. */
export function chatServiceHost(): string {
    if (!CHAT_SERVICE_URL) return '';
    try {
        return new URL(CHAT_SERVICE_URL).host;
    } catch {
        return '';
    }
}

export type ToolKind = 'enclave' | 'external';

// UserTool mirrors store.UserTool in chat-service.
export interface UserTool {
    id: string;
    kind: ToolKind;
    ref: string; // app id/alias (enclave) or base_url (external)
    name: string;
    label: string;
    description?: string;
    icon?: string;
    transport: string;
    auth_mode: string;
    expected_digest?: string;
    requires_user_confirmation: boolean;
    enabled: boolean;
    acknowledged_at?: string;
    created_at: string;
    updated_at: string;
}

export interface AddUserToolInput {
    kind: ToolKind;
    ref: string;
    name: string;
    label?: string;
    description?: string;
    icon?: string;
    transport?: string;
    auth_mode?: string;
    auth_audience?: string;
    requires_user_confirmation?: boolean;
    /** Required true for external (off-platform) tools. */
    acknowledged?: boolean;
    /** When set, chat-service enforces the fleet tool_policy at add time. */
    instance_id?: string;
}

const decoder = new TextDecoder();

// call issues a sealed request to chat-service with the user's bearer inside
// the encrypted envelope, and decodes the JSON body. Throws on non-2xx.
async function call<T>(
    session: SealedSession,
    token: string,
    method: string,
    path: string,
    body?: unknown
): Promise<T> {
    // Identity note: chat-service authenticates the SEALED SESSION itself —
    // the enclave relay asserts the wallet-vouched sub (X-Privasys-Sub)
    // toward the app, so no bearer needs to travel. The Authorization set
    // here is overwritten by the sealed transport's session scheme anyway;
    // `token` is kept in the signature as the caller-side "signed in" gate.
    void token;
    const res: SealedResponse = await session.request(method, path, body);
    // A missing/odd status must never read as success (a `status` of
    // undefined passes both range checks vacuously and would surface
    // phantom empty objects as created resources).
    if (typeof res.status !== 'number' || res.status < 200 || res.status >= 300) {
        const text = res.body && res.body.byteLength ? decoder.decode(res.body) : '';
        let msg = `${res.status}`;
        try {
            const j = text ? (JSON.parse(text) as { error?: string }) : null;
            if (j?.error) msg = j.error;
        } catch {
            if (text) msg = text;
        }
        throw new Error(msg);
    }
    const text = res.body && res.body.byteLength ? decoder.decode(res.body) : '';
    return (text ? JSON.parse(text) : {}) as T;
}

/** List the caller's persistent tools. */
export async function fetchUserTools(session: SealedSession, token: string): Promise<UserTool[]> {
    const data = await call<{ tools: UserTool[] }>(session, token, 'GET', '/api/v1/me/tools');
    return data.tools ?? [];
}

/** Add a tool (enclave or external). */
export async function addUserTool(
    session: SealedSession,
    token: string,
    input: AddUserToolInput
): Promise<UserTool> {
    const created = await call<UserTool>(session, token, 'POST', '/api/v1/me/tools', input);
    // Guard against a malformed success: appending a shapeless object would
    // render a nameless, un-deletable ghost row in the tools panel.
    if (!created?.id || !created?.name) {
        throw new Error('The tools back-end returned an unexpected response. Please try again.');
    }
    return created;
}

/** Enable/disable a tool. */
export async function setUserToolEnabled(
    session: SealedSession,
    token: string,
    id: string,
    enabled: boolean
): Promise<UserTool> {
    return call<UserTool>(session, token, 'PATCH', `/api/v1/me/tools/${encodeURIComponent(id)}`, {
        enabled
    });
}

/** Remove a tool. */
export async function deleteUserTool(session: SealedSession, token: string, id: string): Promise<void> {
    await call<unknown>(session, token, 'DELETE', `/api/v1/me/tools/${encodeURIComponent(id)}`);
}

/**
 * Mint a tool-grant for {user, instance}. The returned compact JWS is
 * forwarded to the inference enclave as the X-Privasys-Tool-Grant header.
 * Returns null when chat-service is unreachable so chat still works with the
 * fleet's admin tools.
 */
export async function fetchToolGrant(
    session: SealedSession,
    token: string,
    instanceId: string
): Promise<string | null> {
    try {
        const data = await call<{ grant?: string }>(
            session,
            token,
            'POST',
            `/api/v1/instances/${encodeURIComponent(instanceId)}/tool-grant`
        );
        if (!data.grant) {
            console.warn('[chat-tools] tool-grant response carried no grant');
            return null;
        }
        return data.grant;
    } catch (e) {
        // Degrade to admin-only tools, but SAY SO: a silent null here made
        // "the model can't see my tool" undiagnosable — every server-side
        // link verified green while the grant never left the browser.
        console.warn('[chat-tools] tool-grant fetch failed (user tools will be unavailable this turn):', (e as Error)?.message ?? e);
        return null;
    }
}
