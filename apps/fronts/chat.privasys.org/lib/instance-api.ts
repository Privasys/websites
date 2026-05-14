// chat.privasys.org instance discovery client.
//
// Talks to the Privasys management-service `/api/v1/ai/instances/{idOrAlias}`
// endpoint added in See `platform/management-service/fleets.go`).
// The chat UI never speaks to a specific GPU VM - this lookup hands back
// the fleet's orchestrator endpoint plus the model menu and auth requirements.

import type { AvailableModel, Instance } from './types';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.developer.privasys.org';

/**
 * Fetch a chat instance by its public id or alias.
 *
 * Throws on HTTP error. Public endpoint, no auth header sent.
 */
export async function fetchInstance(idOrAlias: string, signal?: AbortSignal): Promise<Instance> {
    const url = `${API_BASE_URL}/api/v1/ai/instances/${encodeURIComponent(idOrAlias)}`;
    const res = await fetch(url, {
        signal,
        headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
        if (res.status === 404) {
            throw new InstanceNotFoundError(idOrAlias);
        }
        throw new Error(`Instance lookup failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export class InstanceNotFoundError extends Error {
    constructor(public idOrAlias: string) {
        super(`chat instance not found: ${idOrAlias}`);
        this.name = 'InstanceNotFoundError';
    }
}

/** Convenience: pick the model the picker should preselect. */
export function pickInitialModel(instance: Instance): AvailableModel | null {
    if (instance.loaded_model) return instance.loaded_model;
    return instance.available_models.find((m) => m.loaded) ?? instance.available_models[0] ?? null;
}

/**
 * Best-effort liveness probe for an enclave endpoint.
 *
 * Hits `GET {endpoint}/healthz` (unauthenticated, served by
 * `platform/confidential-ai/internal/handler/handler.go`) with a hard
 * timeout. Returns `true` only when the back-end answers — any
 * non-2xx (e.g. 502 from the gateway when the VM is down), TLS
 * failure, network error, or timeout returns `false`.
 *
 * The chat page calls this before rendering the composer so users
 * are not invited to type a prompt against an unreachable enclave
 * (and then made to wait several seconds for the gateway's 502).
 */
export async function probeInstanceHealth(
    endpoint: string,
    timeoutMs: number
): Promise<boolean> {
    if (!endpoint) return false;
    const url = `${endpoint.replace(/\/$/, '')}/healthz`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: 'GET',
            signal: ctrl.signal,
            cache: 'no-store',
            // /healthz is unauthenticated; we don't need cookies.
            credentials: 'omit',
            headers: { Accept: 'application/json' }
        });
        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Poll the enclave's `/healthz` until the requested model is fully
 * loaded (or the deadline expires). Used by the chat panel to
 * automatically retry a prompt that was rejected with
 * `503 Model is loading` after a Spot-VM cold start.
 *
 * Resolves with `true` once `/healthz` reports `model_state === 'ready'`
 * AND `model === requestedModel` (so we don't accidentally retry while
 * a different model is finishing its load). Resolves with `false` on
 * timeout or persistent network error. Honours `signal` so the caller
 * can cancel when the user aborts the conversation.
 *
 * Implementation note: we deliberately use `/healthz` instead of the
 * mgmt-service `/instances/{alias}` endpoint because (a) it is one
 * round-trip, (b) it goes directly to the enclave so it reflects real
 * model state without the 30s runtime-status push lag, and (c) it
 * stays inside the same trust boundary the chat session is already
 * using for `/v1/chat/completions`.
 */
export async function waitForModelReady(
    endpoint: string,
    requestedModel: string,
    opts: {
        timeoutMs: number;
        intervalMs?: number;
        signal?: AbortSignal;
        onTick?: (elapsedMs: number) => void;
    }
): Promise<boolean> {
    const interval = opts.intervalMs ?? 5_000;
    const url = `${endpoint.replace(/\/$/, '')}/healthz`;
    const startedAt = Date.now();

    // Tight loop with `await new Promise(setTimeout)` so we cooperate
    // with React's scheduler and surface elapsed time to the UI.
    while (Date.now() - startedAt < opts.timeoutMs) {
        if (opts.signal?.aborted) return false;
        try {
            const ctrl = new AbortController();
            const subSignal = opts.signal;
            const onAbort = () => ctrl.abort();
            subSignal?.addEventListener('abort', onAbort, { once: true });
            const t = setTimeout(() => ctrl.abort(), Math.min(interval, 8_000));
            try {
                const res = await fetch(url, {
                    method: 'GET',
                    signal: ctrl.signal,
                    cache: 'no-store',
                    credentials: 'omit',
                    headers: { Accept: 'application/json' }
                });
                if (res.ok) {
                    const body = (await res.json().catch(() => null)) as
                        | { model_state?: string; model?: string }
                        | null;
                    if (
                        body?.model_state === 'ready' &&
                        (body.model === requestedModel || !body.model)
                    ) {
                        return true;
                    }
                }
            } finally {
                clearTimeout(t);
                subSignal?.removeEventListener('abort', onAbort);
            }
        } catch {
            // Network blip — keep polling until deadline.
        }
        opts.onTick?.(Date.now() - startedAt);
        await new Promise((r) => setTimeout(r, interval));
    }
    return false;
}
