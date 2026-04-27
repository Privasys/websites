'use client';

import type { SamplingParams } from '~/lib/sampling';
import { DEFAULT_SAMPLING } from '~/lib/sampling';

// Compact editor for sampling parameters. Surfaced inside the
// composer (collapsible) so demo operators can flip seed /
// temperature to show that fixing them produces byte-identical
// replies on the same hardware.
export function SamplingEditor({
    value,
    onChange,
}: {
    value: SamplingParams;
    onChange: (next: SamplingParams) => void;
}) {
    const set = (k: keyof SamplingParams, raw: string) => {
        if (raw === '') {
            const next = { ...value };
            delete next[k];
            onChange(next);
            return;
        }
        const n = Number(raw);
        if (Number.isNaN(n)) return;
        onChange({ ...value, [k]: n });
    };

    return (
        <div className='border-t border-[var(--color-border-dark)] px-4 py-3'>
            <div className='grid grid-cols-2 gap-3 text-xs sm:grid-cols-5'>
                <Field
                    label='seed'
                    step='1'
                    value={value.seed}
                    onChange={(v) => set('seed', v)}
                />
                <Field
                    label='temperature'
                    step='0.1'
                    value={value.temperature}
                    onChange={(v) => set('temperature', v)}
                />
                <Field
                    label='top_p'
                    step='0.05'
                    value={value.top_p}
                    onChange={(v) => set('top_p', v)}
                />
                <Field
                    label='top_k'
                    step='1'
                    value={value.top_k}
                    onChange={(v) => set('top_k', v)}
                    placeholder='auto'
                />
                <Field
                    label='max_tokens'
                    step='32'
                    value={value.max_tokens}
                    onChange={(v) => set('max_tokens', v)}
                    placeholder='auto'
                />
            </div>
            <div className='mt-2 flex items-center justify-end'>
                <button
                    type='button'
                    onClick={() => onChange({ ...DEFAULT_SAMPLING })}
                    className='text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                >
                    Reset to defaults
                </button>
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    step,
    placeholder,
}: {
    label: string;
    value: number | undefined;
    onChange: (raw: string) => void;
    step?: string;
    placeholder?: string;
}) {
    return (
        <label className='flex flex-col gap-1'>
            <span className='text-[var(--color-text-muted)]'>{label}</span>
            <input
                type='number'
                step={step}
                value={value ?? ''}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className='rounded border border-[var(--color-border-dark)] bg-[var(--color-surface-2)] px-2 py-1 text-[var(--color-text-primary)] focus:border-[var(--color-primary-blue)] focus:outline-none'
            />
        </label>
    );
}
