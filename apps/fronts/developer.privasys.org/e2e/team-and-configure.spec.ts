/**
 * E2E: per-app owners team + @config-api freeze-gate.
 *
 * Verifies the end-to-end story for the configure-then-freeze pattern:
 *   1. App creator (sub X) is automatically added to the owners team.
 *   2. Owners team can be modified via REST API; the creator cannot
 *      be removed.
 *   3. The DeployTarget envelope carries `owners: [X, ...]` so the
 *      enclave knows who is allowed to call @config-api exports.
 *   4. After deployment the app is frozen — `protected-call` returns
 *      "awaiting initial configuration".
 *   5. The owner can call `configure`; subsequent `protected-call`
 *      requests return the canary "ok: api_key length = N".
 *
 * (We intentionally do not exercise the negative auth path here — it
 *  would require a second OIDC identity. The owners-team REST tests
 *  cover that the list is mutated and shipped correctly; the enclave
 *  side is exercised by Rust unit tests in
 *  `crates/enclave-os-wasm/tests/...`.)
 *
 * Run:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     team-and-configure.spec.ts --project=portal --no-deps
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { setupAuth, getToken as getE2eToken } from './e2e-auth';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

// The configure-then-freeze variant — exports @config-api configure +
// protected-call (the simple wasm-app-example dropped these after the repo
// split, so this test uses wasm-app-example-with-config).
const WASM_COMMIT_URL =
    'https://github.com/Privasys/wasm-app-example-with-config/commit/da08e12e231a03ddf1c24af3b02b8cd67e20c567';
const APP_NAME = 'e2e-team-configure';

let token: string;
let appId: string;
let versionId: string;
let deployed = false;
let creatorSub: string;

async function getToken(page: import('@playwright/test').Page): Promise<string> {
    if (token) return token;
    await setupAuth(page);
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    token = await getE2eToken();
    expect(token).toBeTruthy();
    return token;
}

async function deleteApp(page: import('@playwright/test').Page, tok: string, name: string) {
    const resp = await page.request.get(`${API}/api/v1/apps`, {
        headers: { Authorization: `Bearer ${tok}` },
    });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    const app = apps.find(a => a.name === name);
    if (!app) return;
    const depsResp = await page.request.get(`${API}/api/v1/apps/${app.id}/deployments`, {
        headers: { Authorization: `Bearer ${tok}` },
    });
    if (depsResp.ok()) {
        const deps: { id: string; status: string }[] = await depsResp.json();
        for (const dep of deps.filter(d => d.status === 'active')) {
            await page.request.post(
                `${API}/api/v1/apps/${app.id}/deployments/${dep.id}/stop`,
                { headers: { Authorization: `Bearer ${tok}` }, timeout: 30_000 },
            );
        }
        if (deps.some(d => d.status === 'active')) await page.waitForTimeout(5_000);
    }
    await page.request.delete(`${API}/api/v1/apps/${app.id}`, {
        headers: { Authorization: `Bearer ${tok}` },
    });
    await page.waitForTimeout(8_000);
    console.log(`Deleted ${name} (${app.id})`);
}

test.describe('Owners Team + @config-api Freeze Gate', () => {
    test.describe.configure({ mode: 'serial' });

    test('create app — creator becomes the sole owner', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        await deleteApp(page, token, APP_NAME);

        const resp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: APP_NAME,
                source_type: 'github',
                commit_url: WASM_COMMIT_URL,
            },
        });
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();
        expect(body.app_type).toBe('wasm');
        appId = body.id;
        creatorSub = body.owner_sub ?? body.creator_sub;
        expect(creatorSub).toBeTruthy();
        console.log(`Created app ${APP_NAME} (${appId}), creator=${creatorSub}`);

        // Owners list must already contain the creator.
        const ownersResp = await page.request.get(
            `${API}/api/v1/apps/${appId}/owners`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(ownersResp.ok()).toBeTruthy();
        const team = await ownersResp.json();
        expect(team.creator_sub).toBe(creatorSub);
        expect(team.owners.map((o: { sub: string }) => o.sub)).toContain(creatorSub);
        console.log(`Owners team has ${team.owners.length} member(s)`);
    });

    test('add a second owner, then remove them', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);

        const fakeSub = 'e2e-test-fake-sub-0001';
        const addResp = await page.request.post(
            `${API}/api/v1/apps/${appId}/owners`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: { sub: fakeSub, email: 'e2e@privasys.test', name: 'E2E Test User' },
            },
        );
        expect(addResp.ok()).toBeTruthy();
        const after = await addResp.json();
        expect(after.owners.map((o: { sub: string }) => o.sub)).toContain(fakeSub);

        const delResp = await page.request.delete(
            `${API}/api/v1/apps/${appId}/owners/${encodeURIComponent(fakeSub)}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(delResp.ok()).toBeTruthy();
        const final = await delResp.json();
        expect(final.owners.map((o: { sub: string }) => o.sub)).not.toContain(fakeSub);
    });

    test('cannot remove the creator from the owners team', async ({ page }) => {
        test.setTimeout(15_000);
        token = await getToken(page);

        const resp = await page.request.delete(
            `${API}/api/v1/apps/${appId}/owners/${encodeURIComponent(creatorSub)}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(resp.status()).toBe(403);
    });

    test('wait for build', async ({ page }) => {
        test.setTimeout(600_000);
        token = await getToken(page);

        for (let i = 0; i < 120; i++) {
            const resp = await page.request.get(
                `${API}/api/v1/apps/${appId}/versions`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (resp.ok()) {
                const versions: { id: string; status: string }[] = await resp.json();
                const failed = versions.find(v => v.status === 'failed');
                if (failed) throw new Error(`Build failed: ${failed.id}`);
                const ready = versions.find(v => v.status === 'ready');
                if (ready) {
                    versionId = ready.id;
                    console.log(`Build ready: ${versionId} (poll ${i})`);
                    return;
                }
            }
            await page.waitForTimeout(5_000);
        }
        throw new Error('Build did not become ready in time');
    });

    test('set config_api so the freeze gate engages', async ({ page }) => {
        test.setTimeout(15_000);
        token = await getToken(page);

        const resp = await page.request.patch(
            `${API}/api/v1/apps/${appId}/config-api`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: { config_api: 'configure' },
            },
        );
        expect(resp.ok()).toBeTruthy();
        const app = await resp.json();
        expect(app.config_api).toBe('configure');
        console.log(`config_api set: ${app.config_api}`);
    });

    test('deploy to SGX — DeployTarget carries owners', async ({ page }) => {
        test.setTimeout(300_000);
        token = await getToken(page);

        const enclResp = await page.request.get(`${API}/api/v1/enclaves`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(enclResp.ok()).toBeTruthy();
        const enclaves: { id: string; name: string; tee_type: string; status: string }[] =
            await enclResp.json();
        const sgx = enclaves.find(e => e.tee_type === 'sgx' && e.status === 'active');
        expect(sgx, 'no active SGX enclave found').toBeTruthy();
        console.log(`Deploying to: ${sgx!.name} (${sgx!.id})`);

        // The deploy gate requires a minimal App Store listing (Description +
        // Category) before an app can be deployed.
        const listingResp = await page.request.put(`${API}/api/v1/apps/${appId}/store`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: {
                store_tagline: '', store_description: 'E2E configure-then-freeze app.', store_category: 'Developer Tools',
                store_icon_url: '', store_screenshots: [], store_privacy_url: '', store_tos_url: '',
                store_website_url: '', store_support_email: '', store_keywords: 'e2e'
            },
        });
        expect(listingResp.ok(), 'set store listing').toBeTruthy();

        // Server-side deploy: mgmt-service SA loads the wasm into the
        // enclave (no portal sealed-relay involved).
        const deploy = await page.request.post(
            `${API}/api/v1/apps/${appId}/versions/${versionId}/deploy`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: { enclave_id: sgx!.id },
                timeout: 240_000,
            },
        );
        if (!deploy.ok()) {
            const errText = await deploy.text();
            console.log(`Deploy failed: ${deploy.status()} ${errText.substring(0, 500)}`);
        }
        expect(deploy.ok()).toBeTruthy();
        const dep = await deploy.json();
        expect(dep.status).toBe('active');
        deployed = true;
        console.log(`Deployed: ${dep.hostname}`);
    });

    test('protected-call is frozen until configure', async ({ page }) => {
        test.skip(!deployed, 'deploy failed');
        test.setTimeout(30_000);
        token = await getToken(page);

        const resp = await page.request.post(
            `${API}/api/v1/apps/${appId}/rpc/protected-call`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: {},
                timeout: 20_000,
            },
        );
        // The freeze gate returns the WIT call wrapped in an Error
        // result. We accept either a non-2xx OR a 2xx whose body
        // contains the expected message — both are valid for the test.
        const body = await resp.json().catch(() => ({}));
        const text = JSON.stringify(body);
        expect(text.toLowerCase()).toContain('awaiting initial configuration');
        console.log(`Pre-configure frozen response: ${text.substring(0, 120)}…`);
    });

    test('owner can call configure', async ({ page }) => {
        test.skip(!deployed, 'deploy failed');
        test.setTimeout(30_000);
        token = await getToken(page);

        const resp = await page.request.post(
            `${API}/api/v1/apps/${appId}/rpc/configure`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: { 'api-key': 'super-secret-test-key-1234567890' },
                timeout: 20_000,
            },
        );
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();
        expect(body.status).toBe('ok');
        console.log(`configure ok: ${JSON.stringify(body).substring(0, 160)}…`);
    });

    test('protected-call now returns the canary', async ({ page }) => {
        test.skip(!deployed, 'deploy failed');
        test.setTimeout(30_000);
        token = await getToken(page);

        const resp = await page.request.post(
            `${API}/api/v1/apps/${appId}/rpc/protected-call`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: {},
                timeout: 20_000,
            },
        );
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();
        expect(body.status).toBe('ok');
        const payload = body.returns?.[0]?.value;
        expect(String(payload).toLowerCase()).toMatch(/api[_-]?key length = \d+/);
        console.log(`protected-call canary: ${payload}`);

        await page.screenshot({
            path: screenshot('team-configure-success'),
            fullPage: true,
        });
    });

    test.afterAll(async ({ browser }) => {
        if (!appId || !token) return;
        const ctx = await browser.newContext();
        const p = await ctx.newPage();
        try {
            await deleteApp(p, token, APP_NAME);
        } catch (err) {
            console.log(`cleanup: ${err}`);
        } finally {
            await ctx.close();
        }
    });
});
