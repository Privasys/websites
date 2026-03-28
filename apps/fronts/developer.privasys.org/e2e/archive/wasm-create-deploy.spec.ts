/**
 * E2E tests: WASM app creation, build, and deployment.
 *
 * Tests the full lifecycle of a WASM app: create from GitHub commit,
 * verify name collision handling, and build + deploy to an SGX enclave.
 *
 * Run with:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts wasm-create-deploy.spec.ts --headed --project=portal --no-deps
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);

const COMMIT_URL = 'https://github.com/Privasys/wasm-app-example/commit/a6acb6da7a1e01b0a01dbb1bd6fcbd2054b6d345';

/** Delete an app by navigating to its Overview tab and using the Danger Zone. */
async function deleteAppByName(page: Page, appName: string) {
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 5_000 });
    const link = page.locator('nav a', { hasText: appName });
    try { await link.waitFor({ state: 'visible', timeout: 5_000 }); } catch { return; }
    await link.click();
    await page.waitForURL('**/dashboard/apps/**');
    await page.waitForTimeout(2_000);

    // Auto-accept any confirm dialogs that appear
    const dialogHandler = (dialog: import('@playwright/test').Dialog) => dialog.accept().catch(() => {});
    page.on('dialog', dialogHandler);

    try {
        // Try tabbed view first (Overview → Danger Zone)
        const overviewTab = page.getByRole('button', { name: 'Overview' });
        try {
            await overviewTab.waitFor({ state: 'visible', timeout: 5_000 });
            await overviewTab.click();
            await page.waitForTimeout(1_000);
        } catch { /* pipeline view — no tabs */ }

        // Find delete confirmation input and fill it
        const deleteInput = page.locator('input[placeholder="' + appName + '"]');
        try {
            await deleteInput.waitFor({ state: 'visible', timeout: 5_000 });
            await deleteInput.fill(appName);
            await page.waitForTimeout(300);
            await page.locator('button', { hasText: 'Delete application' }).click();
            await page.waitForURL('**/dashboard', { timeout: 15_000 }).catch(() => {});
            return;
        } catch { /* try pipeline view fallback */ }

        // Pipeline view — delete button with confirm() dialog
        const deleteBtn = page.getByRole('button', { name: /delete application/i });
        try {
            await deleteBtn.waitFor({ state: 'visible', timeout: 3_000 });
            await deleteBtn.click();
            await page.waitForURL('**/dashboard', { timeout: 15_000 }).catch(() => {});
        } catch { /* could not delete */ }
    } finally {
        page.off('dialog', dialogHandler);
    }
}

test.describe('WASM App Create & Deploy', () => {
    test.describe.configure({ mode: 'serial' });

    test('create app from GitHub commit', async ({ page }) => {
        // Check if the app already exists from a previous run
        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);
        const existingApp = page.locator('nav a', { hasText: 'wasm-app-example' });
        if (await existingApp.isVisible().catch(() => false)) {
            // App exists — verify it's accessible and has correct details
            await existingApp.click();
            await page.waitForURL('**/dashboard/apps/**');
            await expect(page.getByText('wasm-app-example')).toBeVisible();
            await page.screenshot({ path: screenshot('create-app-detail'), fullPage: true });
            return; // Already created in a prior run — nothing to do
        }

        // Navigate to new app page and create
        await page.goto('/dashboard/new/');
        await expect(page.locator('h1')).toContainText(/new application/i);

        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(COMMIT_URL);

        // Wait for URL to be parsed — repo and commit info should appear
        await expect(page.getByText('Privasys/wasm-app-example')).toBeVisible({ timeout: 5_000 });

        // Name field should be pre-filled from repo name and editable
        const nameInput = page.locator('input[type="text"]').nth(1); // second text input (after commit URL)
        await expect(nameInput).toHaveValue('wasm-app-example', { timeout: 5_000 });

        // The name availability check should show a result (available or taken)
        const available = page.getByText(/\.apps\.privasys\.org is available/i);
        const taken = page.getByText(/already taken|name is reserved/i);
        await expect(available.or(taken)).toBeVisible({ timeout: 5_000 });

        // If name is taken, change it to a unique variant
        if (await taken.isVisible().catch(() => false)) {
            const uniqueName = `wasm-app-example-${Date.now().toString(36).slice(-4)}`;
            await nameInput.clear();
            await nameInput.fill(uniqueName);
            // Wait for availability check on the new name
            await expect(page.getByText(/\.apps\.privasys\.org is available/i)).toBeVisible({ timeout: 5_000 });
        }

        await page.screenshot({ path: screenshot('create-app-parsed'), fullPage: true });

        // Submit
        const createBtn = page.getByRole('button', { name: /create application/i });
        await expect(createBtn).toBeEnabled();
        await createBtn.click();

        // Should succeed — we verified the name was available
        await expect(page.getByText(/application submitted/i)).toBeVisible({ timeout: 15_000 });
        await page.screenshot({ path: screenshot('create-app-submitted'), fullPage: true });

        // Wait for auto-redirect to app detail page
        await page.waitForURL('**/dashboard/apps/**', { timeout: 10_000 });
        await page.screenshot({ path: screenshot('create-app-detail'), fullPage: true });
    });

    test('create app shows name taken when name conflicts', async ({ page }) => {
        // Try to create an app with a name that's already in use
        await page.goto('/dashboard/new/');
        await expect(page.locator('h1')).toContainText(/new application/i);

        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(COMMIT_URL);

        // Wait for URL to be parsed and name to be pre-filled
        await expect(page.getByText('Privasys/wasm-app-example')).toBeVisible({ timeout: 5_000 });
        const nameInput = page.locator('input[type="text"]').nth(1);
        await expect(nameInput).toHaveValue('wasm-app-example');

        // The name pre-fills to "wasm-app-example" — if our first test created it,
        // it should show as taken (or available if this test runs first)
        const available = page.getByText(/\.apps\.privasys\.org is available/i);
        const taken = page.getByText(/already taken|name is reserved/i);
        await expect(available.or(taken)).toBeVisible({ timeout: 10_000 });
        await page.screenshot({ path: screenshot('create-app-name-check'), fullPage: true });

        // Verify reserved names are rejected
        await nameInput.clear();
        await nameInput.fill('admin');
        await expect(page.getByText(/reserved/i)).toBeVisible({ timeout: 5_000 });
        await page.screenshot({ path: screenshot('create-app-reserved'), fullPage: true });
    });

    test('build completes and deploy to enclave', async ({ page }) => {
        test.setTimeout(240_000); // 4 minutes — build + deploy

        // Create a fresh app with a unique name to test the full flow
        await page.goto('/dashboard/new/');
        await expect(page.locator('h1')).toContainText(/new application/i);

        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(COMMIT_URL);

        // Wait for URL parsing
        await expect(page.getByText('Privasys/wasm-app-example')).toBeVisible({ timeout: 5_000 });

        // Use a unique name to avoid conflicts
        const uniqueName = `e2e-full-${Date.now().toString(36).slice(-6)}`;
        const nameInput = page.locator('input[type="text"]').nth(1);
        await nameInput.clear();
        await nameInput.fill(uniqueName);

        // Wait for availability check
        await expect(page.getByText(/\.apps\.privasys\.org is available/i)).toBeVisible({ timeout: 5_000 });

        // Submit
        const createBtn = page.getByRole('button', { name: /create application/i });
        await expect(createBtn).toBeEnabled();
        await createBtn.click();

        // Wait for redirect to app detail
        await expect(page.getByText(/application submitted/i)).toBeVisible({ timeout: 15_000 });
        await page.waitForURL('**/dashboard/apps/**', { timeout: 10_000 });

        // Should initially show pipeline view
        await page.screenshot({ path: screenshot('build-pipeline-start'), fullPage: true });

        try {
            // --- Phase 1: Wait for build to complete ---
            const overviewTab = page.getByRole('button', { name: 'Overview' });
            await expect(overviewTab).toBeVisible({ timeout: 120_000 });

            // Verify the app is in the tabbed view with all expected tabs
            const deploymentsTab = page.getByRole('button', { name: 'Deployments' });
            await expect(deploymentsTab).toBeVisible();
            await expect(page.getByRole('button', { name: 'App Store' })).toBeVisible();

            await page.screenshot({ path: screenshot('build-complete-ready'), fullPage: true });

            // --- Phase 2: Deploy the app ---
            await deploymentsTab.click();
            await page.screenshot({ path: screenshot('deploy-tab-before'), fullPage: true });

            // Select version (should have v1 ready from auto-build)
            const versionSelect = page.locator('select').first();
            await expect(versionSelect).toBeVisible({ timeout: 5_000 });
            const versionOptions = versionSelect.locator('option:not([value=""])');
            const versionCount = await versionOptions.count();
            expect(versionCount).toBeGreaterThan(0);
            const versionValue = await versionOptions.first().getAttribute('value');
            await versionSelect.selectOption(versionValue!);

            // Select enclave/location
            const locationSelect = page.locator('select').nth(1);
            await expect(locationSelect).toBeVisible();
            const locationOptions = locationSelect.locator('option:not([value=""])');
            const locationCount = await locationOptions.count();
            expect(locationCount).toBeGreaterThan(0);
            const locationValue = await locationOptions.first().getAttribute('value');
            await locationSelect.selectOption(locationValue!);

            // Click Deploy
            const deployBtn = page.getByRole('button', { name: /^deploy$/i });
            await expect(deployBtn).toBeEnabled();
            await deployBtn.click();

            // Wait for deployment to appear — should show as active or deploying
            const activeOrDeploying = page.locator('text=Active').or(page.locator('text=Deploying'));
            await expect(activeOrDeploying).toBeVisible({ timeout: 30_000 });

            await page.screenshot({ path: screenshot('deploy-active'), fullPage: true });

            // Verify deployment history section appears
            await expect(page.getByText('Deployment history')).toBeVisible();

            // Verify the hostname link is shown for active deployments
            const hostnameLink = page.locator(`a[href*="${uniqueName}"]`);
            const hasHostname = await hostnameLink.isVisible({ timeout: 5_000 }).catch(() => false);
            if (hasHostname) {
                await expect(hostnameLink).toContainText(uniqueName);
            }

            // Verify Stop button exists for the active deployment
            const stopBtn = page.getByRole('button', { name: /stop/i });
            await expect(stopBtn).toBeVisible();

            await page.screenshot({ path: screenshot('deploy-complete'), fullPage: true });
        } catch (e) {
            // On failure, clean up immediately
            await deleteAppByName(page, uniqueName);
            throw e;
        }
        // On success, leave the deployed app alive for subsequent tests (App Store, Attestation, API Testing).
        // The cleanup test at the end will delete all remaining apps.
    });
});
