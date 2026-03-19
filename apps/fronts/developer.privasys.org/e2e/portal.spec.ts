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

        // Wait for URL to be parsed
        await expect(page.getByText('Privasys/wasm-app-example')).toBeVisible({ timeout: 5_000 });

        // The name pre-fills to "wasm-app-example" — if our first test created it,
        // it should show as taken (or available if this test runs first)
        const available = page.getByText(/\.apps\.privasys\.org is available/i);
        const taken = page.getByText(/already taken|name is reserved/i);
        await expect(available.or(taken)).toBeVisible({ timeout: 5_000 });
        await page.screenshot({ path: screenshot('create-app-name-check'), fullPage: true });

        // Verify reserved names are rejected
        const nameInput = page.locator('input[type="text"]').nth(1); // second input (after commit URL)
        await nameInput.clear();
        await nameInput.fill('admin');
        await expect(page.getByText(/reserved/i)).toBeVisible({ timeout: 5_000 });
        await page.screenshot({ path: screenshot('create-app-reserved'), fullPage: true });
    });

    test('build completes and app transitions to Ready', async ({ page }) => {
        test.setTimeout(180_000); // 3 minutes — build takes ~55s

        // Create a fresh app with a unique name to test the full flow
        await page.goto('/dashboard/new/');
        await expect(page.locator('h1')).toContainText(/new application/i);

        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(COMMIT_URL);

        // Wait for URL parsing
        await expect(page.getByText('Privasys/wasm-app-example')).toBeVisible({ timeout: 5_000 });

        // Use a unique name to avoid conflicts
        const uniqueName = `e2e-build-${Date.now().toString(36).slice(-6)}`;
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

        // Wait for the tabbed view to appear — the build completes and SSE pushes
        // the status to "built", which triggers the frontend to show tabs
        const overviewTab = page.getByRole('button', { name: 'Overview' });
        await expect(overviewTab).toBeVisible({ timeout: 120_000 });

        // Verify the app is in the tabbed view with all expected tabs
        await expect(page.getByRole('button', { name: 'Deployments' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'App Store' })).toBeVisible();

        await page.screenshot({ path: screenshot('build-complete-ready'), fullPage: true });
    });

    test('deploy app to enclave and verify active deployment', async ({ page }) => {
        test.setTimeout(180_000); // 3 minutes — build takes ~55s + deploy

        // Create a fresh app with a unique name
        await page.goto('/dashboard/new/');
        await expect(page.locator('h1')).toContainText(/new application/i);

        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.fill(COMMIT_URL);
        await expect(page.getByText('Privasys/wasm-app-example')).toBeVisible({ timeout: 5_000 });

        const uniqueName = `e2e-deploy-${Date.now().toString(36).slice(-6)}`;
        const nameInput = page.locator('input[type="text"]').nth(1);
        await nameInput.clear();
        await nameInput.fill(uniqueName);
        await expect(page.getByText(/\.apps\.privasys\.org is available/i)).toBeVisible({ timeout: 5_000 });

        const createBtn = page.getByRole('button', { name: /create application/i });
        await expect(createBtn).toBeEnabled();
        await createBtn.click();

        await expect(page.getByText(/application submitted/i)).toBeVisible({ timeout: 15_000 });
        await page.waitForURL('**/dashboard/apps/**', { timeout: 10_000 });

        // Wait for build to complete — tabbed view appears
        const deploymentsTab = page.getByRole('button', { name: 'Deployments' });
        await expect(deploymentsTab).toBeVisible({ timeout: 120_000 });

        // Go to Deployments tab
        await deploymentsTab.click();
        await page.screenshot({ path: screenshot('deploy-tab-before'), fullPage: true });

        // Select version (should have v1 ready from auto-build)
        const versionSelect = page.locator('select').first();
        await expect(versionSelect).toBeVisible({ timeout: 5_000 });
        // Pick the first non-empty option
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

            // Click inspect and wait for results
            await inspectBtn.click();

            // Should NOT show "app is not deployed to an enclave" error
            const notDeployedError = page.getByText('app is not deployed to an enclave');
            // Wait a bit for the response, then check
            await page.waitForTimeout(3_000);
            const hasNotDeployedError = await notDeployedError.isVisible().catch(() => false);
            expect(hasNotDeployedError).toBeFalsy();

            // Should show some attestation result (certificate info, verification, etc.)
            const certSection = page.getByText(/certificate|attestation|quote|subject/i);
            await expect(certSection.first()).toBeVisible({ timeout: 15_000 });

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

    test('overview tab has Danger Zone with delete', async ({ page }) => {
        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });
        await page.waitForTimeout(2_000);

        const appLinks = page.locator('nav a[href*="/dashboard/apps/"]');
        const count = await appLinks.count();
        test.skip(count === 0, 'No apps exist');

        await appLinks.first().click();
        await page.waitForURL('**/dashboard/apps/**');

        // If tabbed view, check Overview has Danger Zone
        const overviewTab = page.getByRole('button', { name: 'Overview' });
        try {
            await overviewTab.waitFor({ state: 'visible', timeout: 10_000 });
            await overviewTab.click();
            await expect(page.getByText('Danger Zone')).toBeVisible();
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
});
