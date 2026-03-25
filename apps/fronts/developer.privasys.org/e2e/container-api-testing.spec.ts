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
const TEST_COMMIT_URL = 'https://github.com/Privasys/container-app-example/commit/04a44ffc9068a8600a69b7791bde8fd970362502';
const TEST_CONTAINER_PORT = 8080;

const TEST_MCP_MANIFEST = {
    tools: [
        {
            name: 'browse',
            description: 'Fetch a web page using the Lightpanda headless browser.',
            endpoint: '/browse',
            inputSchema: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The URL of the web page to fetch',
                    },
                },
                required: ['url'],
            },
        },
    ],
};

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

    test('create container app with MCP manifest', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);
        await deleteAppIfExists(page, token);

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
                container_mcp: TEST_MCP_MANIFEST,
            },
        });

        expect(createResp.ok()).toBeTruthy();
        const body = await createResp.json();
        expect(body.app_type).toBe('container');
        expect(body.container_mcp).toBeTruthy();
        appId = body.id;
        console.log(`Created container app: ${TEST_APP_NAME} (${appId})`);
    });

    test('deploy container app to TDX enclave', async ({ page }) => {
        test.setTimeout(120_000);
        token = await getToken(page);
        if (!appId) {
            const resp = await page.request.get(`${API}/api/v1/apps`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const apps: { id: string; name: string }[] = await resp.json();
            appId = apps.find(a => a.name === TEST_APP_NAME)!.id;
        }

        // Create version
        const verResp = await page.request.post(`${API}/api/v1/apps/${appId}/versions`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: {},
        });
        expect(verResp.ok()).toBeTruthy();
        const version = await verResp.json();
        console.log(`Created version: v${version.version_number} (${version.id})`);

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
            `${API}/api/v1/apps/${appId}/versions/${version.id}/deploy`,
            {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: { enclave_id: enclaveId },
                timeout: 90_000,
            },
        );
        console.log(`Deploy response: ${deployResp.status()}`);
        const deployBody = await deployResp.json();
        console.log(`Deploy body: ${JSON.stringify(deployBody).substring(0, 300)}`);
        expect(deployResp.ok()).toBeTruthy();

        // Poll until app status is "deployed"
        for (let i = 0; i < 30; i++) {
            await page.waitForTimeout(2_000);
            const appResp = await page.request.get(`${API}/api/v1/apps/${appId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const app = await appResp.json();
            console.log(`  poll ${i}: status=${app.status}`);
            if (app.status === 'deployed') break;
            if (app.status === 'failed') throw new Error('Deploy failed');
        }
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

        // Should show "url" parameter input
        await expect(page.locator('text=url')).toBeVisible();

        // Should have a Send button
        await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();

        await page.screenshot({ path: screenshot('container-api-testing-ui'), fullPage: true });
        console.log('API Testing tab loaded with browse function and url parameter');
    });

    test('container app without MCP hides API Testing tab', async ({ page }) => {
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

        // Create container WITHOUT MCP
        const createResp = await page.request.post(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: {
                name: noMcpName,
                source_type: 'github',
                commit_url: TEST_COMMIT_URL,
                app_type: 'container',
                container_port: 8080,
            },
        });
        expect(createResp.ok()).toBeTruthy();
        const noMcpApp = await createResp.json();

        // Navigate to the app detail page
        await page.goto(`/dashboard/apps/${noMcpApp.id}`);
        await page.waitForSelector('nav', { timeout: 5_000 });

        // Overview tab should be visible
        await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 5_000 });

        // API Testing tab should NOT be visible (no MCP = no schema)
        await expect(page.getByRole('button', { name: 'API Testing' })).not.toBeVisible();

        await page.screenshot({ path: screenshot('container-no-mcp-no-api-testing'), fullPage: true });
        console.log('Confirmed: API Testing tab hidden for container without MCP');

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
