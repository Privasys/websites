import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);

const API_BASE = process.env.E2E_API_BASE || 'https://api.developer.privasys.org';
const APP_NAME = process.env.E2E_APP_NAME || 'wasm-app';

const MOCK_SESSION_TOKEN = 'mock-session-token-e2e-test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function connectToApp(page: Page) {
    await page.goto('/');
    await page.locator('#app-name-input').fill(APP_NAME);
    await page.locator('#connect-btn').click();
    await expect(page.locator('#connected-view')).toBeVisible();
}

async function switchToAuthTab(page: Page) {
    await page.locator('.tab-btn[data-tab="auth"]').click();
    await expect(page.locator('.tab-btn[data-tab="auth"]')).toHaveClass(/active/);
}

/**
 * Mock the AuthFrame IIFE loaded from privasys.id so tests run without
 * the real SDK.  Supports signIn(), getSession(), clearSession().
 */
async function mockAuthFrame(page: Page, opts?: { error?: string; attestation?: Record<string, string> }) {
    await page.route('**/privasys-auth-client.iife.js', async (route) => {
        const errorExpr = opts?.error ? `'${opts.error.replace(/'/g, "\\'")}'` : 'null';
        const attestationExpr = opts?.attestation ? JSON.stringify(opts.attestation) : 'null';
        await route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: `
                window.__mockAuth = {
                    error: ${errorExpr},
                    attestation: ${attestationExpr},
                    sessionToken: '${MOCK_SESSION_TOKEN}',
                    sessionId: 'mock-session-id-e2e',
                    session: null,
                };
                window.Privasys = {
                    AuthFrame: class AuthFrame {
                        constructor(config) {
                            this.config = config;
                            this.rpId = config.rpId;
                            this.onSessionExpired = null;
                            this.onSessionRenewed = null;
                        }
                        async signIn() {
                            var m = window.__mockAuth;
                            if (m.error) throw new Error(m.error);
                            var result = { sessionToken: m.sessionToken, sessionId: m.sessionId };
                            if (m.attestation) result.attestation = m.attestation;
                            m.session = { token: m.sessionToken, authenticatedAt: Date.now() };
                            return result;
                        }
                        async getSession() {
                            return window.__mockAuth.session;
                        }
                        async clearSession() {
                            window.__mockAuth.session = null;
                        }
                    }
                };
            `,
        });
    });
}

// ---------------------------------------------------------------------------
// Tests — AuthFrame-based sign-in flow
// ---------------------------------------------------------------------------

test.describe('Explorer — AuthFrame Sign-in', () => {
    test.describe.configure({ mode: 'serial' });

    test('auth tab shows sign-in button with SDK overlay hint', async ({ page }) => {
        await mockAuthFrame(page);
        await connectToApp(page);
        await switchToAuthTab(page);

        // Single sign-in button that delegates to AuthFrame overlay
        await expect(page.locator('button', { hasText: 'Sign in' })).toBeVisible();
        await expect(page.locator('.auth-provider-hint', { hasText: 'Opens SDK overlay' })).toBeVisible();

        // Brand section with app name
        await expect(page.locator('.auth-brand-title')).toContainText(APP_NAME);

        await page.screenshot({ path: screenshot('webauthn-01-auth-idle'), fullPage: true });
    });

    test('sign-in completes and shows authenticated state', async ({ page }) => {
        test.setTimeout(30_000);
        await mockAuthFrame(page);
        await connectToApp(page);
        await switchToAuthTab(page);

        await page.locator('button', { hasText: 'Sign in' }).click();

        // Should show authenticated state
        await expect(page.locator('.auth-success-title', { hasText: 'Authenticated' })).toBeVisible({ timeout: 10_000 });

        // Session info should be displayed
        await expect(page.locator('.auth-session-label', { hasText: 'Session' })).toBeVisible();

        // Sign out button should be present
        await expect(page.locator('.auth-signout-btn', { hasText: 'Sign out' })).toBeVisible();

        await page.screenshot({ path: screenshot('webauthn-02-authenticated'), fullPage: true });
    });

    test('session token appears in header after auth and enables API tab', async ({ page }) => {
        test.setTimeout(30_000);
        await mockAuthFrame(page);

        let capturedAuthHeader = '';
        await page.route('**/api/v1/apps/*/schema', async (route, request) => {
            capturedAuthHeader = request.headers()['x-app-auth'] || '';
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ functions: [{ name: 'greet', params: [{ name: 'name', type: 'string' }], returns: 'string' }] }),
            });
        });

        await connectToApp(page);
        await switchToAuthTab(page);

        await page.locator('button', { hasText: 'Sign in' }).click();
        await expect(page.locator('.auth-success-title', { hasText: 'Authenticated' })).toBeVisible({ timeout: 10_000 });

        // Switch to API tab — schema fetch should include X-App-Auth header
        await page.locator('.tab-btn[data-tab="api"]').click();
        await page.waitForTimeout(2_000);
        expect(capturedAuthHeader).toBe(MOCK_SESSION_TOKEN);

        await page.screenshot({ path: screenshot('webauthn-03-api-with-token'), fullPage: true });
    });

    test('sign-in error is displayed gracefully', async ({ page }) => {
        await mockAuthFrame(page, { error: 'enclave not available' });
        await connectToApp(page);
        await switchToAuthTab(page);

        await page.locator('button', { hasText: 'Sign in' }).click();

        await expect(page.locator('.auth-error')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.auth-error')).toContainText('enclave not available');

        await page.screenshot({ path: screenshot('webauthn-04-error'), fullPage: true });
    });

    test('sign out resets to idle state', async ({ page }) => {
        test.setTimeout(30_000);
        await mockAuthFrame(page);
        await connectToApp(page);
        await switchToAuthTab(page);

        await page.locator('button', { hasText: 'Sign in' }).click();
        await expect(page.locator('.auth-success-title', { hasText: 'Authenticated' })).toBeVisible({ timeout: 10_000 });

        await page.locator('.auth-signout-btn', { hasText: 'Sign out' }).click();

        // Should be back to idle with sign-in button
        await expect(page.locator('button', { hasText: 'Sign in' })).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.auth-provider-hint', { hasText: 'Opens SDK overlay' })).toBeVisible();

        await page.screenshot({ path: screenshot('webauthn-05-signed-out'), fullPage: true });
    });

    test('wallet attestation details are shown when available', async ({ page }) => {
        test.setTimeout(30_000);
        await mockAuthFrame(page, {
            attestation: { mrenclave: 'abc123', mrsigner: 'def456', product_id: '1' },
        });
        await connectToApp(page);
        await switchToAuthTab(page);

        await page.locator('button', { hasText: 'Sign in' }).click();
        await expect(page.locator('.auth-success-title', { hasText: 'Authenticated' })).toBeVisible({ timeout: 10_000 });

        // Wallet attestation card should be visible
        await expect(page.locator('h3', { hasText: 'Wallet Attestation' })).toBeVisible({ timeout: 5_000 });

        await page.screenshot({ path: screenshot('webauthn-06-attestation-details'), fullPage: true });
    });
});

// ---------------------------------------------------------------------------
// FIDO2 proxy endpoint tests (standard WebAuthn routed endpoints)
// ---------------------------------------------------------------------------

test.describe('Explorer — FIDO2 Proxy Endpoint', () => {
    test('FIDO2 proxy returns proper error for unknown app', async ({ request }) => {
        const response = await request.post(
            `${API_BASE}/api/v1/apps/nonexistent-app-e2e-test/fido2/register/begin`,
            {
                data: { userName: 'test', userHandle: 'dGVzdA' },
                headers: { 'Content-Type': 'application/json' },
                timeout: 15_000,
            }
        );
        expect(response.status()).toBe(404);
        const body = await response.json();
        expect(body.error).toBe('app not found');
    });

    test('FIDO2 proxy rejects unknown endpoint', async ({ request }) => {
        const response = await request.post(
            `${API_BASE}/api/v1/apps/${APP_NAME}/fido2/drop_tables`,
            {
                data: {},
                headers: { 'Content-Type': 'application/json' },
                timeout: 15_000,
            }
        );
        expect([400, 404]).toContain(response.status());
    });

    test('CORS preflight allows POST to FIDO2 endpoint', async ({ request }) => {
        const response = await request.fetch(
            `${API_BASE}/api/v1/apps/${APP_NAME}/fido2/register/begin`,
            {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'https://explorer.privasys.org',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'content-type',
                },
                timeout: 15_000,
            }
        );
        expect(response.status()).toBe(200);
        const corsOrigin = response.headers()['access-control-allow-origin'];
        expect(corsOrigin).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// Real E2E: wasm-app-example on development environment
// ---------------------------------------------------------------------------

const DEV_API_BASE = 'https://api-test.developer.privasys.org';
const DEV_APP_NAME = 'wasm-app-example';

async function connectToDevApp(page: Page) {
    await page.goto('/');
    await page.locator('#env-select').selectOption('development');
    await page.locator('#app-name-input').fill(DEV_APP_NAME);
    await page.locator('#connect-btn').click();
    await expect(page.locator('#connected-view')).toBeVisible({ timeout: 10_000 });
}

test.describe('Explorer — Real E2E (wasm-app-example / dev)', () => {
    test.describe.configure({ mode: 'serial' });

    test('connects to wasm-app-example in development env', async ({ page }) => {
        await connectToDevApp(page);
        await expect(page.locator('#connection-info')).toContainText(DEV_APP_NAME);
        await page.screenshot({ path: screenshot('real-e2e-01-connected'), fullPage: true });
    });

    test('auth tab shows sign-in button', async ({ page }) => {
        await connectToDevApp(page);
        await switchToAuthTab(page);
        await expect(page.locator('button', { hasText: 'Sign in' })).toBeVisible();
        await page.screenshot({ path: screenshot('real-e2e-02-auth-tab'), fullPage: true });
    });

    test('register/begin returns valid standard WebAuthn options from real enclave', async ({ page }) => {
        const response = await page.request.post(
            `${DEV_API_BASE}/api/v1/apps/${DEV_APP_NAME}/fido2/register/begin`,
            {
                data: { userName: 'e2e-test', userHandle: 'ZTJlLXRlc3Q' },
                headers: { 'Content-Type': 'application/json' },
                timeout: 15_000,
            },
        );

        expect(response.status()).toBe(200);
        const body = await response.json();

        // Standard WebAuthn: options nested under publicKey
        expect(body.publicKey).toBeTruthy();
        expect(body.publicKey.challenge).toBeTruthy();
        expect(body.publicKey.rp).toBeTruthy();
        expect(body.publicKey.rp.id).toBeTruthy();
        expect(body.publicKey.user).toBeTruthy();
        expect(body.publicKey.pubKeyCredParams).toBeTruthy();
        expect(body.publicKey.pubKeyCredParams.length).toBeGreaterThan(0);
        expect(body.publicKey.pubKeyCredParams.some((p: { alg: number }) => p.alg === -7)).toBe(true);
        expect(body.publicKey.authenticatorSelection?.authenticatorAttachment).toBe('cross-platform');
    });

    test('authenticate/begin returns valid standard WebAuthn options from real enclave', async ({ page }) => {
        const response = await page.request.post(
            `${DEV_API_BASE}/api/v1/apps/${DEV_APP_NAME}/fido2/authenticate/begin`,
            {
                data: {},
                headers: { 'Content-Type': 'application/json' },
                timeout: 15_000,
            },
        );

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body.publicKey).toBeTruthy();
        expect(body.publicKey.challenge).toBeTruthy();
        expect(body.publicKey.userVerification).toBeTruthy();
    });
});
