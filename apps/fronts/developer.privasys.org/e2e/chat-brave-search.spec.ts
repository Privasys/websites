/**
 * E2E for the Brave Search AI Tool wired into the confidential-ai-demo
 * fleet. The user-facing prompt under test is the same one you can
 * paste into chat-test.privasys.org with Brave Search enabled:
 *
 *   "Please read privasys doc on enclave os and give me your opinion."
 *
 * Asserts:
 *   1. The public instance discovery endpoint advertises
 *      `brave_search` in `available_tools[]` (the chat sidebar reads
 *      this list to render the tool toggle).
 *   2. The Brave-Search app's attestation is reachable through the
 *      management-service proxy at the URL the discovery endpoint
 *      hands back (this is the request that surfaces as "Attest
 *      request failed: 502" when broken).
 *   3. With `X-Privasys-Tools: brave_search` on a
 *      /v1/chat/completions request asking the model to read a doc,
 *      the confidential-ai agent loop emits a `tool_call` (model
 *      decides to invoke `brave_search__*`) and the SSE stream
 *      surfaces a `tool_result` event before the assistant finishes —
 *      proving the tool actually executed against the web and the
 *      result flowed back into the model.
 *
 * Run:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     chat-brave-search.spec.ts --project=chat-brave-search --no-deps
 */
import { test, expect, request } from '@playwright/test';

const INSTANCE_API =
    process.env.CHAT_INSTANCE_API ||
    'https://api-test.developer.privasys.org/api/v1/ai/instances/demo';
const ENDPOINT_OVERRIDE = process.env.CHAT_INFERENCE_ENDPOINT || '';
const API_BASE =
    process.env.CHAT_API_BASE || 'https://api-test.developer.privasys.org';

const TOOL_NAME = 'brave_search';
const USER_PROMPT =
    'Please read privasys doc on enclave os and give me your opinion.';

test('brave-search: instance API publishes brave_search in available_tools', async () => {
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

    const brave = tools.find((t) => t.name === TOOL_NAME);
    expect(brave, `no available_tools entry for '${TOOL_NAME}'`).toBeTruthy();
    expect(brave!.transport).toBe('privasys_http');
    expect(brave!.attest_url, 'brave_search missing attest_url').toBeTruthy();
    expect(brave!.attest_url).toMatch(/^\/api\/v1\/apps\/[0-9a-f-]+\/attest$/);
});

test('brave-search: attest_url is reachable via mgmt-service', async () => {
    const ctx = await request.newContext();
    const meta = await (await ctx.get(INSTANCE_API)).json();
    const tool = (meta.available_tools ?? []).find(
        (t: { name: string }) => t.name === TOOL_NAME
    );
    expect(tool, 'brave_search tool missing').toBeTruthy();

    const url = `${API_BASE.replace(/\/$/, '')}${tool.attest_url}`;
    const resp = await ctx.get(url);
    expect(
        resp.ok(),
        `attest_url ${url} returned ${resp.status()} — is the Brave-Search app deployed and reachable from mgmt-service? This is the failure that surfaces as "Attest request failed: 502" in the chat UI.`
    ).toBeTruthy();

    // Shape sanity-check: the attest payload must carry the quote
    // raw_base64 + an x509 PEM (it's what use-attestation.ts feeds
    // into /verify-quote and the cert OID extraction logic).
    const body = await resp.json();
    expect(body, 'attest body empty').toBeTruthy();
    expect(body.quote?.raw_base64, 'attest body missing quote.raw_base64').toBeTruthy();
    expect(body.certificate || body.cert_pem || body.cert, 'attest body missing certificate').toBeTruthy();
});

test('brave-search: agent loop fires brave_search on a doc-reading prompt', async () => {
    test.setTimeout(180_000);
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
            // here. With 'brave_search', the agent loop opens with
            // ONLY the Brave Search MCP server advertised, so any
            // tool_call we observe in the SSE stream must be from
            // brave_search__*.
            'X-Privasys-Tools': TOOL_NAME
        },
        body: JSON.stringify({
            model,
            stream: true,
            // Brave Search round-trips can pull large pages back into
            // the model context; budget enough tokens for the agent
            // loop to do at least one tool call + a non-trivial
            // post-tool answer without truncation.
            max_tokens: 2000,
            temperature: 0,
            seed: 0,
            messages: [
                {
                    role: 'system',
                    content:
                        // Production chat-shell system prompt minus
                        // wallet-specific bits. The "use the brave_search
                        // tool" nudge mirrors what the chat UI ships
                        // when a tool is toggled on.
                        'You are Privasys Chat, a helpful assistant. When the user asks you to read documentation or otherwise look up information on the web, call the brave_search tool to fetch it before answering.'
                },
                { role: 'user', content: USER_PROMPT }
            ]
        })
    });
    expect(res.ok, `chat completions returned ${res.status}`).toBeTruthy();
    expect(res.body, 'no body stream').toBeTruthy();

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const dec = new TextDecoder();
    let toolCallSeen = false;
    let toolResultSeen = false;
    let toolName = '';
    let assistantText = '';
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
                        try {
                            const j = JSON.parse(payload);
                            toolName = toolName || j?.name || j?.function?.name || '';
                        } catch {
                            /* ignore */
                        }
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
                                const name =
                                    tc[0]?.function?.name ?? tc[0]?.name ?? '';
                                if (name) toolName = toolName || name;
                            }
                            const c = j.choices?.[0]?.delta?.content;
                            if (typeof c === 'string') assistantText += c;
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
        `[brave-search] events=${events.length} unique=${[...new Set(events)].join(',')} tool=${toolName} took=${Date.now() - t0}ms answerLen=${assistantText.length}`
    );
    /* eslint-enable no-console */

    expect(
        toolCallSeen,
        `agent loop did not emit any tool_call event for the brave_search prompt. SSE events: ${[...new Set(events)].join(',')}. This is the failure that surfaces as "no tool call" in the chat UI.`
    ).toBeTruthy();
    expect(
        toolResultSeen,
        `no tool_result event surfaced — brave_search either errored out or the MCP relay dropped the response. SSE events: ${[...new Set(events)].join(',')}.`
    ).toBeTruthy();
    if (toolName) {
        expect(
            toolName.toLowerCase(),
            `tool_call invoked '${toolName}' but the only enabled tool was '${TOOL_NAME}'`
        ).toContain('brave');
    }
});
