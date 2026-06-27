// Client for the chat-service back-end (api.chat.privasys.org).
//
// chat-service owns the user's persistent MCP tool list and mints the
// signed tool-grant the chat forwards to the confidential-ai enclave. It is
// distinct from management-service (instance discovery / control plane): the
// chat front-end talks to both.

const CHAT_SERVICE_URL =
    process.env.NEXT_PUBLIC_CHAT_SERVICE_URL ?? 'https://api.chat.privasys.org';

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

function authHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
}

async function asError(res: Response): Promise<Error> {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return new Error(body?.error || `${res.status} ${res.statusText}`);
}

/** List the caller's persistent tools. */
export async function fetchUserTools(token: string, signal?: AbortSignal): Promise<UserTool[]> {
    const res = await fetch(`${CHAT_SERVICE_URL}/api/v1/me/tools`, {
        headers: authHeaders(token),
        signal
    });
    if (!res.ok) throw await asError(res);
    const data = (await res.json()) as { tools: UserTool[] };
    return data.tools ?? [];
}

/** Add a tool (enclave or external). */
export async function addUserTool(token: string, input: AddUserToolInput): Promise<UserTool> {
    const res = await fetch(`${CHAT_SERVICE_URL}/api/v1/me/tools`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
    });
    if (!res.ok) throw await asError(res);
    return res.json();
}

/** Enable/disable a tool. */
export async function setUserToolEnabled(
    token: string,
    id: string,
    enabled: boolean
): Promise<UserTool> {
    const res = await fetch(`${CHAT_SERVICE_URL}/api/v1/me/tools/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw await asError(res);
    return res.json();
}

/** Remove a tool. */
export async function deleteUserTool(token: string, id: string): Promise<void> {
    const res = await fetch(`${CHAT_SERVICE_URL}/api/v1/me/tools/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(token)
    });
    if (!res.ok && res.status !== 204) throw await asError(res);
}

/**
 * Mint a tool-grant for {user, instance}. The returned compact JWS is
 * forwarded to the enclave as the X-Privasys-Tool-Grant header. Returns null
 * when chat-service is unreachable so chat still works with admin tools.
 */
export async function fetchToolGrant(
    token: string,
    instanceId: string,
    signal?: AbortSignal
): Promise<string | null> {
    try {
        const res = await fetch(
            `${CHAT_SERVICE_URL}/api/v1/instances/${encodeURIComponent(instanceId)}/tool-grant`,
            { method: 'POST', headers: authHeaders(token), signal }
        );
        if (!res.ok) return null;
        const data = (await res.json()) as { grant?: string };
        return data.grant ?? null;
    } catch {
        return null;
    }
}
