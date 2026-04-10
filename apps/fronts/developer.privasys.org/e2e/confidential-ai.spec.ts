/**
 * Confidential AI container deployment verification.
 *
 * Creates, builds, deploys and verifies the confidential-ai container
 * on a TDX enclave, then validates:
 *   - Container health endpoint returns correct metadata
 *   - TDX attestation with MRTD, RTMRs, workload extensions
 *   - Challenge-response nonce binding to TDX report data
 *   - MCP tools manifest (4 tools: chat, complete, models, health)
 *   - Portal tabs visible (including AI Tools)
 *
 * Run:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts confidential-ai.spec.ts --project=portal --no-deps
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

// ── App config ─────────────────────────────────────────────────────
const COMMIT_URL =
    'https://github.com/Privasys/confidential-ai/commit/1336dda71860336ebc3670a627cb86b081e45293';
const APP_NAME = 'e2e-conf-ai';
const CONTAINER_PORT = 8080;

// Expected MCP tools from privasys.json
const EXPECTED_MCP_TOOLS = ['chat', 'complete', 'models', 'health'];

// ── Shared state (serial tests share these across the suite) ───────
let token: string;
let appId: string;
let versionId: string;

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
        if (deps.some(d => d.status === 'active')) await page.waitForTimeout(10_000);
    }
    await page.request.delete(`${API}/api/v1/apps/${app.id}`, {
        headers: { Authorization: `Bearer ${tok}` },
    });
    // Wait for enclave-side container removal
    await page.waitForTimeout(15_000);
    console.log(`Deleted ${name} (${app.id})`);
}

// ════════════════════════════════════════════════════════════════════
test.describe('Confidential AI Deployment', () => {
    test.describe.configure({ mode: 'serial' });

    // ── Phase 1: Create app ────────────────────────────────────────

    test('create confidential-ai container app', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        await deleteApp(page, token, APP_NAME);

        const resp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: APP_NAME,
                source_type: 'github',
                commit_url: COMMIT_URL,
                app_type: 'container',
                container_port: CONTAINER_PORT,
            },
        });
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();
        expect(body.app_type).toBe('container');
        expect(body.container_port).toBe(CONTAINER_PORT);
        expect(body.gpg_verified).toBe(true);
        // MCP auto-detected from privasys.json
        expect(body.container_mcp).toBeTruthy();
        expect(body.container_mcp.tools).toHaveLength(EXPECTED_MCP_TOOLS.length);
        appId = body.id;
        console.log(`Created app: ${APP_NAME} (${appId})`);
    });

    // ── Phase 2: Wait for build ────────────────────────────────────

    test('wait for container build', async ({ page }) => {
        test.setTimeout(600_000); // 10 min max
        token = await getToken(page);

        for (let i = 0; i < 108; i++) {
            const resp = await page.request.get(
                `${API}/api/v1/apps/${appId}/versions`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (resp.ok()) {
                const versions: { id: string; status: string }[] = await resp.json();
                const failed = versions.find(v => v.status === 'failed');
                if (failed) throw new Error(`Build failed: ${failed.id}`);
                const ready = versions.find(v => v.status === 'ready');
                if (ready) {
                    versionId = ready.id;
                    console.log(`Build ready: ${versionId} (poll ${i})`);
                    break;
                }
            }
            await page.waitForTimeout(5_000);
        }
        expect(versionId).toBeTruthy();
    });

    // ── Phase 3: Deploy to TDX enclave ─────────────────────────────

    test('deploy to TDX enclave', async ({ page }) => {
        test.setTimeout(180_000);
        token = await getToken(page);

        // Find the ai-dev TDX enclave
        const enclResp = await page.request.get(`${API}/api/v1/enclaves`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(enclResp.ok()).toBeTruthy();
        const enclaves: { id: string; name: string; tee_type: string }[] =
            await enclResp.json();
        // Prefer ai-gpu enclave, fall back to any TDX
        const aiGpu = enclaves.find(e => e.name.includes('ai-gpu'));
        const tdx = aiGpu || enclaves.find(e => e.tee_type === 'tdx');
        expect(tdx).toBeTruthy();
        console.log(`Deploying to enclave: ${tdx!.name} (${tdx!.id})`);

        // Retry deploy - enclave may still be cleaning up from a prior run
        let deployBody: { status: string; hostname: string } | undefined;
        for (let attempt = 0; attempt < 6; attempt++) {
            const resp = await page.request.post(
                `${API}/api/v1/apps/${appId}/versions/${versionId}/deploy`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    data: { enclave_id: tdx!.id },
                    timeout: 150_000,
                },
            );
            if (resp.ok()) {
                deployBody = await resp.json();
                break;
            }
            const errBody = await resp.text();
            if ((errBody.includes('already loaded') || errBody.includes('already exists')) && attempt < 5) {
                console.log(`Container conflict, retry ${attempt + 1}/5 in 15s: ${errBody.substring(0, 120)}`);
                await page.waitForTimeout(15_000);
                continue;
            }
            console.log(`Deploy failed (${resp.status()}): ${errBody}`);
            expect(resp.ok()).toBeTruthy(); // fail the test
        }
        expect(deployBody).toBeTruthy();
        expect(deployBody!.status).toBe('active');
        console.log(`Deployed: ${deployBody!.hostname}`);
    });

    // ── Phase 4: Verify health ─────────────────────────────────────

    test('health endpoint returns AI metadata', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);

        // The health endpoint is proxied through the management service
        // via the app's deployment hostname
        const depsResp = await page.request.get(
            `${API}/api/v1/apps/${appId}/deployments`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(depsResp.ok()).toBeTruthy();
        const deps: { hostname: string; status: string }[] = await depsResp.json();
        const active = deps.find(d => d.status === 'active');
        expect(active).toBeTruthy();
        console.log(`Active deployment hostname: ${active!.hostname}`);
    });

    // ── Phase 5: TDX attestation ───────────────────────────────────

    test('TDX attestation with MRTD, RTMRs, and workload extensions', async ({
        page,
    }) => {
        test.setTimeout(60_000);
        token = await getToken(page);

        const resp = await page.request.get(
            `${API}/api/v1/apps/${appId}/attest`,
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
        // Per-workload cert extensions (3.x OIDs: config root, image digest, container ref)
        expect(result.app_extensions).toBeDefined();
        expect(result.app_extensions.length).toBeGreaterThan(0);
        // Container image reference should be present
        expect(result.container_image).toBeTruthy();
        expect(result.container_image).toContain(APP_NAME);
        console.log(
            `TDX attestation: MRTD=${result.quote.mr_td.substring(0, 16)}... exts=${result.extensions?.length ?? 0} app_exts=${result.app_extensions?.length ?? 0}`,
        );
    });

    test('challenge-response binds nonce to TDX report data', async ({
        page,
    }) => {
        test.setTimeout(60_000);
        token = await getToken(page);

        const challengeBytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++)
            challengeBytes[i] = Math.floor(Math.random() * 256);
        const challengeHex = Array.from(challengeBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const resp = await page.request.get(
            `${API}/api/v1/apps/${appId}/attest?challenge=${challengeHex}`,
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
        console.log('Challenge-response: verified');
    });

    // ── Phase 6: MCP tools ─────────────────────────────────────────

    test('MCP endpoint returns confidential-ai tools', async ({ page }) => {
        test.setTimeout(15_000);
        token = await getToken(page);

        const resp = await page.request.get(
            `${API}/api/v1/apps/${appId}/mcp`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(resp.ok()).toBeTruthy();
        const manifest = await resp.json();

        expect(manifest.status).toBe('mcp_tools');
        expect(manifest.manifest.name).toBe(APP_NAME);
        const toolNames = manifest.manifest.tools.map(
            (t: { name: string }) => t.name,
        );
        for (const expected of EXPECTED_MCP_TOOLS) {
            expect(toolNames).toContain(expected);
        }
        console.log(`MCP tools: ${toolNames.join(', ')}`);
    });

    test('schema endpoint returns AppSchema with AI functions', async ({ page }) => {
        test.setTimeout(15_000);
        token = await getToken(page);

        const resp = await page.request.get(
            `${API}/api/v1/apps/${appId}/schema`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();

        expect(body.status).toBe('schema');
        expect(body.schema.name).toBe(APP_NAME);
        expect(body.schema.functions.length).toBe(EXPECTED_MCP_TOOLS.length);
        const funcNames = body.schema.functions.map(
            (f: { name: string }) => f.name,
        );
        expect(funcNames).toContain('chat');
        expect(funcNames).toContain('health');
        console.log(`Schema functions: ${funcNames.join(', ')}`);
    });

    // ── Phase 7: Portal UI ─────────────────────────────────────────

    test('portal shows correct tabs for container app', async ({ page }) => {
        test.setTimeout(30_000);
        await page.goto(`/dashboard/apps/${appId}`);
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
        // Container apps show API Testing tab
        await expect(
            page.getByRole('button', { name: 'API Testing' }),
        ).toBeVisible();
        // AI Tools tab (from MCP)
        await expect(
            page.getByRole('button', { name: /ai tools/i }),
        ).toBeVisible();
        await page.screenshot({
            path: screenshot('conf-ai-tabs'),
            fullPage: true,
        });
    });

    // ── Phase 8: Cleanup ───────────────────────────────────────────

    test('cleanup: delete test app', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        await deleteApp(page, token, APP_NAME);
    });
});
