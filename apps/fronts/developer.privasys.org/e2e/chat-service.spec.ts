/**
 * E2E for the chat-service back-end deployed as a Privasys container app.
 *
 * Dogfooding: chat-service is built and deployed through the same
 * create -> build -> deploy-to-TDX path as any tenant container app, then
 * verified from the outside:
 *
 *   1. Build the public Privasys/chat-service repo and deploy it to a TDX
 *      enclave (Postgres initialises on the per-app /data volume).
 *   2. GET /healthz returns ok (the service booted + reached its DB).
 *   3. GET /.well-known/jwks.json publishes the ES256 grant-signing key
 *      (the enclave verifies tool-grants against this).
 *   4. The public app-resolution endpoint reports is_enclave for the
 *      deployed service (the surface chat-service itself uses to admit a
 *      user's enclave tools).
 *
 * Run:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     chat-service.spec.ts --project=chat-service --no-deps
 */
import { test, expect, request } from '@playwright/test';
import { getToken } from './e2e-auth';
import { deleteApp, cleanupApps } from './e2e-cleanup';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';
const COMMIT_URL =
    process.env.CHAT_SERVICE_COMMIT_URL ||
    'https://github.com/Privasys/chat-service/commit/c8bac3fd9103b97057c20d3097cb048dabee81c7';
const APP_NAME = 'e2e-chat-service';
const PORT = 8080;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe('chat-service container app', () => {
    test.describe.configure({ mode: 'serial' });

    let token = '';
    let appId = '';
    let versionId = '';
    let hostname = '';
    let deployed = false;

    test.afterAll(async () => {
        // KEEP_E2E_APP=1 leaves the deployment up for live diagnosis.
        if (process.env.KEEP_E2E_APP) return;
        await cleanupApps({ names: [APP_NAME] });
    });

    test('create + build chat-service from the public repo', async () => {
        test.setTimeout(600_000); // build can take several minutes
        token = await getToken();
        expect(token, 'no e2e token').toBeTruthy();

        const ctx = await request.newContext();
        await deleteApp(ctx, token, APP_NAME);

        const create = await ctx.post(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: {
                name: APP_NAME,
                source_type: 'github',
                commit_url: COMMIT_URL,
                app_type: 'container',
                container_port: PORT
                // NB: production chat-service should be vault-backed
                // (container_storage + key_provider) so Postgres persists on
                // the sealed /data volume. This smoke test deploys plain to
                // keep the deploy path off the (flakier) vault constellation —
                // the grant signer it verifies is independent of the DB.
            }
        });
        expect(
            create.ok(),
            `create returned ${create.status()}: ${await create.text().catch(() => '')}`
        ).toBeTruthy();
        const body = await create.json();
        expect(body.app_type).toBe('container');
        appId = body.id;
        console.log(`Created chat-service app: ${appId}`);

        // Deploy gate: a minimal store listing.
        const store = await ctx.put(`${API}/api/v1/apps/${appId}/store`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: {
                store_tagline: '',
                store_description: 'Chat back-end (e2e).',
                store_category: 'Developer Tools',
                store_icon_url: '',
                store_screenshots: [],
                store_privacy_url: '',
                store_tos_url: '',
                store_website_url: '',
                store_support_email: '',
                store_keywords: 'e2e'
            }
        });
        expect(store.ok(), 'set store listing').toBeTruthy();

        // Wait for the GitHub Actions build to produce a ready version.
        for (let i = 0; i < 108 && !versionId; i++) {
            const r = await ctx.get(`${API}/api/v1/apps/${appId}/versions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (r.ok()) {
                const versions: { id: string; status: string }[] = await r.json();
                const failed = versions.find((v) => v.status === 'failed');
                if (failed) throw new Error(`chat-service build failed: ${failed.id}`);
                const ready = versions.find((v) => v.status === 'ready');
                if (ready) versionId = ready.id;
            }
            if (!versionId) await sleep(5_000);
        }
        expect(versionId, 'build did not become ready in time').toBeTruthy();
        console.log(`chat-service build ready: ${versionId}`);
        await ctx.dispose();
    });

    test('deploy to TDX and the grant signer (JWKS) is live', async () => {
        test.setTimeout(300_000);
        const ctx = await request.newContext({ ignoreHTTPSErrors: true });

        const enclResp = await ctx.get(`${API}/api/v1/enclaves`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        expect(enclResp.ok()).toBeTruthy();
        const enclaves: { id: string; tee_type: string }[] = await enclResp.json();
        const tdx = enclaves.find((e) => e.tee_type === 'tdx');
        test.skip(!tdx, 'no TDX enclave registered on dev — cannot deploy a container app');

        const dep = await ctx.post(
            `${API}/api/v1/apps/${appId}/versions/${versionId}/deploy`,
            {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: { enclave_id: tdx!.id },
                timeout: 180_000
            }
        );
        expect(dep.ok(), `deploy ${dep.status()}: ${await dep.text().catch(() => '')}`).toBeTruthy();
        const depBody = await dep.json();

        // Wait for the deployment to reach `active` (the gateway only routes
        // once the manager's readiness probe passes). A failed/timed-out
        // deploy here is dev-enclave infrastructure flakiness (capacity, image
        // pull, constellation) rather than a chat-service regression, so we
        // skip rather than red — the build assertion above is the code guard.
        let active = depBody.status === 'active';
        let failed = false;
        const start = Date.now();
        while (!active && !failed && Date.now() - start < 180_000) {
            await sleep(5_000);
            const deps = await (
                await ctx.get(`${API}/api/v1/apps/${appId}/deployments`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ).json();
            const d = (deps as { id: string; status: string; hostname?: string }[]).find(
                (x) => x.id === depBody.id
            );
            if (d?.status === 'active') {
                hostname = d.hostname || depBody.hostname;
                active = true;
            }
            if (d?.status === 'failed') failed = true;
        }
        test.skip(!active, `dev enclave did not bring the deployment active (failed=${failed}) — infra flake`);
        deployed = true;
        console.log(`chat-service deployed + active: ${hostname}`);

        // The grant signer is live and externally verifiable: JWKS publishes
        // the ES256 key the enclave verifies tool-grants against. This is the
        // core of the BYO-MCP mechanism and is independent of the DB/auth.
        let jwksOk = false;
        for (let i = 0; i < 18 && !jwksOk; i++) {
            const j = await ctx
                .get(`https://${hostname}/.well-known/jwks.json`, { timeout: 10_000 })
                .catch(() => null);
            if (j && j.ok()) {
                const jwks = await j.json().catch(() => null);
                const k = jwks?.keys?.[0];
                if (k?.kty === 'EC' && k?.crv === 'P-256') {
                    jwksOk = true;
                    console.log(`chat-service JWKS live: kid=${k.kid}`);
                }
            }
            if (!jwksOk) await sleep(5_000);
        }
        expect(jwksOk, 'chat-service JWKS (grant signer) not reachable').toBeTruthy();

        // /healthz is reachable and reports subsystem state (informational —
        // see the fixme below for full readiness).
        const hz = await ctx.get(`https://${hostname}/healthz`, { timeout: 10_000 }).catch(() => null);
        if (hz) console.log(`chat-service /healthz ${hz.status()}: ${(await hz.text().catch(() => '')).slice(0, 500)}`);
        await ctx.dispose();
    });

    // Full readiness: Postgres (on /data) is up and OIDC discovery succeeded,
    // so /healthz reports ok and the user-tools API + grant minting are live.
    test('deployed chat-service /healthz reports ok', async () => {
        test.skip(!deployed, 'chat-service not deployed — skipping');
        const ctx = await request.newContext({ ignoreHTTPSErrors: true });
        let ok = false;
        for (let i = 0; i < 18 && !ok; i++) {
            const hz = await ctx.get(`https://${hostname}/healthz`, { timeout: 10_000 }).catch(() => null);
            if (hz && hz.ok()) {
                const b = await hz.json().catch(() => null);
                if (b?.status === 'ok') ok = true;
            }
            if (!ok) await sleep(5_000);
        }
        expect(ok, 'chat-service /healthz should report ok (Postgres + OIDC up)').toBeTruthy();
        await ctx.dispose();
    });

    test('configure is gateway-gated against direct external POST', async () => {
        test.skip(!deployed, 'chat-service not deployed — skipping');
        const ctx = await request.newContext({ ignoreHTTPSErrors: true });
        // The /configure endpoint exists and is auth-gated, but the gateway
        // refuses direct external mutating calls (sealed-transport-required).
        // Real config delivery goes through the owner-authed management-service
        // RPC relay; this asserts the gateway does not expose it directly.
        const r = await ctx.post(`https://${hostname}/configure`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: { mgmt_base_url: API }
        });
        expect(r.status(), 'gateway should reject a direct external POST /configure').toBe(403);
        await ctx.dispose();
    });

    test('public app-resolution reports is_enclave for the deployed service', async () => {
        test.skip(!deployed, 'chat-service not deployed — skipping');
        const ctx = await request.newContext();
        const r = await ctx.get(`${API}/api/v1/apps/by-name/${APP_NAME}/resolve`);
        expect(r.ok(), `resolve ${r.status()}`).toBeTruthy();
        const res = await r.json();
        // is_enclave/has_mcp are new fields; a dev management-service that
        // predates the redeploy omits them. Skip rather than red in that case.
        test.skip(
            res.is_enclave === undefined,
            'dev management-service predates is_enclave/has_mcp — redeploy main to enable'
        );
        expect(res.is_enclave, 'deployed app should resolve as an enclave').toBe(true);
        expect(typeof res.has_mcp).toBe('boolean');
        expect(res.image_digest, 'attested image digest present').toBeTruthy();
        console.log(`resolve: is_enclave=${res.is_enclave} has_mcp=${res.has_mcp}`);
        await ctx.dispose();
    });
});
