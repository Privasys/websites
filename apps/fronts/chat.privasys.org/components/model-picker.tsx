'use client';

import type { AvailableModel, Instance } from '~/lib/types';
import { modelLabel } from '~/lib/model-label';

// Compact pill-style model picker that lives inside the composer
// (Gemini bottom-right pattern). Single-model fleet → read-only label.
//
// `name` is the canonical id served by vLLM (e.g. "gemma4-31b") and is
// what we send on the wire unchanged. The optional `label` published by
// the back-end (e.g. "Gemma 4 31B") is used purely for display via
// modelLabel().
export function ModelPicker({
    instance,
    selected,
    onSelect
}: {
    instance: Instance;
    selected: AvailableModel | null;
    onSelect: (m: AvailableModel) => void;
}) {
    const baseClass =
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]';

    if (!instance.multi_model) {
        return (
            <span className={baseClass}>
                {selected ? modelLabel(selected) : 'no model'}
            </span>
        );
    }

    return (
        <label className="relative">
            <select
                value={selected?.name ?? ''}
                onChange={(e) => {
                    const next = instance.available_models.find((m) => m.name === e.target.value);
                    if (next) onSelect(next);
                }}
                className={`${baseClass} cursor-pointer appearance-none bg-transparent pr-5 outline-none focus:text-[var(--color-text-primary)]`}
            >
                {instance.available_models.map((m) => (
                    <option key={m.name} value={m.name} disabled={!m.loadable && !m.loaded}>
                        {modelLabel(m)}
                        {m.loaded ? ' • loaded' : !m.loadable ? ' • unavailable' : ''}
                    </option>
                ))}
            </select>
            <svg
                className="pointer-events-none absolute top-1/2 right-1 h-3 w-3 -translate-y-1/2 text-[var(--color-text-muted)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polyline points="6 9 12 15 18 9" />
            </svg>
        </label>
    );
}
