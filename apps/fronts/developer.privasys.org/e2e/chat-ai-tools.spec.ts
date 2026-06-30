/**
 * E2E for the AI-Tools surface (LightPanda end-to-end smoke).
 *
 * Asserts three things on the deployed dev fleet (`confidential-ai-demo`
 * fleet behind https://api-test.developer.privasys.org):
 *
 *   1. The public instance discovery endpoint advertises the LightPanda
 *      tool in `available_tools[]` with the right shape (mirrors
 *      mgmt-service `PublicTool`).
 *   2. The LightPanda app's attestation is reachable through the
 *      management-service proxy at the URL the discovery endpoint
 *      hands back.
 *   3. With `X-Privasys-Tools: web_reader` set on a
 *      /v1/chat/completions request that contains a URL, the
 *      confidential-ai agent loop emits `tool_calls` (the model
 *      decides to invoke `web_reader__browse`) and the SSE stream
 *      surfaces a `tool_result` event before the assistant finishes.
 *
 * Run:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     chat-ai-tools.spec.ts --project=chat-ai-tools --no-deps
 */
import { test, expect, request } from '@playwright/test';

const INSTANCE_API =
    process.env.CHAT_INSTANCE_API ||
    'https://api-test.developer.privasys.org/api/v1/ai/instances/demo';
const ENDPOINT_OVERRIDE = process.env.CHAT_INFERENCE_ENDPOINT || '';
const API_BASE =
    process.env.CHAT_API_BASE || 'https://api-test.developer.privasys.org';

const TOOL_NAME = 'web_reader';

test('ai-tools: instance API publishes web_reader in available_tools', async () => {
    const ctx = await request.newContext();
    const resp = await ctx.get(INSTANCE_API);
    expect(resp.ok(), `instance API ${INSTANCE_API} returned ${resp.status()}`).toBeTruthy();
    const body = await resp.json();

    const tools: Array<{
        id: string;
        name: string;
        label: string;
        transport: string;
        attest_url?: string;
        enabled_default?: boolean;
    }> = body.available_tools ?? [];
    expect(tools.length, 'available_tools[] is empty').toBeGreaterThan(0);

    const web_reader = tools.find((t) => t.name === TOOL_NAME);
    expect(web_reader, `no available_tools entry for '${TOOL_NAME}'`).toBeTruthy();
    expect(web_reader!.transport).toBe('privasys_http');
    expect(web_reader!.attest_url, 'web_reader missing attest_url').toBeTruthy();
    expect(web_reader!.attest_url).toMatch(/^\/api\/v1\/apps\/[0-9a-f-]+\/attest$/);
});

test('ai-tools: web_reader attest_url is reachable via mgmt-service', async () => {
    const ctx = await request.newContext();
    const meta = await (await ctx.get(INSTANCE_API)).json();
    const tool = (meta.available_tools ?? []).find(
        (t: { name: string }) => t.name === TOOL_NAME
    );
    expect(tool, 'web_reader tool missing').toBeTruthy();

    const url = `${API_BASE.replace(/\/$/, '')}${tool.attest_url}`;
    const resp = await ctx.get(url);
    expect(
        resp.ok(),
        `attest_url ${url} returned ${resp.status()} - is the LightPanda app deployed and reachable from the mgmt-service VM?`
    ).toBeTruthy();

    // Shape check: the attest payload should at least carry an
    // x509 PEM and the Privasys OID extensions array. We don't
    // verify the quote here (chat-thinking covers that path); we
    // only assert the proxy is wired and returning JSON.
    const body = await resp.json();
    expect(body, 'attest body empty').toBeTruthy();
});

test('ai-tools: agent loop fires web_reader__browse on a URL prompt', async () => {
    test.setTimeout(120_000);
    const ctx = await request.newContext();
    const meta = await (await ctx.get(INSTANCE_API)).json();
    const endpoint: string = ENDPOINT_OVERRIDE || meta.endpoint;
    const model: string = meta.available_models?.[0]?.name;
    expect(model, 'no model in instance API').toBeTruthy();

    const t0 = Date.now();
    const url = `${endpoint.replace(/\/$/, '')}/v1/chat/completions`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            // The chat front-end forwards the user's enabled tool set
            // here. Empty / missing -> agent loop is bypassed
            // (proxyStream path). Comma-separated server names ->
            // agent loop opens with only that subset advertised.
            'X-Privasys-Tools': TOOL_NAME
        },
        body: JSON.stringify({
            model,
            stream: true,
            max_tokens: 1500,
            temperature: 0,
            seed: 0,
            messages: [
                {
                    role: 'system',
                    content:
                        'You are Privasys Chat, a helpful assistant. When the user shares a URL, call the web_reader__browse tool to fetch it before answering.'
                },
                {
                    role: 'user',
                    content:
                        'Please fetch https://example.com and summarise the page in one sentence.'
                }
            ]
        })
    });
    expect(res.ok, `chat completions returned ${res.status}`).toBeTruthy();
    expect(res.body, 'no body stream').toBeTruthy();

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const dec = new TextDecoder();
    let toolCallSeen = false;
    let toolResultSeen = false;
    const events: string[] = [];
    let buf = '';
    let currentEvent: string | null = null;

    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        buf += dec.decode(value, { stream: true });

        // SSE frame parser: lines split by \n, frames split by \n\n.
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.startsWith('event: ')) {
                currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
                const payload = line.slice(6).trim();
                if (currentEvent) {
                    events.push(currentEvent);
                    if (
                        currentEvent === 'tool_call' ||
                        currentEvent === 'tool_call_pending'
                    ) {
                        toolCallSeen = true;
                    }
                    if (currentEvent === 'tool_result') {
                        toolResultSeen = true;
                    }
                    currentEvent = null;
                } else {
                    // Fall back to OpenAI chunk parsing for the case
                    // where confidential-ai forwards raw vLLM chunks
                    // (older proxy revisions).
                    if (payload && payload !== '[DONE]') {
                        try {
                            const j = JSON.parse(payload);
                            const tc = j.choices?.[0]?.delta?.tool_calls;
                            if (Array.isArray(tc) && tc.length > 0) {
                                toolCallSeen = true;
                            }
                        } catch {
                            /* ignore */
                        }
                    }
                }
            } else if (line === '') {
                currentEvent = null;
            }
        }
    }

    /* eslint-disable no-console */
    console.log(
        `[chat-ai-tools] events=${events.length} unique=${[...new Set(events)].join(',')} took=${Date.now() - t0}ms`
    );
    /* eslint-enable no-console */

    expect(
        toolCallSeen,
        `agent loop did not emit any tool_call event in ${events.length} SSE events: ${[...new Set(events)].join(',')}`
    ).toBeTruthy();
    expect(
        toolResultSeen,
        `no tool_result event surfaced after ${events.length} SSE events: ${[...new Set(events)].join(',')}`
    ).toBeTruthy();
});
