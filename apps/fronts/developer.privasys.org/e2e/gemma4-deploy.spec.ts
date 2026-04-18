/**
 * Gemma 4 package deployment - e2e test.
 *
 * Deploys the confidential-ai-gemma4 container image (pre-built package)
 * to the ai-gpu TDX enclave. Model weights are pre-loaded on a persistent
 * disk, bind-mounted at /models/ via the image's ai.privasys.volume label.
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
const CONTAINER_IMAGE = 'ghcr.io/privasys/confidential-ai-gemma4:latest';
const CONTAINER_PORT = 8080;

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
        console.log('container_mcp tools:', body.container_mcp?.tools?.map((t: { name: string }) => t.name));

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
        test.setTimeout(720_000); // 12 min - WaitReady blocks until model loaded
        token = await getToken(page);

        // Find TDX enclave
        const enclResp = await page.request.get(`${API}/api/v1/enclaves`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(enclResp.ok()).toBeTruthy();
        const enclaves: { id: string; name: string; tee_type: string; status: string }[] = await enclResp.json();
        const tdx = enclaves.find(e => e.name.includes('ai-gpu') && e.status === 'active');
        if (!tdx) {
            console.log('Available enclaves:', enclaves.map(e => `${e.name} (${e.tee_type}, ${e.status})`));
        }
        expect(tdx, 'ai-gpu TDX enclave not found or not active').toBeTruthy();
        console.log(`Deploying to: ${tdx!.name} (${tdx!.id})`);

        // Deploy - model weights are pre-loaded on a persistent disk,
        // bind-mounted at /models/ via the image's ai.privasys.volume label.
        let deployBody: { id: string; status: string; hostname: string } | undefined;
        for (let attempt = 0; attempt < 6; attempt++) {
            const resp = await page.request.post(
                `${API}/api/v1/apps/${appId}/versions/${versionId}/deploy`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        enclave_id: tdx!.id,
                        runtime_env: {},
                    },
                    timeout: 660_000,
                },
            );

            const respText = await resp.text();
            console.log(`Deploy attempt ${attempt + 1}: HTTP ${resp.status()}, body: ${respText.substring(0, 300)}`);

            if (resp.ok()) {
                deployBody = JSON.parse(respText);
                break;
            }

            // Retry on conflict (container already exists from a previous failed run)
            // or transient errors (502/500 during image pull, service unavailable)
            const retryable = respText.includes('already loaded') ||
                respText.includes('already exists') ||
                respText.includes('service unavailable') ||
                resp.status() === 502 ||
                resp.status() === 500 ||
                resp.status() === 503;
            if (retryable) {
                console.log(`Retryable error (attempt ${attempt + 1}), waiting 30s...`);
                await page.waitForTimeout(30_000);
                continue;
            }

            // Non-retryable error
            expect(resp.ok(), `deploy failed: ${respText}`).toBeTruthy();
        }

        expect(deployBody).toBeTruthy();
        // The deploy response may be a zero-value struct if the request
        // takes >60s (context canceled during re-fetch). Verify via polling instead.
        if (deployBody!.status === 'active') {
            console.log(`Deployed: ${deployBody!.hostname} (${deployBody!.id})`);
        } else {
            console.log('Deploy returned OK but empty body (context timeout), will verify via polling');
        }
    });

    test('verify deployment active', async ({ page }) => {
        test.setTimeout(180_000);
        token = await getToken(page);

        // Poll deployments until one is active (deploy may still be propagating)
        let active: { id: string; status: string; hostname: string; enclave_host: string } | undefined;
        for (let i = 0; i < 30; i++) {
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
            console.log(`Poll ${i + 1}/30: no active deployment yet, statuses: ${deps.map(d => d.status)}`);
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
        expect(functions.length).toBeGreaterThanOrEqual(4);

        const toolNames = functions.map((f: { name: string }) => f.name);
        for (const expected of ['chat', 'complete', 'models', 'health']) {
            expect(toolNames, `missing tool: ${expected}`).toContain(expected);
        }
    });

    test('wait for model ready', async ({ page }) => {
        test.setTimeout(600_000); // 10 min - model download + load can be very slow
        token = await getToken(page);

        // Poll the health RPC endpoint until vLLM is ready
        for (let i = 0; i < 120; i++) {
            try {
                const resp = await page.request.post(
                    `${API}/api/v1/apps/${appId}/rpc/health`,
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
                    console.log(`Model ready after ${i * 5}s`);
                    return;
                }
                console.log(`Health poll ${i + 1}/120: HTTP ${resp.status()}`);
            } catch {
                console.log(`Health poll ${i + 1}/120: request failed`);
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
