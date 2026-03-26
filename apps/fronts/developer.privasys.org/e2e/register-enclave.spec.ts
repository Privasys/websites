/**
 * Register the TDX dev enclave in the dev management service.
 * Run: npx playwright test --headed register-enclave.spec.ts
 */
import { test, expect } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

test('register TDX dev enclave', async ({ page }) => {
    test.setTimeout(60_000);

    // Login
    await page.goto('/dashboard/');
    await page.waitForSelector('nav', { timeout: 10_000 });

    // Get token from session
    const session = await page.evaluate(() => fetch('/api/auth/session').then(r => r.json()));
    const token = session?.accessToken as string;
    expect(token).toBeTruthy();

    // Check if enclave already exists
    const listResp = await page.request.get(`${API}/api/v1/admin/enclaves/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`List enclaves response: ${listResp.status()} ${await listResp.text()}`);
    test.skip(listResp.status() === 403, 'User lacks admin/manager role — cannot manage enclaves');
    expect(listResp.ok()).toBeTruthy();
    const enclaves: { id: string; name: string; host: string }[] = await listResp.json();

    const existing = enclaves.find(e => e.host === 'v-fr-dev.privasys.org');
    if (existing) {
        console.log(`Enclave already exists: ${existing.id} (${existing.name})`);
        return;
    }

    // Register new TDX enclave
    const createResp = await page.request.post(`${API}/api/v1/admin/enclaves/`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        data: {
            name: 'DEV---virtual-eu-paris-1',
            host: 'v-fr-dev.privasys.org',
            port: 443,
            tee_type: 'tdx',
            country: 'FR',
            region: 'europe-west9',
            provider: 'GCP',
            owner: 'Privasys',
            status: 'active',
            max_apps: 10,
            gateway_host: '34.155.116.130',
        },
    });

    expect(createResp.ok()).toBeTruthy();
    const enclave = await createResp.json();
    console.log(`Enclave registered: ${JSON.stringify(enclave, null, 2)}`);
});
