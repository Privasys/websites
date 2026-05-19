/**
 * E2E for the "3 attestations all green" path on the chat-test
 * confidential-ai-demo instance — mirrors what the user sees in the
 * Security view of chat-test.privasys.org/i/demo.
 *
 * For the AI Inference enclave + every tool in `available_tools[]`,
 * asserts BOTH of:
 *
 *   1. GET <api-base><attest_url> returns 200 with a quote.raw_base64
 *      and a certificate (any of certificate|cert|cert_pem). This is
 *      the "Attest request failed: 502" failure mode that shows up
 *      when an enclave is unreachable or its gateway_host is stale
 *      after a Spot preemption.
 *
 *   2. POST <api-base>/api/v1/verify-quote { quote } returns
 *      `success: true`. This is the actual TDX/SGX ECDSA verification
 *      the chat UI's `verifyQuoteSignature()` runs (see
 *      libs/attestation-view/src/use-attestation.ts). When this fails
 *      the per-row "Quote signature verified" pill stays red even if
 *      /attest itself returned 200.
 *
 * The verify-quote call requires a Bearer JWT with aud
 * `privasys-platform`. We mint one from a developer service-account
 * key at /tmp/dev-sa.json using the standard mint helper. When the SA
 * key is absent the spec falls back to the shallow shape-only check
 * (test still passes if /attest is healthy), so that this spec can
 * run in environments without SA credentials. The verify-quote
 * coverage is the bit that mirrors the UI's green/red signal — when
 * the SA key is present the test will fail in exactly the same way
 * the chat Security view does.
 *
 * Run:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     chat-attestations-green.spec.ts --project=chat-attestations-green --no-deps
 */
import { test, expect, request } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const INSTANCE_API =
    process.env.CHAT_INSTANCE_API ||
    'https://api-test.developer.privasys.org/api/v1/ai/instances/demo';
const API_BASE =
    process.env.CHAT_API_BASE || 'https://api-test.developer.privasys.org';
const SA_KEY = process.env.PRIVASYS_SA_KEY || '/tmp/dev-sa.json';
const MINT_SCRIPT =
    process.env.PRIVASYS_MINT_SCRIPT ||
    '/home/dev/privasys/.operations/scripts/mint-sa-token.sh';

interface Tool {
    id: string;
    name: string;
    label: string;
    attest_url: string;
}

function mintToken(): string | null {
    if (process.env.ATTESTATION_TOKEN) return process.env.ATTESTATION_TOKEN;
    if (!existsSync(SA_KEY) || !existsSync(MINT_SCRIPT)) return null;
    try {
        const out = execSync(`bash ${MINT_SCRIPT} --key ${SA_KEY}`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        }).trim();
        return out || null;
    } catch {
        return null;
    }
}

test('attestations: AI inference + every tool produce a verifiable quote', async () => {
    test.setTimeout(120_000);
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

    const token = mintToken();
    /* eslint-disable no-console */
    if (!token) {
        console.warn(
            '[attestations] no Bearer token available (set ATTESTATION_TOKEN or place a SA key at ' +
                SA_KEY +
                '); skipping verify-quote check — UI-equivalent assertion DEGRADED to /attest shape only.'
        );
    } else {
        console.log('[attestations] verify-quote enabled (SA-minted token).');
    }
    /* eslint-enable no-console */
    const verifyHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    };
    if (token) verifyHeaders.Authorization = `Bearer ${token}`;

    const failures: string[] = [];
    for (const t of targets) {
        // 1. /attest reachability + shape — with one retry to absorb
        //    the 5-10s window after a Spot IP rotation in which the
        //    mgmt-svc gateway cache is stale (eefb31f self-heal).
        let resp = await ctx.get(t.url);
        if (!resp.ok()) {
            await new Promise((r) => setTimeout(r, 5_000));
            resp = await ctx.get(t.url);
        }
        if (!resp.ok()) {
            failures.push(`${t.label} (${t.url}) → HTTP ${resp.status()}`);
            continue;
        }
        let body: { quote?: { raw_base64?: string }; certificate?: unknown; cert?: unknown; cert_pem?: unknown };
        try {
            body = await resp.json();
        } catch (e) {
            failures.push(`${t.label} — non-JSON /attest response: ${(e as Error).message}`);
            continue;
        }
        const raw = body.quote?.raw_base64;
        if (!raw) {
            failures.push(`${t.label} — /attest response missing quote.raw_base64`);
            continue;
        }
        if (!(body.certificate || body.cert || body.cert_pem)) {
            failures.push(`${t.label} — /attest response missing certificate (any of certificate|cert|cert_pem)`);
            continue;
        }

        // 2. verify-quote — only when we have a bearer token.
        if (!token) {
            /* eslint-disable no-console */
            console.log(`[attestations] ${t.label} OK (shape; verify-quote skipped)`);
            /* eslint-enable no-console */
            continue;
        }
        const verifyUrl = `${API_BASE.replace(/\/$/, '')}/api/v1/verify-quote`;
        const vresp = await ctx.post(verifyUrl, {
            headers: verifyHeaders,
            data: JSON.stringify({ quote: raw })
        });
        if (!vresp.ok()) {
            failures.push(`${t.label} — verify-quote HTTP ${vresp.status()}`);
            continue;
        }
        let vbody: { success?: boolean; status?: string; error?: string; teeType?: string; message?: string };
        try {
            vbody = await vresp.json();
        } catch (e) {
            failures.push(`${t.label} — verify-quote non-JSON response: ${(e as Error).message}`);
            continue;
        }
        if (vbody.success !== true) {
            failures.push(
                `${t.label} — verify-quote failed: status=${vbody.status ?? '?'} error=${vbody.error ?? vbody.message ?? '?'}`
            );
            continue;
        }
        /* eslint-disable no-console */
        console.log(
            `[attestations] ${t.label} OK (quote ${raw.length} chars, verified ${vbody.teeType ?? '?'})`
        );
        /* eslint-enable no-console */
    }

    expect(
        failures,
        `one or more attestation rows would fail in the chat Security view:\n  - ${failures.join('\n  - ')}`
    ).toEqual([]);
});
