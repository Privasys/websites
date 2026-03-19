/**
 * Playwright auth setup — logs in via GitHub (through Zitadel OIDC) and saves session state.
 *
 * Required env vars:
 *   E2E_USER_EMAIL    — GitHub account username
 *   E2E_USER_PASSWORD — GitHub account password
 *
 * If GitHub device verification is triggered, the test writes a marker file
 * and polls for the OTP to be written to a file by the user/operator.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const stateFile = path.join(__dirname, '.auth', 'state.json');
const otpRequestFile = path.join(__dirname, '.auth', 'otp-needed');
const otpResponseFile = path.join(__dirname, '.auth', 'otp-code');

setup('authenticate via GitHub', async ({ page }) => {
    setup.setTimeout(180_000); // 3 min — gives time for OTP to be provided

    // Skip if auth state already exists (re-run with --force-auth to redo)
    if (fs.existsSync(stateFile) && !process.env.FORCE_AUTH) {
        console.log('Auth state already exists, skipping login. Set FORCE_AUTH=1 to redo.');
        return;
    }

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) {
        throw new Error('E2E_USER_EMAIL and E2E_USER_PASSWORD must be set');
    }

    // Clean up OTP marker files from previous runs
    const authDir = path.dirname(otpRequestFile);
    fs.mkdirSync(authDir, { recursive: true });
    try { fs.unlinkSync(otpRequestFile); } catch {}
    try { fs.unlinkSync(otpResponseFile); } catch {}

    // Go to the portal — login page auto-redirects to Zitadel OIDC
    await page.goto('/dashboard/');

    // Zitadel either auto-redirects to GitHub or shows IDP picker
    await page.waitForURL(/auth\.privasys\.org|github\.com/, { timeout: 30_000 });
    if (page.url().includes('auth.privasys.org')) {
        const githubBtn = page.getByRole('button', { name: /github/i });
        if (await githubBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await githubBtn.click();
        }
    }

    // Now on GitHub login page — fill credentials
    await page.waitForURL(/github\.com/, { timeout: 15_000 });
    await page.waitForLoadState('domcontentloaded');

    // Use explicit locators and type slowly to avoid GitHub JS race conditions
    const loginField = page.locator('#login_field');
    await loginField.waitFor({ state: 'visible', timeout: 10_000 });
    await loginField.click();
    await loginField.fill(email);

    const passwordField = page.locator('#password');
    await passwordField.waitFor({ state: 'visible', timeout: 10_000 });
    await passwordField.click();
    await passwordField.pressSequentially(password, { delay: 50 });

    // Debug screenshot to verify fields are filled
    await page.screenshot({ path: path.join(__dirname, 'test-results', 'debug-github-login.png'), fullPage: true });

    // Submit the login form using Promise.all to handle navigation
    await Promise.all([
        page.waitForNavigation({ timeout: 15_000 }),
        page.locator('[name="commit"]').click(),
    ]);

    // Post-click screenshot to see what page we landed on
    await page.screenshot({ path: path.join(__dirname, 'test-results', 'debug-after-signin.png'), fullPage: true });

    const currentUrl = page.url();
    console.log(`After sign-in click, URL: ${currentUrl}`);

    // Handle GitHub device verification if prompted
    if (currentUrl.includes('sessions/verified-device') ||
        await page.waitForURL(/sessions\/verified-device/, { timeout: 5_000 }).then(() => true).catch(() => false)) {
        // Signal that we need an OTP
        fs.writeFileSync(otpRequestFile, 'otp-needed');
        console.log('\n⚠️  GitHub device verification required — waiting for OTP...');
        console.log(`   Write the code to: ${otpResponseFile}\n`);

        // Poll for OTP file (check every 2s, up to 2 minutes)
        let otp = '';
        for (let i = 0; i < 60; i++) {
            await page.waitForTimeout(2_000);
            try {
                otp = fs.readFileSync(otpResponseFile, 'utf-8').trim();
                if (otp) break;
            } catch {}
        }
        if (!otp) throw new Error('Timed out waiting for OTP code');

        console.log(`   Got OTP: ${otp}, entering...`);
        await page.getByPlaceholder('XXXXXX').fill(otp);
        await page.getByRole('button', { name: /verify/i }).click({ noWaitAfter: true });
        await page.waitForURL(url => !url.toString().includes('verified-device') && !url.toString().includes('github.com'), { timeout: 30_000 });
    }

    // Handle possible authorize/continue app page (account selection)
    if (page.url().includes('github.com')) {
        const continueBtn = page.getByRole('button', { name: /continue|authorize/i });
        if (await continueBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await continueBtn.click({ noWaitAfter: true });
        }
    }

    // Wait for redirect back to the portal dashboard (Zitadel processing can be slow)
    await page.waitForURL('**/dashboard/**', { timeout: 60_000 });
    await expect(page.locator('text=Overview')).toBeVisible({ timeout: 15_000 });

    // Save authenticated state
    await page.context().storageState({ path: stateFile });
});
