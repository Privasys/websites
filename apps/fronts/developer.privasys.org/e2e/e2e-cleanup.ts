/**
 * Shared e2e app teardown.
 *
 * Every spec that creates apps must remove them when it finishes, or the admin
 * Review-apps list fills up with leftover "Built" e2e apps. The reliable place
 * to do this is a Playwright `afterAll` hook (it runs even when a test fails),
 * NOT a final cleanup *test* — in serial mode a cleanup test is skipped after
 * any earlier failure (e.g. a flaky UI assertion), so the apps survive.
 *
 * Usage in a spec:
 *
 *   import { cleanupApps } from './e2e-cleanup';
 *   test.afterAll(async () => {
 *       await cleanupApps({ names: [APP_NAME] });
 *   });
 *
 * Pass `prefixes` for dynamically-named apps (e.g. `e2e-store-<timestamp>`).
 * The bearer token is fetched internally (e2e-auth getToken is self-sufficient),
 * so afterAll needs no token in scope; cleanupApps no-ops if auth is unavailable.
 */
import { request, type APIRequestContext } from '@playwright/test';
import { getToken } from './e2e-auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function stopAndDelete(req: APIRequestContext, token: string, id: string, label: string): Promise<void> {
    const headers = { Authorization: `Bearer ${token}` };
    const depsResp = await req.get(`${API}/api/v1/apps/${id}/deployments`, { headers });
    if (depsResp.ok()) {
        const deps: { id: string; status: string }[] = await depsResp.json();
        for (const d of deps.filter(x => x.status === 'active')) {
            await req.post(`${API}/api/v1/apps/${id}/deployments/${d.id}/stop`, { headers, timeout: 30_000 }).catch(() => undefined);
        }
        if (deps.some(d => d.status === 'active')) await sleep(5_000);
    }
    await req.delete(`${API}/api/v1/apps/${id}`, { headers }).catch(() => undefined);
    // Wait for enclave-side cleanup (snapshot / volume removal).
    await sleep(10_000);
    console.log(`Cleaned up ${label} (${id})`);
}

/**
 * Delete an app by exact name (stop active deployments first). Best-effort:
 * a missing app or a failed request is ignored. Takes an APIRequestContext so
 * it works with `page.request` in a test or a standalone context in afterAll.
 */
export async function deleteApp(req: APIRequestContext, token: string, name: string): Promise<void> {
    const resp = await req.get(`${API}/api/v1/apps`, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    const app = apps.find(a => a.name === name);
    if (!app) return;
    await stopAndDelete(req, token, app.id, name);
}

/**
 * Teardown helper for `afterAll`: delete every app this suite created, by exact
 * name and/or by name prefix, via a standalone request context. Fetches the
 * bearer token itself and no-ops if auth is unavailable.
 */
export async function cleanupApps(opts: { names?: string[]; prefixes?: string[] }): Promise<void> {
    const token = await getToken().catch(() => '');
    if (!token) return;
    const ctx = await request.newContext();
    try {
        for (const name of opts.names ?? []) await deleteApp(ctx, token, name);
        if (opts.prefixes && opts.prefixes.length > 0) {
            const resp = await ctx.get(`${API}/api/v1/apps`, { headers: { Authorization: `Bearer ${token}` } });
            if (resp.ok()) {
                const apps: { id: string; name: string }[] = await resp.json();
                for (const app of apps.filter(a => opts.prefixes!.some(p => a.name.startsWith(p)))) {
                    await stopAndDelete(ctx, token, app.id, app.name);
                }
            }
        }
    } catch (e) {
        console.warn(`cleanupApps error: ${e}`);
    } finally {
        await ctx.dispose();
    }
}
