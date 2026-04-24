'use client';

import type { AvailableModel, Instance } from '~/lib/types';

// Phase 7.2 model picker rules (per ai-plan.md):
// - Single-model fleet (multi_model = false): show the loaded model as
//   read-only label.
// - Multi-model fleet (multi_model = true): show a select with all
//   `available_models`. Disable entries where loadable = false.
export function ModelPicker({
    instance,
    selected,
    onSelect,
}: {
    instance: Instance;
    selected: AvailableModel | null;
    onSelect: (m: AvailableModel) => void;
}) {
    if (!instance.multi_model) {
        return (
            <span className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200">
                {selected?.name ?? 'no model'}
            </span>
        );
    }

    return (
        <select
            value={selected?.name ?? ''}
            onChange={(e) => {
                const next = instance.available_models.find((m) => m.name === e.target.value);
                if (next) onSelect(next);
            }}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100"
        >
            {instance.available_models.map((m) => (
                <option key={m.name} value={m.name} disabled={!m.loadable && !m.loaded}>
                    {m.name}
                    {m.loaded ? ' (loaded)' : !m.loadable ? ' (unavailable)' : ''}
                </option>
            ))}
        </select>
    );
}
