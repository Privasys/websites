import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Regression test for explorer.privasys.org's "Get Token" button.
//
// Bug (2026-05-20): the Quote Verification "Get Token" button threw
//   "frame.getTokenForAudience is not a function"
// because the hosted SDK bundle at
//   https://privasys.id/auth/privasys-auth-client.iife.js
// was the pre-sdk-v0.3.7 build (4.3 kB) and did not include the
// AuthFrame.getTokenForAudience method. The chat front-end was unaffected
// because it bundles @privasys/auth directly into its Next.js build.
//
// Root-cause fix lives in the `auth` repo's publish-sdk.yaml workflow
// (sdk-v0.3.11+), which now also redeploys privasys-auth-client.iife.js
// alongside the frame bundle.
//
// This spec asserts:
//   1. The Quote Verification URL field is prefilled with
//      "https://as.privasys.org".
//   2. The "Get Token" button is rendered and initially enabled.
//   3. The hosted Privasys.AuthFrame *prototype* exposes
//      `getTokenForAudience` as a function. This is the symbol whose
//      absence produced the user-visible TypeError.
//   4. Clicking the button does NOT throw a synchronous
//      "is not a function" page error.
//
// The test runs against whatever EXPLORER_URL is configured (defaults to
// the locally-served static build via Playwright's webServer). To run
// against the deployed site:
//
//   E2E_EXPLORER_URL=https://explorer.privasys.org \
//     npx playwright test apps/fronts/explorer.privasys.org/e2e/explorer-get-token.spec.ts
// ---------------------------------------------------------------------------

async function gotoConnect(page: Page) {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto('/');
    await expect(page.locator('#connect-screen')).toBeVisible();
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
        // This is the assertion that catches the original bug. The
        // explorer loads Privasys.AuthFrame from
        // https://privasys.id/auth/privasys-auth-client.iife.js — and
        // before the SDK redeploy that bundle did NOT carry
        // getTokenForAudience. We probe both the constructor and the
        // prototype so the test stays correct regardless of how esbuild
        // emits the class.
        await gotoConnect(page);
        const result = await page.evaluate(() => {
            const P = (window as unknown as { Privasys?: { AuthFrame?: unknown } }).Privasys;
            const AF = P?.AuthFrame as (new (...a: unknown[]) => unknown) | undefined;
            if (typeof AF !== 'function') return { ok: false, reason: 'Privasys.AuthFrame missing' };
            const proto = AF.prototype as Record<string, unknown>;
            const onProto = typeof proto.getTokenForAudience;
            // Build a throw-away instance with a minimal config to also
            // probe the instance side (the bug message named the *instance*
            // method as missing).
            let onInstance: string;
            try {
                const inst = new AF({
                    apiBase: 'https://api.developer.privasys.org',
                    appName: 'probe',
                    rpId: 'probe.apps.privasys.org',
                    authOrigin: 'https://privasys.id'
                }) as Record<string, unknown>;
                onInstance = typeof inst.getTokenForAudience;
            } catch (e) {
                onInstance = `ctor-threw:${(e as Error).message}`;
            }
            return { ok: onProto === 'function' && onInstance === 'function', onProto, onInstance };
        });
        expect(result, JSON.stringify(result)).toMatchObject({
            ok: true,
            onProto: 'function',
            onInstance: 'function'
        });
    });

    test('clicking "Get Token" does not throw "is not a function"', async ({ page }) => {
        const pageErrors = await gotoConnect(page);
        // The button click triggers AuthFrame.getSession() which mounts the
        // privasys.id iframe. We do NOT wait for the actual sign-in (that
        // would require a real wallet). We just assert no synchronous
        // TypeError fires from the explorer's handler in the first
        // ~2 seconds — which is what the user saw.
        const btn = page.locator('#attestation-token-btn');
        await expect(btn).toBeEnabled();
        await btn.click();
        await page.waitForTimeout(2000);
        const fnErrs = pageErrors.filter((m) => /is not a function/i.test(m));
        expect(fnErrs, `unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
});
