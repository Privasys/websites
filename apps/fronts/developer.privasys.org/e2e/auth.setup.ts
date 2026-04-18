/**
 * Playwright auth setup — fetches a fresh JWT from the IdP /e2e/token
 * endpoint and mocks the AuthFrame iframe so PrivasysAuthProvider picks
 * up the session.
 *
 * Required env vars (via .env.dev / .env.prod):
 *   E2E_SECRET — shared secret matching IDP_E2E_SECRET on the IdP
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { injectAuthCookies, mockAuthFrame } from './e2e-auth';

const stateFile = path.join(__dirname, '.auth', 'state.json');

setup('inject auth token', async ({ page }) => {
    setup.setTimeout(30_000);

    // Ensure .auth directory exists
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });

    // Inject the token cookie and mock the AuthFrame iframe
    await injectAuthCookies(page.context());
    await mockAuthFrame(page);

    // Navigate to verify the token works
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 15_000 });

    // Verify we're on the dashboard (not redirected to login)
    expect(page.url()).toContain('/dashboard');
    console.log('Auth token injected and verified.');

    // Save browser state for dependent test projects
    await page.context().storageState({ path: stateFile });
});
