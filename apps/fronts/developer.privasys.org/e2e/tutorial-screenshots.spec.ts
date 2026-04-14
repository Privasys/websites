/**
 * Playwright script to capture screenshots of the complete developer platform
 * workflow for both WASM and Container tutorials.
 *
 * Prerequisites:
 *   - Alice's account must be empty (no apps)
 *   - Auth state must exist in .auth/state.json
 *
 * Run WASM tutorial:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts tutorial-screenshots.spec.ts -g "WASM" --project=portal --no-deps
 *
 * Run Container tutorial:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts tutorial-screenshots.spec.ts -g "Container" --project=portal --no-deps
 *
 * Run both:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts tutorial-screenshots.spec.ts --project=portal --no-deps
 *
 * Screenshots saved to: apps/fronts/developer.privasys.org/e2e/test-results/tutorial/
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const TUTORIAL_DIR = path.join(__dirname, 'test-results', 'tutorial');
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

const WASM_COMMIT_URL = 'https://github.com/Privasys/wasm-app-example/commit/b296c0d78d0f7a5504d76abba7e5e5b3af885936';
const WASM_APP_NAME = 'alice-first-wasm-app';

const CONTAINER_COMMIT_URL = 'https://github.com/Privasys/container-app-lightpanda/commit/9d08f6d6d16c313b8ad7fb9b6e5df763044d9b7d';
const CONTAINER_APP_NAME = 'alice-lightpanda-app';

function shot(name: string) {
    fs.mkdirSync(TUTORIAL_DIR, { recursive: true });
    return path.join(TUTORIAL_DIR, `${name}.png`);
}

async function settle(page: Page, ms = 500) {
    await page.waitForTimeout(ms);
}

async function getToken(page: Page): Promise<string> {
    const session = await page.evaluate(() => fetch('/api/auth/session').then(r => r.json()));
    return session?.accessToken as string;
}

/** Delete an app by name via the API (clean slate). */
async function deleteAppByApi(page: Page, token: string, appName: string) {
    const resp = await page.request.get(`${API}/api/v1/apps`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    const existing = apps.find(a => a.name === appName);
    if (!existing) return;

    // Stop active deployments first
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
    console.log(`Cleaned up ${appName} (${existing.id})`);
}

/** Delete ALL apps via the API (clean slate for screenshots). */
async function deleteAllApps(page: Page, token: string) {
    const resp = await page.request.get(`${API}/api/v1/apps`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    for (const app of apps) {
        await deleteAppByApi(page, token, app.name);
    }
}

// ══════════════════════════════════════════════════════════════
//  WASM APP TUTORIAL
// ══════════════════════════════════════════════════════════════
test.describe('WASM App Tutorial', () => {
    test.describe.configure({ mode: 'serial' });

    test('wasm-01 — Empty dashboard', async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto('/dashboard/');
        await settle(page);

        // Clean up ALL apps from previous runs to ensure empty dashboard
        const token = await getToken(page);
        await deleteAllApps(page, token);
        await page.reload();
        await settle(page);

        await page.screenshot({ path: shot('wasm-01-empty-dashboard'), fullPage: true });
    });

    test('wasm-02 — New Application screen', async ({ page }) => {
        test.setTimeout(30_000);
        await page.goto('/dashboard/new/');
        await settle(page);
        await page.screenshot({ path: shot('wasm-02-new-application'), fullPage: true });
    });

    test('wasm-03 — Commit URL pasted and form filled', async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto('/dashboard/new/');
        await settle(page, 500);

        // Step 1: click WASM Application
        await page.getByRole('button', { name: 'WASM Application' }).click();

        // Step 2: fill commit URL
        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(WASM_COMMIT_URL);
        await expect(page.getByText('Privasys/wasm-app-example')).toBeVisible({ timeout: 10_000 });

        // Click Next to step 3 (name)
        await page.getByRole('button', { name: 'Next' }).click();

        // Change the name to alice-first-wasm-app
        const nameInput = page.getByPlaceholder('my-confidential-app');
        await nameInput.clear();
        await nameInput.fill(WASM_APP_NAME);
        await expect(page.getByText(/\.apps\.privasys\.org is available/i).or(
            page.getByText(/already taken/i)
        )).toBeVisible({ timeout: 10_000 });

        await settle(page);
        await page.screenshot({ path: shot('wasm-03-commit-and-name'), fullPage: true });
    });

    test('wasm-04 — Submit and wait for build (Overview)', async ({ page }) => {
        test.setTimeout(300_000); // 5 min — build can take a while

        // Create the app via wizard
        await page.goto('/dashboard/new/');
        await settle(page, 500);

        // Step 1: click WASM Application
        await page.getByRole('button', { name: 'WASM Application' }).click();

        // Step 2: fill commit URL
        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(WASM_COMMIT_URL);
        await expect(page.getByText('Privasys/wasm-app-example')).toBeVisible({ timeout: 10_000 });

        // Click Next to step 3 (name)
        await page.getByRole('button', { name: 'Next' }).click();

        const nameInput = page.getByPlaceholder('my-confidential-app');
        await nameInput.clear();
        await nameInput.fill(WASM_APP_NAME);

        const available = page.getByText(/\.apps\.privasys\.org is available/i);
        const taken = page.getByText(/already taken/i);
        await expect(available.or(taken)).toBeVisible({ timeout: 10_000 });

        // If name taken, the app already exists - navigate to it instead
        if (await taken.isVisible().catch(() => false)) {
            await page.goto('/dashboard/');
            await settle(page);
            const link = page.locator('nav a', { hasText: WASM_APP_NAME });
            await link.click();
            await page.waitForURL('**/dashboard/apps/**');
        } else {
            // Click Next to step 4 (configuration)
            await page.getByRole('button', { name: 'Next' }).click();

            const createBtn = page.getByRole('button', { name: /create application/i });
            await expect(createBtn).toBeEnabled();
            await createBtn.click();
            await expect(page.getByText(/application submitted/i)).toBeVisible({ timeout: 15_000 });
            await page.waitForURL('**/dashboard/apps/**', { timeout: 10_000 });
        }

        // Wait for build to complete — Overview tab appears when done
        const overviewTab = page.getByRole('button', { name: 'Overview' });
        await expect(overviewTab).toBeVisible({ timeout: 240_000 });
        await overviewTab.click();
        await settle(page, 2000);

        // The overview shows the WASM module SHA-256
        await expect(page.getByText('WASM module SHA-256')).toBeVisible({ timeout: 5_000 });

        await page.screenshot({ path: shot('wasm-04-overview-built'), fullPage: true });
    });

    test('wasm-04b — GitHub Actions: reproducible build log', async ({ page }) => {
        test.setTimeout(60_000);

        // Navigate to the portal first so getToken can fetch /api/auth/session
        await page.goto('/dashboard/');
        await settle(page);

        // Fetch the build's run_url from the API
        const token = await getToken(page);
        const appsResp = await page.request.get(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const apps: { id: string; name: string }[] = await appsResp.json();
        const app = apps.find(a => a.name === WASM_APP_NAME);
        expect(app).toBeTruthy();

        const buildsResp = await page.request.get(`${API}/api/v1/apps/${app!.id}/builds`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const builds: { run_url?: string }[] = await buildsResp.json();
        const runUrl = builds[0]?.run_url;
        expect(runUrl).toBeTruthy();

        console.log(`GitHub Actions run URL: ${runUrl}`);

        // Navigate to GitHub Actions run page (auth cookies from setup include github.com)
        await page.goto(runUrl!);
        await settle(page, 3000);

        await page.screenshot({ path: shot('wasm-04b-github-actions-hash'), fullPage: true });
    });

    test('wasm-05 — Deployments tab with version and region selected', async ({ page }) => {
        test.setTimeout(180_000);

        // Navigate to the app
        await page.goto('/dashboard/');
        await settle(page);
        const link = page.locator('nav a', { hasText: WASM_APP_NAME });
        await link.waitFor({ state: 'visible', timeout: 10_000 });
        await link.click();
        await page.waitForURL('**/dashboard/apps/**');
        await settle(page);

        // Click Deployments tab
        const deploymentsTab = page.getByRole('button', { name: 'Deployments' });
        await expect(deploymentsTab).toBeVisible({ timeout: 10_000 });
        await deploymentsTab.click();
        await settle(page);

        // Select version
        const versionSelect = page.locator('select').first();
        await expect(versionSelect).toBeVisible({ timeout: 5_000 });
        const versionOptions = versionSelect.locator('option:not([value=""])');
        const versionCount = await versionOptions.count();
        expect(versionCount).toBeGreaterThan(0);
        await versionSelect.selectOption((await versionOptions.first().getAttribute('value'))!);

        // Select location
        const locationSelect = page.locator('select').nth(1);
        await expect(locationSelect).toBeVisible();
        const locationOptions = locationSelect.locator('option:not([value=""])');
        const locationCount = await locationOptions.count();
        expect(locationCount).toBeGreaterThan(0);
        await locationSelect.selectOption((await locationOptions.first().getAttribute('value'))!);

        await settle(page);
        await page.screenshot({ path: shot('wasm-05-deploy-select'), fullPage: true });

        // Actually deploy
        const deployBtn = page.getByRole('button', { name: /^deploy$/i });
        await expect(deployBtn).toBeEnabled();
        await deployBtn.click();

        // Wait for deployment to complete
        const activeOrDeploying = page.locator('text=Active').or(page.locator('text=Deploying'));
        await expect(activeOrDeploying).toBeVisible({ timeout: 60_000 });

        // Wait for Active status
        await expect(page.locator('text=Active')).toBeVisible({ timeout: 60_000 });
        await settle(page);
    });

    test('wasm-06 — Attestation: challenge and workload extensions', async ({ page }) => {
        test.setTimeout(120_000);

        await page.goto('/dashboard/');
        await settle(page);
        const link = page.locator('nav a', { hasText: WASM_APP_NAME });
        await link.click();
        await page.waitForURL('**/dashboard/apps/**');
        await settle(page);

        // Click Attestation tab
        const attestTab = page.getByRole('button', { name: 'Attestation' });
        await expect(attestTab).toBeVisible({ timeout: 10_000 });
        await attestTab.click();
        await settle(page, 2000);

        // Click Inspect Certificate (challenge mode)
        const inspectBtn = page.getByRole('button', { name: /inspect certificate/i });
        await expect(inspectBtn).toBeVisible({ timeout: 5_000 });
        await inspectBtn.click();

        // Wait for attestation results
        await expect(page.getByText(/TLS Connection/i)).toBeVisible({ timeout: 60_000 });
        await settle(page, 2000);

        // Wait for quote verification to complete (✓ Verified badge)
        await expect(page.getByText(/Verified/).first()).toBeVisible({ timeout: 30_000 });

        // Fail if the attestation server is not configured
        await expect(page.getByText(/attestation server is not configured/i)).not.toBeVisible();

        // Workload Attestation Extensions must be present for WASM apps
        const workloadSection = page.getByText('Workload Attestation Extensions');
        await expect(workloadSection).toBeVisible({ timeout: 10_000 });

        // Screenshot 1: Full attestation with challenge
        await page.screenshot({ path: shot('wasm-06a-attestation-challenge'), fullPage: true });

        // Screenshot 2: Scroll to Workload Attestation Extensions section
        await workloadSection.scrollIntoViewIfNeeded();
        await settle(page, 500);
        await page.screenshot({ path: shot('wasm-06b-workload-extensions'), fullPage: true });
    });

    test('wasm-07 — API Testing: call get-random', async ({ page }) => {
        test.setTimeout(120_000);

        await page.goto('/dashboard/');
        await settle(page);
        const link = page.locator('nav a', { hasText: WASM_APP_NAME });
        await link.click();
        await page.waitForURL('**/dashboard/apps/**');
        await settle(page);

        // Click API Testing tab
        const apiTestTab = page.getByRole('button', { name: 'API Testing' });
        await expect(apiTestTab).toBeVisible({ timeout: 10_000 });
        await apiTestTab.click();
        await settle(page, 3000);

        // Select the get-random function from the dropdown
        const fnSelect = page.locator('select').first();
        await expect(fnSelect).toBeVisible({ timeout: 10_000 });

        // Find the get-random option
        const options = await fnSelect.locator('option').allTextContents();
        const randomOption = options.find(o => o.includes('get-random'));
        if (randomOption) {
            const optionValue = await fnSelect.locator('option', { hasText: 'get-random' }).getAttribute('value');
            if (optionValue) await fnSelect.selectOption(optionValue);
        }
        await settle(page, 1000);

        // Click Send
        const sendBtn = page.getByRole('button', { name: /send/i });
        await expect(sendBtn).toBeVisible();
        await sendBtn.click();

        // Wait for response
        await expect(page.getByText(/200 OK/i).first()).toBeVisible({ timeout: 30_000 });
        await settle(page, 1000);

        await page.screenshot({ path: shot('wasm-07-api-testing-getrandom'), fullPage: true });
    });

    test('wasm-08 — AI Tools (MCP) tab', async ({ page }) => {
        test.setTimeout(60_000);

        await page.goto('/dashboard/');
        await settle(page);
        const link = page.locator('nav a', { hasText: WASM_APP_NAME });
        await link.click();
        await page.waitForURL('**/dashboard/apps/**');
        await settle(page);

        // Click AI Tools tab
        const aiToolsTab = page.getByRole('button', { name: /ai tools/i });
        await expect(aiToolsTab).toBeVisible({ timeout: 10_000 });
        await aiToolsTab.click();

        // Wait for MCP manifest to load
        await expect(page.getByText('MCP Tool Server')).toBeVisible({ timeout: 15_000 });
        await settle(page, 2000);

        await page.screenshot({ path: shot('wasm-08-mcp-tools'), fullPage: true });
    });
});

// ══════════════════════════════════════════════════════════════
//  CONTAINER APP TUTORIAL
// ══════════════════════════════════════════════════════════════
test.describe('Container App Tutorial', () => {
    test.describe.configure({ mode: 'serial' });

    test('container-01 — Empty dashboard', async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto('/dashboard/');
        await settle(page);

        // Clean up if the app exists from a previous run
        const token = await getToken(page);
        await deleteAppByApi(page, token, CONTAINER_APP_NAME);
        await page.reload();
        await settle(page);

        await page.screenshot({ path: shot('container-01-empty-dashboard'), fullPage: true });
    });

    test('container-02 — New Application screen', async ({ page }) => {
        test.setTimeout(30_000);
        await page.goto('/dashboard/new/');
        await settle(page);
        await page.screenshot({ path: shot('container-02-new-application'), fullPage: true });
    });

    test('container-03 — Commit URL pasted with auto-detection', async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto('/dashboard/new/');
        await settle(page, 500);

        // Step 1: click Container
        await page.getByRole('button', { name: 'Container' }).click();

        // Step 2: fill commit URL
        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(CONTAINER_COMMIT_URL);
        await expect(page.getByText(/container-app-lightpanda/i)).toBeVisible({ timeout: 10_000 });

        // Click Next to step 3 (name)
        await page.getByRole('button', { name: 'Next' }).click();

        // Change the name
        const nameInput = page.getByPlaceholder('my-confidential-app');
        await nameInput.clear();
        await nameInput.fill(CONTAINER_APP_NAME);
        await expect(page.getByText(/\.apps\.privasys\.org is available/i).or(
            page.getByText(/already taken/i)
        )).toBeVisible({ timeout: 10_000 });

        // Click Next to step 4 (configuration)
        await page.getByRole('button', { name: 'Next' }).click();

        // Set container port
        const portInput = page.locator('input[type="number"][placeholder="8080"]');
        await expect(portInput).toBeVisible({ timeout: 5_000 });
        await portInput.fill('8080');

        await settle(page);
        await page.screenshot({ path: shot('container-03-commit-and-name'), fullPage: true });
    });

    test('container-04 — Submit and Overview', async ({ page }) => {
        test.setTimeout(300_000);

        await page.goto('/dashboard/new/');
        await settle(page, 500);

        // Step 1: click Container
        await page.getByRole('button', { name: 'Container' }).click();

        // Step 2: fill commit URL
        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(CONTAINER_COMMIT_URL);
        await expect(page.getByText(/container-app-lightpanda/i)).toBeVisible({ timeout: 10_000 });

        // Click Next to step 3 (name)
        await page.getByRole('button', { name: 'Next' }).click();

        const nameInput = page.getByPlaceholder('my-confidential-app');
        await nameInput.clear();
        await nameInput.fill(CONTAINER_APP_NAME);

        const available = page.getByText(/\.apps\.privasys\.org is available/i);
        const taken = page.getByText(/already taken/i);
        await expect(available.or(taken)).toBeVisible({ timeout: 10_000 });

        if (await taken.isVisible().catch(() => false)) {
            await page.goto('/dashboard/');
            await settle(page);
            const link = page.locator('nav a', { hasText: CONTAINER_APP_NAME });
            await link.click();
            await page.waitForURL('**/dashboard/apps/**');
        } else {
            // Click Next to step 4 (configuration)
            await page.getByRole('button', { name: 'Next' }).click();

            // Set port
            const portInput = page.locator('input[type="number"][placeholder="8080"]');
            await expect(portInput).toBeVisible({ timeout: 5_000 });
            await portInput.fill('8080');

            const createBtn = page.getByRole('button', { name: /create application/i });
            await expect(createBtn).toBeEnabled();
            await createBtn.click();
            await expect(page.getByText(/application submitted/i)).toBeVisible({ timeout: 15_000 });
            await page.waitForURL('**/dashboard/apps/**', { timeout: 10_000 });
        }

        // Wait for build to complete
        const overviewTab = page.getByRole('button', { name: 'Overview' });
        await expect(overviewTab).toBeVisible({ timeout: 240_000 });
        await overviewTab.click();
        await settle(page, 2000);

        // Container badge
        await expect(page.getByText('Container', { exact: true })).toBeVisible({ timeout: 5_000 });

        await page.screenshot({ path: shot('container-04-overview'), fullPage: true });
    });

    test('container-05 — Deployments tab with version and region selected', async ({ page }) => {
        test.setTimeout(180_000);

        await page.goto('/dashboard/');
        await settle(page);
        const link = page.locator('nav a', { hasText: CONTAINER_APP_NAME });
        await link.waitFor({ state: 'visible', timeout: 10_000 });
        await link.click();
        await page.waitForURL('**/dashboard/apps/**');
        await settle(page);

        const deploymentsTab = page.getByRole('button', { name: 'Deployments' });
        await expect(deploymentsTab).toBeVisible({ timeout: 10_000 });
        await deploymentsTab.click();
        await settle(page);

        // Select version
        const versionSelect = page.locator('select').first();
        await expect(versionSelect).toBeVisible({ timeout: 5_000 });
        const versionOptions = versionSelect.locator('option:not([value=""])');
        expect(await versionOptions.count()).toBeGreaterThan(0);
        await versionSelect.selectOption((await versionOptions.first().getAttribute('value'))!);

        // Select TDX location
        const locationSelect = page.locator('select').nth(1);
        await expect(locationSelect).toBeVisible();
        const locationOptions = locationSelect.locator('option:not([value=""])');
        expect(await locationOptions.count()).toBeGreaterThan(0);
        await locationSelect.selectOption((await locationOptions.first().getAttribute('value'))!);

        await settle(page);
        await page.screenshot({ path: shot('container-05-deploy-select'), fullPage: true });

        // Deploy
        const deployBtn = page.getByRole('button', { name: /^deploy$/i });
        await expect(deployBtn).toBeEnabled();
        await deployBtn.click();

        // Wait for deployment to reach Active status (page polls every 5s)
        await expect(page.locator('text=Active')).toBeVisible({ timeout: 180_000 });
        await settle(page);
    });

    test('container-06 — Attestation: challenge and workload', async ({ page }) => {
        test.setTimeout(120_000);

        await page.goto('/dashboard/');
        await settle(page);
        const link = page.locator('nav a', { hasText: CONTAINER_APP_NAME });
        await link.click();
        await page.waitForURL('**/dashboard/apps/**');
        await settle(page);

        const attestTab = page.getByRole('button', { name: 'Attestation' });
        await expect(attestTab).toBeVisible({ timeout: 15_000 });
        await attestTab.click();
        await settle(page, 2000);

        const inspectBtn = page.getByRole('button', { name: /inspect certificate/i });
        await expect(inspectBtn).toBeVisible({ timeout: 5_000 });
        await inspectBtn.click();

        await expect(page.getByText(/TLS Connection/i)).toBeVisible({ timeout: 60_000 });
        await settle(page, 2000);

        // Wait for quote verification to complete (✓ Verified badge)
        await expect(page.getByText(/Verified/).first()).toBeVisible({ timeout: 30_000 });

        // Fail if the attestation server is not configured
        await expect(page.getByText(/attestation server is not configured/i)).not.toBeVisible();

        // Workload Attestation Extensions must be present for container apps
        const workloadSection = page.getByText('Workload Attestation Extensions');
        await expect(workloadSection).toBeVisible({ timeout: 10_000 });

        await page.screenshot({ path: shot('container-06a-attestation-challenge'), fullPage: true });

        // Scroll to Workload Attestation Extensions
        await workloadSection.scrollIntoViewIfNeeded();
        await settle(page, 500);
        await page.screenshot({ path: shot('container-06b-workload-extensions'), fullPage: true });

        // Scroll to TDX RTMR measurements
        const rtmrSection = page.getByText(/RTMR/);
        if (await rtmrSection.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
            await rtmrSection.first().scrollIntoViewIfNeeded();
            await settle(page, 500);
            await page.screenshot({ path: shot('container-06c-rtmr-measurements'), fullPage: true });
        }
    });

    test('container-07 — API Testing tab', async ({ page }) => {
        test.setTimeout(120_000);

        await page.goto('/dashboard/');
        await settle(page);
        const link = page.locator('nav a', { hasText: CONTAINER_APP_NAME });
        await link.click();
        await page.waitForURL('**/dashboard/apps/**');
        await settle(page);

        const apiTestTab = page.getByRole('button', { name: 'API Testing' });
        await expect(apiTestTab).toBeVisible({ timeout: 15_000 });
        await apiTestTab.click();
        await settle(page, 3000);

        await page.screenshot({ path: shot('container-07-api-testing'), fullPage: true });
    });

    test('container-08 — AI Tools (MCP) tab', async ({ page }) => {
        test.setTimeout(60_000);

        await page.goto('/dashboard/');
        await settle(page);
        const link = page.locator('nav a', { hasText: CONTAINER_APP_NAME });
        await link.click();
        await page.waitForURL('**/dashboard/apps/**');
        await settle(page);

        const aiToolsTab = page.getByRole('button', { name: /ai tools/i });
        await expect(aiToolsTab).toBeVisible({ timeout: 15_000 });
        await aiToolsTab.click();

        await expect(page.getByText('MCP Tool Server')).toBeVisible({ timeout: 15_000 });
        await settle(page, 2000);

        await page.screenshot({ path: shot('container-08-mcp-tools'), fullPage: true });
    });
});
