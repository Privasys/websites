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
 *   E2E_BASE_URL    — portal URL (default: https://developer.test.privasys.org)
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

const BASE_URL = process.env.E2E_BASE_URL || 'https://developer.test.privasys.org';
const AUTH_ORIGIN = (process.env.E2E_AUTH_ORIGIN || 'https://privasys.id').replace(/\/$/, '');
const RP_ID = new URL(AUTH_ORIGIN).hostname;

// The suite's token must be for the platform it runs against: a production
// token (aud privasys-platform) must never reach the test control plane or a
// test app. A run against anything but the production API signs in with the
// e2e test client (privasys-e2e-test) and asks for the test audience.
const PROD_API_URL = 'https://api.developer.privasys.org';
const TARGET_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.developer.test.privasys.org';
const PROD_AUDIENCE = 'privasys-platform';
const TEST_AUDIENCE = 'privasys-platform-test';
/** The audience every token this suite uses must carry, and nothing else. */
export const TARGET_AUDIENCE = TARGET_API_URL === PROD_API_URL ? PROD_AUDIENCE : TEST_AUDIENCE;
const CLIENT_ID = TARGET_AUDIENCE === TEST_AUDIENCE ? 'privasys-e2e-test' : 'privasys-platform';
// The IdP grants the test audience only to a page on the test platform, so a
// test run's redirect is on the test portal's origin, and it must be one the
// client registered (E2E_REDIRECT_URI names another). The flow reads the code
// from the session status and never loads this URL.
const REDIRECT_URI =
    process.env.E2E_REDIRECT_URI ||
    (TARGET_AUDIENCE === TEST_AUDIENCE ? `${new URL(BASE_URL).origin}/auth/callback` : `${AUTH_ORIGIN}/auth/callback`);
const SCOPE = 'openid email profile' + (TARGET_AUDIENCE === TEST_AUDIENCE ? ` audience:${TEST_AUDIENCE}` : '');

/**
 * Refuse a token whose audience is not exactly TARGET_AUDIENCE, before it is
 * sent anywhere. The token itself never appears in the error.
 */
export function assertTokenAudience(token: string): void {
    let aud: unknown;
    try {
        aud = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')).aud;
    } catch {
        throw new Error('[e2e-auth] the e2e token is not a readable JWT; refusing to use it');
    }
    const auds = Array.isArray(aud) ? aud : [aud];
    if (auds.length !== 1 || auds[0] !== TARGET_AUDIENCE) {
        throw new Error(
            `[e2e-auth] the e2e token's audience ${JSON.stringify(aud)} is not ${TARGET_AUDIENCE} (the platform at ${TARGET_API_URL}); refusing to use it`
        );
    }
}
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
    if (!cachedToken) cachedToken = await runOidcFlow();
    // Checked on every use, E2E_TOKEN included: nothing reaches a request
    // with another platform's audience.
    assertTokenAudience(cachedToken);
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
 * Mock the AuthFrame's frame at privasys.id/auth/ so the SDK receives a
 * fake session via postMessage. The injected cookie above is what the
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
    // The stored session: a wallet one, so app(host) opens a sealed channel.
    var session = { token: ${JSON.stringify(token)}, method: 'wallet' };
    if (d.type === 'privasys:check-session') {
        e.source.postMessage({ type: 'privasys:session', id: d.id, session: session }, '*');
    } else if (d.type === 'privasys:renew-session') {
        e.source.postMessage({ type: 'privasys:renew-session:response', id: d.id, session: session }, '*');
    } else if (d.type === 'privasys:clear-session') {
        e.source.postMessage({ type: 'privasys:session-cleared', id: d.id }, '*');
    }
    // Sealed channels. The real frame derives an X25519 shared key with the
    // enclave and forwards sealed CBOR. For the mock every host resumes at
    // once and every sealed request gets a stub answer, so portal-side UI
    // tests can drive the deploy button without a live enclave.
    else if (d.type === 'privasys:session:resume') {
        e.source.postMessage({ type: 'privasys:session:resume:response', id: d.id }, '*');
    } else if (d.type === 'privasys:session:request') {
        e.source.postMessage({
            type: 'privasys:session:response',
            id: d.id,
            status: 200,
            headers: { 'content-type': 'application/json' },
            body: new TextEncoder().encode(JSON.stringify({ status: 'ok', mock: true })),
        }, '*');
    } else if (d.type === 'privasys:session:stream-request') {
        e.source.postMessage({
            type: 'privasys:session:stream-start',
            id: d.id,
            status: 200,
            headers: { 'content-type': 'text/event-stream' },
        }, '*');
        e.source.postMessage({
            type: 'privasys:session:stream-end',
            id: d.id,
        }, '*');
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

// The suite works in an organisation account of its own ("E2E Tests"),
// so the apps it deploys are billed and listed there, never in a person's
// account. The e2e user is an admin of it. E2E_ACCOUNT_NAME names another
// one; E2E_ACCOUNT=personal works in the e2e user's own account instead.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.developer.test.privasys.org';
const ACCOUNT_NAME = process.env.E2E_ACCOUNT_NAME || 'E2E Tests';
let accountId: string | null | undefined;

/** The id of the account the suite works in, or null for the personal one. */
export async function getAccountId(): Promise<string | null> {
    if (accountId !== undefined) return accountId;
    if (process.env.E2E_ACCOUNT === 'personal') return (accountId = null);
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/v1/accounts`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`listing the e2e user's accounts: HTTP ${res.status}`);
    const { accounts } = (await res.json()) as { accounts: { id: string; kind: string; name: string }[] };
    const acc = accounts.find(a => a.kind === 'org' && a.name === ACCOUNT_NAME);
    if (!acc) {
        throw new Error(`the e2e user is not in an organisation account named "${ACCOUNT_NAME}" ` +
            '(set E2E_ACCOUNT=personal to run in its own account)');
    }
    return (accountId = acc.id);
}

/** The header naming the suite's account to the control plane. */
export async function accountHeader(): Promise<Record<string, string>> {
    const id = await getAccountId();
    return id ? { 'X-Privasys-Account': id } : {};
}

/** Full auth setup for a page: inject cookies, mock the AuthFrame iframe,
 *  and open the portal in the suite's account (as the switcher would). */
export async function setupAuth(page: Page): Promise<void> {
    await injectAuthCookies(page.context());
    await mockAuthFrame(page);
    const id = await getAccountId();
    if (id) {
        await page.addInitScript((acc: string) => {
            try {
                if (!new URLSearchParams(window.location.search).get('account')) {
                    window.localStorage.setItem('privasys.account', acc);
                }
            } catch { /* not remembered; the page falls back to the default */ }
        }, id);
    }
}

/** Navigate to the dashboard and wait for it to be ready. */
export async function goToDashboard(page: Page): Promise<void> {
    await setupAuth(page);
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
}
