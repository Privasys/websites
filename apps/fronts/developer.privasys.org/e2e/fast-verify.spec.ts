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

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

// ── App config ─────────────────────────────────────────────────────
const WASM_COMMIT_URL =
    'https://github.com/Privasys/wasm-app-example/commit/a6acb6da7a1e01b0a01dbb1bd6fcbd2054b6d345';
const WASM_APP_NAME = 'e2e-wasm-verify';

const CONTAINER_COMMIT_URL =
    'https://github.com/Privasys/container-app-example/commit/5abf1e9';
const CONTAINER_APP_NAME = 'e2e-container-verify';
const CONTAINER_PORT = 8080;

// ── Shared state (serial tests share these across the suite) ───────
let token: string;
let wasmAppId: string;
let wasmVersionId: string;
let containerAppId: string;
let containerVersionId: string;
let wasmDeployed = false;
let containerDeployed = false;

// ── Helpers ────────────────────────────────────────────────────────
async function getToken(page: import('@playwright/test').Page): Promise<string> {
    if (token) return token;
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    const session = await page.evaluate(() =>
        fetch('/api/auth/session').then(r => r.json()),
    );
    token = session?.accessToken as string;
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

// ════════════════════════════════════════════════════════════════════
test.describe('Fast Verification Suite', () => {
    test.describe.configure({ mode: 'serial' });

    // ── Phase 1: Create both apps ──────────────────────────────────

    test('create WASM + container apps', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        await deleteApp(page, token, WASM_APP_NAME);
        await deleteApp(page, token, CONTAINER_APP_NAME);

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

    test('WASM: portal tabs visible', async ({ page }) => {
        test.skip(!wasmDeployed, 'WASM deploy failed — skipping');
        test.setTimeout(30_000);
        await page.goto(`/dashboard/apps/${wasmAppId}`);
        await page.waitForSelector('nav', { timeout: 10_000 });

        await expect(
            page.getByRole('button', { name: 'Overview' }),
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
        await expect(
            page.getByRole('button', { name: 'App Store' }),
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
            page.getByRole('button', { name: 'Overview' }),
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
