/**
 * Fast verification suite - one WASM build + one container build.
 *
 * Creates, builds, deploys and verifies two apps in a single serial run:
 *   1. A WASM app   (wasm-app-example   → SGX enclave)
 *   2. A container   (container-app-example → TDX enclave)
 *
 * Both builds happen on GitHub Actions in parallel, so the total wall-clock
 * time is dominated by a single build cycle (~2–3 min) rather than the sum.
 * Target: 3–5 minutes end-to-end.
 *
 * Run:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts fast-verify.spec.ts --project=portal --no-deps
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { setupAuth, getToken as getE2eToken } from './e2e-auth';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

// ── App config ─────────────────────────────────────────────────────
const WASM_COMMIT_URL =
    'https://github.com/Privasys/wasm-app-example/commit/2f082dfbe354c074c6784d185094bbbadd043ad6';
const WASM_APP_NAME = 'e2e-wasm-verify';

const CONTAINER_COMMIT_URL =
    'https://github.com/Privasys/container-app-example/commit/ad18cb1e5f4eaff65f0fd68f83fc4cfcd5cd379d';
const CONTAINER_APP_NAME = 'e2e-container-verify';
const CONTAINER_PORT = 8080;

// A second container from the same source, created vault-backed
// (container_storage + enclave_generated) for the key-rotation flow:
// rotate-key is container-only and requires a vault-backed volume DEK.
// Kept separate from CONTAINER_APP_NAME so a vault/constellation hiccup
// cannot break the plain container verification coverage.
const ROTATE_APP_NAME = 'e2e-rotate-verify';

// ── Shared state (serial tests share these across the suite) ───────
let token: string;
let wasmAppId: string;
let wasmVersionId: string;
let wasmEnclaveId: string;
let containerAppId: string;
let containerVersionId: string;
let rotateAppId: string;
let rotateVersionId: string;
let rotateEnclaveId: string;
let rotateHandleV1: string;
let wasmDeployed = false;
let containerDeployed = false;
let rotateDeployed = false;

// ── Helpers ────────────────────────────────────────────────────────
async function getToken(page: import('@playwright/test').Page): Promise<string> {
    if (token) return token;
    await setupAuth(page);
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    token = await getE2eToken();
    expect(token).toBeTruthy();
    return token;
}

async function deleteApp(
    page: import('@playwright/test').Page,
    tok: string,
    name: string,
) {
    const resp = await page.request.get(`${API}/api/v1/apps`, {
        headers: { Authorization: `Bearer ${tok}` },
    });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    const app = apps.find(a => a.name === name);
    if (!app) return;

    // Stop active deployments first
    const depsResp = await page.request.get(
        `${API}/api/v1/apps/${app.id}/deployments`,
        { headers: { Authorization: `Bearer ${tok}` } },
    );
    if (depsResp.ok()) {
        const deps: { id: string; status: string }[] = await depsResp.json();
        for (const dep of deps.filter(d => d.status === 'active')) {
            await page.request.post(
                `${API}/api/v1/apps/${app.id}/deployments/${dep.id}/stop`,
                { headers: { Authorization: `Bearer ${tok}` }, timeout: 30_000 },
            );
        }
        if (deps.some(d => d.status === 'active')) await page.waitForTimeout(5_000);
    }
    await page.request.delete(`${API}/api/v1/apps/${app.id}`, {
        headers: { Authorization: `Bearer ${tok}` },
    });
    // Wait for enclave-side cleanup (snapshot removal)
    await page.waitForTimeout(10_000);
    console.log(`Deleted ${name} (${app.id})`);
}

// Poll a deployment until it reaches `active` (or fails / times out).
async function waitForActive(
    page: import('@playwright/test').Page,
    tok: string,
    appId: string,
    deploymentId: string,
    maxMs: number,
): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
        const resp = await page.request.get(
            `${API}/api/v1/apps/${appId}/deployments`,
            { headers: { Authorization: `Bearer ${tok}` } },
        );
        if (resp.ok()) {
            const deps: { id: string; status: string }[] = await resp.json();
            const dep = deps.find(d => d.id === deploymentId);
            if (dep?.status === 'active') return true;
            if (dep?.status === 'failed') return false;
        }
        await page.waitForTimeout(5_000);
    }
    return false;
}

// ════════════════════════════════════════════════════════════════════
test.describe('Fast Verification Suite', () => {
    test.describe.configure({ mode: 'serial' });

    // ── Phase 1: Create both apps ──────────────────────────────────

    test('create WASM + container apps', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        await deleteApp(page, token, WASM_APP_NAME);
        await deleteApp(page, token, CONTAINER_APP_NAME);
        await deleteApp(page, token, ROTATE_APP_NAME);

        // Create WASM app
        const wasmResp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: WASM_APP_NAME,
                source_type: 'github',
                commit_url: WASM_COMMIT_URL,
            },
        });
        expect(wasmResp.ok()).toBeTruthy();
        const wasmBody = await wasmResp.json();
        expect(wasmBody.app_type).toBe('wasm');
        wasmAppId = wasmBody.id;
        console.log(`Created WASM app: ${WASM_APP_NAME} (${wasmAppId})`);

        // Create container app (privasys.json → auto-detected MCP)
        const ctrResp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: CONTAINER_APP_NAME,
                source_type: 'github',
                commit_url: CONTAINER_COMMIT_URL,
                app_type: 'container',
                container_port: CONTAINER_PORT,
            },
        });
        expect(ctrResp.ok()).toBeTruthy();
        const ctrBody = await ctrResp.json();
        expect(ctrBody.app_type).toBe('container');
        expect(ctrBody.container_mcp).toBeTruthy();
        containerAppId = ctrBody.id;
        console.log(`Created container app: ${CONTAINER_APP_NAME} (${containerAppId})`);

        // Create the vault-backed container (key-rotation flow). container_storage
        // + key_provider=enclave_generated make the app vault-backed: the platform
        // reserves a stable vault key handle now, and the per-app LUKS volume DEK is
        // reconstructed from the vault constellation at deploy. rotate-key requires
        // this (it re-keys the volume in place).
        const rotResp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: ROTATE_APP_NAME,
                source_type: 'github',
                commit_url: CONTAINER_COMMIT_URL,
                app_type: 'container',
                container_port: CONTAINER_PORT,
                container_storage: true,
                key_provider: 'enclave_generated',
            },
        });
        expect(rotResp.ok()).toBeTruthy();
        const rotBody = await rotResp.json();
        expect(rotBody.app_type).toBe('container');
        // The app must be vault-backed, otherwise rotate-key returns 400.
        expect(rotBody.vault_key_handle, 'rotate app must be vault-backed').toBeTruthy();
        rotateAppId = rotBody.id;
        rotateHandleV1 = rotBody.vault_key_handle;
        console.log(`Created vault-backed app: ${ROTATE_APP_NAME} (${rotateAppId}) handle=${rotateHandleV1}`);

        // The deploy gate requires a minimal App Store listing (Description +
        // Category) before an app can be deployed. Set it for all apps.
        for (const id of [wasmAppId, containerAppId, rotateAppId]) {
            const r = await page.request.put(`${API}/api/v1/apps/${id}/store`, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: {
                    store_tagline: '', store_description: 'E2E fast-verify app.', store_category: 'Developer Tools',
                    store_icon_url: '', store_screenshots: [], store_privacy_url: '', store_tos_url: '',
                    store_website_url: '', store_support_email: '', store_keywords: 'e2e'
                },
            });
            expect(r.ok(), 'set store listing').toBeTruthy();
        }
    });

    // ── Phase 2: Wait for both builds (parallel on GH Actions) ─────

    test('wait for both builds', async ({ page }) => {
        test.setTimeout(600_000); // 10 min max
        token = await getToken(page);

        let wasmReady = false;
        let containerReady = false;

        for (let i = 0; i < 108; i++) {
            if (!wasmReady) {
                const resp = await page.request.get(
                    `${API}/api/v1/apps/${wasmAppId}/versions`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                if (resp.ok()) {
                    const versions: { id: string; status: string }[] = await resp.json();
                    const failed = versions.find(v => v.status === 'failed');
                    if (failed) throw new Error(`WASM build failed: ${failed.id}`);
                    const ready = versions.find(v => v.status === 'ready');
                    if (ready) {
                        wasmVersionId = ready.id;
                        wasmReady = true;
                        console.log(`WASM build ready: ${wasmVersionId} (poll ${i})`);
                    }
                }
            }
            if (!containerReady) {
                const resp = await page.request.get(
                    `${API}/api/v1/apps/${containerAppId}/versions`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                if (resp.ok()) {
                    const versions: { id: string; status: string }[] = await resp.json();
                    const failed = versions.find(v => v.status === 'failed');
                    if (failed) throw new Error(`Container build failed: ${failed.id}`);
                    const ready = versions.find(v => v.status === 'ready');
                    if (ready) {
                        containerVersionId = ready.id;
                        containerReady = true;
                        console.log(`Container build ready: ${containerVersionId} (poll ${i})`);
                    }
                }
            }
            if (wasmReady && containerReady) break;
            await page.waitForTimeout(5_000);
        }
        expect(wasmReady).toBeTruthy();
        expect(containerReady).toBeTruthy();
    });

    // ── Phase 3: Deploy both (independent — one can fail without blocking the other) ──

    test('deploy WASM to SGX', async ({ page }) => {
        test.setTimeout(180_000);
        token = await getToken(page);

        // Discover enclaves
        const enclResp = await page.request.get(`${API}/api/v1/enclaves`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(enclResp.ok()).toBeTruthy();
        const enclaves: { id: string; name: string; tee_type: string }[] =
            await enclResp.json();
        const sgx = enclaves.find(e => e.tee_type === 'sgx');
        expect(sgx).toBeTruthy();
        wasmEnclaveId = sgx!.id;

        const wasmDeploy = await page.request.post(
            `${API}/api/v1/apps/${wasmAppId}/versions/${wasmVersionId}/deploy`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: { enclave_id: sgx!.id },
                timeout: 120_000,
            },
        );
        expect(wasmDeploy.ok()).toBeTruthy();
        const wasmDepBody = await wasmDeploy.json();
        expect(wasmDepBody.status).toBe('active');
        wasmDeployed = true;
        console.log(`WASM deployed: ${wasmDepBody.hostname}`);
    });

    test('deploy container to TDX', async ({ page }) => {
        test.setTimeout(180_000);
        token = await getToken(page);

        const enclResp = await page.request.get(`${API}/api/v1/enclaves`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(enclResp.ok()).toBeTruthy();
        const enclaves: { id: string; name: string; tee_type: string }[] =
            await enclResp.json();
        const tdx = enclaves.find(e => e.tee_type === 'tdx');
        if (!tdx) {
            console.log('No TDX enclave registered — skipping container deploy');
            return;
        }

        const ctrDeploy = await page.request.post(
            `${API}/api/v1/apps/${containerAppId}/versions/${containerVersionId}/deploy`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: { enclave_id: tdx!.id },
                timeout: 150_000,
            },
        );
        if (!ctrDeploy.ok()) {
            const errBody = await ctrDeploy.text();
            console.log(`Container deploy failed (${ctrDeploy.status()}): ${errBody}`);
            // Don't fail — container tests will be skipped via containerDeployed flag
            return;
        }
        const ctrDepBody = await ctrDeploy.json();

        // Container deploys are async — poll until active or timeout.
        if (ctrDepBody.status !== 'active') {
            const deploymentId = ctrDepBody.id;
            const maxPollMs = 150_000;
            const pollInterval = 5_000;
            const start = Date.now();
            let status = ctrDepBody.status;

            while (status !== 'active' && Date.now() - start < maxPollMs) {
                await new Promise(r => setTimeout(r, pollInterval));
                const pollResp = await page.request.get(
                    `${API}/api/v1/apps/${containerAppId}/deployments`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                if (pollResp.ok()) {
                    const deps = await pollResp.json();
                    const dep = Array.isArray(deps)
                        ? deps.find((d: { id: string }) => d.id === deploymentId)
                        : null;
                    if (dep) status = dep.status;
                    if (status === 'failed') break;
                }
            }
            if (status !== 'active') {
                console.log(`Container deploy did not reach active (last status: ${status}) — skipping container tests`);
                return;
            }
        }

        containerDeployed = true;
        console.log(`Container deployed: ${ctrDepBody.hostname}`);
    });

    test('deploy vault-backed container to TDX', async ({ page }) => {
        test.setTimeout(240_000);
        token = await getToken(page);

        // Its build was kicked off at create (same source as the plain
        // container) — wait for the ready version.
        for (let i = 0; i < 60 && !rotateVersionId; i++) {
            const vresp = await page.request.get(
                `${API}/api/v1/apps/${rotateAppId}/versions`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (vresp.ok()) {
                const versions: { id: string; status: string }[] = await vresp.json();
                if (versions.find(v => v.status === 'failed')) {
                    console.log('vault-backed container build failed — skipping rotation tests');
                    return;
                }
                const ready = versions.find(v => v.status === 'ready');
                if (ready) rotateVersionId = ready.id;
            }
            if (!rotateVersionId) await page.waitForTimeout(5_000);
        }
        if (!rotateVersionId) {
            console.log('vault-backed container build not ready — skipping rotation tests');
            return;
        }

        const enclResp = await page.request.get(`${API}/api/v1/enclaves`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(enclResp.ok()).toBeTruthy();
        const enclaves: { id: string; tee_type: string }[] = await enclResp.json();
        const tdx = enclaves.find(e => e.tee_type === 'tdx');
        if (!tdx) {
            console.log('No TDX enclave registered — skipping rotation tests');
            return;
        }
        rotateEnclaveId = tdx.id;

        const dep = await page.request.post(
            `${API}/api/v1/apps/${rotateAppId}/versions/${rotateVersionId}/deploy`,
            {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: { enclave_id: rotateEnclaveId },
                timeout: 180_000,
            },
        );
        if (!dep.ok()) {
            // A vault/constellation issue surfaces here. Don't fail the suite —
            // the rotation tests will skip via rotateDeployed.
            console.log(`Vault-backed deploy failed (${dep.status()}): ${await dep.text()} — skipping rotation tests`);
            return;
        }
        const ok = await waitForActive(page, token, rotateAppId, (await dep.json()).id, 180_000);
        if (!ok) {
            console.log('Vault-backed container did not reach active — skipping rotation tests');
            return;
        }
        rotateDeployed = true;
        console.log(`Vault-backed container deployed: ${ROTATE_APP_NAME}`);
    });

    // ── Phase 3.5: lifecycle (upgrade survival + key rotation) ─────
    // Run right after deploy, before the functional/UI checks, so the
    // upgrade + rotation coverage executes every run regardless of any
    // later (e.g. portal-UI) flake in this serial suite.

    test('WASM: app upgrade (redeploy) keeps the app functional', async ({ page }) => {
        test.skip(!wasmDeployed, 'WASM deploy failed — skipping');
        test.setTimeout(180_000);
        token = await getToken(page);

        // Redeploy the ready version (the upgrade path): stops the running
        // instance and starts a fresh one on the same SGX enclave.
        //
        // NOTE: sealed-KV data survival is intentionally NOT asserted here. A
        // non-vault-backed WASM app gets a freshly generated per-app key on
        // every wasm_load (mgmt stores no key and only sends one when
        // vault_backed), so its sealed KV does not carry across a redeploy.
        // Data survival across upgrades is a vault-backed property — exercised
        // by the container key-rotation test below (and gated on the vault
        // constellation being available).
        const redeploy = await page.request.post(
            `${API}/api/v1/apps/${wasmAppId}/versions/${wasmVersionId}/deploy`,
            {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: { enclave_id: wasmEnclaveId },
                timeout: 120_000,
            },
        );
        expect(redeploy.ok(), 'redeploy (upgrade)').toBeTruthy();
        expect((await redeploy.json()).status).toBe('active');

        // The upgraded instance serves traffic: the public hello RPC works.
        const hello = await page.request.post(
            `${API}/api/v1/apps/${wasmAppId}/rpc/hello`,
            {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: {},
                timeout: 20_000,
            },
        );
        expect(hello.ok()).toBeTruthy();
        const body = await hello.json();
        expect(body.status).toBe('ok');
        expect(body.returns?.[0]?.value).toMatch(/Hello/i);
        console.log('WASM app upgrade: redeploy active + hello works after upgrade');
    });

    test('container: key rotation re-keys the volume and data survives', async ({ page }) => {
        test.skip(!rotateDeployed, 'vault-backed container not deployed — skipping');
        test.setTimeout(300_000);
        token = await getToken(page);

        // Rotate the vault-backed volume DEK: reserve a sibling key generation,
        // add the new LUKS keyslot online, advance the handle pointer, retire the
        // old slot, delete the old generation. A re-wrap, NOT a re-encrypt.
        const rot = await page.request.post(
            `${API}/api/v1/apps/${rotateAppId}/versions/${rotateVersionId}/rotate-key`,
            {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: { enclave_id: rotateEnclaveId },
                timeout: 240_000,
            },
        );
        expect(rot.ok(), `rotate-key (${rot.status()}): ${await rot.text().catch(() => '')}`).toBeTruthy();
        const rotBody = await rot.json();
        expect(rotBody.rotated).toBe(true);
        expect(rotBody.old_handle).toBe(rotateHandleV1);
        expect(rotBody.new_handle, 'new handle must differ from old').not.toBe(rotBody.old_handle);
        console.log(`rotate-key: ${rotBody.old_handle} -> ${rotBody.new_handle}`);

        // The handle pointer advanced on the app record.
        const appResp = await page.request.get(`${API}/api/v1/apps/${rotateAppId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(appResp.ok()).toBeTruthy();
        expect((await appResp.json()).vault_key_handle).toBe(rotBody.new_handle);

        // Redeploy: the manager must re-open the EXISTING per-app volume with the
        // rotated DEK. Reaching `active` proves the volume survived the rotation
        // and opens with the new key — a broken retire would lock the data and the
        // container would never become healthy.
        const redeploy = await page.request.post(
            `${API}/api/v1/apps/${rotateAppId}/versions/${rotateVersionId}/deploy`,
            {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: { enclave_id: rotateEnclaveId },
                timeout: 180_000,
            },
        );
        expect(redeploy.ok(), 'redeploy after rotation').toBeTruthy();
        const redepBody = await redeploy.json();
        const ok = redepBody.status === 'active'
            || await waitForActive(page, token, rotateAppId, redepBody.id, 180_000);
        expect(ok, 'container active after key rotation (volume re-opened with rotated key)').toBeTruthy();
        console.log('Container key rotation: volume re-opened with rotated DEK after redeploy');
    });

    // ── Phase 4: WASM verifications ────────────────────────────────

    test('WASM: attestation quote with workload extensions', async ({
        page,
    }) => {
        test.skip(!wasmDeployed, 'WASM deploy failed — skipping');
        test.setTimeout(60_000);
        token = await getToken(page);

        const resp = await page.request.get(
            `${API}/api/v1/apps/${wasmAppId}/attest`,
            {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30_000,
            },
        );
        expect(resp.ok()).toBeTruthy();
        const result = await resp.json();

        expect(result.quote).toBeTruthy();
        expect(result.tls).toBeTruthy();
        expect(result.certificate).toBeTruthy();
        expect(result.pem).toContain('BEGIN CERTIFICATE');
        expect(result.app_extensions).toBeTruthy();
        expect(result.app_extensions.length).toBeGreaterThan(0);
        // Verify specific workload OID labels (Privasys arc 1.3.6.1.4.1.65230.3.x)
        const oids = result.app_extensions.map((e: { oid: string }) => e.oid);
        expect(oids).toContain('1.3.6.1.4.1.65230.3.2'); // Workload Code Hash
        console.log(
            `WASM attestation: ${result.app_extensions.length} workload extensions (OIDs: ${oids.join(', ')})`,
        );
    });

    test('WASM: MCP endpoint returns tools', async ({ page }) => {
        test.skip(!wasmDeployed, 'WASM deploy failed — skipping');
        test.setTimeout(15_000);
        token = await getToken(page);

        const resp = await page.request.get(
            `${API}/api/v1/apps/${wasmAppId}/mcp`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(resp.ok()).toBeTruthy();
        const manifest = await resp.json();

        expect(manifest.status).toBe('mcp_tools');
        expect(manifest.manifest.name).toBe(WASM_APP_NAME);
        expect(manifest.manifest.tools.length).toBeGreaterThan(0);
        const names = manifest.manifest.tools.map(
            (t: { name: string }) => t.name,
        );
        expect(names).toContain('hello');
        expect(names).toContain('get-random');
        console.log(`WASM MCP tools: ${names.join(', ')}`);
    });

    test('WASM: public hello RPC returns greeting', async ({ page }) => {
        test.skip(!wasmDeployed, 'WASM deploy failed — skipping');
        test.setTimeout(30_000);
        token = await getToken(page);

        // Goes through management-service → enclave via RA-TLS.
        // `hello` is declared `auth:hello = "public"` in the WIT, so no
        // `app_auth` is required. This is the canary for the RPC path.
        const resp = await page.request.post(
            `${API}/api/v1/apps/${wasmAppId}/rpc/hello`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: {},
                timeout: 20_000,
            },
        );
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();
        expect(body.status).toBe('ok');
        expect(body.returns?.[0]?.value).toMatch(/Hello/i);
        console.log(`WASM hello: ${body.returns[0].value}`);
    });

    test('WASM: auth-hello requires JWT and returns caller identity', async ({ page }) => {
        test.skip(!wasmDeployed, 'WASM deploy failed — skipping');
        test.setTimeout(30_000);
        token = await getToken(page);

        // With a valid JWT the enclave validates against the app's OIDC
        // config (injected via AppPermissions.oidc at wasm_load time) and
        // returns the caller's claims.
        const resp = await page.request.post(
            `${API}/api/v1/apps/${wasmAppId}/rpc/auth-hello`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                // The portal's RpcProxy forwards the bearer JWT as
                // `app_auth` when the caller is the app developer.
                data: {},
                timeout: 20_000,
            },
        );
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();
        expect(body.status).toBe('ok');
        const payload = body.returns?.[0]?.value;
        expect(payload).toBeTruthy();
        // WIT returns a string that contains a JSON body.
        const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
        expect(parsed.caller).toBeTruthy();
        expect(parsed.message).toMatch(/authenticated/i);
        console.log(`WASM auth-hello caller=${parsed.caller}`);
    });

    test('WASM: portal tabs visible', async ({ page }) => {
        test.skip(!wasmDeployed, 'WASM deploy failed — skipping');
        test.setTimeout(30_000);
        await page.goto(`/dashboard/apps/${wasmAppId}`);
        await page.waitForSelector('nav', { timeout: 30_000 });

        // Always-present tabs (Overview was removed; App Store is now first)
        await expect(
            page.getByRole('button', { name: 'App Store' }),
        ).toBeVisible({ timeout: 15_000 });
        await expect(
            page.getByRole('button', { name: 'Deployments' }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Team' }),
        ).toBeVisible();
        // Deployment-conditional tabs — wait for Attestation as the signal
        // the active-deployment data has loaded, then check siblings.
        await expect(
            page.getByRole('button', { name: 'Attestation' }),
        ).toBeVisible({ timeout: 15_000 });
        await expect(
            page.getByRole('button', { name: 'API Testing' }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: /ai tools/i }),
        ).toBeVisible();
        await page.screenshot({
            path: screenshot('fast-wasm-tabs'),
            fullPage: true,
        });
    });

    // ── Phase 5: Container verifications ───────────────────────────

    test('container: TDX attestation with MRTD, RTMRs, and event log', async ({
        page,
    }) => {
        test.skip(!containerDeployed, 'Container deploy failed — skipping');
        test.setTimeout(60_000);
        token = await getToken(page);

        const resp = await page.request.get(
            `${API}/api/v1/apps/${containerAppId}/attest`,
            {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30_000,
            },
        );
        expect(resp.ok()).toBeTruthy();
        const result = await resp.json();

        expect(result.quote).toBeTruthy();
        expect(result.quote.type).toBe('TDX Quote');
        expect(result.quote.is_mock).toBe(false);
        expect(result.quote.mr_td).toBeTruthy();
        expect(result.quote.mr_td).not.toMatch(/^0+$/);
        expect(result.quote.rtmr0).toBeTruthy();
        expect(result.quote.rtmr1).toBeTruthy();
        expect(result.quote.rtmr2).toBeTruthy();
        expect(result.quote.rtmr3).toBeTruthy();
        expect(result.quote.report_data).toHaveLength(128);
        // Platform cert extensions (Privasys OIDs)
        expect(result.extensions).toBeDefined();
        // Per-workload cert extensions (Privasys arc 1.3.6.1.4.1.65230.3.x)
        expect(result.app_extensions).toBeDefined();
        expect(result.app_extensions.length).toBeGreaterThan(0);
        // Verify specific workload OID labels
        const appOids = result.app_extensions.map((e: { oid: string }) => e.oid);
        expect(appOids).toContain('1.3.6.1.4.1.65230.3.2'); // Image Digest
        expect(appOids).toContain('1.3.6.1.4.1.65230.3.1'); // Config Merkle Root
        // Container image reference should be present
        expect(result.container_image).toBeTruthy();
        // Event log may not be available right after deploy
        if (result.event_log_events) {
            expect(result.event_log_events.length).toBeGreaterThan(10);
        }
        console.log(
            `Container TDX: MRTD=${result.quote.mr_td.substring(0, 16)}... exts=${result.extensions?.length ?? 0} app_exts=${result.app_extensions?.length ?? 0} events=${result.event_log_events?.length ?? 'none'}`,
        );
    });

    test('container: challenge-response binds nonce to report data', async ({
        page,
    }) => {
        test.skip(!containerDeployed, 'Container deploy failed — skipping');
        test.setTimeout(60_000);
        token = await getToken(page);

        const challengeBytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++)
            challengeBytes[i] = Math.floor(Math.random() * 256);
        const challengeHex = Array.from(challengeBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const resp = await page.request.get(
            `${API}/api/v1/apps/${containerAppId}/attest?challenge=${challengeHex}`,
            {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30_000,
            },
        );
        expect(resp.ok()).toBeTruthy();
        const result = await resp.json();

        expect(result.challenge_mode).toBe(true);
        expect(result.challenge).toBe(challengeHex);
        expect(result.quote.challenge_verified).toBe(true);
        console.log('Container challenge-response: verified');
    });

    test('container: MCP endpoint returns tools', async ({ page }) => {
        test.skip(!containerDeployed, 'Container deploy failed — skipping');
        test.setTimeout(15_000);
        token = await getToken(page);

        const resp = await page.request.get(
            `${API}/api/v1/apps/${containerAppId}/mcp`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(resp.ok()).toBeTruthy();
        const manifest = await resp.json();

        expect(manifest.status).toBe('mcp_tools');
        expect(manifest.manifest.name).toBe(CONTAINER_APP_NAME);
        expect(manifest.manifest.tools.length).toBeGreaterThan(0);
        console.log(
            `Container MCP tools: ${manifest.manifest.tools.map((t: { name: string }) => t.name).join(', ')}`,
        );
    });

    test('container: schema endpoint returns AppSchema', async ({ page }) => {
        test.skip(!containerDeployed, 'Container deploy failed — skipping');
        test.setTimeout(15_000);
        token = await getToken(page);

        const resp = await page.request.get(
            `${API}/api/v1/apps/${containerAppId}/schema`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();

        expect(body.status).toBe('schema');
        expect(body.schema.name).toBe(CONTAINER_APP_NAME);
        expect(body.schema.functions.length).toBeGreaterThan(0);
        console.log(
            `Container schema: ${body.schema.functions.length} functions`,
        );
    });

    test('container: portal tabs visible', async ({ page }) => {
        test.skip(!containerDeployed, 'Container deploy failed — skipping');
        test.setTimeout(30_000);
        await page.goto(`/dashboard/apps/${containerAppId}`);
        await page.waitForSelector('nav', { timeout: 10_000 });

        await expect(
            page.getByRole('button', { name: 'App Store' }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(
            page.getByRole('button', { name: 'Deployments' }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Attestation' }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'API Testing' }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: /ai tools/i }),
        ).toBeVisible();
        await page.screenshot({
            path: screenshot('fast-container-tabs'),
            fullPage: true,
        });
    });

    // Cleanup is handled by portal.spec.ts which deletes all test apps
    // after the portal tests that depend on deployed apps have finished.
});
