/**
 * E2E for the "3 attestations all green" path on the chat-test
 * confidential-ai-demo instance — mirrors what the user sees in the
 * Security view of chat-test.privasys.org/i/demo.
 *
 * Asserts, for the AI Inference enclave + every tool in
 * `available_tools[]`, that:
 *
 *   1. /attest returns 200 (mgmt-service can reach the enclave through
 *      RA-TLS — this is what fails with "Attest request failed: 502"
 *      in the chat UI when an enclave is down or its gateway_host is
 *      stale after a Spot preemption).
 *   2. The response payload carries a quote.raw_base64 + an x509
 *      certificate. This is what `use-attestation.ts` feeds into
 *      /verify-quote and what the cert-OID extraction reads to compute
 *      the per-row digest. If either is missing, the UI row can never
 *      turn green even if /attest itself succeeded.
 *
 * The verify-quote ECDSA path itself requires a user-bound JWT (the
 * Privasys ID iframe mints one per audience) and so cannot be
 * exercised without a real session. This spec deliberately stops at
 * the "all the building blocks the green pill depends on are
 * present" boundary — anything beyond that point is the browser-only
 * surface that the chat-shell session-gating fix already covers.
 *
 * Run:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     chat-attestations-green.spec.ts --project=chat-attestations-green --no-deps
 */
import { test, expect, request } from '@playwright/test';

const INSTANCE_API =
    process.env.CHAT_INSTANCE_API ||
    'https://api-test.developer.privasys.org/api/v1/ai/instances/demo';
const API_BASE =
    process.env.CHAT_API_BASE || 'https://api-test.developer.privasys.org';

interface Tool {
    id: string;
    name: string;
    label: string;
    attest_url: string;
}

test('attestations: AI inference + every tool returns a usable /attest payload', async () => {
    test.setTimeout(90_000);
    const ctx = await request.newContext();
    const meta = await (await ctx.get(INSTANCE_API)).json();

    // Build the component list the chat Security view renders:
    //   row 0: AI Inference (instance-level attest_url)
    //   rows 1..N: each AI Tool from available_tools[].
    const targets: Array<{ label: string; url: string }> = [];
    expect(meta.attest_url, 'instance API missing attest_url for AI inference').toBeTruthy();
    targets.push({
        label: 'AI Inference',
        url: `${API_BASE.replace(/\/$/, '')}${meta.attest_url}`
    });
    const tools: Tool[] = meta.available_tools ?? [];
    expect(tools.length, 'available_tools[] is empty').toBeGreaterThan(0);
    for (const t of tools) {
        expect(t.attest_url, `tool '${t.name}' is missing attest_url`).toBeTruthy();
        targets.push({
            label: t.label || t.name,
            url: `${API_BASE.replace(/\/$/, '')}${t.attest_url}`
        });
    }

    // The chat Security view today exposes 3 rows: AI Inference,
    // Brave Search, LightPanda. This guard catches the case where a
    // tool silently drops out of the fleet config and the UI would
    // be "all green" only because it has fewer rows to verify.
    expect(
        targets.length,
        `expected at least 3 attestation rows (AI Inference + 2 tools), got ${targets.length}: ${targets.map((x) => x.label).join(', ')}`
    ).toBeGreaterThanOrEqual(3);

    const failures: string[] = [];
    for (const t of targets) {
        const resp = await ctx.get(t.url);
        if (!resp.ok()) {
            failures.push(`${t.label} (${t.url}) → HTTP ${resp.status()}`);
            continue;
        }
        let body: { quote?: { raw_base64?: string }; certificate?: unknown; cert?: unknown; cert_pem?: unknown };
        try {
            body = await resp.json();
        } catch (e) {
            failures.push(`${t.label} — non-JSON response: ${(e as Error).message}`);
            continue;
        }
        if (!body.quote?.raw_base64) {
            failures.push(`${t.label} — response missing quote.raw_base64`);
            continue;
        }
        if (!(body.certificate || body.cert || body.cert_pem)) {
            failures.push(`${t.label} — response missing certificate (any of certificate|cert|cert_pem)`);
            continue;
        }
        /* eslint-disable no-console */
        console.log(`[attestations] ${t.label} OK (quote ${(body.quote.raw_base64 as string).length} chars)`);
        /* eslint-enable no-console */
    }

    expect(
        failures,
        `one or more attestation rows would fail in the chat Security view:\n  - ${failures.join('\n  - ')}`
    ).toEqual([]);
});
