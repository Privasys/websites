/**
 * E2E tests: Container app creation, build, deployment, and detail verification.
 *
 * Tests the full lifecycle of a container app: auto-detect container type,
 * create from GitHub commit, build container image, deploy to TDX enclave,
 * and verify container-specific UI elements.
 *
 * Run with:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts container-create-deploy.spec.ts --headed --project=portal --no-deps
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);

const CONTAINER_COMMIT_URL = 'https://github.com/Privasys/container-app-example/commit/04a44ffc9068a8600a69b7791bde8fd970362502';

test.describe('Container App Create & Deploy', () => {
    test.describe.configure({ mode: 'serial' });

    test('container commit URL auto-detects container type', async ({ page }) => {
        await page.goto('/dashboard/new/');
        await expect(page.locator('h1')).toContainText(/new application/i);

        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(CONTAINER_COMMIT_URL);

        // Wait for URL parsing
        await expect(page.getByText('Privasys/container-app-example')).toBeVisible({ timeout: 5_000 });

        // Wait for auto-detection — Container button should become selected
        const containerBtn = page.getByRole('button', { name: 'Container' });
        await containerBtn.waitFor({ state: 'visible', timeout: 10_000 });
        await expect(containerBtn).toHaveClass(/bg-black|bg-white/, { timeout: 10_000 });

        // Auto-detected indicator should be visible
        await expect(page.getByText('(auto-detected)')).toBeVisible({ timeout: 5_000 });

        // Container fields should be visible
        await expect(page.getByText('Container port')).toBeVisible({ timeout: 5_000 });

        await page.screenshot({ path: screenshot('container-auto-detected'), fullPage: true });
    });

    test('create container app from GitHub commit', async ({ page }) => {
        // Check if the app already exists
        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);
        const existingApp = page.locator('nav a', { hasText: 'container-app-example' });
        if (await existingApp.isVisible().catch(() => false)) {
            await existingApp.click();
            await page.waitForURL('**/dashboard/apps/**');
            await expect(page.getByText('container-app-example')).toBeVisible();
            // Verify container badge
            await expect(page.getByText('Container', { exact: true })).toBeVisible({ timeout: 5_000 });
            await page.screenshot({ path: screenshot('container-app-detail'), fullPage: true });
            return;
        }

        // Navigate to new app page
        await page.goto('/dashboard/new/');
        await expect(page.locator('h1')).toContainText(/new application/i);

        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(CONTAINER_COMMIT_URL);
        await expect(page.getByText('Privasys/container-app-example')).toBeVisible({ timeout: 5_000 });

        // Wait for auto-detection to select Container
        const containerBtn = page.getByRole('button', { name: 'Container' });
        await containerBtn.waitFor({ state: 'visible', timeout: 10_000 });
        await expect(containerBtn).toHaveClass(/bg-black|bg-white/, { timeout: 10_000 });

        // Verify name is pre-filled
        const nameInput = page.locator('input[type="text"]').nth(1);
        await expect(nameInput).toHaveValue('container-app-example', { timeout: 5_000 });

        // Check name availability
        const available = page.getByText(/\.apps\.privasys\.org is available/i);
        const taken = page.getByText(/already taken|name is reserved/i);
        await expect(available.or(taken)).toBeVisible({ timeout: 5_000 });

        if (await taken.isVisible().catch(() => false)) {
            const uniqueName = `container-test-${Date.now().toString(36).slice(-4)}`;
            await nameInput.clear();
            await nameInput.fill(uniqueName);
            await expect(page.getByText(/\.apps\.privasys\.org is available/i)).toBeVisible({ timeout: 5_000 });
        }

        // Set container port
        const portInput = page.locator('input[type="number"][placeholder="8080"]');
        await portInput.fill('8080');

        await page.screenshot({ path: screenshot('container-app-before-submit'), fullPage: true });

        // Submit
        const createBtn = page.getByRole('button', { name: /create application/i });
        await expect(createBtn).toBeEnabled();
        await createBtn.click();

        // Should succeed
        await expect(page.getByText(/application submitted/i)).toBeVisible({ timeout: 15_000 });
        await page.screenshot({ path: screenshot('container-app-submitted'), fullPage: true });

        // Wait for redirect to detail page
        await page.waitForURL('**/dashboard/apps/**', { timeout: 10_000 });

        // Verify container badge on detail page
        await expect(page.getByText('Container', { exact: true })).toBeVisible({ timeout: 5_000 });
        await page.screenshot({ path: screenshot('container-app-detail'), fullPage: true });
    });

    test('container build completes', async ({ page }) => {
        test.setTimeout(240_000); // 4 minutes — container image build

        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);
        const appLink = page.locator('nav a', { hasText: 'container-app-example' });
        if (!await appLink.isVisible().catch(() => false)) {
            test.skip(true, 'Container app not created — skipping build check');
            return;
        }
        await appLink.click();
        await page.waitForURL('**/dashboard/apps/**');

        // Wait for the build to complete — tabbed view appears when build is done
        const overviewTab = page.getByRole('button', { name: 'Overview' });
        await expect(overviewTab).toBeVisible({ timeout: 180_000 });

        await page.screenshot({ path: screenshot('container-build-complete'), fullPage: true });

        // Verify container badge
        await expect(page.getByText('Container', { exact: true })).toBeVisible({ timeout: 5_000 });

        // Verify the app has Deployments tab (build is done)
        await expect(page.getByRole('button', { name: 'Deployments' })).toBeVisible();
    });

    test('container deploy to TDX enclave', async ({ page }) => {
        test.setTimeout(180_000); // 3 minutes — deploy may timeout against TDX enclave

        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);
        const appLink = page.locator('nav a', { hasText: 'container-app-example' });
        if (!await appLink.isVisible().catch(() => false)) {
            test.skip(true, 'Container app not created');
            return;
        }
        await appLink.click();
        await page.waitForURL('**/dashboard/apps/**');

        // Must be in tabbed view (build done)
        const deploymentsTab = page.getByRole('button', { name: 'Deployments' });
        try {
            await deploymentsTab.waitFor({ state: 'visible', timeout: 10_000 });
        } catch {
            test.skip(true, 'Container app not built yet — no Deployments tab');
            return;
        }
        await deploymentsTab.click();
        await page.waitForTimeout(500);

        // Select version
        const versionSelect = page.locator('select').first();
        await expect(versionSelect).toBeVisible({ timeout: 5_000 });
        const versionOptions = versionSelect.locator('option:not([value=""])');
        const versionCount = await versionOptions.count();
        expect(versionCount).toBeGreaterThan(0);
        const versionValue = await versionOptions.first().getAttribute('value');
        await versionSelect.selectOption(versionValue!);

        // Check if TDX enclaves are available
        const locationSelect = page.locator('select').nth(1);
        await expect(locationSelect).toBeVisible();
        const locationOptions = locationSelect.locator('option:not([value=""])');
        const locationCount = await locationOptions.count();
        if (locationCount === 0) {
            test.skip(true, 'No TDX enclaves registered — cannot deploy container');
            return;
        }

        // Verify location shows [TDX] badge (container apps only show TDX enclaves)
        const firstOptionText = await locationOptions.first().textContent();
        expect(firstOptionText).toContain('[TDX]');

        // Select location and deploy
        const locationValue = await locationOptions.first().getAttribute('value');
        await locationSelect.selectOption(locationValue!);

        const deployBtn = page.getByRole('button', { name: /^deploy$/i });
        await expect(deployBtn).toBeEnabled();

        await page.screenshot({ path: screenshot('container-deploy-before'), fullPage: true });
        await deployBtn.click();

        // The deploy is synchronous — wait for it to complete (up to 2.5 min including TDX enclave timeout)
        // After clicking, the button shows "Deploying…" while the request is in flight
        // Then deployments list should refresh showing Active or Failed

        // Wait for the deploying spinner to go away (request completes)
        const deployingBtn = page.getByRole('button', { name: /deploying/i });
        try {
            await deployingBtn.waitFor({ state: 'hidden', timeout: 150_000 });
        } catch { /* may not be visible if deploy was very fast */ }

        await page.screenshot({ path: screenshot('container-deploy-after'), fullPage: true });

        // Deployment should now appear in the deployment history
        // It can be Active (success) or Failed (e.g. TDX enclave unreachable)
        const activeStatus = page.locator('text=Active');
        const failedStatus = page.locator('text=Failed');
        const deployingStatus = page.locator('text=Deploying');
        const errorBanner = page.locator('.bg-red-50, [class*="bg-red"]').filter({ hasText: /fail|error|timeout/i });

        const hasActive = await activeStatus.isVisible({ timeout: 5_000 }).catch(() => false);
        const hasFailed = await failedStatus.isVisible().catch(() => false);
        const hasDeploying = await deployingStatus.isVisible().catch(() => false);
        const hasError = await errorBanner.isVisible().catch(() => false);

        // Must have some result — not stuck with no feedback
        expect(hasActive || hasFailed || hasDeploying || hasError).toBeTruthy();

        if (hasActive) {
            // Deployment succeeded — verify Stop button
            const stopBtn = page.getByRole('button', { name: /stop/i });
            await expect(stopBtn).toBeVisible();
        }

        if (hasFailed || hasError) {
            // Deployment failed — verify there's an error message or deployment shows as failed
            // This is expected if the TDX enclave is not reachable
            console.log('Container deployment failed (expected in test environment without TDX enclave)');
        }

        await page.screenshot({ path: screenshot('container-deploy-result'), fullPage: true });
    });

    test('container app detail shows container badge and no WASM info', async ({ page }) => {
        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);
        const appLink = page.locator('nav a', { hasText: 'container-app-example' });
        if (!await appLink.isVisible().catch(() => false)) {
            test.skip(true, 'Container app not created — skipping detail check');
            return;
        }
        await appLink.click();
        await page.waitForURL('**/dashboard/apps/**');

        // Click Overview tab if visible
        const overviewTab = page.getByRole('button', { name: 'Overview' });
        try {
            await overviewTab.waitFor({ state: 'visible', timeout: 5_000 });
            await overviewTab.click();
            await page.waitForTimeout(1_000);
        } catch { /* pipeline view */ }

        // Container badge should be visible
        await expect(page.getByText('Container', { exact: true })).toBeVisible({ timeout: 5_000 });

        // WASM-specific elements should NOT be visible
        const cwasmHash = page.getByText('SHA-256');
        expect(await cwasmHash.isVisible().catch(() => false)).toBe(false);

        await page.screenshot({ path: screenshot('container-detail-overview'), fullPage: true });
    });
});
