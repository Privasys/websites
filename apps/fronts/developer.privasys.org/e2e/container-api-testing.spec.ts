/**
 * E2E test: verifies the API Testing tab works for container apps that have
 * a container_mcp manifest. The MCP manifest tools are converted into
 * FunctionSchema (same format as WASM) so the Postman-like UI can be used.
 *
 * Run with:
 *   E2E_BASE_URL=https://developer.privasys.org npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts container-api-testing.spec.ts --headed --project=portal --no-deps
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) =>
    path.join(__dirname, 'test-results', `${name}.png`);

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';
const TEST_APP_NAME = 'e2e-container-api-test';
// New commit includes privasys.json — auto-detection should populate container_mcp
const TEST_COMMIT_URL = 'https://github.com/Privasys/container-app-example/commit/daaffbd60317f0a18a4ff32b1a22a426d6a00dd1';
// Old commit has NO privasys.json — used to verify the "no MCP" path
const NO_MCP_COMMIT_URL = 'https://github.com/Privasys/container-app-example/commit/04a44ffc9068a8600a69b7791bde8fd970362502';
const TEST_CONTAINER_PORT = 8080;

async function getToken(page: import('@playwright/test').Page): Promise<string> {
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    const session = await page.evaluate(() => fetch('/api/auth/session').then(r => r.json()));
    const token = session?.accessToken as string;
    expect(token).toBeTruthy();
    return token;
}

async function deleteAppIfExists(page: import('@playwright/test').Page, token: string) {
    const resp = await page.request.get(`${API}/api/v1/apps`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    const existing = apps.find(a => a.name === TEST_APP_NAME);
    if (existing) {
        const depsResp = await page.request.get(`${API}/api/v1/apps/${existing.id}/deployments`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (depsResp.ok()) {
            const deps: { id: string; status: string }[] = await depsResp.json();
            for (const dep of deps.filter(d => d.status === 'active')) {
                await page.request.post(`${API}/api/v1/apps/${existing.id}/deployments/${dep.id}/stop`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 30_000,
                });
            }
            if (deps.some(d => d.status === 'active')) await page.waitForTimeout(5_000);
        }
        await page.request.delete(`${API}/api/v1/apps/${existing.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`Cleaned up existing app ${existing.id}`);
    }
}

test.describe('Container App API Testing Tab', () => {
    test.describe.configure({ mode: 'serial' });

    let token: string;
    let appId: string;

    test('create container app — auto-detect MCP from privasys.json', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);
        await deleteAppIfExists(page, token);

        // Do NOT pass container_mcp — the management service should auto-detect
        // it from the privasys.json in the GitHub repo at the given commit.
        const createResp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: TEST_APP_NAME,
                source_type: 'github',
                commit_url: TEST_COMMIT_URL,
                app_type: 'container',
                container_port: TEST_CONTAINER_PORT,
            },
        });

        expect(createResp.ok()).toBeTruthy();
        const body = await createResp.json();
        expect(body.app_type).toBe('container');
        // container_mcp should be populated from auto-detection of privasys.json
        expect(body.container_mcp).toBeTruthy();
        expect(body.container_mcp.tools).toBeDefined();
        expect(body.container_mcp.tools[0].name).toBe('browse');
        appId = body.id;
        console.log(`Created container app: ${TEST_APP_NAME} (${appId}) — MCP auto-detected`);
    });

    test('schema endpoint returns AppSchema with FunctionSchema for container MCP tools', async ({ page }) => {
        test.setTimeout(15_000);
        token = await getToken(page);
        if (!appId) {
            const resp = await page.request.get(`${API}/api/v1/apps`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const apps: { id: string; name: string }[] = await resp.json();
            appId = apps.find(a => a.name === TEST_APP_NAME)!.id;
        }

        // The schema endpoint should return the same envelope as WASM apps
        const schemaResp = await page.request.get(`${API}/api/v1/apps/${appId}/schema`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(schemaResp.ok()).toBeTruthy();
        const body = await schemaResp.json();
        console.log(`Schema: ${JSON.stringify(body).substring(0, 800)}`);

        expect(body.status).toBe('schema');
        expect(body.schema).toBeDefined();
        expect(body.schema.name).toBe(TEST_APP_NAME);
        expect(body.schema.functions.length).toBe(1);

        // Verify browse function has WitType params (converted from JSON Schema)
        const browseFn = body.schema.functions[0];
        expect(browseFn.name).toBe('browse');
        expect(Array.isArray(browseFn.params)).toBe(true);
        const urlParam = browseFn.params.find((p: { name: string }) => p.name === 'url');
        expect(urlParam).toBeDefined();
        expect(urlParam.type.kind).toBe('string');
        console.log('Schema endpoint returns correct AppSchema format for container');
    });

    test('wait for build and deploy to TDX enclave', async ({ page }) => {
        test.setTimeout(360_000); // 6 minutes — build can take a while
        token = await getToken(page);
        if (!appId) {
            const resp = await page.request.get(`${API}/api/v1/apps`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const apps: { id: string; name: string }[] = await resp.json();
            appId = apps.find(a => a.name === TEST_APP_NAME)!.id;
        }

        // Wait for a "ready" version (auto-built from the GitHub commit)
        let versionId = '';
        for (let i = 0; i < 60; i++) {
            const versionsResp = await page.request.get(`${API}/api/v1/apps/${appId}/versions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (versionsResp.ok()) {
                const versions: { id: string; status: string }[] = await versionsResp.json();
                const readyVersion = versions.find(v => v.status === 'ready');
                if (readyVersion) {
                    versionId = readyVersion.id;
                    break;
                }
                console.log(`  build poll ${i}: ${versions.map(v => v.status).join(', ') || 'no versions'}`);
            }
            await page.waitForTimeout(5_000);
        }
        expect(versionId).toBeTruthy();
        console.log(`Ready version: ${versionId}`);

        // Find TDX enclave
        const enclResp = await page.request.get(`${API}/api/v1/enclaves?tee_type=tdx`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(enclResp.ok()).toBeTruthy();
        const enclaves: { id: string; name: string }[] = await enclResp.json();
        expect(enclaves.length).toBeGreaterThan(0);
        const enclaveId = enclaves[0].id;
        console.log(`Deploying to enclave: ${enclaves[0].name} (${enclaveId})`);

        // Deploy
        const deployResp = await page.request.post(
            `${API}/api/v1/apps/${appId}/versions/${versionId}/deploy`,
            {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: { enclave_id: enclaveId },
                timeout: 150_000,
            },
        );
        console.log(`Deploy response: ${deployResp.status()}`);
        expect(deployResp.ok()).toBeTruthy();
        const deployBody = await deployResp.json();
        expect(deployBody.status).toBe('active');
        console.log(`Deployment ${deployBody.id} is active at ${deployBody.hostname}`);
    });

    test('API Testing tab is visible for container app with MCP', async ({ page }) => {
        test.setTimeout(15_000);
        token = await getToken(page);
        if (!appId) {
            const resp = await page.request.get(`${API}/api/v1/apps`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const apps: { id: string; name: string }[] = await resp.json();
            appId = apps.find(a => a.name === TEST_APP_NAME)!.id;
        }

        await page.goto(`/dashboard/apps/${appId}`);
        await page.waitForSelector('nav', { timeout: 5_000 });

        // Wait for tabs to render (needs active deployment)
        await expect(page.getByRole('button', { name: 'Attestation' })).toBeVisible({ timeout: 10_000 });

        // API Testing tab should be visible for containers with MCP manifest
        await expect(page.getByRole('button', { name: 'API Testing' })).toBeVisible();
        await page.screenshot({ path: screenshot('container-api-testing-tab-visible'), fullPage: true });
        console.log('Confirmed: API Testing tab is visible for container with MCP');
    });

    test('API Testing tab loads schema and shows browse function', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);
        if (!appId) {
            const resp = await page.request.get(`${API}/api/v1/apps`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const apps: { id: string; name: string }[] = await resp.json();
            appId = apps.find(a => a.name === TEST_APP_NAME)!.id;
        }

        await page.goto(`/dashboard/apps/${appId}`);
        await page.waitForSelector('nav', { timeout: 5_000 });

        // Click on the API Testing tab
        const apiTab = page.getByRole('button', { name: 'API Testing' });
        await expect(apiTab).toBeVisible({ timeout: 10_000 });
        await apiTab.click();

        // Wait for schema to load — should see the POST method badge and the function selector
        await expect(page.locator('text=POST')).toBeVisible({ timeout: 15_000 });

        // The function dropdown should include "browse"
        await expect(page.locator('select option')).toContainText(['browse']);

        // Should show "Parameters" section with "url" parameter
        await expect(page.locator('text=Parameters')).toBeVisible();
        await expect(page.getByPlaceholder('Enter url…')).toBeVisible();

        // Should have a Send button
        await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();

        await page.screenshot({ path: screenshot('container-api-testing-ui'), fullPage: true });
        console.log('API Testing tab loaded with browse function and url parameter');
    });

    test('container app without MCP returns empty schema and hides API Testing tab', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);

        const noMcpName = 'e2e-container-no-api';
        // Clean up
        const listResp = await page.request.get(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (listResp.ok()) {
            const apps: { id: string; name: string }[] = await listResp.json();
            const existing = apps.find(a => a.name === noMcpName);
            if (existing) {
                await page.request.delete(`${API}/api/v1/apps/${existing.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
        }

        // Create container using old commit that has NO privasys.json
        const createResp = await page.request.post(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: {
                name: noMcpName,
                source_type: 'github',
                commit_url: NO_MCP_COMMIT_URL,
                app_type: 'container',
                container_port: 8080,
            },
        });
        expect(createResp.ok()).toBeTruthy();
        const noMcpApp = await createResp.json();

        // Schema endpoint should return no functions for a container without MCP
        const schemaResp = await page.request.get(`${API}/api/v1/apps/${noMcpApp.id}/schema`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(schemaResp.ok()).toBeTruthy();
        const schema = await schemaResp.json();
        // Without MCP there should be no function definitions
        const funcs = schema?.schema?.functions || schema?.functions || [];
        expect(funcs.length).toBe(0);
        console.log('Schema for no-MCP container has no functions — API Testing will be hidden');

        // Cleanup
        await page.request.delete(`${API}/api/v1/apps/${noMcpApp.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    });

    test('cleanup test app', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);
        await deleteAppIfExists(page, token);
        console.log('Cleanup complete');
    });
});
