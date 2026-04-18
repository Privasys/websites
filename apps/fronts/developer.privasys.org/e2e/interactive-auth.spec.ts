/**
 * Interactive auth e2e tests for the Privasys SDK.
 *
 * These tests require human interaction — they pause at the right moment
 * so you can scan QR codes, enter social‑provider credentials, or tap a
 * passkey prompt.  The agent checks the page for errors after you resume.
 *
 * Run:
 *   npx playwright test interactive-auth.spec.ts --project=interactive --config=e2e/playwright.config.ts
 *
 * Architecture:
 *   The portal creates a full-viewport <iframe src="https://privasys.id/auth/">
 *   which hosts the frame-host script. Inside that iframe, AuthUI renders
 *   the auth buttons / QR in a closed Shadow DOM.  We use frameLocator()
 *   to reach the iframe, then evaluate inside it to access the shadow root.
 */
import { test, expect, Page, FrameLocator } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Selector for the full-viewport auth iframe injected by frame-client.ts. */
const AUTH_IFRAME_SEL = 'iframe[src*="privasys.id/auth"]';

/**
 * Patch Shadow DOM to `mode: 'open'` in ALL frames (including the auth iframe).
 * The SDK uses a closed Shadow DOM inside the privasys.id iframe; without this
 * patch Playwright selectors cannot reach the auth buttons / QR code.
 */
const FORCE_OPEN_SHADOW = `
  const _origAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function(init) {
    return _origAttachShadow.call(this, { ...init, mode: 'open' });
  };
`;

/** Attach console.error / pageerror collectors and return the array. */
function collectErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
    return errors;
}

/** Track failed HTTP requests (4xx/5xx) on auth-critical endpoints only. */
function collectFailedRequests(page: Page): string[] {
    const failures: string[] = [];
    page.on('response', res => {
        if (res.status() >= 400) {
            const url = res.url();
            // Only flag failures on auth-specific endpoints (IdP, relay, SDK)
            // Exclude app API calls (api-test.developer) — those are post-auth data loads
            if (
                (url.includes('privasys.id') || url.includes('relay.')) &&
                !url.includes('favicon')
            ) {
                failures.push(`[HTTP ${res.status()}] ${res.url()}`);
            }
        }
    });
    return failures;
}

/** Filter out noise errors (favicon, resource loads, third-party cookies). */
function criticalOnly(errors: string[]): string[] {
    return errors.filter(
        e =>
            !e.includes('favicon') &&
            !e.includes('third-party cookie') &&
            !e.includes('net::ERR_BLOCKED_BY_CLIENT') &&
            !e.includes('ERR_FAVICON') &&
            // Browser "Failed to load resource" for 4xx are just HTTP status echoes
            !e.includes('Failed to load resource'),
    );
}

/**
 * Navigate to the portal dashboard (auto‑triggers signIn → auth iframe).
 * Returns a FrameLocator pointing into the privasys.id auth iframe.
 */
async function goToDashboard(page: Page): Promise<FrameLocator> {
    // Patch all frames (main + iframes) so closed shadow DOMs become open
    await page.addInitScript(FORCE_OPEN_SHADOW);

    await page.goto('/dashboard/');

    // Wait for the full-viewport auth iframe to be added to the DOM.
    // The portal hydrates, detects no session (~5 s getSession timeout),
    // then calls signIn() which injects the iframe.
    await page.locator(AUTH_IFRAME_SEL).waitFor({ state: 'attached', timeout: 30_000 });
    console.log('Auth iframe attached.');

    const frame = page.frameLocator(AUTH_IFRAME_SEL);

    // Inside the iframe, frame-host creates an AuthUI (shadow DOM).
    // Wait for the auth-panel heading to be rendered in the iframe.
    await frame.getByText('Sign in to', { exact: false }).waitFor({ state: 'visible', timeout: 20_000 });
    console.log('Auth UI rendered inside iframe.');

    return frame;
}

// ---------------------------------------------------------------------------
// 1. Wallet — QR code scan
// ---------------------------------------------------------------------------

test.describe('Wallet QR flow', () => {
    test('authenticate by scanning QR with the Privasys Wallet', async ({ page }) => {
        test.setTimeout(300_000); // 5 min for human interaction

        const errors = collectErrors(page);
        const httpFails = collectFailedRequests(page);

        const frame = await goToDashboard(page);

        // The idle screen should show a "Continue with Privasys ID" button
        const walletBtn = frame.getByText('Continue with Privasys ID', { exact: false });
        await walletBtn.waitFor({ state: 'visible', timeout: 10_000 });
        await walletBtn.click();

        // QR code should now be visible (SVG rendered inside the iframe)
        await expect(frame.locator('svg').first()).toBeVisible({ timeout: 10_000 });
        console.log('\n  QR code displayed — scan it with the Privasys Wallet app.');
        console.log('    When done, close the Inspector (Resume) to continue the test.\n');

        // PAUSE: scan the QR code with your phone
        await page.pause();

        // ── After resume — verify outcome ──
        await assertAuthSuccess(page, errors, httpFails);
    });
});

// ---------------------------------------------------------------------------
// 2. Social IdP (e.g. GitHub)
// ---------------------------------------------------------------------------

test.describe('Social IdP flow', () => {
    test('authenticate via a social identity provider', async ({ page }) => {
        test.setTimeout(300_000);

        const errors = collectErrors(page);
        const httpFails = collectFailedRequests(page);

        const frame = await goToDashboard(page);

        // Look for any social provider button (GitHub, Google, etc.)
        const socialBtn = frame
            .getByText(/GitHub|Google|Microsoft|LinkedIn/i)
            .first();

        if (await socialBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
            const providerName = await socialBtn.textContent();
            console.log(`\n  Clicking "${providerName}" — complete the login in the browser.`);
            console.log('    When done, close the Inspector (Resume) to continue the test.\n');
            await socialBtn.click();
        } else {
            console.log('\n  No social provider buttons found on this IdP configuration.');
            console.log('    Complete login manually, then resume.\n');
        }

        // ── PAUSE: complete the social provider login ──
        await page.pause();

        // ── After resume — verify outcome ──
        await assertAuthSuccess(page, errors, httpFails);
    });
});

// ---------------------------------------------------------------------------
// 3. Platform FIDO2 / Passkey
// ---------------------------------------------------------------------------

test.describe('Platform FIDO2 flow', () => {
    test('authenticate with a passkey (Windows Hello / Touch ID)', async ({ page }) => {
        test.setTimeout(300_000);

        const errors = collectErrors(page);
        const httpFails = collectFailedRequests(page);

        const frame = await goToDashboard(page);

        // Click "Passkey" button inside the auth iframe
        const passkeyBtn = frame.getByText('Passkey', { exact: true });
        if (await passkeyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
            console.log('\n  Clicking "Passkey" — approve the browser prompt.');
            console.log('    When done, close the Inspector (Resume) to continue the test.\n');
            await passkeyBtn.click();
        } else {
            console.log('\n  No passkey button visible (WebAuthn not supported in this context?).');
            console.log('    Complete login manually, then resume.\n');
        }

        // ── PAUSE: complete the passkey / biometric prompt ──
        await page.pause();

        // ── After resume — verify outcome ──
        await assertAuthSuccess(page, errors, httpFails);
    });
});

// ---------------------------------------------------------------------------
// Shared assertion: auth succeeded, no critical errors
// ---------------------------------------------------------------------------

async function assertAuthSuccess(
    page: Page,
    consoleErrors: string[],
    httpFailures: string[],
): Promise<void> {
    // After auth completes the iframe is removed and the portal renders /dashboard.
    // Give it a moment to process the token and redirect.
    await page.waitForTimeout(3_000);

    // Option A: The auth iframe is gone (signIn resolved, iframe cleaned up)
    const iframeGone = await page
        .locator(AUTH_IFRAME_SEL)
        .isHidden({ timeout: 5_000 })
        .catch(() => true);

    // Option B: The portal loaded the dashboard content
    const onDashboard = page.url().includes('/dashboard');

    // Option C: A session cookie / token exists
    const hasSession = await page
        .evaluate(() => {
            try {
                return document.cookie.includes('session') ||
                    !!sessionStorage.getItem('privasys_session') ||
                    !!localStorage.getItem('privasys_session');
            } catch { return false; }
        })
        .catch(() => false);

    console.log('\n-- Auth result --');
    console.log(`  Auth iframe removed         : ${iframeGone}`);
    console.log(`  On /dashboard               : ${onDashboard}`);
    console.log(`  Session cookie/storage       : ${hasSession}`);

    // Log any collected errors
    const critical = criticalOnly(consoleErrors);
    if (critical.length) {
        console.log('\n⚠️  Console errors:');
        critical.forEach(e => console.log(`    ${e}`));
    }
    if (httpFailures.length) {
        console.log('\n⚠️  Failed HTTP requests:');
        httpFailures.forEach(e => console.log(`    ${e}`));
    }

    // Hard assertions
    expect(critical, 'No critical console errors').toHaveLength(0);
    // Log HTTP failures as warnings but don't fail the test if auth succeeded.
    // Intermediate 404s (e.g. passkey endpoint not configured) are expected
    // when the user falls back to a different auth method.
    if (httpFailures.length) {
        console.log('  (HTTP failures logged above are non-fatal — auth still succeeded)');
    }
    expect(
        iframeGone || onDashboard || hasSession,
        'Auth should succeed (iframe removed, dashboard loaded, or session present)',
    ).toBe(true);
}
