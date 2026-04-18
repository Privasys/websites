/**
 * Shared e2e auth helper — fetches a fresh JWT from the IdP's /e2e/token
 * endpoint to bypass the Privasys Wallet auth flow (QR / push / biometric).
 *
 * How it works:
 *   1. Calls POST {AUTH_ORIGIN}/e2e/token with the shared E2E_SECRET to
 *      get a fresh access_token (valid 5 min, re-fetched per test suite).
 *   2. Sets the `privasys_session` cookie so server-side middleware and
 *      client-side code can read it.
 *   3. Intercepts the AuthFrame iframe (privasys.id/auth/) and responds
 *      to its postMessage protocol so PrivasysAuthProvider picks up the
 *      session without ever loading the real iframe.
 *
 * Required env vars (set via .env.dev / .env.prod / .env.local):
 *   E2E_SECRET  — shared secret matching IDP_E2E_SECRET on the IdP
 *
 * Optional env vars:
 *   E2E_TOKEN       — skip /e2e/token fetch, use this JWT directly
 *   E2E_BASE_URL    — portal URL (default: from .env.dev)
 *   E2E_AUTH_ORIGIN — IdP URL  (default: from .env.dev)
 */
import { type Page, type BrowserContext } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://developer-test.privasys.org';
const AUTH_ORIGIN = process.env.E2E_AUTH_ORIGIN || 'https://dev.privasys.id';
const E2E_SECRET = process.env.E2E_SECRET || '';
const RP_ID = 'privasys.id';

/** Cached token so we only fetch once per test worker. */
let cachedToken = process.env.E2E_TOKEN || '';

/**
 * Fetch a fresh token from the IdP's /e2e/token endpoint, or return
 * the cached one / E2E_TOKEN override.
 */
async function fetchToken(): Promise<string> {
    if (cachedToken) return cachedToken;

    if (!E2E_SECRET) {
        throw new Error(
            'E2E_SECRET env var is required (or set E2E_TOKEN to skip the fetch)'
        );
    }

    const resp = await fetch(`${AUTH_ORIGIN}/e2e/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-E2E-Secret': E2E_SECRET
        },
        body: JSON.stringify({ client_id: 'privasys-platform' })
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`/e2e/token failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();
    cachedToken = data.access_token as string;
    if (!cachedToken) throw new Error('/e2e/token returned no access_token');
    return cachedToken;
}

/**
 * Decode the payload of a JWT (no verification — test helper only).
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
    try {
        const parts = jwt.split('.');
        if (parts.length !== 3) return {};
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(Buffer.from(b64, 'base64').toString());
    } catch {
        return {};
    }
}

/**
 * Inject the e2e token into a browser context:
 *   - Sets the privasys_session cookie on the portal domain
 */
export async function injectAuthCookies(context: BrowserContext): Promise<void> {
    const token = await fetchToken();
    const portalDomain = new URL(BASE_URL).hostname;

    await context.addCookies([
        {
            name: 'privasys_session',
            value: token,
            domain: portalDomain,
            path: '/',
            httpOnly: false,
            secure: true,
            sameSite: 'Lax'
        }
    ]);
}

/**
 * Set up page-level interception so the AuthFrame iframe receives
 * a valid session via postMessage without loading the real privasys.id.
 *
 * Call this before navigating to any authenticated page.
 */
export async function mockAuthFrame(page: Page): Promise<void> {
    const token = await fetchToken();
    const claims = decodeJwtPayload(token);

    // Intercept the AuthFrame iframe HTML — return a minimal page that
    // responds to the postMessage protocol expected by frame-client.ts.
    await page.route(`${AUTH_ORIGIN}/auth/**`, async (route) => {
        const url = route.request().url();

        // Let JS/CSS/asset requests pass through (shouldn't happen, but safe)
        if (!url.endsWith('/auth/') && !url.endsWith('/auth')) {
            await route.abort();
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `<!DOCTYPE html>
<html><head><title>E2E Auth Mock</title></head>
<body><script>
    // Respond to frame-client.ts postMessage protocol
    window.addEventListener('message', function(e) {
        var data = e.data;
        if (!data || typeof data.type !== 'string') return;

        if (data.type === 'privasys:init') {
            // signIn() flow — immediately return success
            e.source.postMessage({
                type: 'privasys:result',
                result: {
                    sessionToken: ${JSON.stringify(token)},
                    accessToken: ${JSON.stringify(token)},
                    method: 'passkey',
                    sessionId: 'e2e-mock-session',
                }
            }, '*');
        }
        else if (data.type === 'privasys:check-session') {
            // getSession() flow — return existing session
            e.source.postMessage({
                type: 'privasys:session',
                session: {
                    token: ${JSON.stringify(token)},
                    rpId: ${JSON.stringify(RP_ID)},
                    authenticatedAt: Date.now(),
                }
            }, '*');
        }
        else if (data.type === 'privasys:clear-session') {
            e.source.postMessage({
                type: 'privasys:session-cleared',
            }, '*');
        }
    });

    // Signal ready to the parent frame
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'privasys:ready' }, '*');
    }
</script></body></html>`
        });
    });
}

/**
 * Get the e2e access token. Fetches from the IdP if not yet cached.
 */
export async function getToken(): Promise<string> {
    return fetchToken();
}

/**
 * Full auth setup for a page: inject cookies + mock the AuthFrame iframe.
 * Call once per page before navigating.
 */
export async function setupAuth(page: Page): Promise<void> {
    await injectAuthCookies(page.context());
    await mockAuthFrame(page);
}

/**
 * Navigate to the dashboard and wait for it to be ready.
 * Handles the auth mock automatically.
 */
export async function goToDashboard(page: Page): Promise<void> {
    await setupAuth(page);
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
}
