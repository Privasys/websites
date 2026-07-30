/**
 * Direct app calls for e2e suites — the mgmt `/apps/{id}/rpc/{fn}` relay is
 * being retired (direct-sealed-app-calls plan §4b), so tests call the enclave
 * the way real clients do:
 *
 *   container → POST https://<hostname><endpoint>   (endpoint from the app's
 *               manifest, `/{fn}` when it declares none), platform bearer in
 *               Authorization — the inner bearer is the sole authority.
 *   wasm      → POST https://<hostname>/rpc/<name>/<fn> (the mini's typed
 *               shim), `app_auth` carried in the body per the shim contract.
 *
 * The enclave serves its RA-TLS chain (not publicly trusted), so calls run in
 * a dedicated request context with ignoreHTTPSErrors. Tests are not attested
 * clients — the CLI and SDK are; this only moves the bytes off the relay.
 */
import { request, type APIRequestContext } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

interface AppTarget {
    name: string;
    appType: string;
    hostname: string;
    /** tool name -> endpoint path (containers; from the manifest). */
    endpoints: Map<string, string>;
}

const targets = new Map<string, AppTarget>();
let raCtx: APIRequestContext | null = null;

async function ctx(): Promise<APIRequestContext> {
    if (!raCtx) raCtx = await request.newContext({ ignoreHTTPSErrors: true });
    return raCtx;
}

interface ManifestTool { name?: string; endpoint?: string }
interface Manifest { configure?: ManifestTool; tools?: Record<string, ManifestTool> | ManifestTool[] }

function endpointsFrom(manifest: Manifest | null | undefined): Map<string, string> {
    const out = new Map<string, string>();
    if (!manifest) return out;
    if (manifest.configure?.endpoint) out.set('configure', manifest.configure.endpoint);
    const t = manifest.tools;
    if (Array.isArray(t)) {
        for (const tool of t) if (tool?.name && tool.endpoint) out.set(tool.name, tool.endpoint);
    } else if (t) {
        for (const [name, tool] of Object.entries(t)) if (tool?.endpoint) out.set(name, tool.endpoint);
    }
    return out;
}

async function target(token: string, appId: string): Promise<AppTarget> {
    const hit = targets.get(appId);
    if (hit) return hit;
    const c = await ctx();
    const resp = await c.get(`${API}/api/v1/apps/${appId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok()) throw new Error(`resolve app ${appId}: HTTP ${resp.status()}`);
    const app = await resp.json();
    if (!app.hostname) throw new Error(`app ${app.name ?? appId} has no live hostname (not deployed?)`);
    const t: AppTarget = {
        name: app.name,
        appType: app.app_type,
        hostname: app.hostname,
        endpoints: endpointsFrom(app.container_mcp as Manifest | undefined)
    };
    targets.set(appId, t);
    return t;
}

/** Drop a cached target (call after redeploys that may move the app). */
export function forgetAppTarget(appId: string): void {
    targets.delete(appId);
}

/**
 * Invoke a tool on the app's enclave directly. Returns { status, body } like
 * the old relay helper so call sites keep their assertions.
 */
export async function appCall(
    token: string,
    appId: string,
    fn: string,
    params: unknown,
    opts?: { timeout?: number }
): Promise<{ status: number; body: Record<string, unknown> }> {
    const t = await target(token, appId);
    const c = await ctx();
    const timeout = opts?.timeout ?? 30_000;
    let resp;
    if (t.appType === 'wasm') {
        resp = await c.post(`https://${t.hostname}/rpc/${t.name}/${fn}`, {
            headers: { 'Content-Type': 'application/json' },
            data: { ...(params as Record<string, unknown> ?? {}), app_auth: token },
            timeout
        });
    } else {
        const endpoint = t.endpoints.get(fn) ?? `/${fn}`;
        resp = await c.post(`https://${t.hostname}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: params ?? {},
            timeout
        });
    }
    const body = await resp.json().catch(async () => ({ raw: await resp.text().catch(() => '') }));
    return { status: resp.status(), body };
}
