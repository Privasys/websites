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
 * A fleet counts as "serving" when some enclave in it currently has a
 * model loaded and its inference proxy is ready — exactly the signal the
 * management-service folds into `available_models[].loaded` /
 * `loaded_model` from each enclave's runtime-status push.
 */
function instanceIsServing(inst: Instance): boolean {
    if (inst.loaded_model) return true;
    return (inst.available_models ?? []).some((m) => m.loaded);
}

/**
 * Best-effort liveness probe for a chat fleet.
 *
 * Asks the MANAGEMENT-SERVICE (public TLS) whether the fleet is serving —
 * never the enclave directly. The enclave presents a self-signed RA-TLS
 * certificate the browser cannot validate: real chat traffic reaches it only
 * through the sealed session / gateway, so a plain `fetch` from the browser to
 * the enclave's `/healthz` always fails (TLS authority error). The mgmt
 * `/api/v1/ai/instances/{idOrAlias}` payload folds in each enclave's
 * runtime-status, so a loaded model means the fleet is up and answering.
 *
 * The chat page calls this before rendering the composer so users are not
 * invited to type a prompt against an unreachable or still-loading fleet.
 */
export async function probeInstanceHealth(
    idOrAlias: string,
    timeoutMs: number
): Promise<boolean> {
    if (!idOrAlias) return false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const inst = await fetchInstance(idOrAlias, ctrl.signal);
        return instanceIsServing(inst);
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Poll until the requested model is loaded on the fleet (or the deadline
 * expires). Used by the chat panel to automatically retry a prompt that was
 * rejected with `503 Model is loading` after a Spot-VM cold start.
 *
 * Like {@link probeInstanceHealth}, this reads model state from the
 * management-service (public TLS), NOT the enclave's `/healthz` directly —
 * the browser cannot validate the enclave's self-signed RA-TLS cert. The
 * trade-off is up to one runtime-status push (~30s) of staleness, which is
 * acceptable for a cold-start retry. Resolves `true` once the fleet reports
 * `requestedModel` loaded, `false` on timeout. Honours `signal`.
 */
export async function waitForModelReady(
    idOrAlias: string,
    requestedModel: string,
    opts: {
        timeoutMs: number;
        intervalMs?: number;
        signal?: AbortSignal;
        onTick?: (_elapsedMs: number) => void;
    }
): Promise<boolean> {
    const interval = opts.intervalMs ?? 5_000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < opts.timeoutMs) {
        if (opts.signal?.aborted) return false;
        try {
            const ctrl = new AbortController();
            const subSignal = opts.signal;
            const onAbort = () => ctrl.abort();
            subSignal?.addEventListener('abort', onAbort, { once: true });
            const t = setTimeout(() => ctrl.abort(), Math.min(interval, 8_000));
            try {
                const inst = await fetchInstance(idOrAlias, ctrl.signal);
                const loadedNames = new Set<string>();
                if (inst.loaded_model?.name) loadedNames.add(inst.loaded_model.name);
                for (const m of inst.available_models ?? []) {
                    if (m.loaded) loadedNames.add(m.name);
                }
                if (loadedNames.has(requestedModel)) return true;
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
