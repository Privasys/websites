/**
 * Gemma 4 dynamic-load deployment - e2e test.
 *
 * Deploys the generic confidential-ai container image to the ai-gpu TDX
 * enclave, then loads the gemma4 model on demand via the dynamic
 * /v1/models/load API. The /mnt directory is bind-mounted at /models
 * (read-only) via the image's ai.privasys.volume label, exposing each
 * pre-provisioned model disk as a subdirectory (e.g. /models/model-gemma4-31b).
 *
 * Run:
 *   cd websites
 *   E2E_USER_EMAIL=alice@privasys.org E2E_USER_PASSWORD='EnqMS75!;%P?vaY@' \
 *     npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     gemma4-deploy.spec.ts --project=gemma4 --no-deps
 */
import { test, expect } from '@playwright/test';
import { setupAuth, getToken as getE2eToken } from './e2e-auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';
const APP_NAME = 'e2e-gemma4-pkg';
const CONTAINER_IMAGE = 'ghcr.io/privasys/confidential-ai:latest';
const CONTAINER_PORT = 8080;
// Model directory name under /models (bind-mounted from /mnt on the host).
// Host disk-mounter strips the 'model-' prefix from GCE device names
// (model-gemma4-31b -> /mnt/gemma4-31b -> /models/gemma4-31b in container).
const MODEL_NAME = 'gemma4-31b';

let token: string;
let appId: string;
let versionId: string;

async function getToken(page: import('@playwright/test').Page): Promise<string> {
    if (token) return token;
    await setupAuth(page);
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    token = await getE2eToken();
    expect(token).toBeTruthy();
    return token;
}

async function cleanupApp(page: import('@playwright/test').Page, tok: string, name: string) {
    const resp = await page.request.get(`${API}/api/v1/apps`, {
        headers: { Authorization: `Bearer ${tok}` },
    });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    const app = apps.find(a => a.name === name);
    if (!app) return;

    // Stop active deployments
    const depsResp = await page.request.get(`${API}/api/v1/apps/${app.id}/deployments`, {
        headers: { Authorization: `Bearer ${tok}` },
    });
    if (depsResp.ok()) {
        const deps: { id: string; status: string }[] = await depsResp.json();
        for (const dep of deps.filter(d => d.status === 'active')) {
            await page.request.post(`${API}/api/v1/apps/${app.id}/deployments/${dep.id}/stop`, {
                headers: { Authorization: `Bearer ${tok}` },
                timeout: 30_000,
            });
        }
        if (deps.some(d => d.status === 'active')) {
            await page.waitForTimeout(15_000);
        }
    }
    await page.request.delete(`${API}/api/v1/apps/${app.id}`, {
        headers: { Authorization: `Bearer ${tok}` },
        timeout: 30_000,
    });
    // Wait long enough for the enclave to fully remove the container
    await page.waitForTimeout(20_000);
    console.log(`Cleaned up ${name} (${app.id})`);
}

test.describe('Gemma 4 Package Deploy', () => {
    test.describe.configure({ mode: 'serial' });

    test('cleanup previous run', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        await cleanupApp(page, token, APP_NAME);
    });

    test('create package app', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);

        const resp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: APP_NAME,
                app_type: 'container',
                source_type: 'package',
                container_image: CONTAINER_IMAGE,
                container_port: CONTAINER_PORT,
                container_devices: [
                    '/dev/nvidia0',
                    '/dev/nvidiactl',
                    '/dev/nvidia-uvm',
                    '/dev/nvidia-uvm-tools',
                ],
            },
        });

        const body = await resp.json();
        console.log('Create response:', resp.status(), JSON.stringify(body).substring(0, 300));
        expect(resp.ok(), `create app failed: ${JSON.stringify(body)}`).toBeTruthy();
        expect(body.app_type).toBe('container');
        expect(body.status).toBe('built');

        // container_mcp should be auto-detected from OCI label
        expect(body.container_mcp).toBeTruthy();
        const toolNames: string[] = body.container_mcp?.tools?.map((t: { name: string }) => t.name) ?? [];
        console.log('container_mcp tools:', toolNames);
        // The generic image exposes the dynamic model loading tools.
        for (const expected of ['load_model', 'model_status', 'unload_model', 'readiness']) {
            expect(toolNames, `missing tool: ${expected}`).toContain(expected);
        }

        appId = body.id;
        console.log(`Created: ${APP_NAME} (${appId})`);
    });

    test('version is ready', async ({ page }) => {
        test.setTimeout(15_000);
        token = await getToken(page);

        const resp = await page.request.get(`${API}/api/v1/apps/${appId}/versions`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(resp.ok()).toBeTruthy();
        const versions: { id: string; status: string; version_number: number }[] = await resp.json();
        console.log('Versions:', versions.map(v => `v${v.version_number} ${v.status}`));

        const ready = versions.find(v => v.status === 'ready');
        expect(ready, 'no ready version found').toBeTruthy();
        versionId = ready!.id;
        console.log(`Version ready: ${versionId}`);
    });

    test('deploy to TDX enclave', async ({ page }) => {
        // Generic image starts the proxy immediately; the container is
        // healthy in seconds. Model load happens later via API.
        test.setTimeout(180_000);
        token = await getToken(page);

        // Find TDX enclave
        const enclResp = await page.request.get(`${API}/api/v1/enclaves`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(enclResp.ok()).toBeTruthy();
        const enclaves: { id: string; name: string; tee_type: string; status: string }[] = await enclResp.json();
        const tdx = enclaves.find(e => e.name.includes('m2-dev-ai') && e.status === 'active');
        if (!tdx) {
            console.log('Available enclaves:', enclaves.map(e => `${e.name} (${e.tee_type}, ${e.status})`));
        }
        expect(tdx, 'm2-dev-ai TDX enclave not found or not active').toBeTruthy();
        console.log(`Deploying to: ${tdx!.name} (${tdx!.id})`);

        // Direct-deploy is portal-driven now (sealed PrivasysSession from
        // the browser to the enclave manager). The legacy POST /deploy on
        // mgmt-service was removed by the direct-deploy refactor — drive
        // the dashboard UI exactly as a user would.
        await setupAuth(page);
        await page.goto(`/dashboard/apps/${appId}?tab=deployments`);
        await page.waitForLoadState('domcontentloaded');

        const versionSelect = page.locator('select').first();
        await versionSelect.waitFor({ state: 'visible', timeout: 30_000 });
        await versionSelect.selectOption({ value: versionId });

        const enclaveSelect = page.locator('select').nth(1);
        await enclaveSelect.selectOption({ value: tdx!.id });

        const deployBtn = page.getByRole('button', { name: /^deploy$/i });
        await expect(deployBtn).toBeEnabled({ timeout: 15_000 });
        await deployBtn.click();

        // Cold image pull on first deploy can be slow; just wait for the
        // "Deploying…" indicator to clear, then the next test polls
        // /deployments for status=active.
        await expect(page.getByRole('button', { name: /deploying/i }))
            .toHaveCount(0, { timeout: 180_000 });
    });

    test('verify deployment active', async ({ page }) => {
        // Cold pull of the confidential-ai image (~5.9 GiB) over the public
        // ghcr.io path can take 15-20 min on a fresh /data/containerd. Once
        // we cut over to disk:// resolution this can drop back to ~30s.
        test.setTimeout(25 * 60_000);
        token = await getToken(page);

        // Poll deployments until one is active (deploy may still be propagating)
        let active: { id: string; status: string; hostname: string; enclave_host: string } | undefined;
        for (let i = 0; i < 240; i++) {
            const resp = await page.request.get(`${API}/api/v1/apps/${appId}/deployments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            expect(resp.ok()).toBeTruthy();
            const deps: { id: string; status: string; hostname: string; enclave_host: string }[] = await resp.json();
            active = deps.find(d => d.status === 'active');
            if (active) break;
            const failed = deps.find(d => d.status === 'failed');
            if (failed) {
                console.log('Deployment failed:', JSON.stringify(failed));
                break;
            }
            console.log(`Poll ${i + 1}/240: no active deployment yet, statuses: ${deps.map(d => d.status)}`);
            await page.waitForTimeout(5_000);
        }
        expect(active, 'no active deployment').toBeTruthy();
        console.log(`Active: ${active!.hostname} on ${active!.enclave_host}`);
    });

    test('API Testing tab shows MCP tools', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);

        // Check schema endpoint returns tools derived from container_mcp
        const resp = await page.request.get(`${API}/api/v1/apps/${appId}/schema`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(resp.ok()).toBeTruthy();
        const schema = await resp.json();
        console.log('Schema:', JSON.stringify(schema).substring(0, 500));
        const functions = schema.schema?.functions ?? schema.functions ?? [];
        expect(functions.length).toBeGreaterThanOrEqual(8);

        const toolNames = functions.map((f: { name: string }) => f.name);
        for (const expected of [
            'chat', 'complete', 'models', 'health',
            'load_model', 'model_status', 'unload_model', 'readiness',
        ]) {
            expect(toolNames, `missing tool: ${expected}`).toContain(expected);
        }
    });

    test('trigger dynamic model load', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);

        // POST /v1/models/load via the gateway RPC route. This is
        // idempotent: returns 202 if loading starts or already in progress,
        // returns 200 if already loaded.
        const resp = await page.request.post(
            `${API}/api/v1/apps/${appId}/rpc/load_model`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    model: MODEL_NAME,
                    dtype: 'bfloat16',
                    max_model_len: 8192,
                    gpu_memory_utilization: 0.90,
                },
                timeout: 30_000,
            },
        );
        const body = await resp.text();
        console.log(`load_model HTTP ${resp.status()}: ${body.substring(0, 300)}`);
        // 200 (already loaded) or 202 (loading started) are both acceptable.
        expect([200, 202]).toContain(resp.status());
    });

    test('wait for model ready', async ({ page }) => {
        test.setTimeout(600_000); // 10 min - model load can be slow
        token = await getToken(page);

        // Poll model_status until state == 'ready'.
        for (let i = 0; i < 120; i++) {
            try {
                const resp = await page.request.post(
                    `${API}/api/v1/apps/${appId}/rpc/model_status`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        data: {},
                        timeout: 10_000,
                    },
                );
                if (resp.ok()) {
                    const status = await resp.json();
                    const state = status?.state ?? status?.status;
                    const progress = status?.progress ?? 0;
                    const elapsed = status?.elapsed_s ?? 0;
                    console.log(`Model status ${i + 1}/120: state=${state} progress=${progress} elapsed=${elapsed}s msg=${status?.message ?? ''}`);
                    if (state === 'ready') {
                        console.log(`Model ready after ${i * 5}s`);
                        return;
                    }
                    if (state === 'failed') {
                        expect(false, `model load failed: ${status?.error ?? 'unknown error'}`).toBeTruthy();
                    }
                } else {
                    console.log(`Model status poll ${i + 1}/120: HTTP ${resp.status()}`);
                }
            } catch {
                console.log(`Model status poll ${i + 1}/120: request failed`);
            }
            await page.waitForTimeout(5_000);
        }
        expect(false, 'model did not become ready within 10 minutes').toBeTruthy();
    });

    test('API Testing - Rousseau chat prompt', async ({ page }) => {
        test.setTimeout(120_000); // 2 min - inference can be slow
        token = await getToken(page);

        const PROMPT = 'From the perspective of Jean-Jacques Rousseau, is it legitimate for elected officials to maintain high public deficits, even if it risks burdening future generations? Please reply in 3-5 paragraphs, use UK English.';

        const resp = await page.request.post(
            `${API}/api/v1/apps/${appId}/rpc/chat`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    messages: [{ role: 'user', content: PROMPT }],
                    max_tokens: 1024,
                    temperature: 0.7,
                    seed: 123456,
                },
                timeout: 90_000,
            },
        );

        const rawText = await resp.text();
        console.log(`Chat HTTP ${resp.status()}, body length: ${rawText.length}, first 500: ${rawText.substring(0, 500)}`);
        expect(resp.ok(), `RPC chat failed: HTTP ${resp.status()}, body: ${rawText.substring(0, 300)}`).toBeTruthy();

        const body = JSON.parse(rawText);
        console.log('Chat response:', JSON.stringify(body).substring(0, 500));

        // Verify the response contains meaningful content about Rousseau
        const text = typeof body === 'string' ? body :
            body?.choices?.[0]?.message?.content ??
            body?.response ?? body?.text ?? JSON.stringify(body);
        console.log('Response text (first 300 chars):', String(text).substring(0, 300));
        expect(String(text).length).toBeGreaterThan(200);
        expect(String(text).toLowerCase()).toContain('rousseau');
    });

    test('Chat tab loads and renders UI', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);

        // Fetch the Chat UI HTML (same as AppUITab does)
        const uiResp = await page.request.get(
            `${API}/api/v1/apps/${appId}/ui`,
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        expect(uiResp.ok(), `UI fetch failed: HTTP ${uiResp.status()}`).toBeTruthy();

        const html = await uiResp.text();
        expect(html.length).toBeGreaterThan(100);
        // The chat UI HTML should contain recognisable elements
        expect(html).toContain('<');
        console.log(`Chat UI HTML loaded: ${html.length} bytes`);

        // Navigate to app detail, click Chat tab, verify iframe loads with content
        await page.goto(`/dashboard/apps/${appId}?tab=ui`);
        await page.waitForSelector('nav', { timeout: 10_000 });

        // Wait for the Chat tab content to render (iframe with srcDoc)
        const iframe = page.locator('iframe[title]');
        await iframe.waitFor({ state: 'visible', timeout: 15_000 });
        console.log('Chat tab iframe is visible');
    });
});
