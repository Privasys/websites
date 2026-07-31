'use client';

// Generic renderer for a tool's settings document (lib/tool-settings.ts).
// The schema drives everything: booleans become toggle rows, arrays with
// materialised options become checklists, x-group draws section labels and
// x-superseded-by greys fields covered by a broader switch. NOTHING here
// knows about any particular tool — Drive's Memory panel renders from the
// same code path as any future rich MCP server.

import type { ReactNode } from 'react';
import { fieldOrder, fieldSuperseded, type ToolSettingsDoc } from '~/lib/tool-settings';

export function ToolSettingsFields({
    doc,
    busyKey,
    onSetValue,
    disabled,
    compact
}: {
    doc: ToolSettingsDoc;
    busyKey: string | null;
    onSetValue: (key: string, value: unknown) => void | Promise<void>;
    /** Grey the whole surface (e.g. the tool's master switch is off). */
    disabled?: boolean;
    /** Popover density: tighter rows, no boxed cards. */
    compact?: boolean;
}) {
    const props = doc.schema?.properties ?? {};
    const values = doc.values ?? {};
    const order = fieldOrder(doc);

    let lastGroup: string | undefined;
    const out: ReactNode[] = [];
    for (const key of order) {
        const f = props[key];
        if (!f) continue;
        const group = f['x-group'];
        if (group && group !== lastGroup) {
            out.push(<GroupLabel key={`g-${group}`} compact={compact}>{group}</GroupLabel>);
            lastGroup = group;
        }
        const superseded = fieldSuperseded(doc, f);
        const supersederTitle = f['x-superseded-by']
            ? props[f['x-superseded-by']]?.title ?? f['x-superseded-by']
            : undefined;
        const rowDisabled = disabled || superseded || f['x-disabled'] || busyKey === key;

        if (f.type === 'boolean') {
            const on = superseded ? true : values[key] === true;
            out.push(
                <FieldRow
                    key={key}
                    compact={compact}
                    title={f.title ?? key}
                    description={
                        f['x-disabled']
                            ? f['x-disabled-reason'] ?? f.description
                            : superseded
                                ? `Included via “${supersederTitle}”.`
                                : f.description
                    }
                    control={<Toggle on={on} disabled={rowDisabled} onChange={(v) => void onSetValue(key, v)} />}
                />
            );
            continue;
        }
        if (f.type === 'array') {
            const selected = new Set(Array.isArray(values[key]) ? (values[key] as string[]) : []);
            const options = f['x-options'] ?? [];
            if (options.length === 0) {
                out.push(
                    <p key={key} className={`text-[var(--color-text-muted)] ${compact ? 'px-3 py-1.5 text-[11px]' : 'px-1 py-2 text-sm'}`}>
                        {f.description ?? 'Nothing available yet.'}
                    </p>
                );
                continue;
            }
            for (const opt of options) {
                const on = superseded ? true : selected.has(opt.value);
                out.push(
                    <FieldRow
                        key={`${key}:${opt.value}`}
                        compact={compact}
                        title={opt.label}
                        description={superseded ? `Included via “${supersederTitle}”.` : undefined}
                        control={
                            <Toggle
                                on={on}
                                disabled={rowDisabled}
                                onChange={(v) => {
                                    const next = new Set(selected);
                                    if (v) next.add(opt.value);
                                    else next.delete(opt.value);
                                    void onSetValue(key, [...next]);
                                }}
                            />
                        }
                    />
                );
            }
            continue;
        }
        // Unknown field types are skipped (forward compatibility).
    }
    return <div className={disabled ? 'opacity-50' : undefined}>{out}</div>;
}

function GroupLabel({ children, compact }: { children: ReactNode; compact?: boolean }) {
    return (
        <p className={`font-medium tracking-wider text-[var(--color-text-muted)] uppercase ${
            compact ? 'px-3 pt-2 pb-0.5 text-[10px]' : 'mt-6 mb-2 px-1 text-[11px]'
        }`}>
            {children}
        </p>
    );
}

function FieldRow({
    title,
    description,
    control,
    compact
}: {
    title: string;
    description?: string;
    control: ReactNode;
    compact?: boolean;
}) {
    if (compact) {
        return (
            <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--color-text-primary)]">{title}</p>
                    {description && (
                        <p className="text-[11px] leading-4 text-[var(--color-text-muted)]">{description}</p>
                    )}
                </div>
                <div className="shrink-0">{control}</div>
            </div>
        );
    }
    return (
        <div className="mb-2 flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] px-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
                {description && (
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
                )}
            </div>
            <div className="shrink-0">{control}</div>
        </div>
    );
}

export function Toggle({
    on,
    disabled,
    onChange
}: {
    on: boolean;
    disabled?: boolean;
    onChange: (_on: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(!on)}
            className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
                on
                    ? 'bg-[var(--color-primary-blue)]'
                    : 'bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border-dark)] ring-inset'
            }`}
        >
            <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    on ? 'translate-x-4' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}
