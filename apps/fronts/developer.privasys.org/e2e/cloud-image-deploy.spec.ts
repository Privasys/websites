/**
 * Cloud-optimised image deploy — e2e test.
 *
 * This is the deployment path used for the public confidential-ai
 * service: the container image is pre-baked into a GCE persistent
 * disk by an operator-side publish script and surfaced to
 * the portal via `GET /api/v1/cached-images`. Each enclave VM
 * (e.g. `ai-gpu`) attaches and mounts the cached disk, then containerd
 * imports the OCI layout from disk — no public ghcr.io pull, no cold
 * 6 GiB download per VM.
 *
 * The test exercises the full happy path that the user runs from the UI:
 *
 *   1. POST /api/v1/apps  source_type=cloud_image
 *   2. wait for a ready version
 *   3. POST /api/v1/apps/{id}/versions/{vid}/deploy with { enclave_id }
 *      (env vars are no longer accepted; configuration is delivered to the
 *      app in-process via the declared config_api endpoint)
 *   4. poll deployments until status=active   (≤ 10 min tolerance)
 *
 * Per-deployment runtime configuration & OID-tagged attestation extensions:
 *   apps now declare `config_api` (method+path) in privasys.json or the
 *   container LABEL, and the manager forwards the first POST to that path
 *   in-process; the app then registers attestation extensions under sub-arc
 *   1.3.6.1.4.1.65230.3.5.* via the `setAttestationExtension` SDK call.
 *   The end-to-end OID flow is covered by an integration test in the
 *   confidential-ai repo (which owns the in-app SDK use), not here.
 *
 * Adding a new VM (e.g. ai-gpu-2):
 *   - Provision via cvm-images and let it auto-register.
 *   - Publish the disk to its zone via the operator publish script.
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
const ENCLAVE_MATCH = process.env.E2E_ENCLAVE_NAME || 'm2-dev-ai';
const CLOUD_IMAGE_NAME = process.env.E2E_CLOUD_IMAGE_NAME || 'confidential-ai';
const CLOUD_IMAGE_CHANNEL = process.env.E2E_CLOUD_IMAGE_CHANNEL || 'prod';
const CONTAINER_PORT = 8080;

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

    test('deploy version to enclave', async ({ page }) => {
        test.setTimeout(180_000);
        token = await getToken(page);

        const resp = await page.request.post(
            `${API}/api/v1/apps/${appId}/versions/${versionId}/deploy`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: { enclave_id: enclaveId },
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

    test.skip('attestation exposes per-env-var OID extension', async ({ page: _page }) => {
        // Per-env-var OID extensions were removed when env vars were dropped
        // from the deploy API. Apps now register attestation extensions via
        // the SDK's `setAttestationExtension(oid, value)` call (sub-arc
        // 1.3.6.1.4.1.65230.3.5.*); coverage for that flow lives with the
        // app that uses it (see confidential-ai integration tests). The
        // legacy block below is preserved in git history for reference.
        return;
    });

    test('cleanup', async ({ page }) => {
        test.setTimeout(120_000);
        token = await getToken(page);
        await deleteApp(page, token, APP_NAME);
    });
});
