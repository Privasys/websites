/**
 * Diagnostic e2e for chat-test sign-in flow.
 *
 * Goals:
 *   1. Reproduce the 3x 409s on /connect/ that show up before the QR
 *      becomes scannable.
 *   2. Find out whether SignInView's signInInto() is being called more
 *      than once per visit.
 *   3. Capture every privasys.id, relay.privasys.org and broker
 *      request/response pair so we can correlate the 409s with the
 *      actual descriptor PUTs.
 *
 * No wallet ceremony is required — we stop at the QR-render stage.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.CHAT_BASE_URL || 'https://chat-test.privasys.org';
const INSTANCE_PATH = process.env.CHAT_INSTANCE_PATH || '/i/demo';

test('chat sign-in: trace network + console up to QR render', async ({ page }) => {
    test.setTimeout(60_000);

    type Hit = { method: string; url: string; status?: number; ts: number };
    const network: Hit[] = [];
    const console_: { type: string; text: string; ts: number }[] = [];
    const t0 = Date.now();

    page.on('request', (req) => {
        const u = req.url();
        if (
            u.includes('relay.privasys.org') ||
            u.includes('privasys.id') ||
            u.includes('/auth') ||
            u.includes('/connect')
        ) {
            network.push({ method: req.method(), url: u, ts: Date.now() - t0 });
        }
    });
    page.on('response', async (resp) => {
        const u = resp.url();
        if (
            u.includes('relay.privasys.org') ||
            u.includes('privasys.id') ||
            u.includes('/auth') ||
            u.includes('/connect')
        ) {
            const idx = network.findIndex(
                (n) => n.url === u && n.status === undefined
            );
            if (idx >= 0) network[idx].status = resp.status();
            else
                network.push({
                    method: resp.request().method(),
                    url: u,
                    status: resp.status(),
                    ts: Date.now() - t0
                });
        }
    });
    page.on('console', (msg) => {
        console_.push({
            type: msg.type(),
            text: msg.text(),
            ts: Date.now() - t0
        });
    });
    page.on('pageerror', (err) =>
        console_.push({ type: 'pageerror', text: err.message, ts: Date.now() - t0 })
    );

    // Force closed shadow DOMs to open so we can inspect the auth UI.
    await page.addInitScript(`
        const orig = Element.prototype.attachShadow;
        Element.prototype.attachShadow = function (init) {
            return orig.call(this, { ...init, mode: 'open' });
        };
        (window).__connectPuts = 0;
        const _origFetch = window.fetch;
        window.fetch = function (input, init) {
            try {
                const url = typeof input === 'string' ? input : (input).url;
                const method = init?.method || (input).method || 'GET';
                if (url.includes('/connect/') && method.toUpperCase() === 'PUT') {
                    (window).__connectPuts++;
                    console.log('[diag] PUT', url);
                }
            } catch (e) {}
            return _origFetch.apply(this, arguments);
        };
        let signInIntoCalls = 0;
        Object.defineProperty(window, '__signInIntoCalls', {
            get: () => signInIntoCalls,
            set: (v) => { signInIntoCalls = v; },
        });
    `);

    await page.goto(`${BASE}${INSTANCE_PATH}`);

    // The chat shell hydrates → instance loads → if no session, the user
    // clicks "Sign in" or the demo route auto-shows it. We need to land
    // in SignInView. The demo instance (i/demo) usually shows a Connect
    // button. Click it.
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    // Try to click any "Sign in" / "Connect" CTA.
    const cta = page
        .getByRole('button', { name: /sign in|connect|continue/i })
        .first();
    if (await cta.count()) {
        await cta.click().catch(() => {});
    }

    // Wait for the auth iframe to attach
    const authIframe = page.locator('iframe[src*="privasys.id/auth"]');
    await authIframe
        .first()
        .waitFor({ state: 'attached', timeout: 30_000 })
        .catch(() => {});

    // Inside the inline auth iframe, click "Continue with Privasys ID" to
    // kick off the QR/relay flow that publishes the descriptor.
    const inlineFrame = page.frameLocator('iframe[src*="privasys.id/auth"]').last();
    const continueBtn = inlineFrame.getByText(/continue with privasys id/i).first();
    await continueBtn.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await continueBtn.click({ timeout: 5_000 }).catch((e) => {
        // eslint-disable-next-line no-console
        console.log('[diag] click continue failed:', String(e).split('\n')[0]);
    });

    // Give the QR a chance to render.
    await page.waitForTimeout(8_000);

    const connectPuts = await page.evaluate(() => (window as any).__connectPuts);
    const connectHits = network.filter((n) => n.url.includes('/connect/'));
    const status409 = network.filter((n) => n.status === 409);

    /* eslint-disable no-console */
    console.log('---');
    console.log('PUT /connect/ count (window patched):', connectPuts);
    console.log('Connect-related hits:');
    for (const h of connectHits)
        console.log(` ${h.ts}ms ${h.method} ${h.status ?? '???'} ${h.url}`);
    console.log('All 409s:');
    for (const h of status409)
        console.log(` ${h.ts}ms ${h.method} ${h.status} ${h.url}`);
    console.log('Console errors / warns:');
    for (const c of console_.filter(
        (c) => c.type === 'error' || c.type === 'warning' || c.type === 'pageerror'
    ))
        console.log(` ${c.ts}ms [${c.type}] ${c.text}`);
    console.log('All privasys.id traffic:');
    for (const h of network.filter((n) => n.url.includes('privasys.id')))
        console.log(` ${h.ts}ms ${h.method} ${h.status ?? '???'} ${h.url}`);
    console.log('---');
    /* eslint-enable no-console */

    expect(connectHits.length).toBeGreaterThan(0);
    // Regression guard for the "3x 409 before QR" bug fixed in
    // @privasys/auth 0.3.4 (renderQR was re-running createQR on every
    // state transition). Allow at most one PUT per sessionId.
    const puts = connectHits.filter((h) => h.method === 'PUT');
    expect(puts.length).toBe(1);
    expect(status409.length).toBe(0);
});
