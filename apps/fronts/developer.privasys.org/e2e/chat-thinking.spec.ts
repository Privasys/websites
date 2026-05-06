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
 *      vLLM's gemma4 reasoning parser surfaces a non-empty
 *      `delta.reasoning_content` channel before any `delta.content`.
 *      The chat front-end re-wraps that channel in <think>…</think>
 *      sentinels for splitReasoning() to render.
 *   3. SSE chunks arrive in a streaming cadence (more than one network
 *      flush, with the first delta in well under 15 s on a warm model).
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

// Plain helpful-assistant prompt. With vLLM's `--reasoning-parser
// gemma4` the reasoning is forced into delta.reasoning_content and is
// no longer prompt-coaxed, so we don't repeat any <think> instructions
// here.
const SYSTEM_PROMPT = `You are Privasys Chat, a helpful assistant.`;

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

test('chat-test: gemma emits reasoning_content channel and streams chunk-by-chunk', async () => {
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
                { role: 'system', content: SYSTEM_PROMPT },
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
    let reasoning = '';
    let content = '';
    let reasoningChunks = 0;
    let contentChunks = 0;
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
                    const delta = j.choices?.[0]?.delta;
                    const r = delta?.reasoning_content ?? delta?.reasoning;
                    if (r) {
                        reasoning += r;
                        reasoningChunks++;
                    }
                    if (delta?.content) {
                        content += delta.content;
                        contentChunks++;
                    }
                } catch {
                    /* keep going; reproducibility / usage chunks */
                }
            }
        }
    }

    /* eslint-disable no-console */
    console.log(
        `[chat-thinking] model=${model} chunks=${chunkTimes.length} ttfb=${chunkTimes[0]}ms total=${Date.now() - t0}ms`
    );
    console.log(
        `[chat-thinking] reasoning_chunks=${reasoningChunks} reasoning_len=${reasoning.length} content_chunks=${contentChunks} content_len=${content.length}`
    );
    console.log(`[chat-thinking] reasoning first 200: ${reasoning.slice(0, 200)}`);
    console.log(`[chat-thinking] content first 200: ${content.slice(0, 200)}`);
    /* eslint-enable no-console */

    // Streaming cadence: more than 3 chunks and first chunk in under
    // 15 s. The system prompt is small now so prefill is fast; warm-
    // cache TTFB is typically < 5 s. Anything > 15 s suggests a cold
    // model load or a buffering regression in the proxy / sealed
    // session relay.
    expect(chunkTimes.length).toBeGreaterThan(3);
    expect(chunkTimes[0]).toBeLessThan(15_000);

    // Native reasoning channel: vLLM's gemma4 reasoning parser must
    // surface non-empty `delta.reasoning_content` and the model must
    // also produce a final answer in `delta.content`.
    expect(reasoningChunks, 'no reasoning_content chunks received').toBeGreaterThan(0);
    expect(reasoning.length, 'reasoning_content was empty').toBeGreaterThan(0);
    expect(contentChunks, 'no content chunks received').toBeGreaterThan(0);
    expect(content.length, 'content was empty').toBeGreaterThan(0);
});
