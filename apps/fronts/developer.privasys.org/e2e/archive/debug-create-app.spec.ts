/**
 * Diagnostic test: investigates the "failed to create app" bug on prod.
 *
 * Run with:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts debug-create-app.spec.ts --headed
 *
 * Pass E2E_BASE_URL=https://developer.privasys.org to target prod.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) =>
    path.join(__dirname, 'test-results', `${name}.png`);

const COMMIT_URL =
    'https://github.com/Privasys/wasm-app-example/commit/f0eefca8adf131a8ab763641c06ac83e1ca1feef';

test.describe('Debug: create app flow', () => {
    /** Capture all network requests/responses for /api/ calls */
    test('trace the full create-app journey', async ({ page }) => {
        test.setTimeout(180_000); // 3 min — includes time for manual login

        const apiLogs: string[] = [];

        // Intercept every /api/ request and response
        page.on('request', req => {
            if (req.url().includes('/api/')) {
                apiLogs.push(`>> ${req.method()} ${req.url()}`);
                const body = req.postData();
                if (body) apiLogs.push(`   body: ${body}`);
            }
        });

        page.on('response', async res => {
            if (res.url().includes('/api/')) {
                const status = res.status();
                let body = '';
                try {
                    body = await res.text();
                    if (body.length > 500) body = body.slice(0, 500) + '…';
                } catch { body = '<unreadable>'; }
                apiLogs.push(`<< ${status} ${res.url()}`);
                apiLogs.push(`   body: ${body}`);
            }
        });

        // Also capture console messages from the browser
        const consoleLogs: string[] = [];
        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        });

        // 1. Go to dashboard — triggers session check, /me, SSE, etc.
        console.log('=== Step 1: Navigate to dashboard ===');
        await page.goto('/dashboard/');
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await page.screenshot({ path: screenshot('debug-01-dashboard'), fullPage: true });

        console.log('Dashboard URL:', page.url());

        // Check if we got redirected to login — if so, wait for manual login
        if (page.url().includes('/login') || page.url().includes('auth.privasys.org') || page.url().includes('github.com')) {
            console.log('Not logged in — waiting for manual login (you have 2 minutes)...');
            console.log('Please log in in the browser window.');
            await page.waitForURL('**/dashboard/**', { timeout: 120_000 });
            console.log('Login complete, now on:', page.url());
            await page.waitForTimeout(2_000);
        }

        // Verify we see the nav / dashboard content
        const nav = page.locator('nav').first();
        await nav.waitFor({ state: 'visible', timeout: 10_000 });
        console.log('Dashboard loaded OK');

        // 2. Navigate to "New Application" page
        console.log('\n=== Step 2: Navigate to /dashboard/new/ ===');
        await page.goto('/dashboard/new/');
        await page.waitForLoadState('domcontentloaded');
        await page.screenshot({ path: screenshot('debug-02-new-app-page'), fullPage: true });

        // 3. Fill commit URL
        console.log('\n=== Step 3: Fill commit URL ===');
        const commitInput = page.getByPlaceholder(/github\.com/i);
        await commitInput.waitFor({ state: 'visible', timeout: 5_000 });
        await commitInput.fill(COMMIT_URL);

        // Wait for URL to be parsed
        await page.waitForTimeout(2_000);
        await page.screenshot({ path: screenshot('debug-03-commit-filled'), fullPage: true });

        // Check if repo info appeared
        const repoInfo = page.getByText('Privasys/wasm-app-example');
        const repoVisible = await repoInfo.isVisible().catch(() => false);
        console.log('Repo info visible:', repoVisible);

        // 4. Check name availability
        console.log('\n=== Step 4: Check name field ===');
        const nameInput = page.locator('input[type="text"]').nth(1);
        const nameValue = await nameInput.inputValue().catch(() => '<not found>');
        console.log('Name field value:', nameValue);

        // Wait for availability check
        await page.waitForTimeout(3_000);
        await page.screenshot({ path: screenshot('debug-04-name-check'), fullPage: true });

        const availableMsg = page.getByText(/\.apps\.privasys\.org is available/i);
        const takenMsg = page.getByText(/already taken|name is reserved/i);
        const availVisible = await availableMsg.isVisible().catch(() => false);
        const takenVisible = await takenMsg.isVisible().catch(() => false);
        console.log('Available message visible:', availVisible);
        console.log('Taken message visible:', takenVisible);

        // If name is taken, use a unique name
        if (takenVisible) {
            const uniqueName = `e2e-debug-${Date.now().toString(36).slice(-4)}`;
            console.log('Name taken, using unique name:', uniqueName);
            await nameInput.clear();
            await nameInput.fill(uniqueName);
            await page.waitForTimeout(3_000);
            await page.screenshot({ path: screenshot('debug-04b-unique-name'), fullPage: true });
        }

        // 5. Click "Create Application"
        console.log('\n=== Step 5: Click Create Application ===');
        const createBtn = page.getByRole('button', { name: /create application/i });
        const btnEnabled = await createBtn.isEnabled().catch(() => false);
        const btnVisible = await createBtn.isVisible().catch(() => false);
        console.log('Create button visible:', btnVisible, 'enabled:', btnEnabled);
        await page.screenshot({ path: screenshot('debug-05-before-create'), fullPage: true });

        if (!btnEnabled || !btnVisible) {
            console.log('Create button not available!');
            console.log('\n=== API Logs ===\n', apiLogs.join('\n'));
            console.log('\n=== Console Logs ===\n', consoleLogs.join('\n'));
            test.fail(true, 'Create button not available');
            return;
        }

        // Click and wait for response
        await createBtn.click();

        // Wait for the response to come in
        await page.waitForTimeout(5_000);
        await page.screenshot({ path: screenshot('debug-06-after-create'), fullPage: true });

        // Check what happened
        const successMsg = page.getByText(/application submitted/i);
        const errorMsg = page.getByText(/failed|error/i);
        const successVisible = await successMsg.isVisible().catch(() => false);
        const errorVisible = await errorMsg.isVisible().catch(() => false);
        console.log('Success message visible:', successVisible);
        console.log('Error message visible:', errorVisible);
        if (errorVisible) {
            const errorText = await errorMsg.textContent().catch(() => '');
            console.log('Error text:', errorText);
        }

        const finalUrl = page.url();
        console.log('Final URL:', finalUrl);

        // Print all captured API traffic
        console.log('\n========== API TRAFFIC ==========');
        for (const line of apiLogs) {
            console.log(line);
        }
        console.log('========== END API TRAFFIC ==========');

        console.log('\n========== CONSOLE LOGS ==========');
        for (const line of consoleLogs) {
            console.log(line);
        }
        console.log('========== END CONSOLE LOGS ==========');

        // Take one more screenshot after inspecting
        await page.screenshot({ path: screenshot('debug-07-final'), fullPage: true });
    });
});
