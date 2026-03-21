import { test } from '@playwright/test';

test.skip('diagnose auth callback', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();

    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const responses: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(`${err.name}: ${err.message}`));
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('response', (res) => {
        if (res.status() >= 400) {
            responses.push(`${res.status()} ${res.url()}`);
        }
    });

    // Go to dashboard — should redirect via login -> Zitadel -> GitHub
    console.log('=== Step 1: Go to /dashboard/ ===');
    await page.goto('https://developer-test.privasys.org/dashboard/');
    console.log(`URL after goto: ${page.url()}`);

    // Wait for Zitadel or GitHub
    await page.waitForURL(/auth\.privasys\.org|github\.com/, { timeout: 30_000 });
    console.log(`At auth: ${page.url()}`);

    // Handle Zitadel IDP picker if shown
    if (page.url().includes('auth.privasys.org')) {
        const githubBtn = page.getByRole('button', { name: /github/i });
        if (await githubBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
            console.log('Clicking GitHub IDP button...');
            await githubBtn.click();
        }
    }

    // Wait for GitHub login page
    await page.waitForURL(/github\.com/, { timeout: 30_000 });
    console.log(`On GitHub: ${page.url()}`);

    // Fill GitHub login
    await page.waitForLoadState('domcontentloaded');
    const loginField = page.locator('#login_field');
    await loginField.waitFor({ state: 'visible', timeout: 10_000 });
    await loginField.click();
    await loginField.fill(process.env.E2E_USER_EMAIL!);
    const passwordField = page.locator('#password');
    await passwordField.click();
    await passwordField.pressSequentially(process.env.E2E_USER_PASSWORD!, { delay: 50 });

    await Promise.all([
        page.waitForNavigation({ timeout: 30_000 }),
        page.locator('[name="commit"]').click(),
    ]);
    console.log(`After login: ${page.url()}`);

    // Handle authorize/continue if needed
    if (page.url().includes('github.com')) {
        const continueBtn = page.getByRole('button', { name: /continue|authorize/i });
        if (await continueBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
            console.log('Clicking authorize/continue...');
            await continueBtn.click({ noWaitAfter: true });
        }
    }

    // Wait for redirect back to the portal
    console.log('Waiting for redirect to portal...');
    try {
        await page.waitForURL(/developer-test\.privasys\.org/, { timeout: 60_000 });
    } catch {
        console.log('Timeout waiting for portal redirect');
    }
    console.log(`Final URL: ${page.url()}`);

    // Wait for page to settle
    await page.waitForTimeout(5000);

    console.log(`\n=== Page Errors (${pageErrors.length}) ===`);
    for (const e of pageErrors) console.log(`  PAGE_ERROR: ${e}`);

    console.log(`\n=== Console Errors (${consoleErrors.length}) ===`);
    for (const m of consoleErrors) console.log(`  CONSOLE_ERROR: ${m}`);

    console.log(`\n=== Failed HTTP Responses (${responses.length}) ===`);
    for (const r of responses) console.log(`  HTTP_ERROR: ${r}`);

    const bodyText = await page.locator('body').innerText().catch(() => 'COULD NOT GET TEXT');
    console.log(`\n=== Body Text ===\n${bodyText.substring(0, 500)}`);

    await page.screenshot({ path: '/tmp/diag-auth-callback.png', fullPage: true });

    await ctx.close();
});
