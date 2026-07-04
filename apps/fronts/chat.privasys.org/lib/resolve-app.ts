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
