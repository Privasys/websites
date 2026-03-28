import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

const TEST_APP_NAME = 'e2e-container-test';
const TEST_COMMIT_URL = 'https://github.com/Privasys/container-app-example/commit/04a44ffc9068a8600a69b7791bde8fd970362502';
const TEST_CONTAINER_PORT = 8080;

/** Helper: get the access token from the authenticated portal session. */
async function getToken(page: import('@playwright/test').Page): Promise<string> {
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    const session = await page.evaluate(() => fetch('/api/auth/session').then(r => r.json()));
    const token = session?.accessToken as string;
    expect(token).toBeTruthy();
    return token;
}

/** Helper: delete app by name if it exists (cleanup). */
async function deleteAppIfExists(page: import('@playwright/test').Page, token: string) {
    const resp = await page.request.get(`${API}/api/v1/apps`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    const existing = apps.find(a => a.name === TEST_APP_NAME);
    if (existing) {
        // Stop any active deployments first (ensures enclave cleans up containers + snapshots)
        const depsResp = await page.request.get(`${API}/api/v1/apps/${existing.id}/deployments`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (depsResp.ok()) {
            const deps: { id: string; status: string }[] = await depsResp.json();
            const activeDeps = deps.filter(d => d.status === 'active');
            for (const dep of activeDeps) {
                await page.request.post(`${API}/api/v1/apps/${existing.id}/deployments/${dep.id}/stop`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 30_000,
                });
                console.log(`Stopped deployment ${dep.id}`);
            }
            // Wait for the enclave manager to fully clean up containers + snapshots
            if (activeDeps.length > 0) await page.waitForTimeout(5_000);
        }
        await page.request.delete(`${API}/api/v1/apps/${existing.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`Cleaned up existing app ${existing.id}`);
    }
}

test.describe('Container Deploy to TDX', () => {
    test.describe.configure({ mode: 'serial' });

    let token: string;
    let appId: string;
    let versionId: string;
    let enclaveId: string;

    /** Discover the test app's ID by name (for when tests run in isolation). */
    async function discoverAppId(page: import('@playwright/test').Page, t: string): Promise<string> {
        const resp = await page.request.get(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${t}` },
        });
        expect(resp.ok()).toBeTruthy();
        const apps: { id: string; name: string }[] = await resp.json();
        const app = apps.find(a => a.name === TEST_APP_NAME);
        expect(app).toBeTruthy();
        return app!.id;
    }

    test('cleanup and create container app with valid port', async ({ page }) => {
        test.setTimeout(30_000);
        token = await getToken(page);

        // Delete any leftover app from a previous run
        await deleteAppIfExists(page, token);

        // Create a container app with a valid port
        const createResp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: TEST_APP_NAME,
                source_type: 'github',
                commit_url: TEST_COMMIT_URL,
                app_type: 'container',
                container_port: TEST_CONTAINER_PORT,
                container_storage: false,
            },
        });

        console.log(`Create response: ${createResp.status()}`);
        const createBody = await createResp.json();
        console.log(`Create body: ${JSON.stringify(createBody)}`);

        expect(createResp.ok()).toBeTruthy();
        expect(createBody.app_type).toBe('container');
        expect(createBody.container_port).toBe(TEST_CONTAINER_PORT);
        expect(createBody.container_storage).toBe(false);
        appId = createBody.id;
        console.log(`Created container app: ${TEST_APP_NAME} (${appId})`);
    });

    test('creating container app without port is rejected', async ({ page }) => {
        token = await getToken(page);

        const resp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: 'e2e-no-port-test',
                source_type: 'github',
                commit_url: TEST_COMMIT_URL,
                app_type: 'container',
                // No container_port
            },
        });

        expect(resp.status()).toBe(400);
        const body = await resp.json();
        expect(body.error).toContain('container_port');
        console.log(`Correctly rejected: ${body.error}`);
    });

    test('app has correct port and a ready version', async ({ page }) => {
        test.setTimeout(360_000); // 6 minutes — build can take a while
        token = await getToken(page);
        if (!appId) appId = await discoverAppId(page, token);

        // Verify port is persisted
        const appResp = await page.request.get(`${API}/api/v1/apps/${appId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(appResp.ok()).toBeTruthy();
        const app = await appResp.json();
        expect(app.container_port).toBe(TEST_CONTAINER_PORT);

        // Wait for build to complete and version to be ready
        // The app was just created — it will trigger a build via GitHub Actions.
        // For the test, we poll for a ready version (the build can take a while).
        let ready = false;
        for (let i = 0; i < 60; i++) {
            const versionsResp = await page.request.get(`${API}/api/v1/apps/${appId}/versions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (versionsResp.ok()) {
                const versions: { id: string; status: string }[] = await versionsResp.json();
                const readyVersion = versions.find(v => v.status === 'ready');
                if (readyVersion) {
                    versionId = readyVersion.id;
                    ready = true;
                    break;
                }
            }
            await page.waitForTimeout(5_000);
        }
        expect(ready).toBeTruthy();
        console.log(`Ready version: ${versionId}`);
    });

    test('TDX enclave is available', async ({ page }) => {
        token = await getToken(page);

        const resp = await page.request.get(`${API}/api/v1/enclaves`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(resp.ok()).toBeTruthy();
        const enclaves: { id: string; name: string; tee_type: string }[] = await resp.json();
        const tdxEnclave = enclaves.find(e => e.tee_type === 'tdx');
        expect(tdxEnclave).toBeTruthy();
        enclaveId = tdxEnclave!.id;
        console.log(`TDX enclave: ${tdxEnclave!.name} (${enclaveId})`);
    });

    test('deploy container to TDX enclave via API', async ({ page }) => {
        test.setTimeout(180_000);
        token = await getToken(page);
        if (!appId) appId = await discoverAppId(page, token);

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

        console.log(`Deploy response: ${resp.status()}`);
        const body = await resp.json();
        console.log(`Deploy body: ${JSON.stringify(body)}`);

        expect(resp.ok()).toBeTruthy();
        expect(body.status).toBe('active');
        console.log(`Deployment ${body.id} is active at ${body.hostname}`);
    });

    test('deployment visible in portal UI', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        if (!appId) appId = await discoverAppId(page, token);

        await page.goto(`/dashboard/apps/${appId}`);

        // Go to Deployments tab
        const deploymentsTab = page.getByRole('button', { name: 'Deployments' });
        await deploymentsTab.click();
        await page.waitForTimeout(1_000);

        // Should see an Active deployment
        await expect(page.locator('text=Active')).toBeVisible({ timeout: 10_000 });
        await page.screenshot({ path: screenshot('container-deploy-active'), fullPage: true });
    });

    test('API Testing tab is NOT shown for container apps', async ({ page }) => {
        test.setTimeout(15_000);
        if (!appId) {
            token = await getToken(page);
            appId = await discoverAppId(page, token);
        }

        await page.goto(`/dashboard/apps/${appId}`);
        await page.waitForSelector('nav', { timeout: 5_000 });

        // Attestation tab should be visible (has active deployment)
        await expect(page.getByRole('button', { name: 'Attestation' })).toBeVisible({ timeout: 5_000 });

        // API Testing tab should NOT be shown for container apps
        await expect(page.getByRole('button', { name: 'API Testing' })).not.toBeVisible();
        await page.screenshot({ path: screenshot('container-no-api-testing-tab'), fullPage: true });
        console.log('Confirmed: API Testing tab hidden for container app');
    });

    test('attestation shows TDX quote (not SGX)', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        if (!appId) appId = await discoverAppId(page, token);

        // Call the attestation API directly
        const resp = await page.request.get(`${API}/api/v1/apps/${appId}/attest`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30_000,
        });
        console.log(`Attest response: ${resp.status()}`);
        expect(resp.ok()).toBeTruthy();

        const result = await resp.json();
        console.log(`Quote type: ${result.quote?.type}`);
        console.log(`Quote OID: ${result.quote?.oid}`);
        console.log(`Extensions count: ${result.extensions?.length}`);
        console.log(`App extensions count: ${result.app_extensions?.length}`);
        console.log(`MRTD: ${result.quote?.mr_td}`);
        console.log(`RTMR0: ${result.quote?.rtmr0}`);
        console.log(`RTMR1: ${result.quote?.rtmr1}`);
        console.log(`RTMR2: ${result.quote?.rtmr2}`);
        console.log(`RTMR3: ${result.quote?.rtmr3}`);
        console.log(`ReportData: ${result.quote?.report_data}`);
        console.log(`Challenge mode: ${result.challenge_mode}`);
        if (result.app_extensions?.length > 0) {
            for (const ext of result.app_extensions) {
                console.log(`  App ext: ${ext.label} (${ext.oid}) = ${ext.value_hex?.substring(0, 64)}...`);
            }
        }

        // Quote should exist and be TDX
        expect(result.quote).toBeTruthy();
        expect(result.quote.type).toBe('TDX Quote');
        expect(result.quote.is_mock).toBe(false);

        // Should have non-trivial MRTD (not all zeros)
        expect(result.quote.mr_td).toBeTruthy();
        expect(result.quote.mr_td).not.toMatch(/^0+$/);

        // Should have RTMRs (runtime measurement registers)
        expect(result.quote.rtmr0).toBeTruthy();
        expect(result.quote.rtmr1).toBeTruthy();
        expect(result.quote.rtmr2).toBeTruthy();
        expect(result.quote.rtmr3).toBeTruthy();

        // Should have ReportData
        expect(result.quote.report_data).toBeTruthy();
        expect(result.quote.report_data).toHaveLength(128); // 64 bytes = 128 hex chars

        // Should have platform extensions
        expect(result.extensions).toBeTruthy();
        expect(result.extensions.length).toBeGreaterThan(0);

        // Should have workload extensions (3.x OIDs)
        expect(result.app_extensions).toBeTruthy();
        expect(result.app_extensions.length).toBeGreaterThan(0);

        // Should have TLS info
        expect(result.tls).toBeTruthy();
        expect(result.tls.version).toBeTruthy();

        // Should have certificate
        expect(result.certificate).toBeTruthy();
        expect(result.certificate.not_before).toBeTruthy();

        // Should have PEM
        expect(result.pem).toContain('BEGIN CERTIFICATE');

        console.log('Attestation verified: TDX quote with MRTD, RTMRs, and ReportData');
    });

    test('challenge-response attestation verifies report data', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        if (!appId) appId = await discoverAppId(page, token);

        // Generate a random 32-byte challenge (64 hex chars)
        const challengeBytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) challengeBytes[i] = Math.floor(Math.random() * 256);
        const challengeHex = Array.from(challengeBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log(`Challenge nonce: ${challengeHex}`);

        const resp = await page.request.get(`${API}/api/v1/apps/${appId}/attest?challenge=${challengeHex}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30_000,
        });
        console.log(`Challenge attest response: ${resp.status()}`);
        expect(resp.ok()).toBeTruthy();

        const result = await resp.json();
        console.log(`Challenge mode: ${result.challenge_mode}`);
        console.log(`Challenge verified: ${result.quote?.challenge_verified}`);
        console.log(`Deterministic verified: ${result.quote?.deterministic_verified}`);
        console.log(`ReportData: ${result.quote?.report_data}`);
        console.log(`Cert validity: ${result.certificate?.not_before} -> ${result.certificate?.not_after}`);

        // Should be in challenge mode
        expect(result.challenge_mode).toBe(true);
        expect(result.challenge).toBe(challengeHex);

        // Quote must have ReportData
        expect(result.quote).toBeTruthy();
        expect(result.quote.report_data).toBeTruthy();

        // Challenge-response MUST be verified — the enclave must bind the
        // nonce into the TDX quote's ReportData via the 0xFFBB extension.
        expect(result.quote.challenge_verified).toBe(true);
        console.log('Challenge-response attestation verified: ReportData = SHA-512(SHA-256(pubkey) || nonce)');
    });

    test('attestation tab renders correctly in UI', async ({ page }) => {
        test.setTimeout(60_000);
        if (!appId) {
            token = await getToken(page);
            appId = await discoverAppId(page, token);
        }

        await page.goto(`/dashboard/apps/${appId}`);
        await page.waitForSelector('nav', { timeout: 5_000 });

        // Click attestation tab
        await page.getByRole('button', { name: 'Attestation' }).click();
        await page.waitForTimeout(500);

        // Click Inspect Certificate
        await page.getByRole('button', { name: 'Inspect Certificate' }).click();

        // Wait for results to load
        await expect(page.locator('text=TLS Connection')).toBeVisible({ timeout: 30_000 });

        // The quote heading should say "TDX Quote", NOT "SGX Quote"
        await expect(page.locator('h2:has-text("TDX Quote")')).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('h2:has-text("SGX Quote")')).not.toBeVisible();

        // Platform attestation extensions should be visible
        await expect(page.locator('text=Platform Attestation Extensions')).toBeVisible({ timeout: 5_000 });

        // Certificate section should be visible
        await expect(page.locator('text=x.509 Certificate')).toBeVisible();

        await page.screenshot({ path: screenshot('container-attestation-tdx'), fullPage: true });
        console.log('Attestation UI verified: TDX Quote heading displayed correctly');
    });

    test('attestation includes event log for RTMR verification', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        if (!appId) appId = await discoverAppId(page, token);

        const resp = await page.request.get(`${API}/api/v1/apps/${appId}/attest`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30_000,
        });
        expect(resp.ok()).toBeTruthy();

        const result = await resp.json();
        console.log(`Event log source: ${result.event_log_source}`);
        console.log(`Event log events: ${result.event_log_events?.length}`);

        // Event log must be present for TDX attestations
        expect(result.event_log_events).toBeTruthy();
        expect(result.event_log_source).toBeTruthy();
        expect(result.event_log_source).toMatch(/^(tpm0|ccel)$/);

        // Compact event log should have a reasonable number of events
        expect(Array.isArray(result.event_log_events)).toBe(true);
        expect(result.event_log_events.length).toBeGreaterThan(10);
        // Each event should have pcr, event_type, and digest fields
        const ev = result.event_log_events[0];
        expect(typeof ev.pcr).toBe('number');
        expect(typeof ev.event_type).toBe('number');
        expect(typeof ev.digest).toBe('string');
        expect(ev.digest.length).toBe(96); // SHA-384 hex = 96 chars

        console.log('Event log present in attestation response');
    });

    test('RTMR verifier renders in attestation UI', async ({ page }) => {
        test.setTimeout(90_000);
        if (!appId) {
            token = await getToken(page);
            appId = await discoverAppId(page, token);
        }

        await page.goto(`/dashboard/apps/${appId}`);
        await page.waitForSelector('nav', { timeout: 5_000 });

        // Click attestation tab
        await page.getByRole('button', { name: 'Attestation' }).click();
        await page.waitForTimeout(500);

        // Click Inspect Certificate
        await page.getByRole('button', { name: 'Inspect Certificate' }).click();

        // Wait for attestation results
        await expect(page.locator('text=TLS Connection')).toBeVisible({ timeout: 30_000 });

        // Event Log Verification section should appear after event log is parsed
        const verifierHeading = page.locator('h2:has-text("Event Log Verification")');
        await expect(verifierHeading).toBeVisible({ timeout: 15_000 });

        // Wait for event log replay to complete — RTMR buttons only appear after processing
        await expect(page.locator('button:has-text("RTMR[0]")')).toBeVisible({ timeout: 30_000 });

        // Should show "Event log verified" or "RTMR mismatch detected" badge.
        // After manager restarts RTMR[3] may drift (hardware register accumulates
        // extends from previous runs but app_events only track the current run).
        const matchBadge = page.locator('text=Event log verified');
        const mismatchBadge = page.locator('text=RTMR mismatch detected');
        const badge = matchBadge.or(mismatchBadge).first();
        const hasBadge = await badge.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!hasBadge) {
            const sectionText = await verifierHeading.locator('..').locator('..').textContent();
            console.log('RTMR Verifier section text:', sectionText?.substring(0, 500));
        }
        await expect(badge).toBeVisible({ timeout: 5_000 });

        // RTMR values from TDX quote should be displayed
        const verifierSec = page.locator('section').filter({ hasText: 'Event Log Verification' });
        await expect(verifierSec.getByRole('heading', { name: /RTMR Values/ })).toBeVisible({ timeout: 5_000 });

        // Key boot measurements should be extracted from event log
        await expect(verifierSec.getByRole('heading', { name: /Key Boot Measurements/ })).toBeVisible({ timeout: 5_000 });

        // dm-verity status should be shown (either root hash or "not configured")
        const dmVerityPresent = verifierSec.locator('text=dm-verity root hash');
        const dmVerityAbsent = verifierSec.locator('text=dm-verity not configured');
        await expect(dmVerityPresent.or(dmVerityAbsent).first()).toBeVisible({ timeout: 5_000 });

        // Should show RTMR[0] through RTMR[3] with event counts
        for (let i = 0; i < 4; i++) {
            await expect(page.locator(`button:has-text("RTMR[${i}]")`)).toBeVisible();
        }

        // Click "Details" to expand the console snippet section (within Event Log Verification)
        const verifierSectionForClick = page.locator('section').filter({ hasText: 'Event Log Verification' });
        const detailsBtn = verifierSectionForClick.locator('button:has-text("Details")');
        await detailsBtn.click();

        // "Verify independently" section should now be visible
        await expect(verifierSectionForClick.locator('text=Verify independently')).toBeVisible({ timeout: 5_000 });

        // Copy snippet button should be visible
        await expect(verifierSectionForClick.locator('button:has-text("Copy snippet")')).toBeVisible();

        // The console snippet should contain PCR replay code (scoped to Event Log section)
        const verifierSection = page.locator('section').filter({ hasText: 'Event Log Verification' });
        const snippet = verifierSection.locator('pre');
        await expect(snippet).toContainText('PCR Replay');
        await expect(snippet).toContainText('crypto.subtle.digest');

        await page.screenshot({ path: screenshot('container-rtmr-verifier'), fullPage: true });
        console.log('RTMR verifier UI rendered correctly with console snippet');
    });

    test('stop the deployment', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);
        if (!appId) appId = await discoverAppId(page, token);

        // Get active deployments
        const depsResp = await page.request.get(`${API}/api/v1/apps/${appId}/deployments`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(depsResp.ok()).toBeTruthy();
        const deps: { id: string; status: string }[] = await depsResp.json();
        const activeDep = deps.find(d => d.status === 'active');
        expect(activeDep).toBeTruthy();

        // Stop it
        const stopResp = await page.request.post(
            `${API}/api/v1/apps/${appId}/deployments/${activeDep!.id}/stop`,
            {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30_000,
            },
        );
        console.log(`Stop response: ${stopResp.status()}`);
        expect(stopResp.ok()).toBeTruthy();

        const body = await stopResp.json();
        expect(body.status).toBe('stopped');
        console.log(`Deployment stopped successfully`);
    });

    test('cleanup: delete test app', async ({ page }) => {
        token = await getToken(page);
        await deleteAppIfExists(page, token);
    });
});
