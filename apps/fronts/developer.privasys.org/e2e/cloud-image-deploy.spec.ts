/**
 * Cloud-optimised image deploy — e2e test.
 *
 * This is the deployment path used for the public confidential-ai
 * service: the container image is pre-baked into a GCE persistent
 * disk by `.operations/scripts/publish-image-disk.sh` and surfaced to
 * the portal via `GET /api/v1/cached-images`. Each enclave VM
 * (e.g. `ai-gpu`) attaches and mounts the cached disk, then containerd
 * imports the OCI layout from disk — no public ghcr.io pull, no cold
 * 6 GiB download per VM.
 *
 * The test exercises the full happy path that the user runs from the UI:
 *
 *   1. POST /api/v1/apps  source_type=cloud_image
 *   2. wait for a ready version
 *   3. POST /api/v1/apps/{id}/versions/{vid}/deploy with
 *        runtime_env      MCP_SERVERS=...
 *        runtime_env_meta MCP_SERVERS={oid:"1"}
 *   4. poll deployments until status=active   (≤ 10 min tolerance)
 *   5. GET /api/v1/apps/{id}/attest  → expect app_extensions
 *      to include the per-env-var OID 1.3.6.1.4.1.65230.3.5.1
 *      with value = the raw value bytes (secret=false in this test).
 *
 * Future variants:
 *   - secret=true (value = SHA-256(value))
 *   - additional OIDs ...3.5.2, ...3.5.3
 *   - GPU-bound model load on top of confidential-ai
 *
 * Adding a new VM (e.g. ai-gpu-2):
 *   - Provision via cvm-images/.operations and let it auto-register.
 *   - Publish the disk to its zone:
 *       .operations/scripts/publish-image-disk.sh confidential-ai prod \
 *           --zone <zone> --source ghcr.io/privasys/confidential-ai:<tag>
 *   - Set E2E_ENCLAVE_NAME=<vm-name> and re-run this test.
 *
 * Run:
 *   cd websites
 *   E2E_USER_EMAIL=alice@privasys.org E2E_USER_PASSWORD='EnqMS75!;%P?vaY@' \
 *     npx playwright test \
 *       --config=apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *       --project=cloud-image
 */
import { test, expect, type Page } from '@playwright/test';
import { setupAuth, getToken as getE2eToken } from './e2e-auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

const APP_NAME = process.env.E2E_APP_NAME || 'e2e-cloud-ai';
const ENCLAVE_MATCH = process.env.E2E_ENCLAVE_NAME || 'ai-gpu';
const CLOUD_IMAGE_NAME = process.env.E2E_CLOUD_IMAGE_NAME || 'confidential-ai';
const CLOUD_IMAGE_CHANNEL = process.env.E2E_CLOUD_IMAGE_CHANNEL || 'prod';
const CONTAINER_PORT = 8080;

// Per-env-var attestation under sub-arc 1.3.6.1.4.1.65230.3.5.*
// MCP_SERVERS is non-secret, so the extension carries the raw value.
const TEST_ENV_KEY = 'MCP_SERVERS';
const TEST_ENV_VALUE =
    'lightpanda=https://container-app-lightpanda.apps-test.privasys.org,' +
    'rag=https://private-rag-demo.apps-test.privasys.org?bearer=1';
const TEST_ENV_SUBARC = '1';
const EXPECTED_OID = `1.3.6.1.4.1.65230.3.5.${TEST_ENV_SUBARC}`;

let token: string;
let appId: string;
let versionId: string;
let enclaveId: string;

async function getToken(page: Page): Promise<string> {
    if (token) return token;
    await setupAuth(page);
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    token = await getE2eToken();
    expect(token).toBeTruthy();
    return token;
}

async function deleteApp(page: Page, tok: string, name: string) {
    const resp = await page.request.get(`${API}/api/v1/apps`, {
        headers: { Authorization: `Bearer ${tok}` },
    });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    const app = apps.find((a) => a.name === name);
    if (!app) return;

    const depsResp = await page.request.get(
        `${API}/api/v1/apps/${app.id}/deployments`,
        { headers: { Authorization: `Bearer ${tok}` } },
    );
    if (depsResp.ok()) {
        const deps: { id: string; status: string }[] = await depsResp.json();
        for (const dep of deps.filter((d) => d.status === 'active' || d.status === 'starting' || d.status === 'deploying')) {
            await page.request.post(
                `${API}/api/v1/apps/${app.id}/deployments/${dep.id}/stop`,
                { headers: { Authorization: `Bearer ${tok}` }, timeout: 30_000 },
            ).catch(() => undefined);
        }
        if (deps.some((d) => d.status === 'active')) {
            await page.waitForTimeout(15_000);
        }
    }
    await page.request.delete(`${API}/api/v1/apps/${app.id}`, {
        headers: { Authorization: `Bearer ${tok}` },
        timeout: 30_000,
    }).catch(() => undefined);
    await page.waitForTimeout(15_000);
    console.log(`Cleaned up ${name} (${app.id})`);
}

test.describe('Cloud-image deploy', () => {
    test.describe.configure({ mode: 'serial' });

    test('cleanup previous run', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        await deleteApp(page, token, APP_NAME);
    });

    test('cached image is registered', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);
        const resp = await page.request.get(`${API}/api/v1/cached-images`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(resp.ok(), `cached-images: HTTP ${resp.status()}`).toBeTruthy();
        const images: { name: string; channel: string; zone: string; disk_name: string }[] = await resp.json();
        const matches = images.filter(
            (i) => i.name === CLOUD_IMAGE_NAME && i.channel === CLOUD_IMAGE_CHANNEL,
        );
        console.log(`Cached images for ${CLOUD_IMAGE_NAME}/${CLOUD_IMAGE_CHANNEL}:`,
            matches.map((m) => `${m.zone}=${m.disk_name}`));
        expect(matches.length, `no cached image registered for ${CLOUD_IMAGE_NAME}/${CLOUD_IMAGE_CHANNEL}`)
            .toBeGreaterThan(0);
    });

    test('target enclave is active', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);
        const resp = await page.request.get(`${API}/api/v1/enclaves`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(resp.ok()).toBeTruthy();
        const enclaves: { id: string; name: string; status: string; zone?: string }[] = await resp.json();
        const tdx = enclaves.find((e) => e.name.includes(ENCLAVE_MATCH) && e.status === 'active');
        if (!tdx) {
            console.log('Available enclaves:', enclaves.map((e) => `${e.name} (${e.status}, zone=${e.zone ?? '-'})`));
        }
        expect(tdx, `${ENCLAVE_MATCH} enclave not found or not active`).toBeTruthy();
        enclaveId = tdx!.id;
        console.log(`Target enclave: ${tdx!.name} (${enclaveId}, zone=${tdx!.zone ?? '-'})`);
    });

    test('create cloud_image app', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);

        const resp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: APP_NAME,
                app_type: 'container',
                source_type: 'cloud_image',
                cloud_image_name: CLOUD_IMAGE_NAME,
                cloud_image_channel: CLOUD_IMAGE_CHANNEL,
                container_port: CONTAINER_PORT,
                container_devices: [
                    '/dev/nvidia0',
                    '/dev/nvidiactl',
                    '/dev/nvidia-uvm',
                    '/dev/nvidia-uvm-tools',
                ],
            },
        });
        const body = await resp.json();
        expect(resp.ok(), `create: ${JSON.stringify(body)}`).toBeTruthy();
        expect(body.app_type).toBe('container');
        expect(body.source_type).toBe('cloud_image');
        expect(body.cloud_image_name).toBe(CLOUD_IMAGE_NAME);
        appId = body.id;
        console.log(`Created ${APP_NAME} (${appId})`);
    });

    test('version is ready', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);

        // cloud_image apps are auto-built (registered version) – usually ready immediately.
        for (let i = 0; i < 30; i++) {
            const resp = await page.request.get(`${API}/api/v1/apps/${appId}/versions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            expect(resp.ok()).toBeTruthy();
            const versions: { id: string; status: string; version_number: number }[] = await resp.json();
            const ready = versions.find((v) => v.status === 'ready' || v.status === 'built');
            if (ready) {
                versionId = ready.id;
                console.log(`Version ready: v${ready.version_number} (${versionId})`);
                return;
            }
            console.log(`Poll ${i + 1}/30: versions=${versions.map((v) => v.status).join(',')}`);
            await page.waitForTimeout(2_000);
        }
        expect(false, 'no ready version').toBeTruthy();
    });

    test('deploy with runtime_env_meta (OID assigned)', async ({ page }) => {
        test.setTimeout(180_000);
        token = await getToken(page);

        const resp = await page.request.post(
            `${API}/api/v1/apps/${appId}/versions/${versionId}/deploy`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    enclave_id: enclaveId,
                    runtime_env: { [TEST_ENV_KEY]: TEST_ENV_VALUE },
                    runtime_env_meta: {
                        [TEST_ENV_KEY]: { secret: false, oid: TEST_ENV_SUBARC },
                    },
                },
                timeout: 150_000,
            },
        );
        const txt = await resp.text();
        console.log(`deploy HTTP ${resp.status()}: ${txt.substring(0, 400)}`);
        expect(resp.ok(), `deploy failed: ${txt}`).toBeTruthy();
    });

    test('deployment becomes active', async ({ page }) => {
        // Allow up to 10 minutes for first-time disk attach + manager load.
        test.setTimeout(12 * 60_000);
        token = await getToken(page);

        let last: string[] = [];
        let active: { id: string; status: string; hostname: string } | undefined;
        for (let i = 0; i < 240; i++) {
            const resp = await page.request.get(
                `${API}/api/v1/apps/${appId}/deployments`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            expect(resp.ok()).toBeTruthy();
            const deps: { id: string; status: string; hostname: string }[] = await resp.json();
            last = deps.map((d) => `${d.status}`);

            active = deps.find((d) => d.status === 'active');
            if (active) {
                console.log(`Active: ${active.hostname} (${active.id})`);
                break;
            }
            const failed = deps.find((d) => d.status === 'failed');
            if (failed) {
                expect(false, `deployment ${failed.id} entered failed state`).toBeTruthy();
            }
            if (i % 6 === 0) {
                console.log(`Poll ${i + 1}/240: statuses=${last.join(',')}`);
            }
            await page.waitForTimeout(5_000);
        }
        expect(active, `no active deployment; last statuses=${last.join(',')}`).toBeTruthy();
    });

    test('attestation exposes per-env-var OID extension', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);

        // Caddy needs a beat after activation to issue the per-workload cert
        // with the freshly-written extension file.
        for (let i = 0; i < 12; i++) {
            const resp = await page.request.get(`${API}/api/v1/apps/${appId}/attest`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30_000,
            });
            if (!resp.ok()) {
                console.log(`attest poll ${i + 1}/12: HTTP ${resp.status()}`);
                await page.waitForTimeout(5_000);
                continue;
            }
            const result: {
                app_extensions?: { oid: string; value_hex: string; label?: string }[];
            } = await resp.json();
            const exts = result.app_extensions ?? [];
            const oids = exts.map((e) => e.oid);
            console.log(`attest poll ${i + 1}/12: app_extensions oids=${oids.join(',')}`);

            const match = exts.find((e) => e.oid === EXPECTED_OID);
            if (match) {
                // For secret=false the extension carries raw UTF-8 of the value.
                const expectedHex = Buffer.from(TEST_ENV_VALUE, 'utf8').toString('hex');
                console.log(`expected_hex(${expectedHex.length / 2} bytes)=${expectedHex.substring(0, 64)}…`);
                console.log(`actual_hex  (${match.value_hex.length / 2} bytes)=${match.value_hex.substring(0, 64)}…`);
                expect(match.value_hex.toLowerCase()).toBe(expectedHex.toLowerCase());
                return;
            }
            await page.waitForTimeout(5_000);
        }
        expect(false, `extension ${EXPECTED_OID} not found in app_extensions`).toBeTruthy();
    });

    test('cleanup', async ({ page }) => {
        test.setTimeout(120_000);
        token = await getToken(page);
        await deleteApp(page, token, APP_NAME);
    });
});
