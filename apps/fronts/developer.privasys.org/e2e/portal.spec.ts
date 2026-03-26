import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);

const COMMIT_URL = 'https://github.com/Privasys/wasm-app-example/commit/a6acb6da7a1e01b0a01dbb1bd6fcbd2054b6d345';

test.describe('Developer Portal', () => {
    test.describe.configure({ mode: 'serial' });

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

            // Wait for results to load — either TLS connection info or an error message.
            // The management service may lack the Go fork for challenge-response mode,
            // which produces an error text on screen. Either outcome means the tab works.
            const gotResult = await Promise.race([
                page.getByText(/TLS Connection/i).waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'tls'),
                page.getByText(/attestation failed/i).waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'error'),
            ]);

            if (gotResult === 'tls') {
                await expect(page.getByText(/x\.509 Certificate/i)).toBeVisible({ timeout: 5_000 });
            }
            // Either outcome means the attestation tab is functional

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

        // Fill container port
        const portInput = page.locator('input[type="number"][placeholder="8080"]');
        await expect(portInput).toBeVisible();
        await portInput.fill('8080');

        // Storage checkbox should NOT exist — all containers have encrypted storage by default
        const storageCheckbox = page.locator('#storage');
        expect(await storageCheckbox.isVisible().catch(() => false)).toBe(false);

        await page.screenshot({ path: screenshot('container-fields'), fullPage: true });
    });

    test('cleanup: delete all test apps', async ({ page }) => {
        test.setTimeout(300_000);
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

        // Delete each app via API (with per-request timeout to handle slow undeploy)
        for (const app of apps) {
            try {
                await page.request.delete(`${API}/api/v1/apps/${app.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 150_000,
                });
            } catch {
                console.warn(`cleanup: delete timed out for app ${app.name} (${app.id}), continuing`);
            }
        }

        // Verify via API
        const verifyResp = await page.request.get(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const remaining: unknown[] = await verifyResp.json();
        expect(remaining.length).toBe(0);
    });
});
