import { test, expect } from '@playwright/test';
import path from 'path';

const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

/** Helper: get the access token from the authenticated portal session.  */
async function getToken(page: import('@playwright/test').Page): Promise<string> {
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });
    const session = await page.evaluate(() => fetch('/api/auth/session').then(r => r.json()));
    const token = session?.accessToken as string;
    expect(token).toBeTruthy();
    return token;
}

test.describe('Container Deploy to TDX', () => {
    test.describe.configure({ mode: 'serial' });

    let token: string;
    let appId: string;
    let versionId: string;
    let enclaveId: string;

    test('authenticate and discover app', async ({ page }) => {
        token = await getToken(page);

        // Find the container-app
        const resp = await page.request.get(`${API}/api/v1/apps`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(resp.ok()).toBeTruthy();
        const apps: { id: string; name: string; app_type: string }[] = await resp.json();
        const containerApp = apps.find(a => a.app_type === 'container');
        expect(containerApp).toBeTruthy();
        appId = containerApp!.id;
        console.log(`Found container app: ${containerApp!.name} (${appId})`);
    });

    test('app has a ready version', async ({ page }) => {
        token = await getToken(page);

        const resp = await page.request.get(`${API}/api/v1/apps/${appId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(resp.ok()).toBeTruthy();
        const app = await resp.json();

        // Verify port is set
        expect(app.container_port).toBeGreaterThan(0);
        console.log(`Container port: ${app.container_port}`);

        // Get versions
        const versionsResp = await page.request.get(`${API}/api/v1/apps/${appId}/versions`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(versionsResp.ok()).toBeTruthy();
        const versions: { id: string; label: string; status: string }[] = await versionsResp.json();
        const readyVersion = versions.find(v => v.status === 'ready');
        expect(readyVersion).toBeTruthy();
        versionId = readyVersion!.id;
        console.log(`Ready version: ${readyVersion!.label} (${versionId})`);
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
        test.setTimeout(180_000); // 3 minutes
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

        console.log(`Deploy response: ${resp.status()}`);
        const body = await resp.json();
        console.log(`Deploy body: ${JSON.stringify(body)}`);

        expect(resp.ok()).toBeTruthy();
        expect(body.status).toBe('active');
        console.log(`Deployment ${body.id} is active at ${body.hostname}`);
    });

    test('deployment visible in portal UI', async ({ page }) => {
        test.setTimeout(30_000);

        await page.goto('/dashboard/');
        await page.waitForSelector('nav', { timeout: 5_000 });

        // Find and click the container app
        const appLink = page.locator('nav a').filter({ hasText: /container/ });
        await appLink.first().click();
        await page.waitForURL('**/dashboard/apps/**');

        // Go to Deployments tab
        const deploymentsTab = page.getByRole('button', { name: 'Deployments' });
        await deploymentsTab.click();
        await page.waitForTimeout(1_000);

        // Should see an Active deployment
        await expect(page.locator('text=Active')).toBeVisible({ timeout: 10_000 });
        await page.screenshot({ path: screenshot('container-deploy-active'), fullPage: true });
    });

    test('stop the deployment', async ({ page }) => {
        test.setTimeout(60_000);
        token = await getToken(page);

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
});
