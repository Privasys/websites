import { test, expect } from '@playwright/test';
import path from 'path';
import { setupAuth, getToken } from './e2e-auth';

// Coverage for the public App Store launch:
//   - the unauthenticated store API (management-service): /store/apps, /store/apps/{slug}
//   - the identicon service (default app icon / user avatar)
//   - the store.privasys.org front (browse + search + detail + reproducibility)
//   - the owner publish flow + publish gate
//
// The API tests are read-only; the publish round-trip restores prior state.

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';
const STORE_URL = process.env.E2E_STORE_URL || 'https://store.privasys.org';
const screenshot = (name: string) => path.join(__dirname, 'test-results', `${name}.png`);

interface StoreApp { slug: string; name: string; target: string; tee: string; icon_url: string; category: string }

test.describe('Public App Store', () => {
    test.describe.configure({ mode: 'serial' });

    // ── Public store API (no auth) ─────────────────────────────────

    test('GET /store/apps returns the published-apps list', async ({ request }) => {
        const res = await request.get(`${API}/api/v1/store/apps`);
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(Array.isArray(data.apps)).toBeTruthy();
        for (const a of data.apps as StoreApp[]) {
            expect(a.slug, 'each app has a slug').toBeTruthy();
            expect(['wasm', 'container'], 'target is wasm|container').toContain(a.target);
            expect(a.icon_url, 'each app has an icon (custom or identicon)').toBeTruthy();
        }
    });

    test('GET /store/apps/{unknown} returns 404 (unpublished apps stay invisible)', async ({ request }) => {
        const res = await request.get(`${API}/api/v1/store/apps/this-app-does-not-exist-e2e`);
        expect(res.status()).toBe(404);
    });

    test('identicon endpoint serves a deterministic, seed-varying SVG', async ({ request }) => {
        const a = await request.get(`${API}/api/v1/identicon/e2e-seed-1`);
        expect(a.ok()).toBeTruthy();
        expect(a.headers()['content-type']).toContain('image/svg+xml');
        const svg1 = await a.text();
        expect(svg1).toContain('<svg');

        // Deterministic: same seed -> identical SVG.
        const again = await request.get(`${API}/api/v1/identicon/e2e-seed-1`);
        expect(await again.text()).toBe(svg1);

        // Seed-varying: a different seed yields a different image.
        const other = await request.get(`${API}/api/v1/identicon/e2e-seed-2`);
        expect(await other.text()).not.toBe(svg1);
    });

    // ── Store front (no auth) ──────────────────────────────────────

    test('store front browse page loads with search and the shared footer', async ({ page }) => {
        await page.goto(STORE_URL);
        await expect(page.getByRole('heading', { name: /Verified confidential apps/i })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByPlaceholder(/Search apps/i)).toBeVisible();
        // Shared @privasys/ui footer.
        await expect(page.locator('.pui-footer')).toBeVisible();
        await page.screenshot({ path: screenshot('store-browse'), fullPage: true });
    });

    // ── Owner publish flow (authed, self-contained) ────────────────
    // These create a throwaway `package` app, drive it through the publish flow,
    // and delete it — no dependency on pre-existing data.

    const PKG_IMAGE = 'ghcr.io/privasys/container-app-example:latest';

    test('publish lifecycle: create -> publish -> visible on store API + front -> delete', async ({ page, request }) => {
        test.setTimeout(120_000);
        await setupAuth(page);
        await page.goto('/dashboard/');
        const token = await getToken();
        expect(token).toBeTruthy();
        const headers = { Authorization: `Bearer ${token}` };

        const name = `e2e-store-${Date.now()}`;
        const created = await request.post(`${API}/api/v1/apps`, {
            headers,
            data: { name, app_type: 'container', source_type: 'package', container_image: PKG_IMAGE, description: 'E2E store test app' }
        });
        expect(created.ok(), 'create package app').toBeTruthy();
        const appId = (await created.json()).id as string;

        try {
            // Set a complete store listing (the publish gate needs Description + Category).
            await request.put(`${API}/api/v1/apps/${appId}/store`, {
                headers,
                data: {
                    store_tagline: 'E2E store app', store_description: 'Created by the store e2e suite.', store_category: 'Developer Tools',
                    store_icon_url: '', store_screenshots: [], store_privacy_url: '', store_tos_url: '',
                    store_website_url: '', store_support_email: '', store_keywords: 'e2e, test'
                }
            });

            const pub = await request.put(`${API}/api/v1/apps/${appId}/store/publish`, { headers, data: { published: true } });
            expect(pub.ok(), 'publish should succeed for a complete listing').toBeTruthy();

            // Appears on the public list, keyed by slug (= app name).
            const listed = ((await (await request.get(`${API}/api/v1/store/apps`)).json()).apps as StoreApp[])
                .find(a => a.slug === name);
            expect(listed, 'published app should appear on /store/apps').toBeTruthy();
            expect(listed!.icon_url, 'app gets an icon (identicon fallback)').toBeTruthy();

            // Detail-by-slug carries the reproducibility block.
            const detail = await request.get(`${API}/api/v1/store/apps/${encodeURIComponent(name)}`);
            expect(detail.ok()).toBeTruthy();
            const d = await detail.json();
            expect(d.reproducibility, 'detail carries a reproducibility block').toBeTruthy();
            expect(d.reproducibility.tee).toBe('TDX'); // container => TDX

            // The store front renders the detail page while published.
            await page.goto(`${STORE_URL}/app/?slug=${encodeURIComponent(name)}`);
            await expect(page.getByRole('heading', { name: 'Reproducibility' })).toBeVisible({ timeout: 20_000 });
            await page.screenshot({ path: screenshot('store-detail'), fullPage: true });
        } finally {
            await request.delete(`${API}/api/v1/apps/${appId}`, { headers, timeout: 60_000 }).catch(() => {});
        }
    });

    test('publish gate: an incomplete listing cannot be published (409)', async ({ page, request }) => {
        test.setTimeout(60_000);
        await setupAuth(page);
        await page.goto('/dashboard/');
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const name = `e2e-gate-${Date.now()}`;
        const created = await request.post(`${API}/api/v1/apps`, {
            headers,
            data: { name, app_type: 'container', source_type: 'package', container_image: PKG_IMAGE, description: 'E2E gate test app' }
        });
        expect(created.ok()).toBeTruthy();
        const appId = (await created.json()).id as string;

        try {
            // No store listing set -> publishing is rejected.
            const res = await request.put(`${API}/api/v1/apps/${appId}/store/publish`, { headers, data: { published: true } });
            expect(res.status(), 'publish must be gated on a complete listing').toBe(409);
        } finally {
            await request.delete(`${API}/api/v1/apps/${appId}`, { headers, timeout: 60_000 }).catch(() => {});
        }
    });
});
