/**
 * E2E regression test for bug #34: FetchOCILabel must descend into multi-arch
 * OCI image indices.
 *
 * Reproduces the failure mode that hid the API Testing / AI Tools tabs on the
 * `container-app-lightpanda` package-source app: the management-service used
 * to return `no config digest in manifest` against any image published by
 * buildx with provenance/sbom enabled (which is an OCI image index, not a
 * single-arch manifest), leaving `container_mcp = NULL` and the tabs hidden.
 *
 * The test creates a fresh `package`-source app pointing at the public
 * lightpanda image (whose top-level manifest IS an OCI index) and asserts
 * the management-service auto-populated `container_mcp` from the embedded
 * `org.privasys.manifest` label — proving FetchOCILabel descended into the
 * platform child manifest correctly.
 *
 * Run with:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     --project portal -g "multi-arch OCI"
 */
import { test, expect } from '@playwright/test';
import { getToken } from './e2e-auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';
const TEST_APP_NAME = 'e2e-multiarch-oci-label';
// container-app-lightpanda was published by buildx (provenance + sbom) → image index.
const LIGHTPANDA_IMAGE = 'ghcr.io/privasys/container-app-lightpanda:817987b';

async function deleteAppIfExists(page: import('@playwright/test').Page, token: string) {
    const resp = await page.request.get(`${API}/api/v1/apps`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok()) return;
    const apps: { id: string; name: string }[] = await resp.json();
    const existing = apps.find(a => a.name === TEST_APP_NAME);
    if (existing) {
        await page.request.delete(`${API}/api/v1/apps/${existing.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }
}

test.describe('Container app — multi-arch OCI label auto-detect (bug #34)', () => {
    test('package-source app populates container_mcp from OCI image index', async ({ page }) => {
        test.setTimeout(60_000);

        const token = await getToken();
        await deleteAppIfExists(page, token);

        const createResp = await page.request.post(`${API}/api/v1/apps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: TEST_APP_NAME,
                source_type: 'package',
                container_image: LIGHTPANDA_IMAGE,
                app_type: 'container',
                container_port: 9222,
            },
        });

        expect(createResp.ok(), `create app failed: ${createResp.status()} ${await createResp.text()}`).toBeTruthy();
        const body = await createResp.json();

        // Bug #34 regression: before the fix, container_mcp was always nil for
        // multi-arch indices because FetchOCILabel returned
        // "no config digest in manifest". After the fix it must descend into
        // the linux/amd64 child manifest and read the embedded label.
        expect(body.container_mcp, 'container_mcp should be populated from the OCI label').toBeTruthy();
        expect(Array.isArray(body.container_mcp.tools), 'manifest should have a tools array').toBeTruthy();
        expect(body.container_mcp.tools.length).toBeGreaterThan(0);
        // lightpanda's privasys.json exposes a "browse" tool — sanity check the
        // shape made it through the index-aware label fetch.
        expect(body.container_mcp.tools[0].name).toBe('browse');

        // Cleanup
        await page.request.delete(`${API}/api/v1/apps/${body.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    });
});
