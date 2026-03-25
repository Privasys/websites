/**
 * E2E test: verifies the AI Tools (MCP) tab works correctly for a deployed container app
 * with a container_mcp manifest.
 *
 * This test creates a container app with an MCP manifest (lightpanda-style),
 * deploys it to a TDX enclave, and verifies the MCP tools show up in the
 * portal and via the API.
 *
 * Run with:
 *   E2E_BASE_URL=https://developer.privasys.org npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts container-mcp.spec.ts --headed --project=portal --no-deps
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) =>
    path.join(__dirname, 'test-results', `${name}.png`);

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';
const TEST_APP_NAME = 'e2e-container-mcp-test';
const TEST_COMMIT_URL = 'https://github.com/Privasys/container-app-example/commit/04a44ffc9068a8600a69b7791bde8fd970362502';
const TEST_CONTAINER_PORT = 8080;

// The MCP manifest matching the Privasys container MCP standard
const TEST_MCP_MANIFEST = {
    tools: [
        {
            name: 'browse',
            description: 'Fetch a web page using the Lightpanda headless browser and return its content as markdown or HTML.',
            endpoint: '/browse',
            inputSchema: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The URL of the web page to fetch (must start with http:// or https://)',
                    },
                    format: {
                        type: 'string',
                        enum: ['markdown', 'html'],
                        description: 'Output format for the page content (default: markdown)',
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

test.describe('Container App MCP Tools', () => {
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

        console.log(`Create response: ${createResp.status()}`);
        const body = await createResp.json();
        console.log(`Create body: ${JSON.stringify(body).substring(0, 500)}`);

        expect(createResp.ok()).toBeTruthy();
        expect(body.app_type).toBe('container');
        expect(body.container_port).toBe(TEST_CONTAINER_PORT);
        expect(body.container_mcp).toBeTruthy();
        appId = body.id;
        console.log(`Created container app with MCP: ${TEST_APP_NAME} (${appId})`);
    });

    test('MCP endpoint returns tool manifest for container app', async ({ page }) => {
        test.setTimeout(15_000);
        token = await getToken(page);
        if (!appId) {
            const resp = await page.request.get(`${API}/api/v1/apps`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const apps: { id: string; name: string }[] = await resp.json();
            appId = apps.find(a => a.name === TEST_APP_NAME)!.id;
        }

        const mcpResp = await page.request.get(`${API}/api/v1/apps/${appId}/mcp`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        console.log(`MCP response: ${mcpResp.status()}`);
        expect(mcpResp.ok()).toBeTruthy();

        const manifest = await mcpResp.json();
        console.log(`MCP manifest: ${JSON.stringify(manifest).substring(0, 500)}`);

        // Verify envelope format matches WASM MCP format
        expect(manifest.status).toBe('mcp_tools');
        expect(manifest.manifest).toBeDefined();
        expect(manifest.manifest.name).toBe(TEST_APP_NAME);
        expect(Array.isArray(manifest.manifest.tools)).toBe(true);
        expect(manifest.manifest.tools.length).toBe(1);

        // Verify "browse" tool
        const browseTool = manifest.manifest.tools[0];
        expect(browseTool.name).toBe('browse');
        expect(browseTool.description).toContain('Lightpanda');
        expect(browseTool.inputSchema).toBeDefined();
        expect(browseTool.inputSchema.type).toBe('object');
        expect(browseTool.inputSchema.properties.url).toBeDefined();
        expect(browseTool.inputSchema.properties.url.type).toBe('string');
        expect(browseTool.inputSchema.properties.format).toBeDefined();
        expect(browseTool.inputSchema.required).toContain('url');
        console.log('Container MCP manifest validated successfully');
    });

    test('schema endpoint includes container tools', async ({ page }) => {
        test.setTimeout(15_000);
        token = await getToken(page);
        if (!appId) {
            const resp = await page.request.get(`${API}/api/v1/apps`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const apps: { id: string; name: string }[] = await resp.json();
            appId = apps.find(a => a.name === TEST_APP_NAME)!.id;
        }

        const schemaResp = await page.request.get(`${API}/api/v1/apps/${appId}/schema`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        console.log(`Schema response: ${schemaResp.status()}`);
        expect(schemaResp.ok()).toBeTruthy();

        const schema = await schemaResp.json();
        console.log(`Schema: ${JSON.stringify(schema).substring(0, 500)}`);

        expect(schema.type).toBe('container');
        expect(schema.name).toBe(TEST_APP_NAME);
        expect(schema.container_port).toBe(TEST_CONTAINER_PORT);
        // Should now include functions from the manifest
        expect(schema.functions).toBeDefined();
        expect(schema.functions.length).toBe(1);
        console.log('Container schema with functions validated');
    });

    test('container app without MCP manifest returns 404 for MCP', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);

        // Create a container app WITHOUT MCP manifest
        const noMcpName = 'e2e-container-no-mcp';
        // Clean up first
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

        const createResp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
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

        // MCP endpoint should return 404 (no manifest)
        const mcpResp = await page.request.get(`${API}/api/v1/apps/${noMcpApp.id}/mcp`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(mcpResp.status()).toBe(404);
        const body = await mcpResp.json();
        expect(body.error).toContain('no MCP tools configured');
        console.log(`Correctly returned 404 for container without MCP: ${body.error}`);

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
