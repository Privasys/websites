import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);

const COMMIT_URL = 'https://github.com/Privasys/wasm-app-example/commit/f0eefca8adf131a8ab763641c06ac83e1ca1feef';

test.describe('Developer Portal', () => {
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

        // Wait for URL to be parsed — app name and commit info should appear
        await expect(page.getByText('wasm-app-example', { exact: true })).toBeVisible({ timeout: 5_000 });
        await page.screenshot({ path: screenshot('create-app-parsed'), fullPage: true });

        // Submit
        const createBtn = page.getByRole('button', { name: /create application/i });
        await expect(createBtn).toBeEnabled();
        await createBtn.click();

        // Either success or "already exists" error (another user owns this name)
        const submitted = page.getByText(/application submitted/i);
        const conflict = page.getByText(/already exists/i);
        await expect(submitted.or(conflict)).toBeVisible({ timeout: 15_000 });

        if (await submitted.isVisible().catch(() => false)) {
            await page.screenshot({ path: screenshot('create-app-submitted'), fullPage: true });
            // Wait for auto-redirect to app detail page
            await page.waitForURL('**/dashboard/apps/**', { timeout: 10_000 });
        } else {
            // Name taken by another user — that's fine, just screenshot the state
            await page.screenshot({ path: screenshot('create-app-conflict'), fullPage: true });
        }
        await page.screenshot({ path: screenshot('create-app-detail'), fullPage: true });
    });

    test('dashboard loads with sidebar and nav elements', async ({ page }) => {
        await page.goto('/dashboard/');
        await expect(page.locator('text=Overview')).toBeVisible();
        await expect(page.getByText('Applications', { exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
        // Header shows branding
        await expect(page.getByRole('link', { name: 'Privasys Developer' })).toBeVisible();
        await page.screenshot({ path: screenshot('dashboard'), fullPage: true });
    });

    test('create app page shows pipeline wizard', async ({ page }) => {
        await page.goto('/dashboard/new/');
        await expect(page.locator('h1')).toContainText(/new application/i);
        // Should show the commit URL input
        await expect(page.getByPlaceholder(/github\.com/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /create application/i })).toBeVisible();
        await page.screenshot({ path: screenshot('new-app'), fullPage: true });
    });

    test('app detail page shows tabs for built/approved apps', async ({ page }) => {
        await page.goto('/dashboard/');

        // Find any app in the sidebar
        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist — skip app detail test');

        await appLinks.first().click();
        await page.waitForURL('**/dashboard/apps/**');

        // Get the status badge text
        const badge = page.locator('[class*="rounded-full"]').first();
        const statusText = (await badge.textContent())?.trim().toLowerCase() || '';

        // Apps with cwasm_hash that are approved/built/deployed/undeployed should show tabs
        const hasOverviewTab = page.getByRole('button', { name: 'Overview' }).or(page.getByText('Overview').first());
        const hasPipeline = page.locator('text=Application submitted');

        const isTabbed = await hasOverviewTab.isVisible({ timeout: 3_000 }).catch(() => false);
        const isPipeline = await hasPipeline.isVisible({ timeout: 3_000 }).catch(() => false);

        // Must be one or the other
        expect(isTabbed || isPipeline).toBeTruthy();

        // If the status is "approved" and pipeline shows "Ready" with all green,
        // this is a BUG — the app should show the tabbed view.
        if (isPipeline && statusText.includes('approved')) {
            const readyStep = page.locator('text=Your application is built and ready to deploy.');
            const isReady = await readyStep.isVisible().catch(() => false);
            // If approved + build ready, the user should NOT be stuck on pipeline
            expect(isReady).toBeFalsy();
        }

        await page.screenshot({ path: screenshot('app-detail'), fullPage: true });
    });

    test('built app shows Deployments and App Store tabs', async ({ page }) => {
        await page.goto('/dashboard/');

        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist');

        await appLinks.first().click();
        await page.waitForURL('**/dashboard/apps/**');

        const deployTab = page.getByRole('button', { name: 'Deployments' });
        const isTabbed = await deployTab.isVisible({ timeout: 5_000 }).catch(() => false);
        test.skip(!isTabbed, 'App is not in tabbed view');

        // Verify core tabs
        await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
        await expect(deployTab).toBeVisible();
        await expect(page.getByRole('button', { name: 'App Store' })).toBeVisible();

        // Click Deployments tab
        await deployTab.click();
        await page.screenshot({ path: screenshot('deployments-tab'), fullPage: true });

        // Click App Store tab
        await page.getByRole('button', { name: 'App Store' }).click();
        await page.screenshot({ path: screenshot('store-tab'), fullPage: true });
    });

    test('overview tab has Danger Zone with delete', async ({ page }) => {
        await page.goto('/dashboard/');

        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist');

        await appLinks.first().click();
        await page.waitForURL('**/dashboard/apps/**');

        // If tabbed view, check Overview has Danger Zone
        const overviewTab = page.getByRole('button', { name: 'Overview' });
        if (await overviewTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await overviewTab.click();
            await expect(page.getByText('Danger Zone')).toBeVisible();
            await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
        }
        await page.screenshot({ path: screenshot('overview-danger'), fullPage: true });
    });

    test('settings page shows identity and profile', async ({ page }) => {
        await page.goto('/dashboard/settings/');
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Identity' })).toBeVisible();
        await expect(page.getByText('Provider', { exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
        await page.screenshot({ path: screenshot('settings'), fullPage: true });
    });

    test('new app page shows upload option', async ({ page }) => {
        await page.goto('/dashboard/new/');
        await expect(page.getByText(/upload manually/i)).toBeVisible();
        await page.screenshot({ path: screenshot('new-app-upload'), fullPage: true });
    });
});
