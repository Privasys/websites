// Shape of the JSON returned by
// GET /api/v1/ai/instances/{idOrAlias} on management-service.
// Mirrors `platform/management-service/fleets.go` GetInstance.

export type Modality = 'text' | 'text+image' | 'text+image+audio' | string;

export interface AvailableModel {
    name: string;
    label?: string;
    digest: string;
    modality: Modality;
    loaded: boolean;
    loadable: boolean;
}

export interface InstanceAuth {
    required: boolean;
    issuer: string;
}

export interface Instance {
    id: string;
    alias: string | null;
    fleet_id: string;
    endpoint: string;
    multi_model: boolean;
    loaded_model: AvailableModel | null;
    available_models: AvailableModel[];
    auth: InstanceAuth;
    attestation_server: string;
    /**
     * Path on the management-service that returns this instance's RA-TLS
     * attestation result (e.g. `/api/v1/apps/<id>/attest`). The chat UI
     * resolves it against `NEXT_PUBLIC_API_BASE_URL`. Empty when no app
     * is currently deployed on the fleet.
     */
    attest_url?: string;
}
