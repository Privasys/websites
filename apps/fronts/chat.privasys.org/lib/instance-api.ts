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
        headers: { Accept: 'application/json' },
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
