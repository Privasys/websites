import { test, expect, Page } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);

const COMMIT_URL = 'https://github.com/Privasys/wasm-app-example/commit/f0eefca8adf131a8ab763641c06ac83e1ca1feef';
const CONTAINER_COMMIT_URL = 'https://github.com/Privasys/container-app-example/commit/04a44ffc9068a8600a69b7791bde8fd970362502';

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

    test('App Store tab shows live banner for deployed app', async ({ page }) => {
        test.setTimeout(120_000);

        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);

        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist');

        // Find a deployed app (one that shows the Attestation tab — only visible for active deployments)
        let foundDeployed = false;
        for (let i = 0; i < count; i++) {
            await page.goto('/dashboard/');
            await page.waitForSelector('nav a[href*="/dashboard/apps/"]', { timeout: 5_000 });
            await page.locator('nav a[href*="/dashboard/apps/"]').nth(i).click();
            await page.waitForURL('**/dashboard/apps/**');

            // Wait for page to fully load — either tabbed or pipeline view
            try {
                await page.getByRole('button', { name: 'Overview' }).waitFor({ state: 'visible', timeout: 10_000 });
            } catch {
                continue; // pipeline view or still loading
            }

            // Check Attestation tab is visible (only when deployment is active)
            try {
                await page.getByRole('button', { name: 'Attestation' }).waitFor({ state: 'visible', timeout: 3_000 });
            } catch {
                continue; // no active deployment
            }

            foundDeployed = true;

            // Click App Store tab
            await page.getByRole('button', { name: 'App Store' }).click();
            await page.waitForTimeout(500);

            // Should show the green "live" banner, NOT the amber "must be deployed" warning
            const mustDeploy = page.getByText('must be deployed');
            const showsMustDeploy = await mustDeploy.isVisible().catch(() => false);
            expect(showsMustDeploy).toBeFalsy();

            await expect(page.getByText('Your app is live')).toBeVisible({ timeout: 5_000 });

            await page.screenshot({ path: screenshot('store-tab-live'), fullPage: true });
            break;
        }
        test.skip(!foundDeployed, 'No deployed app found');
    });

    test('Attestation tab works for deployed app', async ({ page }) => {
        test.setTimeout(120_000);

        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);

        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist');

        let foundDeployed = false;
        for (let i = 0; i < count; i++) {
            await page.goto('/dashboard/');
            await page.waitForSelector('nav a[href*="/dashboard/apps/"]', { timeout: 5_000 });
            await page.locator('nav a[href*="/dashboard/apps/"]').nth(i).click();
            await page.waitForURL('**/dashboard/apps/**');

            try {
                await page.getByRole('button', { name: 'Overview' }).waitFor({ state: 'visible', timeout: 10_000 });
            } catch { continue; }

            try {
                await page.getByRole('button', { name: 'Attestation' }).waitFor({ state: 'visible', timeout: 3_000 });
            } catch { continue; }

            foundDeployed = true;
            await page.getByRole('button', { name: 'Attestation' }).click();
            await page.waitForTimeout(500);

            // Should show Inspect Certificate button
            const inspectBtn = page.getByRole('button', { name: /inspect certificate/i });
            await expect(inspectBtn).toBeVisible({ timeout: 5_000 });

            // Click inspect (challenge mode — random hex is pre-filled)
            await inspectBtn.click();

            // Wait for results to load — should show TLS connection and certificate info
            await expect(page.getByText(/TLS Connection/i)).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText(/x\.509 Certificate/i)).toBeVisible({ timeout: 5_000 });

            // Should show challenge mode active (not deterministic mode)
            await expect(page.getByText(/Challenge Mode Active/i)).toBeVisible({ timeout: 5_000 });

            await page.screenshot({ path: screenshot('attestation-tab-result'), fullPage: true });
            break;
        }
        test.skip(!foundDeployed, 'No deployed app found');
    });

    test('API Testing tab loads schema for deployed app', async ({ page }) => {
        test.setTimeout(120_000);

        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);

        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist');

        let foundDeployed = false;
        for (let i = 0; i < count; i++) {
            await page.goto('/dashboard/');
            await page.waitForSelector('nav a[href*="/dashboard/apps/"]', { timeout: 5_000 });
            await page.locator('nav a[href*="/dashboard/apps/"]').nth(i).click();
            await page.waitForURL('**/dashboard/apps/**');

            try {
                await page.getByRole('button', { name: 'Overview' }).waitFor({ state: 'visible', timeout: 10_000 });
            } catch { continue; }

            try {
                await page.getByRole('button', { name: 'API Testing' }).waitFor({ state: 'visible', timeout: 3_000 });
            } catch { continue; }

            foundDeployed = true;
            await page.getByRole('button', { name: 'API Testing' }).click();

            // Wait for loading to finish
            await page.waitForTimeout(5_000);

            // Should NOT show "not deployed" error
            const notDeployedError = page.getByText('app is not deployed to an enclave');
            const hasDeployError = await notDeployedError.isVisible().catch(() => false);
            expect(hasDeployError).toBeFalsy();

            // Schema should either load successfully or show a non-deployment error
            const schemaError = page.getByText('Could not load API schema');
            const hasSchemaError = await schemaError.isVisible().catch(() => false);
            if (hasSchemaError) {
                const errorText = await page.locator('text=Could not load API schema').locator('..').textContent() || '';
                expect(errorText).not.toContain('not deployed');
            }

            // If schema loaded, verify function selector and send button exist
            const funcSelector = page.locator('select').first();
            const funcLoaded = await funcSelector.isVisible().catch(() => false);
            if (funcLoaded) {
                const sendBtn = page.getByRole('button', { name: /send|call/i });
                await expect(sendBtn.first()).toBeVisible();
            }

            await page.screenshot({ path: screenshot('api-testing-tab'), fullPage: true });
            break;
        }
        test.skip(!foundDeployed, 'No deployed app found');
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
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);

        // Find any app in the sidebar
        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist — skip app detail test');

        await appLinks.first().click();
        await page.waitForURL('**/dashboard/apps/**');

        // Wait for page to fully load — either tabbed or pipeline view
        let isTabbed = false;
        let isPipeline = false;
        try {
            await page.getByRole('button', { name: 'Overview' }).waitFor({ state: 'visible', timeout: 10_000 });
            isTabbed = true;
        } catch {
            isPipeline = await page.locator('text=Application submitted').isVisible().catch(() => false);
        }

        // Must be one or the other
        expect(isTabbed || isPipeline).toBeTruthy();

        await page.screenshot({ path: screenshot('app-detail'), fullPage: true });
    });

    test('built app shows Deployments and App Store tabs', async ({ page }) => {
        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);

        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist');

        await appLinks.first().click();
        await page.waitForURL('**/dashboard/apps/**');

        // Wait for the tab to load
        try {
            await page.getByRole('button', { name: 'Deployments' }).waitFor({ state: 'visible', timeout: 10_000 });
        } catch {
            test.skip(true, 'App is not in tabbed view');
        }

        // Verify core tabs
        await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Deployments' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'App Store' })).toBeVisible();

        // Click Deployments tab
        await page.getByRole('button', { name: 'Deployments' }).click();
        await page.screenshot({ path: screenshot('deployments-tab'), fullPage: true });

        // Click App Store tab
        await page.getByRole('button', { name: 'App Store' }).click();
        await page.screenshot({ path: screenshot('store-tab'), fullPage: true });
    });

    test('overview tab has delete option', async ({ page }) => {
        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);

        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist');

        await appLinks.first().click();
        await page.waitForURL('**/dashboard/apps/**');

        // If tabbed view, check Overview has delete section
        const overviewTab = page.getByRole('button', { name: 'Overview' });
        try {
            await overviewTab.waitFor({ state: 'visible', timeout: 10_000 });
            await overviewTab.click();
            await expect(page.getByText('Delete this application')).toBeVisible();
            await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
        } catch { /* pipeline view */ }
        await page.screenshot({ path: screenshot('overview-danger'), fullPage: true });
    });

    test('pipeline view always has a delete action button', async ({ page }) => {
        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);

        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist');

        // Check every app — if it shows the pipeline, it must have a delete button
        for (let i = 0; i < count; i++) {
            await page.goto('/dashboard/');
            await page.waitForSelector('nav a[href*="/dashboard/apps/"]', { timeout: 5_000 });
            const link = page.locator('nav a[href*="/dashboard/apps/"]').nth(i);
            const appName = (await link.textContent())?.trim() || `app-${i}`;
            await link.click();
            await page.waitForURL('**/dashboard/apps/**');

            // Determine if pipeline view (non-terminal status)
            const pipelineMarker = page.locator('text=Application submitted');
            const isPipeline = await pipelineMarker.isVisible({ timeout: 3_000 }).catch(() => false);

            if (isPipeline) {
                // Pipeline view — there MUST be a delete button so the user is never stuck
                const deleteBtn = page.getByRole('button', { name: /delete application/i });
                await expect(deleteBtn).toBeVisible({ timeout: 3_000 });
                await page.screenshot({ path: screenshot(`pipeline-action-${appName}`), fullPage: true });
            } else {
                // Tabbed view — Danger Zone delete is in the Overview tab
                const overviewTab = page.getByRole('button', { name: 'Overview' });
                if (await overviewTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
                    await overviewTab.click();
                }
                const deleteBtn = page.getByRole('button', { name: /delete/i });
                await expect(deleteBtn).toBeVisible({ timeout: 3_000 });
            }
        }
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

    test('new app page shows app type selector for GitHub commits', async ({ page }) => {
        await page.goto('/dashboard/new/');
        await expect(page.locator('h1')).toContainText(/new application/i);

        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(COMMIT_URL);

        // Wait for URL parsing
        await expect(page.getByText('Privasys/wasm-app-example')).toBeVisible({ timeout: 5_000 });

        // Type toggle should appear with WASM App and Container buttons
        const wasmBtn = page.getByRole('button', { name: 'WASM App' });
        const containerBtn = page.getByRole('button', { name: 'Container' });
        await expect(wasmBtn).toBeVisible({ timeout: 10_000 });
        await expect(containerBtn).toBeVisible();

        // For the wasm example repo, WASM should be auto-detected and selected
        await expect(wasmBtn).toHaveClass(/bg-black|bg-white/);

        await page.screenshot({ path: screenshot('app-type-selector-wasm'), fullPage: true });
    });

    test('selecting container type shows container-specific fields', async ({ page }) => {
        await page.goto('/dashboard/new/');
        await expect(page.locator('h1')).toContainText(/new application/i);

        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(COMMIT_URL);
        await expect(page.getByText('Privasys/wasm-app-example')).toBeVisible({ timeout: 5_000 });

        // Wait for auto-detection to complete before clicking
        await expect(page.getByText('(auto-detected)')).toBeVisible({ timeout: 10_000 });

        // Click Container button
        const containerBtn = page.getByRole('button', { name: 'Container' });
        await containerBtn.click();

        // Container-specific fields should appear
        await expect(page.getByText('Container port')).toBeVisible({ timeout: 5_000 });
        await expect(page.getByText(/encrypted persistent storage/i)).toBeVisible();

        // Fill container port
        const portInput = page.locator('input[type="number"][placeholder="8080"]');
        await expect(portInput).toBeVisible();
        await portInput.fill('8080');

        // Toggle storage checkbox
        const storageCheckbox = page.locator('#storage');
        await expect(storageCheckbox).toBeVisible();
        await storageCheckbox.check();
        expect(await storageCheckbox.isChecked()).toBe(true);

        await page.screenshot({ path: screenshot('container-fields'), fullPage: true });
    });

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

    test('cleanup: delete all test apps', async ({ page }) => {
        test.setTimeout(120_000);
        const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

        // Navigate to establish cookies, then extract the access token from the session
        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        const session = await page.evaluate(() => fetch('/api/auth/session').then(r => r.json()));
        const token = session?.accessToken as string;
        expect(token).toBeTruthy();

        // List apps via API
        const listResp = await page.request.get(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(listResp.ok()).toBeTruthy();
        const apps: { id: string; name: string }[] = await listResp.json();

        // Delete each app via API
        for (const app of apps) {
            await page.request.delete(`${API}/api/v1/apps/${app.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
        }

        // Verify via API
        const verifyResp = await page.request.get(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const remaining: unknown[] = await verifyResp.json();
        expect(remaining.length).toBe(0);
    });
});
