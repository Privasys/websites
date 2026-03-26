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

test.describe('Container App MCP Tools', () => {
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

        console.log(`Create response: ${createResp.status()}`);
        const body = await createResp.json();
        console.log(`Create body: ${JSON.stringify(body).substring(0, 500)}`);

        expect(createResp.ok()).toBeTruthy();
        expect(body.app_type).toBe('container');
        expect(body.container_port).toBe(TEST_CONTAINER_PORT);
        // container_mcp should be populated from auto-detection of privasys.json
        expect(body.container_mcp).toBeTruthy();
        expect(body.container_mcp.tools).toBeDefined();
        expect(body.container_mcp.tools[0].name).toBe('browse');
        appId = body.id;
        console.log(`Created container app with MCP: ${TEST_APP_NAME} (${appId}) — MCP auto-detected`);
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

    test('schema endpoint returns AppSchema format for container with MCP', async ({ page }) => {
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

        const body = await schemaResp.json();
        console.log(`Schema: ${JSON.stringify(body).substring(0, 800)}`);

        // Verify the response uses the same AppSchema envelope as WASM apps
        expect(body.status).toBe('schema');
        expect(body.schema).toBeDefined();
        expect(body.schema.name).toBe(TEST_APP_NAME);
        expect(Array.isArray(body.schema.functions)).toBe(true);
        expect(Array.isArray(body.schema.interfaces)).toBe(true);
        expect(body.schema.functions.length).toBe(1);

        // Verify the browse function was converted from MCP manifest to FunctionSchema format
        const browseFn = body.schema.functions[0];
        expect(browseFn.name).toBe('browse');
        expect(Array.isArray(browseFn.params)).toBe(true);
        expect(Array.isArray(browseFn.results)).toBe(true);

        // Verify parameters were converted from JSON Schema to WitType format
        const urlParam = browseFn.params.find((p: { name: string }) => p.name === 'url');
        expect(urlParam).toBeDefined();
        expect(urlParam.type.kind).toBe('string'); // required → no option wrapper

        // format is optional → should be wrapped in option, inner is enum
        const formatParam = browseFn.params.find((p: { name: string }) => p.name === 'format');
        expect(formatParam).toBeDefined();
        expect(formatParam.type.kind).toBe('option');
        expect(formatParam.type.inner.kind).toBe('enum');
        expect(formatParam.type.inner.names).toEqual(['markdown', 'html']);
        console.log('Container schema with AppSchema format validated');
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
                commit_url: NO_MCP_COMMIT_URL,
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
