// Public app resolution — the tools page's "what am I about to trust?"
// preview. GET /api/v1/apps/by-name/{name}/resolve on the management API
// returns only publicly verifiable deployment facts (hostname, attested
// image digest, TEE type, attest URL); no auth involved.

export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.developer.privasys.org';

export interface ResolvedApp {
    name: string;
    display_name: string;
    app_type: 'wasm' | 'container' | string;
    hostname: string;
    image_digest: string;
    tee_type?: string;
    is_enclave: boolean;
    has_mcp: boolean;
    attest_url?: string;
    version?: number;
}

export type ResolveOutcome =
    | { ok: true; app: ResolvedApp }
    | { ok: false; error: string };

/** Resolve a Privasys app by name/alias. A non-2xx comes back as a
 *  human-readable error (e.g. "app is not deployed"). */
export async function resolveApp(ref: string): Promise<ResolveOutcome> {
    try {
        const r = await fetch(
            `${API_BASE_URL}/api/v1/apps/by-name/${encodeURIComponent(ref)}/resolve`,
            { cache: 'no-store' }
        );
        const body = (await r.json().catch(() => null)) as
            | (ResolvedApp & { error?: string })
            | null;
        if (!r.ok || !body || body.error) {
            return { ok: false, error: body?.error ?? `lookup failed (${r.status})` };
        }
        return { ok: true, app: body };
    } catch {
        return { ok: false, error: 'could not reach the app directory' };
    }
}

/** True when the ref reads as an external URL rather than an app name. */
export function looksLikeUrl(ref: string): boolean {
    const v = ref.trim().toLowerCase();
    return v.startsWith('http://') || v.startsWith('https://') || v.includes('://');
}

// ── Tools directory (search-and-select picker) ─────────────────────────

export interface ToolDirectoryEntry {
    name: string;
    display_name: string;
    tagline?: string;
    icon_url?: string;
    app_type: string;
    hostname: string;
    image_digest: string;
    tee_type?: string;
    attest_url: string;
    mine: boolean;
    public: boolean;
}

/** Fetch the tool apps the signed-in user may discover: every public app
 *  plus their own team's. */
export async function fetchToolDirectory(token: string): Promise<ToolDirectoryEntry[]> {
    const r = await fetch(`${API_BASE_URL}/api/v1/tools/directory`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!r.ok) throw new Error(`directory unavailable (${r.status})`);
    const body = (await r.json()) as { tools?: ToolDirectoryEntry[] };
    return body.tools ?? [];
}

/** If `url` is a Privasys app endpoint (<app>.apps[-env].privasys.org),
 *  return the app name so the add flow can upgrade it to the attested
 *  enclave path; null for anything else. */
export function privasysAppFromUrl(url: string): string | null {
    try {
        const u = new URL(url.trim());
        const m = u.hostname.toLowerCase().match(/^([a-z0-9-]+)\.apps(-[a-z0-9]+)?\.privasys\.org$/);
        return m ? m[1] : null;
    } catch {
        return null;
    }
}

/** Parse an external-tool ref "the standard way": either a bare URL or a
 *  pasted MCP config snippet ({"mcpServers":{"name":{"url":...}}}). */
export function parseExternalRef(raw: string): { url: string; name?: string } | null {
    const v = raw.trim();
    if (!v) return null;
    if (v.startsWith('{')) {
        try {
            const parsed = JSON.parse(v) as {
                mcpServers?: Record<string, { url?: string }>;
                url?: string;
            };
            if (parsed.mcpServers) {
                for (const [name, spec] of Object.entries(parsed.mcpServers)) {
                    if (spec?.url) return { url: spec.url, name };
                }
            }
            if (parsed.url) return { url: parsed.url };
            return null;
        } catch {
            return null;
        }
    }
    return looksLikeUrl(v) ? { url: v } : null;
}
