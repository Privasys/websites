/**
 * E2E auth helper — gets a real Privasys IdP JWT for the test user via
 * a complete OIDC flow with software FIDO2.
 *
 * Replaces the old `/e2e/token` shortcut. The IdP no longer needs a
 * special e2e endpoint or `IDP_E2E_SECRET`: tests authenticate exactly
 * the same way the production wallet does.
 *
 * Per worker we keep one persistent identity at
 * `e2e/.auth/fido2-<RP>.json` so subsequent runs reuse the same
 * server-side `user_id` (and therefore the same role grants seeded by
 * IDP_BOOTSTRAP_ADMIN).
 *
 * Required env vars:
 *   E2E_BASE_URL    — portal URL (default: https://developer-test.privasys.org)
 *   E2E_AUTH_ORIGIN — IdP URL    (default: https://privasys.id)
 *
 * Optional env vars:
 *   E2E_TOKEN          — skip the OIDC dance, use this JWT directly (for debugging)
 *   E2E_IDENTITY_FILE  — override the persisted-identity path
 */
import { type Page, type BrowserContext } from '@playwright/test';
import { createHash, randomBytes } from 'crypto';
import * as path from 'path';

import {
    fido2Authenticate,
    fido2Register,
    loadOrCreateIdentity,
    type AuthenticateResult,
    type RegisterResult
} from './lib/fido2-client';

const BASE_URL = process.env.E2E_BASE_URL || 'https://developer-test.privasys.org';
const AUTH_ORIGIN = (process.env.E2E_AUTH_ORIGIN || 'https://privasys.id').replace(/\/$/, '');
const RP_ID = new URL(AUTH_ORIGIN).hostname;
const CLIENT_ID = 'privasys-platform';
const REDIRECT_URI = `${AUTH_ORIGIN}/auth/callback`;
const SCOPE = 'openid email profile';
const E2E_DISPLAY_NAME = 'E2E Test User';
const E2E_EMAIL = 'e2e@test.privasys.org';

const IDENTITY_FILE =
    process.env.E2E_IDENTITY_FILE ||
    path.join(__dirname, '.auth', `fido2-${RP_ID}.json`);

/** Cached token so we only fetch once per worker. */
let cachedToken = process.env.E2E_TOKEN || '';

const b64url = (b: Buffer): string =>
    b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function pkce() {
    const verifier = b64url(randomBytes(32));
    const challenge = b64url(createHash('sha256').update(verifier).digest());
    return { verifier, challenge };
}

interface AuthorizeResp {
    session_id: string;
    poll_url?: string;
    expires_in?: number;
}

interface SessionStatus {
    authenticated: boolean;
    redirect_uri?: string;
}

interface TokenResp {
    access_token: string;
    id_token?: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
}

async function fetchJson<T>(url: string, init?: Parameters<typeof fetch>[1]): Promise<T> {
    const resp = await fetch(url, init);
    const text = await resp.text();
    if (!resp.ok) {
        throw new Error(`${init?.method || 'GET'} ${url} → ${resp.status}: ${text}`);
    }
    return JSON.parse(text) as T;
}

/**
 * Run the full OIDC flow with software FIDO2 and return a fresh JWT.
 *
 *   1. /authorize       → session_id
 *   2. fido2 register or authenticate (binds to session_id)
 *   3. /session/complete (deliver attributes)
 *   4. /session/status  → redirect_uri with ?code=
 *   5. /token           → access_token
 */
async function runOidcFlow(): Promise<string> {
    const identity = loadOrCreateIdentity(IDENTITY_FILE);

    // 1. /authorize
    const { verifier, challenge } = pkce();
    const state = randomBytes(16).toString('hex');
    const nonce = randomBytes(16).toString('hex');
    const authorizeURL =
        `${AUTH_ORIGIN}/authorize?` +
        new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: SCOPE,
            state,
            nonce,
            code_challenge: challenge,
            code_challenge_method: 'S256'
        }).toString();
    const auth = await fetchJson<AuthorizeResp>(authorizeURL, {
        headers: { Accept: 'application/json' }
    });
    const sessionId = auth.session_id;
    if (!sessionId) throw new Error(`/authorize returned no session_id: ${JSON.stringify(auth)}`);

    // 2. FIDO2 register or authenticate
    let result: RegisterResult | AuthenticateResult;
    if (!identity.credentialId) {
        result = await fido2Register(AUTH_ORIGIN, RP_ID, identity, sessionId, E2E_DISPLAY_NAME);
        if ((result as RegisterResult).recoveryPhrase) {
            console.log('[e2e-auth] new identity registered, recovery phrase generated');
        }
    } else {
        try {
            result = await fido2Authenticate(AUTH_ORIGIN, RP_ID, identity, sessionId);
        } catch (e) {
            const status = (e as Error & { status?: number }).status;
            if (status === 404) {
                // Server doesn't know our credentialId (DB wiped?) — re-register.
                console.warn('[e2e-auth] credential not on server, re-registering');
                identity.credentialId = undefined;
                identity.persisted.credentialId = undefined;
                result = await fido2Register(AUTH_ORIGIN, RP_ID, identity, sessionId, E2E_DISPLAY_NAME);
            } else {
                throw e;
            }
        }
    }

    // 3. /session/complete — deliver attributes (FIDO2 handler already
    //    completed the session and created an AuthCode without attrs;
    //    this patches them in).
    await fetchJson(`${AUTH_ORIGIN}/session/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id: sessionId,
            user_id: result.userId,
            attributes: { email: E2E_EMAIL, name: E2E_DISPLAY_NAME }
        })
    });

    // 4. /session/status → grab the code from redirect_uri
    const status = await fetchJson<SessionStatus>(
        `${AUTH_ORIGIN}/session/status?session_id=${encodeURIComponent(sessionId)}`
    );
    if (!status.authenticated || !status.redirect_uri) {
        throw new Error(`session not authenticated: ${JSON.stringify(status)}`);
    }
    const code = new URL(status.redirect_uri).searchParams.get('code');
    if (!code) throw new Error(`no code in redirect_uri: ${status.redirect_uri}`);

    // 5. /token
    const tokenResp = await fetchJson<TokenResp>(`${AUTH_ORIGIN}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            code_verifier: verifier
        }).toString()
    });
    if (!tokenResp.access_token) throw new Error('no access_token in /token response');
    return tokenResp.access_token;
}

async function fetchToken(): Promise<string> {
    if (cachedToken) return cachedToken;
    cachedToken = await runOidcFlow();
    return cachedToken;
}

/**
 * Inject the e2e token into a browser context as the privasys_session cookie.
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
 * Mock the AuthFrame iframe at privasys.id/auth/ so frame-client receives
 * a fake session via postMessage. The injected cookie above is what the
 * portal's API routes actually verify against the IdP JWKS.
 */
export async function mockAuthFrame(page: Page): Promise<void> {
    const token = await fetchToken();

    await page.route(`${AUTH_ORIGIN}/auth/**`, async (route) => {
        const url = route.request().url();
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
window.addEventListener('message', function(e) {
    var d = e.data;
    if (!d || typeof d.type !== 'string') return;
    if (d.type === 'privasys:init') {
        e.source.postMessage({
            type: 'privasys:result',
            result: {
                sessionToken: ${JSON.stringify(token)},
                accessToken: ${JSON.stringify(token)},
                method: 'passkey',
                sessionId: 'e2e-mock-session',
            }
        }, '*');
    } else if (d.type === 'privasys:check-session') {
        e.source.postMessage({
            type: 'privasys:session',
            session: {
                token: ${JSON.stringify(token)},
                rpId: ${JSON.stringify(RP_ID)},
                authenticatedAt: Date.now(),
            }
        }, '*');
    } else if (d.type === 'privasys:clear-session') {
        e.source.postMessage({ type: 'privasys:session-cleared' }, '*');
    }
});
if (window.parent !== window) {
    window.parent.postMessage({ type: 'privasys:ready' }, '*');
}
</script></body></html>`
        });
    });
}

/** Get the e2e access token. Fetches from the IdP if not yet cached. */
export async function getToken(): Promise<string> {
    return fetchToken();
}

/** Full auth setup for a page: inject cookies + mock the AuthFrame iframe. */
export async function setupAuth(page: Page): Promise<void> {
    await injectAuthCookies(page.context());
    await mockAuthFrame(page);
}

/** Navigate to the dashboard and wait for it to be ready. */
export async function goToDashboard(page: Page): Promise<void> {
    await setupAuth(page);
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
}
