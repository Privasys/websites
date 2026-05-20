import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// End-to-end regression test for the explorer Quote Verification
// "Get Token" button.
//
// History of the bug this guards against
// --------------------------------------
// (1) 2026-05-20 — hosted privasys-auth-client.iife.js stub: the bundle at
//     https://privasys.id/auth/privasys-auth-client.iife.js was a 4.3 kB stub
//     from before sdk-v0.3.7 and was missing AuthFrame.getTokenForAudience.
//     Fixed in auth sdk-v0.3.11 by also redeploying the client bundle from
//     publish-sdk.yaml.
// (2) 2026-05-20 — wrong AuthFrame + wrong flow: the button used the
//     per-WASM-app AuthFrame (rpId = `<appName>.<gatewayDomain>`, EncAuth
//     credentials) instead of a Privasys.id-OIDC AuthFrame (rpId = privasys.id,
//     `privasys-platform` client). And it called `getSession().then(getToken)`
//     — but getSession() returns null AND tears down its hidden iframe when
//     no session exists, so getTokenForAudience() then threw "no active
//     session iframe; call getSession() first". Fixed by routing through a
//     `mintAudienceToken()` helper that does signIn() when no session exists.
//
// Test strategy
// -------------
// The real WebAuthn ceremony can't run in headless Playwright without a
// virtual authenticator and a real registered passkey on the test IdP,
// so we don't drive sign-in to completion. Instead we assert the
// VISIBLE consequences of clicking the button:
//
//   * The SDK appends a full-screen iframe whose `src` starts with
//     https://privasys.id/auth/ — i.e. the actual Privasys.id OIDC
//     overlay opens for the user.
//   * That iframe stays attached and visible for several seconds
//     (the user is in the middle of the ceremony). Both prior bugs
//     would fail here: bug 1 throws TypeError before any iframe is
//     created; bug 2 creates a 0×0 iframe via getSession() that gets
//     torn down immediately after returning null.
//   * No "is not a function" or "no active session iframe" page errors
//     fire during the first few seconds.
//
// Run against deployed prod:
//
//   $env:E2E_EXPLORER_URL = "https://explorer.privasys.org"
//   npx playwright test apps/fronts/explorer.privasys.org/e2e/explorer-get-token.spec.ts \
//     --config=apps/fronts/explorer.privasys.org/e2e/playwright.config.ts
//
// ---------------------------------------------------------------------------

const IDP_ORIGIN = process.env.E2E_IDP_ORIGIN || 'https://privasys.id';
const IDP_AUTH_URL_PREFIX = `${IDP_ORIGIN}/auth/`;

async function gotoConnect(page: Page) {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto('/');
    await expect(page.locator('#connect-screen')).toBeVisible();
    // The hosted SDK must finish loading before we can probe Privasys.AuthFrame.
    await page.waitForFunction(() => {
        const w = window as unknown as { Privasys?: { AuthFrame?: unknown } };
        return typeof w.Privasys?.AuthFrame === 'function';
    }, undefined, { timeout: 15_000 });
    return pageErrors;
}

test.describe('Explorer — Quote Verification "Get Token"', () => {
    test('attestation URL field is prefilled with https://as.privasys.org', async ({ page }) => {
        await gotoConnect(page);
        await expect(page.locator('#attestation-url-input')).toHaveValue('https://as.privasys.org');
    });

    test('"Get Token" button is rendered and enabled by default', async ({ page }) => {
        await gotoConnect(page);
        const btn = page.locator('#attestation-token-btn');
        await expect(btn).toBeVisible();
        await expect(btn).toHaveText(/Get Token/i);
        await expect(btn).toBeEnabled();
    });

    test('button auto-disables when URL is not as.privasys.org', async ({ page }) => {
        await gotoConnect(page);
        const url = page.locator('#attestation-url-input');
        const btn = page.locator('#attestation-token-btn');
        await url.fill('https://example.com');
        await url.dispatchEvent('input');
        await expect(btn).toBeDisabled();
        await url.fill('https://as.privasys.org');
        await url.dispatchEvent('input');
        await expect(btn).toBeEnabled();
    });

    test('hosted Privasys.AuthFrame exposes getTokenForAudience', async ({ page }) => {
        // Catches bug (1): hosted client.iife.js stub missing the method.
        await gotoConnect(page);
        const probe = await page.evaluate(() => {
            const P = (window as unknown as { Privasys?: { AuthFrame?: unknown } }).Privasys;
            const AF = P?.AuthFrame as (new (...a: unknown[]) => unknown) | undefined;
            if (typeof AF !== 'function') return { ok: false, reason: 'Privasys.AuthFrame missing' as const };
            const proto = AF.prototype as Record<string, unknown>;
            return {
                ok: typeof proto.getTokenForAudience === 'function',
                onProto: typeof proto.getTokenForAudience
            };
        });
        expect(probe.ok, JSON.stringify(probe)).toBe(true);
    });

    test('clicking "Get Token" opens the privasys.id sign-in overlay', async ({ page }) => {
        // Catches bug (2): wrong flow / wrong AuthFrame. If the button does
        // the *correct* thing (call signIn() when no session exists), a
        // full-screen iframe pointing at privasys.id/auth/ must appear and
        // STAY mounted for several seconds (the user is signing in).
        //
        // If the button instead calls getSession() and then
        // getTokenForAudience() (the prior broken sequence), getSession()
        // mounts a 0×0 hidden iframe, gets null back from privasys.id,
        // tears the iframe down, and the second call throws synchronously
        // — no visible overlay ever appears.
        const pageErrors = await gotoConnect(page);
        // Eat any test-environment 'alert' so the click handler doesn't block.
        page.on('dialog', (d) => { void d.dismiss().catch(() => undefined); });

        const btn = page.locator('#attestation-token-btn');
        await expect(btn).toBeEnabled();
        await btn.click();

        // A visible (non-zero) auth iframe pointing at privasys.id must appear.
        const overlay = page.locator(`iframe[src^="${IDP_AUTH_URL_PREFIX}"]`).first();
        await expect(overlay).toBeAttached({ timeout: 10_000 });
        await expect(overlay).toBeVisible({ timeout: 10_000 });

        // And it must have real dimensions (>0×0). signIn()'s overlay is
        // position:fixed inset:0 — full viewport. The getSession() probe
        // iframe is `position:fixed;width:0;height:0;opacity:0;` and would
        // not pass this check.
        const box = await overlay.boundingBox();
        expect(box, 'auth iframe has no bounding box').not.toBeNull();
        expect(box!.width, 'auth iframe must be visibly sized').toBeGreaterThan(100);
        expect(box!.height, 'auth iframe must be visibly sized').toBeGreaterThan(100);

        // It should still be attached 2s later — i.e. the SDK didn't tear it
        // down (which is what the broken getSession()-only flow would have
        // done after the no-session response from privasys.id).
        await page.waitForTimeout(2000);
        await expect(overlay).toBeVisible();

        // No "is not a function" or "no active session iframe" errors should
        // have surfaced in the click handler path.
        const badErrs = pageErrors.filter((m) =>
            /is not a function|no active session iframe/i.test(m)
        );
        expect(badErrs, `unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
});
