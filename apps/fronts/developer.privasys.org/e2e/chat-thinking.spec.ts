/**
 * E2E for chat-test thinking + streaming behaviour.
 *
 * Tests the public confidential-ai-demo endpoint directly (no wallet
 * needed) to assert two things end-to-end on the deployed test fleet:
 *
 *   1. The model id advertised at /api/v1/ai/instances/demo matches the
 *      `--served-model-name` vLLM is exposing (proves the model-name
 *      regression fix is live).
 *   2. With the production system prompt and a non-trivial question,
 *      Gemma 4 emits a `<think>...</think>` block in the streamed
 *      content (which the chat UI renders as a collapsible "Thinking"
 *      panel via splitReasoning()).
 *   3. SSE chunks arrive in a streaming cadence (more than one network
 *      flush, with the first delta in well under 5 s on a warm model).
 *
 * Run:
 *   npx playwright test --config apps/fronts/developer.privasys.org/e2e/playwright.config.ts \
 *     chat-thinking.spec.ts --project=chat-thinking --no-deps
 */
import { test, expect, request } from '@playwright/test';

const INSTANCE_API =
    process.env.CHAT_INSTANCE_API ||
    'https://api-test.developer.privasys.org/api/v1/ai/instances/demo';
const ENDPOINT_OVERRIDE = process.env.CHAT_INFERENCE_ENDPOINT || '';

// Mirror lib/system-prompt.ts. Kept inline so the test does not import
// from the chat front-end (which has React/Next deps not wanted here).
const THINKING_SYSTEM_PROMPT = `You are Privasys Chat, a helpful assistant.

Reasoning
- For any question that benefits from multi-step reasoning, planning, or
  fact-checking, FIRST emit a brief private thought wrapped in
  <think>...</think> tags, then write the final answer for the user
  outside the tags.
- Keep the <think> block short (1-5 short sentences).
`;

test('chat-test: instance API publishes a model name vLLM actually serves', async () => {
    const ctx = await request.newContext();
    const resp = await ctx.get(INSTANCE_API);
    expect(resp.ok(), `instance API ${INSTANCE_API} returned ${resp.status()}`).toBeTruthy();
    const body = await resp.json();
    const models: Array<{ name: string }> = body.available_models ?? [];
    expect(models.length, 'available_models is empty').toBeGreaterThan(0);
    const endpoint: string = body.endpoint;
    expect(endpoint).toMatch(/^https:\/\//);

    // Cross-check against vLLM's /v1/models so we never silently drift.
    const inference = ENDPOINT_OVERRIDE || endpoint;
    const list = await ctx.get(`${inference.replace(/\/$/, '')}/v1/models`);
    expect(list.ok(), `vLLM /v1/models ${inference} returned ${list.status()}`).toBeTruthy();
    const listed: Array<{ id: string }> = (await list.json()).data ?? [];
    const served = new Set(listed.map((m) => m.id));
    for (const m of models) {
        expect(
            served.has(m.name),
            `available_models[].name="${m.name}" is not served by vLLM (served: ${[...served].join(', ')})`
        ).toBeTruthy();
    }
});

test('chat-test: gemma emits <think> block and streams chunk-by-chunk', async () => {
    test.setTimeout(60_000);
    const ctx = await request.newContext();
    const meta = await (await ctx.get(INSTANCE_API)).json();
    const endpoint: string = ENDPOINT_OVERRIDE || meta.endpoint;
    const model: string = meta.available_models?.[0]?.name;
    expect(model, 'no model in instance API').toBeTruthy();

    // Use raw fetch to capture per-chunk timings; Playwright's request
    // API buffers the whole body which would mask the streaming cadence.
    const t0 = Date.now();
    const url = `${endpoint.replace(/\/$/, '')}/v1/chat/completions`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream'
        },
        body: JSON.stringify({
            model,
            stream: true,
            max_tokens: 256,
            temperature: 0,
            seed: 0,
            messages: [
                { role: 'system', content: THINKING_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content:
                        'A train leaves Paris at 14:00 going 120 km/h and another leaves Lyon at 14:30 going 90 km/h on the same 460 km track toward each other. When and where do they meet? Show your reasoning briefly.'
                }
            ]
        })
    });
    expect(res.ok, `chat completions returned ${res.status}`).toBeTruthy();
    expect(res.body, 'no body stream').toBeTruthy();

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const dec = new TextDecoder();
    let full = '';
    const chunkTimes: number[] = [];
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
            chunkTimes.push(Date.now() - t0);
            const text = dec.decode(value, { stream: true });
            for (const line of text.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const payload = line.slice(6).trim();
                if (!payload || payload === '[DONE]') continue;
                try {
                    const j = JSON.parse(payload);
                    const delta = j.choices?.[0]?.delta?.content;
                    if (delta) full += delta;
                } catch {
                    /* keep going; reproducibility / usage chunks */
                }
            }
        }
    }

    /* eslint-disable no-console */
    console.log(`[chat-thinking] model=${model} chunks=${chunkTimes.length} ttfb=${chunkTimes[0]}ms total=${Date.now() - t0}ms`);
    console.log(`[chat-thinking] response length=${full.length}`);
    console.log(`[chat-thinking] first 400 chars: ${full.slice(0, 400)}`);
    /* eslint-enable no-console */

    // Streaming cadence: more than 1 chunk and first chunk in under
    // 15 s. The big system prompt (~600 tokens) makes prefill take a
    // few seconds even on H100; warm-cache TTFB on chat-test is
    // typically 4-6 s for this prompt class. Anything > 15 s suggests
    // either a cold model load or a buffering regression.
    expect(chunkTimes.length).toBeGreaterThan(3);
    expect(chunkTimes[0]).toBeLessThan(15_000);

    // Thinking: model must emit at least one <think> open tag. We do
    // NOT require a closing tag here in case max_tokens truncates mid-
    // thought — the front-end's splitReasoning still renders an
    // in-progress thinking panel in that case.
    expect(full.toLowerCase()).toMatch(/<think(ing)?>/);
});
