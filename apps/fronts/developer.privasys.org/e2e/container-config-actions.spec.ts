/**
 * E2E: container app typed config + actions (image-bound configure-then-freeze).
 *
 * Exercises the app-capabilities design on a TDX container using
 * container-app-example-with-config:
 *   1. Create the app from its GitHub commit; wait for the build.
 *   2. Deploy to a TDX enclave. The freeze gate engages WITHOUT any manual
 *      PATCH /config-api: mgmt derives config_api from the manifest tool tagged
 *      role:"config" (image-bound).
 *   3. Before configure, a non-configure tool (store) is frozen — the manager
 *      returns "awaiting initial configuration".
 *   4. The owner calls the role:"config" tool (configure) -> 2xx lifts the gate.
 *   5. After configure, store works; the role:"action" tool (process) runs with
 *      a dynamic enum (datasets) and a progress channel (process_status) until
 *      it reaches a terminal "done" state.
 *
 * All calls go through the unary /rpc/{name} relay — the same surface the API
 * Test tab and MCP use.
 *
 * Run:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     container-config-actions.spec.ts --project=portal --no-deps
 */
import { test, expect } from '@playwright/test';
import { setupAuth, getToken as getE2eToken } from './e2e-auth';
import { cleanupApps } from './e2e-cleanup';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

// Pushed container-app-example-with-config (typed config + actions, no app-level
// freeze logic).
const COMMIT_URL =
    'https://github.com/Privasys/container-app-example-with-config/commit/061d8976a570bb3f34ab3b70bf442a31210554cb';
const APP_NAME = 'e2e-container-config';

let token: string;
let appId: string;
let versionId: string;
let deployed = false;

async function getToken(page: import('@playwright/test').Page): Promise<string> {
    if (token) return token;
    await setupAuth(page);
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    token = await getE2eToken();
    expect(token).toBeTruthy();
    return token;
}

// rpc invokes a tool by name through the owner-authed unary relay and returns
// { status, body } so callers can assert on both the HTTP status and the JSON.
async function rpc(page: import('@playwright/test').Page, tok: string, fn: string, params: unknown) {
    const resp = await page.request.post(
        `${API}/api/v1/apps/${appId}/rpc/${fn}`,
        {
            headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
            data: params ?? {},
            timeout: 30_000,
        },
    );
    const body = await resp.json().catch(() => ({}));
    return { status: resp.status(), body };
}

async function deleteApp(page: import('@playwright/test').Page, tok: string, name: string) {
    const resp = await page.request.get(`${API}/api/v1/apps`, { headers: { Authorization: `Bearer ${tok}` } });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    const app = apps.find(a => a.name === name);
    if (!app) return;
    const depsResp = await page.request.get(`${API}/api/v1/apps/${app.id}/deployments`, { headers: { Authorization: `Bearer ${tok}` } });
    if (depsResp.ok()) {
        const deps: { id: string; status: string }[] = await depsResp.json();
        for (const dep of deps.filter(d => d.status === 'active')) {
            await page.request.post(`${API}/api/v1/apps/${app.id}/deployments/${dep.id}/stop`, { headers: { Authorization: `Bearer ${tok}` }, timeout: 30_000 });
        }
        if (deps.some(d => d.status === 'active')) await page.waitForTimeout(5_000);
    }
    await page.request.delete(`${API}/api/v1/apps/${app.id}`, { headers: { Authorization: `Bearer ${tok}` } });
    await page.waitForTimeout(8_000);
}

test.describe('Container typed config + actions (image-bound freeze)', () => {
    test.describe.configure({ mode: 'serial' });

    test('create app from commit', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        await deleteApp(page, token, APP_NAME);

        const resp = await page.request.post(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: { name: APP_NAME, source_type: 'github', commit_url: COMMIT_URL },
        });
        expect(resp.ok(), `create app: ${resp.status()}`).toBeTruthy();
        const body = await resp.json();
        expect(body.app_type).toBe('container');
        appId = body.id;
        console.log(`Created ${APP_NAME} (${appId})`);
    });

    test('wait for build', async ({ page }) => {
        test.setTimeout(900_000);
        token = await getToken(page);
        for (let i = 0; i < 150; i++) {
            const resp = await page.request.get(`${API}/api/v1/apps/${appId}/versions`, { headers: { Authorization: `Bearer ${token}` } });
            if (resp.ok()) {
                const versions: { id: string; status: string }[] = await resp.json();
                const failed = versions.find(v => v.status === 'failed');
                if (failed) throw new Error(`Build failed: ${failed.id}`);
                const ready = versions.find(v => v.status === 'ready');
                if (ready) { versionId = ready.id; console.log(`Build ready: ${versionId} (poll ${i})`); return; }
            }
            await page.waitForTimeout(6_000);
        }
        throw new Error('Build did not become ready in time');
    });

    test('deploy to TDX — freeze derived from manifest', async ({ page }) => {
        test.setTimeout(300_000);
        token = await getToken(page);

        const enclResp = await page.request.get(`${API}/api/v1/enclaves`, { headers: { Authorization: `Bearer ${token}` } });
        expect(enclResp.ok()).toBeTruthy();
        const enclaves: { id: string; name: string; tee_type: string; status: string }[] = await enclResp.json();
        const tdx = enclaves.find(e => e.tee_type === 'tdx' && e.status === 'active');
        expect(tdx, 'no active TDX enclave found').toBeTruthy();
        console.log(`Deploying to: ${tdx!.name} (${tdx!.id})`);

        const listingResp = await page.request.put(`${API}/api/v1/apps/${appId}/store`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: {
                store_tagline: '', store_description: 'E2E container typed config + actions.', store_category: 'Developer Tools',
                store_icon_url: '', store_screenshots: [], store_privacy_url: '', store_tos_url: '',
                store_website_url: '', store_support_email: '', store_keywords: 'e2e',
            },
        });
        expect(listingResp.ok(), 'set store listing').toBeTruthy();

        const deploy = await page.request.post(`${API}/api/v1/apps/${appId}/versions/${versionId}/deploy`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: { enclave_id: tdx!.id },
            timeout: 240_000,
        });
        if (!deploy.ok()) console.log(`Deploy failed: ${deploy.status()} ${(await deploy.text()).substring(0, 500)}`);
        expect(deploy.ok()).toBeTruthy();
        const dep = await deploy.json();
        expect(dep.status).toBe('active');
        deployed = true;
        console.log(`Deployed: ${dep.hostname}`);
    });

    test('store is frozen until configure', async ({ page }) => {
        test.skip(!deployed, 'deploy failed');
        test.setTimeout(30_000);
        token = await getToken(page);
        const { status, body } = await rpc(page, token, 'store', { key: 'k1', value: 'v1' });
        const text = JSON.stringify(body);
        expect(status >= 500 || /awaiting initial configuration/i.test(text), `expected frozen, got ${status} ${text}`).toBeTruthy();
        console.log(`Pre-configure frozen: ${status} ${text.substring(0, 120)}`);
    });

    test('configure lifts the gate', async ({ page }) => {
        test.skip(!deployed, 'deploy failed');
        test.setTimeout(30_000);
        token = await getToken(page);
        const { status, body } = await rpc(page, token, 'configure', { api_key: 'e2e-secret-key-1234567890' });
        expect(status, JSON.stringify(body)).toBe(200);
        console.log(`configure: ${JSON.stringify(body).substring(0, 120)}`);
        // Give the manager a beat to flip the gate after the 2xx.
        await page.waitForTimeout(3_000);
    });

    test('store works + dataset enum populates after configure', async ({ page }) => {
        test.skip(!deployed, 'deploy failed');
        test.setTimeout(30_000);
        token = await getToken(page);
        const put = await rpc(page, token, 'store', { key: 'alpha', value: 'hello' });
        expect(put.status, JSON.stringify(put.body)).toBe(200);
        const ds = await rpc(page, token, 'datasets', {});
        expect(ds.status).toBe(200);
        expect(Array.isArray(ds.body.available) && ds.body.available.includes('alpha'), JSON.stringify(ds.body)).toBeTruthy();
        console.log(`datasets: ${JSON.stringify(ds.body)}`);
    });

    test('action process runs to a terminal state with progress', async ({ page }) => {
        test.skip(!deployed, 'deploy failed');
        test.setTimeout(120_000);
        token = await getToken(page);
        const start = await rpc(page, token, 'process', { dataset: 'alpha' });
        expect([200, 202], JSON.stringify(start.body)).toContain(start.status);

        let state = '';
        for (let i = 0; i < 40; i++) {
            await page.waitForTimeout(2_000);
            const st = await rpc(page, token, 'process_status', {});
            state = String(st.body.state ?? '');
            if (state === 'done') { console.log(`process done: ${JSON.stringify(st.body)}`); break; }
            if (state === 'failed') throw new Error(`process failed: ${JSON.stringify(st.body)}`);
        }
        expect(state).toBe('done');
    });

    test.afterAll(async () => {
        await cleanupApps({ names: [APP_NAME] });
    });
});
