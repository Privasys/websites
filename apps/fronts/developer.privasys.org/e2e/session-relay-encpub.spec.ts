/**
 * Session-relay enc_pub stability across an enclave restart (Sc 2).
 *
 * Proves the platform session-relay identity key (`enc_pub`) is
 * reconstructed from the non-promotable, measurement-pinned vault key on
 * restart — i.e. it is IDENTICAL before and after an enclave reboot —
 * instead of being regenerated (which, pre-fix, forced every wallet to
 * re-sign-in on every restart). See
 * .operations/identity-platform/session-relay/enc-pub-plan.md.
 *
 * What it does:
 *   1. Ensure a container app with a public hostname is deployed on the
 *      target enclave (deploys one when E2E_SR_COMMIT_URL is set, or reuses
 *      E2E_SR_APP_HOST). Deploying through the (Sc-2-aware) management
 *      service is what provisions the vault-backed enc_pub.
 *   2. Probe POST /__privasys/session-bootstrap → record enc_pub (#1).
 *   3. Hard-reset the enclave VM (manager process restarts → re-resolves
 *      the key from the vault).
 *   4. Wait for recovery, probe again → enc_pub (#2).
 *   5. Assert enc_pub #1 === #2 (vault-backed + stable). A regenerated
 *      (ephemeral) key would differ → the fix is not in effect.
 *
 * Modes (pick one):
 *   - FAST  : set E2E_SR_APP_HOST=<host already deployed on the enclave>.
 *             Skips deploy; just probe → reset → probe.
 *   - FULL  : set E2E_SR_COMMIT_URL=<github container commit>. Builds +
 *             deploys a fresh app on the target enclave first.
 *
 * Restart env (the VM hosting the enclave):
 *   E2E_SR_ENCLAVE     enclave row name to target  (default: m1-dev)
 *   E2E_SR_GCE_NAME    GCE instance to reset       (default: = enclave name)
 *   E2E_SR_GCE_ZONE    (default: europe-west9-a)
 *   E2E_SR_GCE_PROJECT (default: privasys-development)
 *   E2E_SR_RESET_CMD   override the restart command entirely (e.g. for CI).
 *
 * Run:
 *   E2E_SR_APP_HOST=myapp.apps-test.privasys.org \
 *     npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     session-relay-encpub.spec.ts --project=portal --no-deps
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';

import { setupAuth, getToken as getE2eToken } from './e2e-auth';
import { cleanupApps } from './e2e-cleanup';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

const ENCLAVE_NAME = process.env.E2E_SR_ENCLAVE || 'm1-dev';
const GCE_NAME = process.env.E2E_SR_GCE_NAME || ENCLAVE_NAME;
const GCE_ZONE = process.env.E2E_SR_GCE_ZONE || 'europe-west9-a';
const GCE_PROJECT = process.env.E2E_SR_GCE_PROJECT || 'privasys-development';
const RESET_CMD =
    process.env.E2E_SR_RESET_CMD ||
    `gcloud compute instances reset ${GCE_NAME} --zone ${GCE_ZONE} --project ${GCE_PROJECT}`;

const FIXED_APP_HOST = process.env.E2E_SR_APP_HOST || '';
const COMMIT_URL = process.env.E2E_SR_COMMIT_URL || '';

// A throwaway app we create only in FULL mode.
const APP_NAME = 'e2e-sr-encpub';
const CONTAINER_PORT = Number(process.env.E2E_SR_CONTAINER_PORT || 8080);

// ── shared state ───────────────────────────────────────────────────────
let token = '';
let appHost = FIXED_APP_HOST;
let createdAppId = '';

// A fresh ephemeral P-256 SDK public key (SEC1 uncompressed, base64url) for
// each bootstrap probe — the enclave derives K against it; we only read back
// `enc_pub`, which is independent of which sdk_pub we send.
function freshSdkPub(): string {
    const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const der = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
    // The uncompressed EC point is the trailing 65 bytes (0x04 || X(32) || Y(32)).
    return der.subarray(der.length - 65).toString('base64url');
}

interface BootstrapResp {
    session_id: string;
    enc_pub: string;
    expires_at: number;
}

/** One bootstrap probe; returns enc_pub or throws. */
async function probeEncPub(request: APIRequestContext, host: string): Promise<string> {
    const resp = await request.post(`https://${host}/__privasys/session-bootstrap`, {
        headers: { 'Content-Type': 'application/json' },
        data: { sdk_pub: freshSdkPub() },
        timeout: 20_000,
    });
    if (!resp.ok()) {
        throw new Error(`bootstrap ${host} → ${resp.status()}: ${(await resp.text()).slice(0, 200)}`);
    }
    const body = (await resp.json()) as BootstrapResp;
    if (!body.enc_pub || body.enc_pub.length < 80) {
        throw new Error(`bootstrap ${host} returned no enc_pub: ${JSON.stringify(body)}`);
    }
    return body.enc_pub;
}

/** Poll the bootstrap endpoint until it answers with an enc_pub (post-reboot). */
async function waitForEncPub(request: APIRequestContext, host: string, ms: number): Promise<string> {
    const deadline = Date.now() + ms;
    let last = '';
    while (Date.now() < deadline) {
        try {
            return await probeEncPub(request, host);
        } catch (e) {
            last = (e as Error).message;
            await new Promise((r) => setTimeout(r, 10_000));
        }
    }
    throw new Error(`enclave did not recover within ${ms}ms; last: ${last}`);
}

/**
 * Poll until enc_pub equals `want`, or fail after `ms`. Robust to the
 * post-reboot window where the manager is briefly serving before the registry
 * replay re-installs the vault key (a transient ephemeral key). It passes iff
 * enc_pub returns to the original (vault-backed) value; if the key is
 * regenerated instead (the bug), it never matches and this times out.
 */
async function waitForEncPubEquals(
    request: APIRequestContext,
    host: string,
    want: string,
    ms: number,
): Promise<void> {
    const deadline = Date.now() + ms;
    let lastSeen = '';
    while (Date.now() < deadline) {
        try {
            const got = await probeEncPub(request, host);
            lastSeen = got;
            if (got === want) return;
        } catch (e) {
            lastSeen = `error: ${(e as Error).message}`;
        }
        await new Promise((r) => setTimeout(r, 10_000));
    }
    throw new Error(
        `enc_pub did not return to the pre-restart value within ${ms}ms ` +
            `(last seen ${lastSeen.slice(0, 24)}…, expected ${want.slice(0, 24)}…) ` +
            `— the key was regenerated, not reconstructed from the vault`,
    );
}

/**
 * Probe until enc_pub STABILISES (two consecutive reads, ~15s apart, equal),
 * then return it. Right after a deploy the manager briefly serves a lazily
 * generated ephemeral key until resolveSessionRelayKey installs the
 * vault-backed one; a single probe can race that window. Stability means we've
 * captured the vault-backed key, which is the value Sc 2 must hold across a
 * restart.
 */
async function waitForStableEncPub(request: APIRequestContext, host: string, ms: number): Promise<string> {
    const deadline = Date.now() + ms;
    let prev = '';
    while (Date.now() < deadline) {
        let cur: string;
        try {
            cur = await probeEncPub(request, host);
        } catch {
            await new Promise((r) => setTimeout(r, 10_000));
            continue;
        }
        if (cur === prev) return cur;
        prev = cur;
        await new Promise((r) => setTimeout(r, 15_000));
    }
    throw new Error(`enc_pub did not stabilise within ${ms}ms (last ${prev.slice(0, 24)}…)`);
}

async function getToken(page: Page): Promise<string> {
    if (token) return token;
    await setupAuth(page);
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    token = await getE2eToken();
    expect(token, 'e2e token').toBeTruthy();
    return token;
}

/** FULL mode: create + build + deploy a fresh container app on the target enclave. */
async function deployFreshApp(page: Page): Promise<string> {
    const tok = await getToken(page);
    const hdrs = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };

    // Clean any prior run, then create.
    await cleanupApps({ names: [APP_NAME] });
    const createResp = await page.request.post(`${API}/api/v1/apps`, {
        headers: hdrs,
        data: {
            name: APP_NAME,
            source_type: 'github',
            commit_url: COMMIT_URL,
            app_type: 'container',
            container_port: CONTAINER_PORT,
        },
    });
    expect(createResp.ok(), `create app: ${await createResp.text()}`).toBeTruthy();
    createdAppId = (await createResp.json()).id;

    // A Description + Category are required before any deploy (App Store gate).
    const storeResp = await page.request.put(`${API}/api/v1/apps/${createdAppId}/store`, {
        headers: hdrs,
        data: { store_description: 'E2E session-relay enc_pub restart test.', store_category: 'Developer Tools' },
    });
    expect(storeResp.ok(), `store listing: HTTP ${storeResp.status()}`).toBeTruthy();

    // Wait for the build (the reproducible builder can be slow/queued).
    let versionId = '';
    for (let i = 0; i < 220 && !versionId; i++) {
        const vr = await page.request.get(`${API}/api/v1/apps/${createdAppId}/versions`, { headers: hdrs });
        if (vr.ok()) {
            const versions: { id: string; status: string }[] = await vr.json();
            if (versions.find((v) => v.status === 'failed')) throw new Error('app build failed');
            versionId = versions.find((v) => v.status === 'ready')?.id || '';
        }
        if (!versionId) await page.waitForTimeout(5_000);
    }
    expect(versionId, 'build ready').toBeTruthy();

    // Target enclave by name.
    const er = await page.request.get(`${API}/api/v1/enclaves`, { headers: hdrs });
    expect(er.ok()).toBeTruthy();
    const enclaves: { id: string; name: string; tee_type: string }[] = await er.json();
    const target = enclaves.find((e) => e.name === ENCLAVE_NAME);
    expect(target, `enclave ${ENCLAVE_NAME} present`).toBeTruthy();

    // Deploy (retry while a prior container is still cleaning up).
    let host = '';
    for (let attempt = 0; attempt < 6 && !host; attempt++) {
        const dr = await page.request.post(
            `${API}/api/v1/apps/${createdAppId}/versions/${versionId}/deploy`,
            { headers: hdrs, data: { enclave_id: target!.id }, timeout: 150_000 },
        );
        if (dr.ok()) {
            host = (await dr.json()).hostname;
            break;
        }
        const err = await dr.text();
        if (!/already (loaded|exists)/.test(err) || attempt === 5) {
            expect(dr.ok(), `deploy: ${err}`).toBeTruthy();
        }
        await page.waitForTimeout(15_000);
    }
    expect(host, 'deployment hostname').toBeTruthy();
    return host;
}

test.describe('Session-relay enc_pub survives an enclave restart (Sc 2)', () => {
    test.describe.configure({ mode: 'serial' });

    let encPubBefore = '';

    test.afterAll(async () => {
        if (createdAppId) await cleanupApps({ names: [APP_NAME] });
    });

    test('ensure a session-relay app is deployed on the target enclave', async ({ page }) => {
        test.setTimeout(1_320_000); // a fresh github build can be slow/queued (~20 min)
        if (FIXED_APP_HOST) {
            console.log(`[sr-encpub] FAST mode: reusing ${FIXED_APP_HOST}`);
            appHost = FIXED_APP_HOST;
        } else if (COMMIT_URL) {
            console.log(`[sr-encpub] FULL mode: deploying ${APP_NAME} on ${ENCLAVE_NAME}`);
            appHost = await deployFreshApp(page);
        } else {
            test.skip(true, 'Set E2E_SR_APP_HOST (fast) or E2E_SR_COMMIT_URL (full) to run this test.');
        }
        expect(appHost).toBeTruthy();
    });

    test('record enc_pub before restart', async ({ request }) => {
        test.setTimeout(180_000);
        // Tolerate gateway-route propagation (the host may 404 briefly) AND the
        // post-deploy ephemeral→vault window: wait until enc_pub stabilises to
        // the vault-backed key before recording the baseline.
        encPubBefore = await waitForStableEncPub(request, appHost, 150_000);
        console.log(`[sr-encpub] enc_pub (before) = ${encPubBefore.slice(0, 24)}…`);
        expect(encPubBefore).toBeTruthy();
    });

    test('restart the enclave VM', async () => {
        test.setTimeout(120_000);
        console.log(`[sr-encpub] resetting enclave: ${RESET_CMD}`);
        execSync(RESET_CMD, { stdio: 'pipe', timeout: 90_000 });
    });

    test('enc_pub is identical after restart (vault-reconstructed, not regenerated)', async ({
        request,
    }) => {
        test.setTimeout(420_000);
        // The fix: same measurement → same vault key → enc_pub returns to its
        // pre-restart value once the registry replay re-resolves it. Without it,
        // the manager regenerates an ephemeral key on restart and this never
        // matches (times out) — exactly the bug being guarded against.
        await waitForEncPubEquals(request, appHost, encPubBefore, 360_000);
        console.log('[sr-encpub] enc_pub identical after restart — Sc 2 confirmed');
    });
});
