'use client';

// Model + response mode in ONE control.
//
// They were two separate pills, which crowded the composer and split a single
// decision ("what answers this, and how hard does it think?") across two
// affordances. Merged, the bar carries one generation control instead of two,
// and the model name — the widest thing in the bar — is capped rather than
// wrapping the row onto a second line.
//
// The button reads "<model> · <mode>"; the popover lists the models the fleet
// can serve, then the response mode.

import { useState, type ReactNode } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import { modelLabel } from '~/lib/model-label';
import type { ChatMode } from './composer';

export function ModelModePicker({
    instance,
    selected,
    onSelect,
    mode,
    onModeChange
}: {
    instance: Instance;
    selected: AvailableModel | null;
    onSelect: (_m: AvailableModel) => void;
    mode?: ChatMode;
    onModeChange?: (_next: ChatMode) => void;
}) {
    const [open, setOpen] = useState(false);
    const models = instance.available_models ?? [];
    const canSwitchModel = !!instance.multi_model && models.length > 1;
    const showMode = !!mode && !!onModeChange;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((s) => !s)}
                aria-expanded={open}
                title={selected ? modelLabel(selected) : 'No model loaded'}
                className={`inline-flex max-w-[13rem] items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${open ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
                <span className="truncate">{selected ? modelLabel(selected) : 'No model'}</span>
                {showMode && (
                    <span className="hidden shrink-0 text-[var(--color-text-muted)] sm:inline">
                        · {mode === 'fast' ? 'Fast' : 'Thinking'}
                    </span>
                )}
                <ChevronDownIcon />
            </button>

            {open && (
                <>
                    <button
                        type="button"
                        aria-hidden="true"
                        tabIndex={-1}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-10 cursor-default"
                    />
                    <div className="absolute bottom-full left-0 z-20 mb-2 w-72 overflow-hidden rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] py-1 shadow-xl shadow-black/30">
                        {canSwitchModel ? (
                            <>
                                <SectionLabel>Model</SectionLabel>
                                <ul className="py-0.5">
                                    {models.map((m) => {
                                        const usable = m.loadable || m.loaded;
                                        return (
                                            <li key={m.name}>
                                                <button
                                                    type="button"
                                                    disabled={!usable}
                                                    onClick={() => {
                                                        onSelect(m);
                                                        setOpen(false);
                                                    }}
                                                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[var(--color-surface-2)]/60 disabled:cursor-default disabled:opacity-40"
                                                >
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm text-[var(--color-text-primary)]">
                                                            {modelLabel(m)}
                                                        </span>
                                                        <span className="block text-[11px] text-[var(--color-text-muted)]">
                                                            {m.loaded
                                                                ? 'Loaded and ready'
                                                                : m.loadable
                                                                    ? 'Loads on first use'
                                                                    : 'Unavailable on this instance'}
                                                        </span>
                                                    </span>
                                                    {selected?.name === m.name && <CheckIcon />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        ) : (
                            <>
                                <SectionLabel>Model</SectionLabel>
                                <div className="px-3 pt-0.5 pb-1">
                                    <p className="truncate text-sm text-[var(--color-text-primary)]">
                                        {selected ? modelLabel(selected) : 'No model loaded'}
                                    </p>
                                    <p className="text-[11px] text-[var(--color-text-muted)]">
                                        The only model this instance serves.
                                    </p>
                                </div>
                            </>
                        )}

                        {showMode && (
                            <>
                                <div className="mt-1 border-t border-[var(--color-border-dark)]" />
                                <SectionLabel>Response</SectionLabel>
                                <ul className="py-0.5">
                                    <ModeRow
                                        icon={<BoltIcon />}
                                        label="Fast"
                                        description="Answers directly. Best for everyday questions."
                                        active={mode === 'fast'}
                                        onSelect={() => {
                                            onModeChange?.('fast');
                                            setOpen(false);
                                        }}
                                    />
                                    <ModeRow
                                        icon={<ThinkingIcon />}
                                        label="Thinking"
                                        description="Reasons step by step first. Slower, better on hard problems."
                                        active={mode === 'thinking'}
                                        onSelect={() => {
                                            onModeChange?.('thinking');
                                            setOpen(false);
                                        }}
                                    />
                                </ul>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function SectionLabel({ children }: { children: ReactNode }) {
    return (
        <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wider text-[var(--color-text-muted)] uppercase">
            {children}
        </p>
    );
}

function ModeRow({
    icon,
    label,
    description,
    active,
    onSelect
}: {
    icon: ReactNode;
    label: string;
    description: string;
    active: boolean;
    onSelect: () => void;
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-[var(--color-surface-2)]/60"
            >
                <span className={`mt-0.5 ${active ? 'text-[var(--color-primary-blue)]' : 'text-[var(--color-text-muted)]'}`}>
                    {icon}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm text-[var(--color-text-primary)]">{label}</span>
                    <span className="block text-[11px] text-[var(--color-text-muted)]">
                        {description}
                    </span>
                </span>
                {active && <CheckIcon />}
            </button>
        </li>
    );
}

function CheckIcon() {
    return (
        <svg className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--color-primary-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0" aria-hidden>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function BoltIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    );
}

function ThinkingIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M12 5v13" />
        </svg>
    );
}
