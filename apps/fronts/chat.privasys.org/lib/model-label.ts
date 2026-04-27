// Friendly display name for a model.
//
// The wire `name` is the canonical id the back-end serves under
// vLLM's --served-model-name and accepts in chat-completions
// requests. We never transform `name` for sending; it is forwarded
// verbatim. For display the back-end may publish an optional
// `label` (e.g. "Gemma 4 31B") in the AvailableModel record. When
// no label is provided we fall back to the raw `name`.
import type { AvailableModel } from './types';

export function modelLabel(model: AvailableModel | null | undefined): string {
    if (!model) return '';
    return model.label?.trim() || model.name;
}

