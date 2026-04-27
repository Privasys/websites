// Sampling parameters surfaced in the composer's "advanced" panel.
// Mirrors the subset of OpenAI / vLLM fields that matter for
// reproducibility demos.
export interface SamplingParams {
    seed?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
}

// Defaults match what the confidential-ai proxy injects today
// (see internal/handler/handler.go: seed=0, temperature=1.0,
// top_p=1.0). max_tokens is left unset to mean "model default".
export const DEFAULT_SAMPLING: SamplingParams = {
    seed: 0,
    temperature: 1.0,
    top_p: 1.0,
};
