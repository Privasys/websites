import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);

/**
 * Management service URL and app name for testing.
 * Default: the production management API with the wasm-app example.
 */
const API_BASE = process.env.E2E_API_BASE || 'https://api.developer.privasys.org';
const APP_NAME = process.env.E2E_APP_NAME || 'wasm-app';
const AUTH_TOKEN = process.env.E2E_AUTH_TOKEN || '';
const ATTESTATION_SERVER_URL = process.env.E2E_ATTESTATION_SERVER_URL || '';
const ATTESTATION_SERVER_TOKEN = process.env.E2E_ATTESTATION_SERVER_TOKEN || '';

test.describe('WASM App Explorer', () => {
    test.describe.configure({ mode: 'serial' });

    test('loads the connection screen', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('h2')).toContainText('Connect to a WASM App');
        await expect(page.locator('#connect-btn')).toBeVisible();
        await expect(page.locator('#endpoint-input')).toBeVisible();
        await expect(page.locator('#base-url-input')).toBeVisible();
        await expect(page.locator('#app-name-input')).toBeVisible();
        await page.screenshot({ path: screenshot('01-connection-screen'), fullPage: true });
    });

    test('pre-fills from URL params', async ({ page }) => {
        await page.goto(`/?base=${encodeURIComponent(API_BASE)}&app=${encodeURIComponent(APP_NAME)}`);
        await expect(page.locator('#base-url-input')).toHaveValue(API_BASE);
        await expect(page.locator('#app-name-input')).toHaveValue(APP_NAME);
    });

    test('shows error when connecting without endpoint', async ({ page }) => {
        await page.goto('/');
        page.on('dialog', dialog => dialog.accept());
        await page.locator('#connect-btn').click();
        // Should not navigate to connected view
        await expect(page.locator('#connected-view')).toHaveClass(/hidden/);
    });

    test('connects and shows attestation tab', async ({ page }) => {
        test.setTimeout(90_000);
        await page.goto('/');

        // Fill connection details
        await page.locator('#base-url-input').fill(API_BASE);
        await page.locator('#app-name-input').fill(APP_NAME);
        if (AUTH_TOKEN) await page.locator('#auth-token-input').fill(AUTH_TOKEN);
        if (ATTESTATION_SERVER_URL) await page.locator('#attestation-url-input').fill(ATTESTATION_SERVER_URL);
        if (ATTESTATION_SERVER_TOKEN) await page.locator('#attestation-token-input').fill(ATTESTATION_SERVER_TOKEN);

        await page.locator('#connect-btn').click();
        await page.screenshot({ path: screenshot('02-connected'), fullPage: true });

        // Should be in connected state with attestation tab active
        await expect(page.locator('#connected-view')).toBeVisible();
        await expect(page.locator('#connection-info')).toContainText(APP_NAME);

        // Attestation tab should be active by default
        const attestBtn = page.locator('.tab-btn[data-tab="attestation"]');
        await expect(attestBtn).toHaveClass(/active/);

        // Challenge input and Inspect button should be visible
        await expect(page.locator('#challenge-input')).toBeVisible();
        await expect(page.locator('#inspect-btn')).toBeVisible();
        await page.screenshot({ path: screenshot('03-attestation-tab'), fullPage: true });
    });

    test('performs attestation with challenge', async ({ page }) => {
        test.setTimeout(90_000);
        await connectToApp(page);

        // Verify challenge field has a value
        const challengeValue = await page.locator('#challenge-input').inputValue();
        expect(challengeValue).toHaveLength(64); // 32 bytes = 64 hex chars

        // Click Inspect Certificate
        await page.locator('#inspect-btn').click();

        // Wait for attestation result — a card should appear
        await expect(page.locator('.card').first()).toBeVisible({ timeout: 30_000 });
        await page.screenshot({ path: screenshot('04-attestation-result'), fullPage: true });

        // Verify key sections are rendered
        await expect(page.locator('h3', { hasText: 'x.509 Certificate' })).toBeVisible({ timeout: 10_000 });

        // Quote section should exist (SGX or TDX)
        const quoteCard = page.locator('h3', { hasText: /SGX Quote|TDX Quote/ });
        await expect(quoteCard).toBeVisible({ timeout: 10_000 });

        // Certificate fields
        await expect(page.locator('.field-label', { hasText: 'Subject' })).toBeVisible();
        await expect(page.locator('.field-label', { hasText: 'Issuer' })).toBeVisible();
        await expect(page.locator('.field-label', { hasText: 'Public Key SHA-256' })).toBeVisible();

        // Quote fields
        await expect(page.locator('.field-label', { hasText: 'Report Data' })).toBeVisible();

        // If challenge mode, verify the challenge banner shows a result
        const challengeBanner = page.locator('.badge', { hasText: /Match|Mismatch|Verifying/ });
        if (await challengeBanner.isVisible({ timeout: 5_000 }).catch(() => false)) {
            // Should show Match for proper attestation
            await expect(page.locator('.badge', { hasText: /Match/ })).toBeVisible({ timeout: 10_000 });
        }

        await page.screenshot({ path: screenshot('05-attestation-details'), fullPage: true });
    });

    test('shows platform extensions', async ({ page }) => {
        test.setTimeout(90_000);
        await connectToApp(page);
        await page.locator('#inspect-btn').click();
        await expect(page.locator('.card').first()).toBeVisible({ timeout: 30_000 });

        // Platform or workload extensions should be visible
        const extHeader = page.locator('h3', { hasText: /Extensions/ });
        if (await extHeader.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
            // At least one extension OID should be displayed
            await expect(page.locator('.ext-oid').first()).toBeVisible();
            await expect(page.locator('.ext-label').first()).toBeVisible();
        }
        await page.screenshot({ path: screenshot('06-extensions'), fullPage: true });
    });

    test('can download PEM certificate', async ({ page }) => {
        test.setTimeout(90_000);
        await connectToApp(page);
        await page.locator('#inspect-btn').click();
        await expect(page.locator('.card').first()).toBeVisible({ timeout: 30_000 });

        // PEM section should exist
        const pemBlock = page.locator('.pem-block');
        if (await pemBlock.isVisible({ timeout: 10_000 }).catch(() => false)) {
            const pemText = await pemBlock.textContent();
            expect(pemText).toContain('-----BEGIN CERTIFICATE-----');
            expect(pemText).toContain('-----END CERTIFICATE-----');
        }
        await page.screenshot({ path: screenshot('07-pem-certificate'), fullPage: true });
    });

    test('regenerate challenge generates new nonce', async ({ page }) => {
        test.setTimeout(90_000);
        await connectToApp(page);

        const original = await page.locator('#challenge-input').inputValue();
        await page.locator('button', { hasText: 'Regenerate' }).click();
        const newVal = await page.locator('#challenge-input').inputValue();
        expect(newVal).not.toBe(original);
        expect(newVal).toHaveLength(64);
    });

    test('switches to API Testing tab and discovers schema', async ({ page }) => {
        test.setTimeout(90_000);
        await connectToApp(page);

        // Switch to API tab
        await page.locator('.tab-btn[data-tab="api"]').click();
        await expect(page.locator('.tab-btn[data-tab="api"]')).toHaveClass(/active/);

        // Wait for schema to load (either shows functions or an error)
        const schemaLoaded = page.locator('.rpc-select, .empty-state');
        await expect(schemaLoaded).toBeVisible({ timeout: 30_000 });
        await page.screenshot({ path: screenshot('08-api-tab'), fullPage: true });

        // If schema loaded successfully, check the function selector
        const funcSelect = page.locator('.rpc-select');
        if (await funcSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
            const options = await funcSelect.locator('option').allTextContents();
            expect(options.length).toBeGreaterThan(0);

            // Should show the function signature
            await expect(page.locator('.sig-bar')).toBeVisible();

            // Send button should be present
            await expect(page.locator('#rpc-send-btn')).toBeVisible();
        }
    });

    test('sends an RPC call and gets a response', async ({ page }) => {
        test.setTimeout(90_000);
        await connectToApp(page);
        await page.locator('.tab-btn[data-tab="api"]').click();

        // Wait for schema to load
        const funcSelect = page.locator('.rpc-select');
        await expect(funcSelect).toBeVisible({ timeout: 30_000 });
        await page.screenshot({ path: screenshot('09-rpc-before-send'), fullPage: true });

        // Click Send
        await page.locator('#rpc-send-btn').click();

        // Wait for response card to appear
        const responseCard = page.locator('.response-body, .response-error');
        await expect(responseCard).toBeVisible({ timeout: 30_000 });
        await page.screenshot({ path: screenshot('10-rpc-response'), fullPage: true });

        // History should have an entry
        const historyItem = page.locator('.history-item');
        await expect(historyItem.first()).toBeVisible({ timeout: 5_000 });
    });

    test('keyboard shortcut Ctrl+Enter sends RPC', async ({ page }) => {
        test.setTimeout(90_000);
        await connectToApp(page);
        await page.locator('.tab-btn[data-tab="api"]').click();

        const funcSelect = page.locator('.rpc-select');
        await expect(funcSelect).toBeVisible({ timeout: 30_000 });

        // Use Ctrl+Enter shortcut
        await page.keyboard.press('Control+Enter');

        const responseCard = page.locator('.response-body, .response-error');
        await expect(responseCard).toBeVisible({ timeout: 30_000 });
    });
});

/** Helper: connect to the wasm app with pre-configured settings. */
async function connectToApp(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.locator('#base-url-input').fill(API_BASE);
    await page.locator('#app-name-input').fill(APP_NAME);
    if (AUTH_TOKEN) await page.locator('#auth-token-input').fill(AUTH_TOKEN);
    if (ATTESTATION_SERVER_URL) await page.locator('#attestation-url-input').fill(ATTESTATION_SERVER_URL);
    if (ATTESTATION_SERVER_TOKEN) await page.locator('#attestation-token-input').fill(ATTESTATION_SERVER_TOKEN);
    await page.locator('#connect-btn').click();
    await expect(page.locator('#connected-view')).toBeVisible();
}
