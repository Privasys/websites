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
import { cleanupApps } from './e2e-cleanup';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.developer.test.privasys.org';
const TEST_APP_NAME = 'e2e-multiarch-oci-label';
// The fixture must be an image whose top level is an OCI index and whose
// platform image carries the org.privasys.manifest label. lightpanda's
// 817987b was one (buildx with provenance + sbom) and is gone from GHCR; its
// releases since are single-arch, and no tagged Privasys image is both today.
// Point E2E_MULTIARCH_IMAGE at one to run this; until then it skips, and the
// control plane's hermetic TestFetchOCILabel_MultiArchIndex covers bug #34.
const LIGHTPANDA_IMAGE = process.env.E2E_MULTIARCH_IMAGE || 'ghcr.io/privasys/container-app-lightpanda:817987b';

/** Whether the image exists and its top level is a multi-arch index. */
async function isPublicIndex(image: string): Promise<boolean> {
    const m = /^ghcr\.io\/([^:@]+)[:@](.+)$/.exec(image);
    if (!m) return false;
    const [, repo, ref] = m;
    try {
        const tok = await (await fetch(`https://ghcr.io/token?scope=repository:${repo}:pull`)).json() as { token?: string };
        const res = await fetch(`https://ghcr.io/v2/${repo}/manifests/${ref}`, {
            headers: {
                Authorization: `Bearer ${tok.token ?? ''}`,
                Accept: 'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json'
            }
        });
        if (!res.ok) return false;
        const type = res.headers.get('content-type') ?? '';
        return type.includes('image.index') || type.includes('manifest.list');
    } catch {
        return false;
    }
}

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
    // Tear down the app this suite creates, even on failure (see ./e2e-cleanup).
    test.afterAll(async () => {
        await cleanupApps({ names: [TEST_APP_NAME] });
    });

    test('package-source app populates container_mcp from OCI image index', async ({ page }) => {
        test.setTimeout(60_000);

        test.skip(!(await isPublicIndex(LIGHTPANDA_IMAGE)), `${LIGHTPANDA_IMAGE} is not a multi-arch index on GHCR (set E2E_MULTIARCH_IMAGE)`);

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
