import type { SealedSession, SealedResponse } from '@privasys/auth';

// Generic MCP tool-settings contract (v1).
//
// A tool server may advertise a `settings` descriptor in its catalogue;
// the enclave republishes it at GET /v1/tools, and proxies the per-user
// settings document (GET/PUT /v1/tools/<server>/settings) to the tool over
// its attested channel with the sealed caller named on-behalf-of. The TOOL
// is the sole authority on the document; the UI renders whatever schema it
// serves — nothing tool-specific ships here. Drive's Memory integration is
// just the first server implementing the contract.

/** Static per-server presentation, advertised in the tool catalogue. */
export interface ToolSettingsDisplay {
    title?: string;
    /** Named icon from the UI's small set ('brain', ...); unknown names
     *  fall back to a generic tool glyph. */
    icon?: string;
    description?: string;
}

export interface ToolServerInfo {
    name: string;
    has_settings: boolean;
    settings?: ToolSettingsDisplay;
}

/** One option of an array field, materialised per user by the server. */
export interface ToolSettingsOption {
    value: string;
    label: string;
}

/** Restricted JSON-Schema profile the generic renderer understands. */
export interface ToolSettingsField {
    'type'?: string; // 'boolean' | 'array' (unknown types are skipped)
    'title'?: string;
    'description'?: string;
    'default'?: unknown;
    'x-group'?: string;
    'x-options'?: ToolSettingsOption[];
    /** Grey this field while the named boolean field is on. */
    'x-superseded-by'?: string;
    'x-disabled'?: boolean;
    'x-disabled-reason'?: string;
}

export interface ToolSettingsDoc {
    version?: number;
    display?: ToolSettingsDisplay;
    schema?: {
        'properties'?: Record<string, ToolSettingsField>;
        'x-order'?: string[];
    };
    values?: Record<string, unknown>;
}

const decoder = new TextDecoder();

async function call<T>(
    session: SealedSession,
    method: string,
    path: string,
    body?: unknown
): Promise<T> {
    const res: SealedResponse = await session.request(method, path, body);
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

/** The enclave's configured MCP servers with their settings descriptors. */
export async function fetchToolServers(session: SealedSession): Promise<ToolServerInfo[]> {
    const data = await call<{ servers: ToolServerInfo[] }>(session, 'GET', '/v1/tools');
    return data.servers ?? [];
}

/** The per-user settings document, served by the attested tool itself. */
export function fetchToolSettings(session: SealedSession, server: string): Promise<ToolSettingsDoc> {
    return call<ToolSettingsDoc>(session, 'GET', `/v1/tools/${encodeURIComponent(server)}/settings`);
}

/** Partial update; the response is the fresh full document. */
export function putToolSettings(
    session: SealedSession,
    server: string,
    values: Record<string, unknown>
): Promise<ToolSettingsDoc> {
    return call<ToolSettingsDoc>(session, 'PUT', `/v1/tools/${encodeURIComponent(server)}/settings`, {
        values
    });
}

/** True when a field is currently superseded by an enabled boolean. */
export function fieldSuperseded(doc: ToolSettingsDoc, field: ToolSettingsField): boolean {
    const by = field['x-superseded-by'];
    return !!by && doc.values?.[by] === true;
}

/** Render order: schema x-order, then any stragglers. */
export function fieldOrder(doc: ToolSettingsDoc): string[] {
    const props = doc.schema?.properties ?? {};
    const order = (doc.schema?.['x-order'] ?? []).filter((k) => k in props);
    for (const k of Object.keys(props)) if (!order.includes(k)) order.push(k);
    return order;
}

/** One-line state summary for a pill, derived generically from the doc:
 *  the titles of enabled recall options (superseders collapse what they
 *  supersede), e.g. "past chats + 2 folders" or "entire Drive". Empty when
 *  only the first field (the tool's core switch) is on. */
export function settingsSummary(doc: ToolSettingsDoc): string {
    const props = doc.schema?.properties ?? {};
    const values = doc.values ?? {};
    const order = fieldOrder(doc);
    const parts: string[] = [];
    for (const key of order.slice(1)) {
        const f = props[key];
        if (!f) continue;
        if (fieldSuperseded(doc, f)) continue;
        if (f.type === 'boolean' && values[key] === true) {
            parts.push((f.title ?? key).toLowerCase());
        }
        if (f.type === 'array' && Array.isArray(values[key]) && (values[key] as unknown[]).length > 0) {
            const arr = values[key] as string[];
            if (arr.length === 1) {
                const label = (f['x-options'] ?? []).find((o) => o.value === arr[0])?.label;
                parts.push(label ?? '1 folder');
            } else {
                parts.push(`${arr.length} folders`);
            }
        }
    }
    return parts.join(' + ');
}
