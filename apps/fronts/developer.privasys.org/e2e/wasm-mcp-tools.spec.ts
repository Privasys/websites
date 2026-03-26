/**
 * E2E test: verifies the AI Tools (MCP) tab works correctly for a deployed WASM app.
 *
 * Expects a WASM app named "wasm-app" to already exist and be deployed.
 *
 * Run with:
 *   E2E_BASE_URL=https://developer.privasys.org npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts wasm-mcp-tools.spec.ts --headed --project=portal --no-deps
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) =>
    path.join(__dirname, 'test-results', `${name}.png`);

const APP_NAME = 'wasm-app';
const APP_DISPLAY_NAME = 'Wasm App';

test('MCP Tools / AI Tools tab — full verification', async ({ page }) => {
    test.setTimeout(120_000);

    // ── Step 1: Navigate to dashboard and handle auth ──
    await page.goto('/dashboard/');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const url = page.url();
    if (url.includes('auth.privasys.org') || url.includes('/login')) {
        if (url.includes('auth.privasys.org')) {
            const accountBtn = page.locator('[class*="account"]', { hasText: /@/ }).first();
            const genericAccount = page.locator('button, a, [role="button"]').filter({ hasText: /privasys\.org/ }).first();
            const anyAccount = accountBtn.or(genericAccount);
            if (await anyAccount.isVisible({ timeout: 3_000 }).catch(() => false)) {
                await anyAccount.click();
            }
        }
        console.log('Waiting for login to complete (manual login within 2 min if needed)...');
        await page.waitForURL('**/dashboard/**', { timeout: 120_000 });
    }

    await page.waitForSelector('nav', { timeout: 10_000 });
    await page.screenshot({ path: screenshot('mcp-01-dashboard'), fullPage: true });

    // ── Step 2: Navigate to the app detail page ──
    const appLink = page.locator('nav a', { hasText: APP_DISPLAY_NAME });
    await appLink.waitFor({ state: 'visible', timeout: 5_000 });
    await appLink.click();

    await page.waitForURL('**/dashboard/apps/**', { timeout: 10_000 });
    const appUrl = page.url();
    console.log('App URL:', appUrl);

    await expect(page.locator('h1', { hasText: /wasm.app/i })).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: screenshot('mcp-02-app-detail'), fullPage: true });

    // ── Step 3: Verify MCP badge is visible ──
    const mcpBadge = page.getByText('MCP', { exact: true });
    await expect(mcpBadge).toBeVisible({ timeout: 5_000 });
    console.log('MCP badge: visible');

    // ── Step 4: Click AI Tools tab ──
    const aiToolsTab = page.getByRole('button', { name: /ai tools/i });
    await expect(aiToolsTab).toBeVisible({ timeout: 5_000 });
    await aiToolsTab.click();

    // Wait for MCP Tool Server section to appear (API call in progress)
    await expect(page.getByText('MCP Tool Server')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: screenshot('mcp-03-ai-tools-tab'), fullPage: true });

    // ── Step 5: Verify tool count is > 0 ──
    const introSection = page.locator('section').filter({ hasText: 'MCP Tool Server' });
    const toolCountEl = introSection.locator('strong').first();
    const toolCount = await toolCountEl.textContent();
    expect(Number(toolCount)).toBeGreaterThan(0);
    console.log(`Tool count displayed: ${toolCount}`);

    // ── Step 6: Verify connection info ──
    await expect(page.getByText('Endpoint')).toBeVisible();
    const endpoint = page.locator('code').filter({ hasText: /apps\.privasys\.org/ });
    await expect(endpoint).toBeVisible();
    const endpointText = await endpoint.textContent();
    expect(endpointText).toContain(`${APP_NAME}.apps.privasys.org`);
    console.log('Endpoint:', endpointText);

    // MCP config snippet
    await expect(page.getByText('MCP config snippet')).toBeVisible();
    const configSnippet = page.locator('pre').filter({ hasText: 'mcpServers' });
    await expect(configSnippet).toBeVisible();
    const configText = await configSnippet.textContent();
    expect(configText).toContain(APP_NAME);
    expect(configText).toContain('sse');
    await page.screenshot({ path: screenshot('mcp-04-connection'), fullPage: true });

    // ── Step 7: Verify tool manifest cards ──
    const toolsHeading = page.getByText(/^Tools \(\d+\)$/);
    await expect(toolsHeading).toBeVisible({ timeout: 5_000 });

    // "No MCP tools found" should NOT be visible
    await expect(page.getByText('No MCP tools found')).not.toBeVisible();

    // Individual tool names from wasm-app-example
    await expect(page.locator('code', { hasText: 'hello' })).toBeVisible();
    await expect(page.locator('code', { hasText: 'get-random' })).toBeVisible();

    // Verify tool descriptions are rendered (not just names)
    // Use .first() to avoid strict-mode collision with the raw JSON section
    const toolsSection = page.locator('section').filter({ hasText: /^Tools \(\d+\)/ });
    await expect(toolsSection.getByText('Return a greeting from inside the enclave')).toBeVisible();
    await expect(toolsSection.getByText('Generate a random number between 1 and 100')).toBeVisible();
    await expect(toolsSection.getByText('Store a value in the enclave')).toBeVisible();
    console.log('Tool descriptions: visible in UI');

    // Verify parameter descriptions are rendered
    await expect(toolsSection.getByText('The key to store the value under')).toBeVisible();
    await expect(toolsSection.getByText('The value to persist')).toBeVisible();
    console.log('Parameter descriptions: visible in UI');
    await page.screenshot({ path: screenshot('mcp-05-tool-cards'), fullPage: true });

    // ── Step 8: Verify raw manifest JSON ──
    await expect(page.getByText('Raw manifest')).toBeVisible();
    const rawJson = page.locator('pre').filter({ hasText: '"mcp_tools"' });
    await expect(rawJson).toBeVisible();
    const jsonText = await rawJson.textContent();

    const manifest = JSON.parse(jsonText!);
    expect(manifest.status).toBe('mcp_tools');
    expect(manifest.manifest).toBeDefined();
    expect(manifest.manifest.name).toBe(APP_NAME);
    expect(Array.isArray(manifest.manifest.tools)).toBe(true);
    expect(manifest.manifest.tools.length).toBeGreaterThan(0);

    const toolNames = manifest.manifest.tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain('hello');
    expect(toolNames).toContain('get-random');
    console.log('Raw manifest tools:', toolNames);
    await page.screenshot({ path: screenshot('mcp-06-raw-json'), fullPage: true });

    // ── Step 9: Verify MCP API endpoint directly ──
    const session = await page.evaluate(() =>
        fetch('/api/auth/session').then(r => r.json())
    );
    const token = session?.accessToken as string;
    expect(token).toBeTruthy();

    // Discover app ID from URL
    const appId = appUrl.split('/apps/')[1]?.split('?')[0]?.split('/')[0];
    expect(appId).toBeTruthy();

    // Call the management service API directly
    const apiBase = 'https://api.developer.privasys.org';
    const mcpResp = await page.request.get(`${apiBase}/api/v1/apps/${appId}/mcp`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    expect(mcpResp.ok()).toBeTruthy();

    const apiManifest = await mcpResp.json();
    expect(apiManifest.status).toBe('mcp_tools');
    expect(apiManifest.manifest.name).toBe(APP_NAME);
    expect(apiManifest.manifest.tools.length).toBeGreaterThan(0);

    for (const tool of apiManifest.manifest.tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
    }

    // Verify descriptions are present in the API response
    const helloTool = apiManifest.manifest.tools.find((t: { name: string }) => t.name === 'hello');
    expect(helloTool.description).toBeTruthy();
    expect(helloTool.description).toContain('greeting');

    const kvStoreTool = apiManifest.manifest.tools.find((t: { name: string }) => t.name === 'kv-store');
    expect(kvStoreTool.description).toBeTruthy();
    expect(kvStoreTool.inputSchema.properties.key.description).toBeTruthy();
    expect(kvStoreTool.inputSchema.properties.value.description).toBeTruthy();
    console.log('Tool descriptions in API: verified');

    console.log('MCP API response validated:', apiManifest.manifest.tools.length, 'tools');
    await page.screenshot({ path: screenshot('mcp-07-final'), fullPage: true });
});
