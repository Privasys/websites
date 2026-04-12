/**
 * Gemma 4 package deployment - e2e test.
 *
 * Deploys the confidential-ai-gemma4 container image (pre-built package)
 * to the ai-gpu TDX enclave with HF_TOKEN as a runtime env var.
 *
 * Run:
 *   cd websites
 *   E2E_USER_EMAIL=alice@privasys.org E2E_USER_PASSWORD='EnqMS75!;%P?vaY@' \
 *     npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     gemma4-deploy.spec.ts --project=gemma4 --no-deps
 */
import { test, expect } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';
const APP_NAME = 'e2e-gemma4-pkg';
const CONTAINER_IMAGE = 'ghcr.io/privasys/confidential-ai-gemma4:latest';
const CONTAINER_PORT = 8080;
const HF_TOKEN = process.env.HF_TOKEN || '';

let token: string;
let appId: string;
let versionId: string;

async function getToken(page: import('@playwright/test').Page): Promise<string> {
    if (token) return token;
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    const session = await page.evaluate(() =>
        fetch('/api/auth/session').then(r => r.json()),
    );
    token = session?.accessToken as string;
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
        test.setTimeout(180_000); // 3 min - container pull can be slow
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

        // Deploy with HF_TOKEN and MODEL_NAME as runtime env
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
                        runtime_env: {
                            HF_TOKEN: HF_TOKEN,
                            MODEL_NAME: 'google/gemma-4-31b-it',
                        },
                    },
                    timeout: 150_000,
                },
            );

            const respText = await resp.text();
            console.log(`Deploy attempt ${attempt + 1}: HTTP ${resp.status()}, body: ${respText.substring(0, 300)}`);

            if (resp.ok()) {
                deployBody = JSON.parse(respText);
                break;
            }

            // Retry on conflict (container already exists from a previous failed run)
            if (respText.includes('already loaded') || respText.includes('already exists')) {
                console.log('Container conflict, waiting 15s before retry...');
                await page.waitForTimeout(15_000);
                continue;
            }

            // Non-retryable error
            expect(resp.ok(), `deploy failed: ${respText}`).toBeTruthy();
        }

        expect(deployBody).toBeTruthy();
        expect(deployBody!.status).toBe('active');
        console.log(`Deployed: ${deployBody!.hostname} (${deployBody!.id})`);
    });

    test('verify deployment active', async ({ page }) => {
        test.setTimeout(15_000);
        token = await getToken(page);

        const resp = await page.request.get(`${API}/api/v1/apps/${appId}/deployments`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(resp.ok()).toBeTruthy();
        const deps: { id: string; status: string; hostname: string; enclave_host: string }[] = await resp.json();
        const active = deps.find(d => d.status === 'active');
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

    test('UI tab available', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);

        await page.goto(`/dashboard/apps/${appId}`);
        await page.waitForSelector('nav', { timeout: 10_000 });
        await page.locator(`text=${APP_NAME}`).first().waitFor({ timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(3_000);

        // Tabs render as <button> elements
        const apiVisible = (await page.locator('button:has-text("API Testing")').count()) > 0;
        const aiToolsVisible = (await page.locator('button:has-text("AI Tools")').count()) > 0;
        const chatVisible = (await page.locator('button:has-text("Chat")').count()) > 0;
        console.log(`Tabs visible - API Testing: ${apiVisible}, AI Tools: ${aiToolsVisible}, Chat: ${chatVisible}`);

        expect(apiVisible || aiToolsVisible || chatVisible, 'neither API Testing, AI Tools, nor Chat tab is visible').toBeTruthy();
    });
});
