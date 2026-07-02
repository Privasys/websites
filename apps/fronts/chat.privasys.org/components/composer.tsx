'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import type { SamplingParams } from '~/lib/sampling';
import type { AddUserToolInput, UserTool } from '~/lib/chat-service-api';
import { ModelPicker } from './model-picker';
import { SamplingEditor } from './sampling-editor';

/** Response mode: 'fast' answers directly, 'thinking' reasons first. */
export type ChatMode = 'fast' | 'thinking';

// Unified composer used both in the empty-state (centered) and in the
// docked footer once a conversation has started. Layout mirrors Gemini:
//   - Single rounded surface
//   - Textarea at the top
//   - Bottom row: attach + model picker (left), send (right)
//
// Model picker lives INSIDE the composer (per design feedback).
export function Composer({
    value,
    onChange,
    onSend,
    onStop,
    streaming,
    instance,
    model,
    onModelChange,
    sampling,
    onSamplingChange,
    mode,
    onModeChange,
    enabledTools,
    onToggleTool,
    userTools,
    onToggleUserTool,
    onAddTool,
    onRemoveUserTool,
    toolPolicy,
    placeholder,
    autoFocus,
    disabledReason
}: {
    value: string;
    onChange: (next: string) => void;
    onSend: () => void;
    onStop?: () => void;
    streaming?: boolean;
    instance: Instance;
    model: AvailableModel | null;
    onModelChange: (m: AvailableModel) => void;
    /** Current sampling parameters (seed, temp, ...). When provided
     *  alongside onSamplingChange, the composer renders an Advanced
     *  toggle that opens an inline editor. */
    sampling?: SamplingParams;
    onSamplingChange?: (next: SamplingParams) => void;
    /** Response mode. 'fast' (default) answers directly; 'thinking' lets
     *  the model reason step by step before answering. When provided with
     *  onModeChange, the composer renders a mode dropdown in the bar. */
    mode?: ChatMode;
    onModeChange?: (next: ChatMode) => void;
    /** Set of currently enabled (admin) tool names. When provided alongside
     *  onToggleTool (and the instance advertises tools), the composer
     *  renders a Tools button next to the prompt — Confer/Claude style —
     *  that opens a popover of per-tool switches. */
    enabledTools?: Set<string>;
    onToggleTool?: (name: string, on: boolean) => void;
    /** The user's own persistent tools (from chat-service). */
    userTools?: UserTool[];
    onToggleUserTool?: (id: string, enabled: boolean) => void | Promise<void>;
    onAddTool?: (input: AddUserToolInput) => Promise<void>;
    onRemoveUserTool?: (id: string) => void | Promise<void>;
    /** Fleet governance: 'locked' | 'enclave_only' | 'open'. Gates adding. */
    toolPolicy?: string;
    placeholder?: string;
    autoFocus?: boolean;
    /**
     * If set, the composer is disabled and a one-line CTA / hint is shown
     * below it (e.g. "Sign in to start chatting").
     */
    disabledReason?: string;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showTools, setShowTools] = useState(false);
    const disabled = !!disabledReason;
    const advancedAvailable = !!sampling && !!onSamplingChange;
    const availableTools = instance.available_tools ?? [];
    const myTools = userTools ?? [];
    const canAddTool = !!onAddTool && !!toolPolicy && toolPolicy !== 'locked';
    const toolsAvailable =
        (availableTools.length > 0 && !!onToggleTool) || myTools.length > 0 || canAddTool;
    const enabledCount =
        availableTools.reduce((n, t) => (enabledTools?.has(t.name) ? n + 1 : n), 0) +
        myTools.reduce((n, t) => (t.enabled ? n + 1 : n), 0);

    // Auto-resize textarea up to ~10 lines.
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 240) + 'px';
    }, [value]);

    useEffect(() => {
        if (autoFocus) textareaRef.current?.focus();
    }, [autoFocus]);

    const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && !streaming) onSend();
        }
    };

    return (
        <div className="w-full">
            <div className="rounded-3xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] shadow-lg shadow-black/20 transition-colors focus-within:border-[var(--color-primary-blue)]/60">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={placeholder ?? 'Type a message…'}
                    rows={1}
                    disabled={disabled}
                    className="block w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] leading-6 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none disabled:opacity-60"
                />

                <div className="flex items-center gap-2 px-3 pt-1 pb-2.5">
                    <button
                        type="button"
                        title="Attach (coming soon)"
                        disabled
                        className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-text-muted)] opacity-50"
                    >
                        <PaperclipIcon />
                    </button>

                    <div className="ml-1">
                        <ModelPicker
                            instance={instance}
                            selected={model}
                            onSelect={onModelChange}
                        />
                    </div>

                    {mode && onModeChange && (
                        <ModeDropdown mode={mode} onChange={onModeChange} />
                    )}

                    {toolsAvailable && (
                        <div className="relative ml-1">
                            <button
                                type="button"
                                onClick={() => setShowTools((s) => !s)}
                                aria-expanded={showTools}
                                title="AI tools"
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${showTools || enabledCount > 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                            >
                                <ToolsIcon />
                                <span className="hidden sm:inline">Tools</span>
                                {enabledCount > 0 && (
                                    <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-primary-blue)] px-1 text-[10px] font-semibold text-white">
                                        {enabledCount}
                                    </span>
                                )}
                            </button>

                            {showTools && (
                                <>
                                    <button
                                        type="button"
                                        aria-hidden="true"
                                        tabIndex={-1}
                                        onClick={() => setShowTools(false)}
                                        className="fixed inset-0 z-10 cursor-default"
                                    />
                                    <div className="absolute bottom-full left-0 z-20 mb-2 w-80 overflow-hidden rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] shadow-xl shadow-black/30">
                                        <div className="max-h-96 overflow-y-auto">
                                            {availableTools.length > 0 && (
                                                <>
                                                    <ToolSectionLabel>AI Tools</ToolSectionLabel>
                                                    <ul className="py-1">
                                                        {availableTools.map((t) => (
                                                            <ToolRow
                                                                key={t.name}
                                                                label={t.label}
                                                                description={t.description}
                                                                on={enabledTools?.has(t.name) ?? false}
                                                                onToggle={() =>
                                                                    onToggleTool?.(
                                                                        t.name,
                                                                        !(enabledTools?.has(t.name) ?? false)
                                                                    )
                                                                }
                                                            />
                                                        ))}
                                                    </ul>
                                                </>
                                            )}

                                            {myTools.length > 0 && (
                                                <>
                                                    <ToolSectionLabel>Your tools</ToolSectionLabel>
                                                    <ul className="py-1">
                                                        {myTools.map((t) => (
                                                            <ToolRow
                                                                key={t.id}
                                                                label={t.label || t.name}
                                                                description={t.description}
                                                                on={t.enabled}
                                                                unverified={t.kind === 'external'}
                                                                onToggle={() =>
                                                                    void onToggleUserTool?.(t.id, !t.enabled)
                                                                }
                                                                onRemove={
                                                                    onRemoveUserTool
                                                                        ? () => void onRemoveUserTool(t.id)
                                                                        : undefined
                                                                }
                                                            />
                                                        ))}
                                                    </ul>
                                                </>
                                            )}

                                            {canAddTool && onAddTool && (
                                                <AddToolForm
                                                    instanceId={instance.id}
                                                    allowExternal={toolPolicy === 'open'}
                                                    onAdd={onAddTool}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {advancedAvailable && (
                        <button
                            type="button"
                            onClick={() => setShowAdvanced((s) => !s)}
                            aria-expanded={showAdvanced}
                            title="Sampling parameters"
                            className={`ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${showAdvanced ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                        >
                            <SlidersIcon />
                            <span className="hidden sm:inline">Advanced</span>
                        </button>
                    )}

                    <div className="ml-auto">
                        {streaming ? (
                            <button
                                type="button"
                                onClick={onStop}
                                aria-label="Stop"
                                className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]/80"
                            >
                                <StopIcon />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onSend}
                                disabled={disabled || !value.trim() || !model}
                                aria-label="Send"
                                className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-navy)] shadow-md transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                                style={{ background: 'var(--brand-gradient)' }}
                            >
                                <SendIcon />
                            </button>
                        )}
                    </div>
                </div>

                {advancedAvailable && showAdvanced && (
                    <SamplingEditor value={sampling!} onChange={onSamplingChange!} />
                )}
            </div>

            {disabledReason && (
                <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
                    {disabledReason}
                </p>
            )}
        </div>
    );
}

// Fast/Thinking dropdown. Fast is the default: the model answers
// directly (chat_template_kwargs.enable_thinking=false). Thinking lets
// it reason step by step first — slower, better on hard problems.
function ModeDropdown({
    mode,
    onChange
}: {
    mode: ChatMode;
    onChange: (next: ChatMode) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative ml-1">
            <button
                type="button"
                onClick={() => setOpen((s) => !s)}
                aria-expanded={open}
                title="Response mode"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
                {mode === 'fast' ? <BoltIcon /> : <BrainIcon />}
                <span className="hidden sm:inline">{mode === 'fast' ? 'Fast' : 'Thinking'}</span>
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
                    <div className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] py-1 shadow-xl shadow-black/30">
                        <ModeOption
                            active={mode === 'fast'}
                            icon={<BoltIcon />}
                            label="Fast"
                            description="Answers directly. Best for everyday questions."
                            onSelect={() => {
                                onChange('fast');
                                setOpen(false);
                            }}
                        />
                        <ModeOption
                            active={mode === 'thinking'}
                            icon={<BrainIcon />}
                            label="Thinking"
                            description="Reasons step by step before answering. Slower, better on hard problems."
                            onSelect={() => {
                                onChange('thinking');
                                setOpen(false);
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

function ModeOption({
    active,
    icon,
    label,
    description,
    onSelect
}: {
    active: boolean;
    icon: ReactNode;
    label: string;
    description: string;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-[var(--color-surface-2)]/60"
        >
            <span className={`mt-0.5 ${active ? 'text-[var(--color-primary-blue)]' : 'text-[var(--color-text-muted)]'}`}>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className={`block text-sm ${active ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]'}`}>
                    {label}
                </span>
                <span className="block text-[11px] text-[var(--color-text-muted)]">
                    {description}
                </span>
            </span>
            {active && (
                <svg className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--color-primary-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            )}
        </button>
    );
}

function BoltIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    );
}

function BrainIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M12 5v13" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const toolInputCls =
    'w-full rounded-md border border-[var(--color-border-dark)] bg-transparent px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary-blue)]/60';

function ToolSectionLabel({ children }: { children: ReactNode }) {
    return (
        <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wider text-[var(--color-text-muted)] uppercase">
            {children}
        </p>
    );
}

function ToolRow({
    label,
    description,
    on,
    unverified,
    onToggle,
    onRemove
}: {
    label: string;
    description?: string;
    on: boolean;
    unverified?: boolean;
    onToggle: () => void;
    onRemove?: () => void;
}) {
    return (
        <li className="group flex items-center gap-1 pr-2 hover:bg-[var(--color-surface-2)]/60">
            <button
                type="button"
                onClick={onToggle}
                className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2 text-left"
            >
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm text-[var(--color-text-primary)]">{label}</span>
                        {unverified && (
                            <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-amber-600 uppercase dark:text-amber-400">
                                unverified
                            </span>
                        )}
                    </span>
                    {description && (
                        <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
                            {description}
                        </span>
                    )}
                </span>
                <Switch on={on} />
            </button>
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    title="Remove tool"
                    className="shrink-0 rounded p-1 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-400"
                >
                    <TrashIcon />
                </button>
            )}
        </li>
    );
}

function KindTab({
    active,
    onClick,
    children
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 rounded px-2 py-1 ${active ? 'bg-[var(--color-surface-1)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}
        >
            {children}
        </button>
    );
}

// Inline "Add a tool" form. Enclave (Privasys app) is the default and only
// option under enclave_only; external is offered when the fleet policy is
// open, behind an explicit off-platform acknowledgement.
function AddToolForm({
    instanceId,
    allowExternal,
    onAdd
}: {
    instanceId: string;
    allowExternal: boolean;
    onAdd: (input: AddUserToolInput) => Promise<void>;
}) {
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState<'enclave' | 'external'>('enclave');
    const [ref, setRef] = useState('');
    const [name, setName] = useState('');
    const [ack, setAck] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | undefined>();

    const submit = async () => {
        setErr(undefined);
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            setErr('Name must be letters, numbers, or underscores.');
            return;
        }
        if (!ref.trim()) {
            setErr(kind === 'enclave' ? 'Enter the app id or alias.' : 'Enter the server URL.');
            return;
        }
        if (kind === 'external' && !ack) {
            setErr('Please acknowledge the off-platform notice.');
            return;
        }
        setBusy(true);
        try {
            await onAdd({
                kind,
                ref: ref.trim(),
                name,
                acknowledged: kind === 'external' ? ack : undefined,
                instance_id: instanceId
            });
            setRef('');
            setName('');
            setAck(false);
            setOpen(false);
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Failed to add tool.');
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center gap-2 border-t border-[var(--color-border-dark)] px-3 py-2.5 text-left text-sm text-[var(--color-primary-blue)] hover:bg-[var(--color-surface-2)]/60"
            >
                <PlusGlyph />
                Add a tool…
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-2 border-t border-[var(--color-border-dark)] p-3">
            {allowExternal && (
                <div className="flex gap-1 rounded-md bg-[var(--color-surface-2)]/50 p-0.5 text-xs">
                    <KindTab active={kind === 'enclave'} onClick={() => setKind('enclave')}>
                        Privasys app
                    </KindTab>
                    <KindTab active={kind === 'external'} onClick={() => setKind('external')}>
                        External
                    </KindTab>
                </div>
            )}
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (e.g. my_rag)"
                className={toolInputCls}
            />
            <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder={kind === 'enclave' ? 'App id or alias' : 'https://server.example.com'}
                className={toolInputCls}
            />
            {kind === 'external' && (
                <label className="flex items-start gap-2 text-[11px] text-[var(--color-text-muted)]">
                    <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={ack}
                        onChange={(e) => setAck(e.target.checked)}
                    />
                    <span>
                        This server runs outside Privasys. Data sent to it leaves the enclave
                        and is not attested or protected.
                    </span>
                </label>
            )}
            {err && <p className="text-[11px] text-red-400">{err}</p>}
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setOpen(false);
                        setErr(undefined);
                    }}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={busy}
                    className="rounded-md bg-[var(--color-primary-blue)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                    {busy ? 'Adding…' : 'Add'}
                </button>
            </div>
        </div>
    );
}

function PlusGlyph() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6 17.5 20a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2L5 6" />
        </svg>
    );
}

function PaperclipIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
    );
}

function SendIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
    );
}

function StopIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
    );
}

function ToolsIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5Z" />
        </svg>
    );
}

// Compact on/off pill switch (Confer-style) used in the Tools popover.
function Switch({ on }: { on: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={`mt-0.5 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-[var(--color-primary-blue)]' : 'bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border-dark)] ring-inset'}`}
        >
            <span
                className={`h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-3.5' : 'translate-x-0.5'}`}
            />
        </span>
    );
}

function SlidersIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
    );
}
