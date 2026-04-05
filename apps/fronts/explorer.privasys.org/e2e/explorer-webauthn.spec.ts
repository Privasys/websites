import { test, expect, type Page, type CDPSession } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);

const EXPLORER_URL = process.env.E2E_EXPLORER_URL || 'http://localhost:54281';
const MOCK_RP_ID = new URL(EXPLORER_URL).hostname;
const API_BASE = process.env.E2E_API_BASE || 'https://api.developer.privasys.org';
const APP_NAME = process.env.E2E_APP_NAME || 'wasm-app';

/**
 * Mock FIDO2 challenge — 32 random-looking bytes, base64url-encoded.
 * In real flow the enclave generates this; for tests we use a fixed value.
 */
const MOCK_CHALLENGE = 'dGVzdC1jaGFsbGVuZ2UtZm9yLXBsYXl3cmlnaHQtZTJl';
const MOCK_USER_ID = 'dGVzdC11c2VyLWlk';
const MOCK_SESSION_TOKEN = 'mock-session-token-e2e-test';

/** Credential ID assigned during registration, captured for authentication tests. */
let registeredCredentialId = '';

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

async function setupVirtualAuthenticator(page: Page): Promise<CDPSession> {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', {
        options: {
            protocol: 'ctap2',
            transport: 'hybrid',
            hasResidentKey: true,
            hasUserVerification: true,
            isUserVerified: true,
        },
    });
    return cdp;
}

/**
 * Intercept the FIDO2 proxy endpoint and return mock enclave responses.
 * This lets us test the full browser WebAuthn ceremony without a live enclave.
 */
async function mockFido2Proxy(page: Page) {
    await page.route('**/api/v1/apps/*/fido2', async (route, request) => {
        const body = JSON.parse(request.postData()!);

        if (body.type === 'register_begin') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    type: 'register_options',
                    challenge: MOCK_CHALLENGE,
                    rp: { id: MOCK_RP_ID, name: 'Privasys Test' },
                    user: { id: MOCK_USER_ID, name: 'test-user', display_name: 'Test User' },
                    pub_key_cred_params: [
                        { type: 'public-key', alg: -7 },   // ES256
                        { type: 'public-key', alg: -257 },  // RS256
                    ],
                    attestation: 'none',
                    authenticator_selection: {
                        user_verification: 'preferred',
                        resident_key: 'preferred',
                    },
                }),
            });
            return;
        }

        if (body.type === 'register_complete') {
            // Save credential ID for later authentication tests
            registeredCredentialId = body.credential_id;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    type: 'register_ok',
                    session_token: MOCK_SESSION_TOKEN,
                }),
            });
            return;
        }

        if (body.type === 'authenticate_begin') {
            const resp: Record<string, unknown> = {
                type: 'authenticate_options',
                challenge: MOCK_CHALLENGE,
                rp_id: MOCK_RP_ID,
                user_verification: 'preferred',
            };
            // If we have a previously registered credential, include it
            if (registeredCredentialId) {
                resp.allow_credentials = [{ id: registeredCredentialId, type: 'public-key' }];
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(resp),
            });
            return;
        }

        if (body.type === 'authenticate_complete') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    type: 'authenticate_ok',
                    session_token: MOCK_SESSION_TOKEN,
                }),
            });
            return;
        }

        // Unknown type → 400
        await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ type: 'error', error: 'unknown type' }),
        });
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Explorer — Browser WebAuthn', () => {
    test.describe.configure({ mode: 'serial' });

    test('auth tab shows WebAuthn buttons when browser supports it', async ({ page }) => {
        await mockFido2Proxy(page);
        await connectToApp(page);
        await switchToAuthTab(page);

        // Browser WebAuthn section
        await expect(page.locator('button', { hasText: 'Register Passkey' })).toBeVisible();
        await expect(page.locator('button', { hasText: 'Sign In' })).toBeVisible();

        // Wallet section
        await expect(page.locator('button', { hasText: 'Authenticate with Wallet' })).toBeVisible();

        // RP info
        await expect(page.locator('.field-label', { hasText: 'Relying Party' })).toBeVisible();

        await page.screenshot({ path: screenshot('webauthn-01-auth-idle'), fullPage: true });
    });

    test('WebAuthn registration ceremony completes successfully', async ({ page }) => {
        test.setTimeout(60_000);
        const cdp = await setupVirtualAuthenticator(page);

        await mockFido2Proxy(page);
        await connectToApp(page);
        await switchToAuthTab(page);

        // Click Register Passkey
        await page.locator('button', { hasText: 'Register Passkey' }).click();

        // Should show registration progress
        await expect(page.locator('h3', { hasText: 'Registering Passkey' })).toBeVisible({ timeout: 5_000 });
        await page.screenshot({ path: screenshot('webauthn-02-registering'), fullPage: true });

        // Virtual authenticator completes the ceremony automatically.
        // Should reach complete state.
        await expect(page.locator('.badge', { hasText: 'Active' })).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('.field-label', { hasText: 'Session Token' })).toBeVisible();
        await expect(page.locator('.field-label', { hasText: 'Method' })).toBeVisible();
        await expect(page.locator('.field-value', { hasText: 'Browser WebAuthn' })).toBeVisible();

        await page.screenshot({ path: screenshot('webauthn-03-registered'), fullPage: true });

        await cdp.detach();
    });

    test('WebAuthn authentication ceremony completes successfully', async ({ page }) => {
        test.setTimeout(60_000);
        const cdp = await setupVirtualAuthenticator(page);

        await mockFido2Proxy(page);
        await connectToApp(page);
        await switchToAuthTab(page);

        // First register so the virtual authenticator has a credential
        await page.locator('button', { hasText: 'Register Passkey' }).click();
        await expect(page.locator('.badge', { hasText: 'Active' })).toBeVisible({ timeout: 30_000 });

        // Sign out and authenticate
        await page.locator('button', { hasText: 'Sign Out' }).click();
        await expect(page.locator('button', { hasText: 'Sign In' })).toBeVisible({ timeout: 5_000 });

        await page.locator('button', { hasText: 'Sign In' }).click();

        // Should show signing in progress
        await expect(page.locator('h3', { hasText: 'Signing In' })).toBeVisible({ timeout: 5_000 });
        await page.screenshot({ path: screenshot('webauthn-04-signing-in'), fullPage: true });

        // Should complete
        await expect(page.locator('.badge', { hasText: 'Active' })).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('.field-value', { hasText: 'Browser WebAuthn' })).toBeVisible();

        await page.screenshot({ path: screenshot('webauthn-05-authenticated'), fullPage: true });

        await cdp.detach();
    });

    test('session token appears in header after auth and enables API tab', async ({ page }) => {
        test.setTimeout(60_000);
        const cdp = await setupVirtualAuthenticator(page);

        // Mock FIDO2 + also intercept a subsequent API call to verify the header
        await mockFido2Proxy(page);

        let capturedAuthHeader = '';
        await page.route('**/api/v1/apps/*/schema', async (route, request) => {
            capturedAuthHeader = request.headers()['x-app-auth'] || '';
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ functions: [{ name: 'greet', params: [{ name: 'name', type: 'string' }], returns: 'string' }] }),
            });
        });

        // Also mock the RPC endpoint
        await page.route('**/api/v1/apps/*/rpc/*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ result: 'Hello, World!' }),
            });
        });

        await connectToApp(page);
        await switchToAuthTab(page);

        // Register
        await page.locator('button', { hasText: 'Register Passkey' }).click();
        await expect(page.locator('.badge', { hasText: 'Active' })).toBeVisible({ timeout: 30_000 });

        // Switch to API tab — schema fetch should include X-App-Auth header
        await page.locator('.tab-btn[data-tab="api"]').click();
        await page.waitForTimeout(2_000); // Wait for schema fetch
        expect(capturedAuthHeader).toBe(MOCK_SESSION_TOKEN);

        await page.screenshot({ path: screenshot('webauthn-06-api-with-token'), fullPage: true });

        await cdp.detach();
    });

    test('registration error is displayed gracefully', async ({ page }) => {
        await page.route('**/api/v1/apps/*/fido2', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ type: 'error', error: 'enclave not available' }),
            });
        });

        await connectToApp(page);
        await switchToAuthTab(page);

        await page.locator('button', { hasText: 'Register Passkey' }).click();

        // Should show error state
        await expect(page.locator('.auth-error')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.auth-error')).toContainText('enclave not available');

        await page.screenshot({ path: screenshot('webauthn-07-error'), fullPage: true });
    });

    test('sign out resets to idle state', async ({ page }) => {
        test.setTimeout(60_000);
        const cdp = await setupVirtualAuthenticator(page);
        await mockFido2Proxy(page);
        await connectToApp(page);
        await switchToAuthTab(page);

        // Register
        await page.locator('button', { hasText: 'Register Passkey' }).click();
        await expect(page.locator('.badge', { hasText: 'Active' })).toBeVisible({ timeout: 30_000 });

        // Sign out
        await page.locator('button', { hasText: 'Sign Out' }).click();

        // Should be back to idle with buttons
        await expect(page.locator('button', { hasText: 'Register Passkey' })).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('button', { hasText: 'Sign In' })).toBeVisible();
        await expect(page.locator('button', { hasText: 'Authenticate with Wallet' })).toBeVisible();

        await page.screenshot({ path: screenshot('webauthn-08-signed-out'), fullPage: true });

        await cdp.detach();
    });
});

test.describe('Explorer — FIDO2 Proxy Endpoint', () => {
    test('FIDO2 proxy returns proper error for unknown app', async ({ request }) => {
        const response = await request.post(
            `${API_BASE}/api/v1/apps/nonexistent-app-e2e-test/fido2`,
            {
                data: { type: 'register_begin' },
                headers: { 'Content-Type': 'application/json' },
                timeout: 15_000,
            }
        );
        // Should get 404 "app not found" (not a router 404)
        expect(response.status()).toBe(404);
        const body = await response.json();
        expect(body.error).toBe('app not found');
    });

    test('FIDO2 proxy rejects invalid type', async ({ request }) => {
        const response = await request.post(
            `${API_BASE}/api/v1/apps/${APP_NAME}/fido2`,
            {
                data: { type: 'drop_tables' },
                headers: { 'Content-Type': 'application/json' },
                timeout: 15_000,
            }
        );
        // Should reject with 400, not proxy the request
        expect([400, 404]).toContain(response.status());
        const body = await response.json();
        expect(body.error).toBeTruthy();
    });

    test('FIDO2 proxy rejects missing type field', async ({ request }) => {
        const response = await request.post(
            `${API_BASE}/api/v1/apps/${APP_NAME}/fido2`,
            {
                data: { foo: 'bar' },
                headers: { 'Content-Type': 'application/json' },
                timeout: 15_000,
            }
        );
        expect([400, 404]).toContain(response.status());
        const body = await response.json();
        expect(body.error).toBeTruthy();
    });

    test('CORS preflight allows POST to FIDO2 endpoint', async ({ request }) => {
        const response = await request.fetch(
            `${API_BASE}/api/v1/apps/${APP_NAME}/fido2`,
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
// Phase 2.5: AAGUID Enforcement
// ---------------------------------------------------------------------------

test.describe('Explorer — AAGUID Enforcement', () => {
    test.describe.configure({ mode: 'serial' });

    test('registration rejected with AAGUID error shows clear message', async ({ page }) => {
        test.setTimeout(60_000);
        const cdp = await setupVirtualAuthenticator(page);

        // Mock FIDO2 proxy: register_begin succeeds, register_complete returns AAGUID error
        await page.route('**/api/v1/apps/*/fido2', async (route, request) => {
            const body = JSON.parse(request.postData()!);

            if (body.type === 'register_begin') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        type: 'register_options',
                        challenge: MOCK_CHALLENGE,
                        rp: { id: MOCK_RP_ID, name: 'Privasys Test' },
                        user: { id: MOCK_USER_ID, name: 'test-user', display_name: 'Test User' },
                        pub_key_cred_params: [{ type: 'public-key', alg: -7 }],
                        attestation: 'none',
                        authenticator_selection: {
                            user_verification: 'preferred',
                            resident_key: 'preferred',
                        },
                    }),
                });
                return;
            }

            if (body.type === 'register_complete') {
                // Simulate enclave AAGUID rejection (Phase 2.5 enforcement)
                const fakeAaguid = body.attestation_object
                    ? '0000000000000000000000000000000000000000'
                    : 'unknown';
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        type: 'error',
                        error: `authenticator AAGUID ${fakeAaguid} not in allowlist`,
                    }),
                });
                return;
            }

            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ type: 'error', error: 'unknown type' }),
            });
        });

        await connectToApp(page);
        await switchToAuthTab(page);

        await page.locator('button', { hasText: 'Register Passkey' }).click();

        // The virtual authenticator completes registration, but the enclave rejects the AAGUID
        await expect(page.locator('.auth-error')).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('.auth-error')).toContainText('not in allowlist');

        await page.screenshot({ path: screenshot('aaguid-01-rejected'), fullPage: true });

        await cdp.detach();
    });

    test('AAGUID rejection does not leave stale auth state', async ({ page }) => {
        test.setTimeout(60_000);
        const cdp = await setupVirtualAuthenticator(page);

        // Same AAGUID-rejecting mock
        await page.route('**/api/v1/apps/*/fido2', async (route, request) => {
            const body = JSON.parse(request.postData()!);
            if (body.type === 'register_begin') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        type: 'register_options',
                        challenge: MOCK_CHALLENGE,
                        rp: { id: MOCK_RP_ID, name: 'Privasys Test' },
                        user: { id: MOCK_USER_ID, name: 'test-user', display_name: 'Test User' },
                        pub_key_cred_params: [{ type: 'public-key', alg: -7 }],
                        attestation: 'none',
                        authenticator_selection: {
                            user_verification: 'preferred',
                            resident_key: 'preferred',
                        },
                    }),
                });
                return;
            }
            if (body.type === 'register_complete') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        type: 'error',
                        error: 'authenticator AAGUID 00000000 not in allowlist',
                    }),
                });
                return;
            }
            await route.fulfill({ status: 400, body: '{}' });
        });

        await connectToApp(page);
        await switchToAuthTab(page);

        // Attempt registration — should fail
        await page.locator('button', { hasText: 'Register Passkey' }).click();
        await expect(page.locator('.auth-error')).toBeVisible({ timeout: 30_000 });

        // After error, no stale "Active" badge
        await expect(page.locator('.badge', { hasText: 'Active' })).not.toBeVisible();

        // "Try Again" button should be visible — click it to verify reset
        const tryAgainBtn = page.locator('button', { hasText: 'Try Again' });
        await expect(tryAgainBtn).toBeVisible({ timeout: 5_000 });
        await tryAgainBtn.click();

        // After clicking "Try Again", auth buttons should reappear
        await expect(page.locator('button', { hasText: 'Register Passkey' })).toBeVisible({ timeout: 10_000 });

        await page.screenshot({ path: screenshot('aaguid-02-reset-after-rejection'), fullPage: true });

        await cdp.detach();
    });
});

// ---------------------------------------------------------------------------
// Real E2E: wasm-app-example on development environment
// ---------------------------------------------------------------------------

const DEV_API_BASE = 'https://api-test.developer.privasys.org';
const DEV_APP_NAME = 'wasm-app-example';

/**
 * Connect to wasm-app-example in the development environment.
 * Selects "development" from the env dropdown, fills the app name, connects.
 */
async function connectToDevApp(page: Page) {
    await page.goto('/');

    // Select development environment
    await page.locator('#env-select').selectOption('development');

    // Fill app name and connect
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

    test('auth tab shows Track A and Track B options', async ({ page }) => {
        await connectToDevApp(page);
        await switchToAuthTab(page);

        // Track A — passkey buttons
        await expect(page.locator('button', { hasText: 'Register Passkey' })).toBeVisible();
        await expect(page.locator('button', { hasText: 'Sign In' })).toBeVisible();

        // Track B — wallet button
        await expect(page.locator('button', { hasText: 'Authenticate with Wallet' })).toBeVisible();

        // RP ID should reflect the dev gateway domain
        await expect(page.locator('.field-value', { hasText: 'apps-test.privasys.org' })).toBeVisible();

        await page.screenshot({ path: screenshot('real-e2e-02-auth-tab'), fullPage: true });
    });

    test('register_begin returns valid options from real enclave', async ({ page }) => {
        // Directly call the real FIDO2 proxy to verify the enclave responds
        const response = await page.request.post(
            `${DEV_API_BASE}/api/v1/apps/${DEV_APP_NAME}/fido2`,
            {
                data: { type: 'register_begin', user_name: 'e2e-test', user_handle: 'ZTJlLXRlc3Q' },
                headers: { 'Content-Type': 'application/json' },
                timeout: 15_000,
            },
        );

        expect(response.status()).toBe(200);
        const body = await response.json();

        // Verify the enclave returned valid FIDO2 registration options
        expect(body.type).toBe('register_options');
        expect(body.challenge).toBeTruthy();
        expect(body.rp).toBeTruthy();
        expect(body.rp.id).toBeTruthy();
        expect(body.user).toBeTruthy();
        expect(body.pub_key_cred_params).toBeTruthy();
        expect(body.pub_key_cred_params.length).toBeGreaterThan(0);
        // ES256 must be supported
        expect(body.pub_key_cred_params.some((p: { alg: number }) => p.alg === -7)).toBe(true);
        // Enclave must request cross-platform attachment (phone-based flow)
        expect(body.authenticator_selection?.authenticator_attachment).toBe('cross-platform');
    });

    test('registration with non-Privasys authenticator is rejected by AAGUID enforcement', async ({ page }) => {
        test.setTimeout(60_000);

        const cdp = await setupVirtualAuthenticator(page);

        await connectToDevApp(page);
        await switchToAuthTab(page);

        await page.locator('button', { hasText: 'Register Passkey' }).click();

        // The virtual authenticator has a zero AAGUID (not Privasys Wallet).
        // The enclave enforces Phase 2.5 AAGUID allowlist and rejects registration.
        await expect(page.locator('.auth-error')).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('.auth-error')).toContainText('not in allowlist');

        await page.screenshot({ path: screenshot('real-e2e-03-aaguid-rejected'), fullPage: true });

        await cdp.detach();
    });

    test('authenticate_begin returns valid options from real enclave', async ({ page }) => {
        const response = await page.request.post(
            `${DEV_API_BASE}/api/v1/apps/${DEV_APP_NAME}/fido2`,
            {
                data: { type: 'authenticate_begin' },
                headers: { 'Content-Type': 'application/json' },
                timeout: 15_000,
            },
        );

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body.type).toBe('authenticate_options');
        expect(body.challenge).toBeTruthy();
        expect(body.user_verification).toBeTruthy();
    });
});
