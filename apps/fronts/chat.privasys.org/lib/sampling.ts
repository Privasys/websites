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

// Defaults. `seed` is deliberately UNSET: the confidential-ai proxy
// picks a random seed per request and returns it in the reproducibility
// block, so a replay can pin it — sending seed=0 from the UI silently
// pinned every conversation to the same seed and defeated that flow.
// Set a seed here (Advanced panel) only to force a specific replay.
export const DEFAULT_SAMPLING: SamplingParams = {
    temperature: 1.0,
    top_p: 1.0
};
