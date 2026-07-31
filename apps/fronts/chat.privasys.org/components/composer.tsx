'use client';

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import type { SamplingParams } from '~/lib/sampling';
import type { UserTool } from '~/lib/chat-service-api';
import type { AttachIntent } from '~/lib/drive-chat-api';
import type { MemoryMode, ScopeFolder } from '~/lib/use-ai-scope';
import { ModelModePicker } from './model-mode-picker';
import { MemoryIcon } from './memory-icon';
import { SamplingEditor } from './sampling-editor';

/** Response mode: 'fast' answers directly, 'thinking' reasons first. */
export type ChatMode = 'fast' | 'thinking';

/** A file attached to the current conversation (Drive §8.7), shown as a chip. */
export interface AttachmentChip {
    id: string;
    name: string;
    sizeBytes: number;
    intent: AttachIntent;
    /** True when the file is large enough to be indexed (looked up on demand)
     *  rather than read in full into the chat context. */
    indexed: boolean;
    status: 'uploading' | 'ready' | 'error';
    error?: string;
}

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
    onManageTools,
    onRemoveUserTool,
    attachEnabled,
    attachments,
    onAttachFile,
    memoryEnabled,
    memoryMode,
    memorySummary,
    onSetMemoryMode,
    memoryFolders,
    onManageMemory,
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
    /** Navigate to the AI Tools management view. */
    onManageTools?: () => void;
    onRemoveUserTool?: (id: string) => void | Promise<void>;
    /** Drive §8.7: when true, the Attach affordance offers the two intents
     *  ("Use in this chat" / "Add to my knowledge base") and uploads to Drive. */
    attachEnabled?: boolean;
    /** Attachment chips for the current conversation. */
    attachments?: AttachmentChip[];
    /** Upload a picked file into the current conversation with an intent. */
    onAttachFile?: (file: File, intent: AttachIntent) => void;
    /** Drive as the assistant's memory. When memoryEnabled, the composer shows
     *  a Memory pill: `Memory/` is always on, and the user chooses what else
     *  the assistant may recall. Writes go straight to the AI-scope grant, so
     *  the choice is durable, cross-device, and honoured by BOTH retrieval
     *  paths (enclave and client fallback) — there is no second toggle. */
    memoryEnabled?: boolean;
    memoryMode?: MemoryMode;
    memorySummary?: string;
    onSetMemoryMode?: (mode: MemoryMode) => void | Promise<void>;
    /** The user's AI-enabled Drive folders, listed read-only in the popover. */
    memoryFolders?: ScopeFolder[];
    onManageMemory?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
    /**
     * If set, the composer is disabled and a one-line CTA / hint is shown
     * below it (e.g. "Sign in to start chatting").
     */
    disabledReason?: string;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingIntentRef = useRef<AttachIntent>('session');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showTools, setShowTools] = useState(false);
    const [showAttach, setShowAttach] = useState(false);
    const [showMemory, setShowMemory] = useState(false);
    const disabled = !!disabledReason;
    const canAttach = !!attachEnabled && !!onAttachFile;
    const chips = attachments ?? [];

    const pickFileFor = (intent: AttachIntent) => {
        pendingIntentRef.current = intent;
        setShowAttach(false);
        fileInputRef.current?.click();
    };

    const onFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset so picking the same file again re-fires the change event.
        e.target.value = '';
        if (file) onAttachFile?.(file, pendingIntentRef.current);
    };
    const advancedAvailable = !!sampling && !!onSamplingChange;
    const availableTools = instance.available_tools ?? [];
    const myTools = userTools ?? [];
    const canManageTools = !!onManageTools;
    const toolsAvailable =
        (availableTools.length > 0 && !!onToggleTool) || myTools.length > 0 || canManageTools;
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

                {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                        {chips.map((c) => (
                            <AttachmentPill key={c.id} chip={c} />
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-2 px-3 pt-1 pb-2.5">
                    {canAttach ? (
                        <div className="relative">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={onFilePicked}
                            />
                            <button
                                type="button"
                                onClick={() => setShowAttach((s) => !s)}
                                aria-expanded={showAttach}
                                title="Attach a file"
                                className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-text-primary)]"
                            >
                                <PaperclipIcon />
                            </button>
                            {showAttach && (
                                <>
                                    <button
                                        type="button"
                                        aria-hidden="true"
                                        tabIndex={-1}
                                        onClick={() => setShowAttach(false)}
                                        className="fixed inset-0 z-10 cursor-default"
                                    />
                                    <div className="absolute bottom-full left-0 z-20 mb-2 w-72 overflow-hidden rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] py-1 shadow-xl shadow-black/30">
                                        <AttachOption
                                            title="Use in this chat"
                                            description="Attach a file for this conversation only. Small files are read in full; larger ones are indexed so I look up the relevant parts."
                                            onSelect={() => pickFileFor('session')}
                                        />
                                        <AttachOption
                                            title="Add to my knowledge base"
                                            description="Save the file to your private Drive knowledge base so I can draw on it in this and future chats."
                                            onSelect={() => pickFileFor('knowledge')}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <button
                            type="button"
                            title="Attach (sign in with the Privasys Wallet to enable)"
                            disabled
                            className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-text-muted)] opacity-50"
                        >
                            <PaperclipIcon />
                        </button>
                    )}

                    <div className="ml-1">
                        <ModelModePicker
                            instance={instance}
                            selected={model}
                            onSelect={onModelChange}
                            mode={mode}
                            onModeChange={onModeChange}
                        />
                    </div>

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

                                            {canManageTools && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowTools(false); onManageTools?.(); }}
                                                    className="flex w-full items-center gap-2 border-t border-[var(--color-border-dark)] px-3 py-2.5 text-left text-sm text-[var(--color-primary-blue)] hover:bg-[var(--color-surface-2)]/60"
                                                >
                                                    <PlusGlyph />
                                                    Manage tools…
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {memoryEnabled && onSetMemoryMode && (
                        <MemoryControl
                            open={showMemory}
                            onOpenChange={setShowMemory}
                            mode={memoryMode ?? 'off'}
                            summary={memorySummary ?? 'off'}
                            onSetMode={onSetMemoryMode}
                            folders={memoryFolders ?? []}
                            onManage={onManageMemory}
                        />
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



// Per-conversation Context control (§8.7): choose, for THIS chat, whether the
// assistant may draw on Memory, past conversations and knowledge folders.
// Defaults come from the user's global Knowledge settings; toggles here
// override them for the current conversation only.
// Memory control: your Drive as the assistant's memory.
//
// `Memory/` is ALWAYS on — it is the spine the assistant writes back to, not a
// toggle. Everything else the assistant may recall (past chats, chosen folders,
// the whole Drive) is opt-in and off by default. Every change here writes the
// AI-scope GRANT, which is the single source of truth both retrieval paths
// read, so a change applies immediately, on every device, on any instance.
function MemoryControl({
    open,
    onOpenChange,
    mode,
    summary,
    onSetMode,
    folders,
    onManage
}: {
    open: boolean;
    onOpenChange: (_v: boolean) => void;
    mode: MemoryMode;
    summary: string;
    onSetMode: (_mode: MemoryMode) => void | Promise<void>;
    folders: ScopeFolder[];
    onManage?: () => void;
}) {
    const on = mode !== 'off';
    const scoped = folders.filter((f) => f.scoped);
    return (
        <div className="relative ml-1">
            <button
                type="button"
                onClick={() => onOpenChange(!open)}
                aria-expanded={open}
                title="What I can remember. Retrieval runs inside the attested enclave over your sealed session — the operator never sees it."
                // On, Memory takes the brand green AND a soft tint, and names what
                // it is recalling. Colour alone would not be a state signal for
                // anyone who cannot separate the hues, so the fill and the label
                // carry it too. Off, it is as quiet as its neighbours.
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    on
                        ? 'bg-[var(--color-primary-green)]/10 text-[var(--color-primary-green)]'
                        : open
                            ? 'text-[var(--color-text-primary)]'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
            >
                <MemoryIcon />
                <span className="hidden sm:inline">Memory</span>
                {on && <span className="hidden opacity-80 sm:inline">· {summary}</span>}
            </button>
            {open && (
                <>
                    <button
                        type="button"
                        aria-hidden="true"
                        tabIndex={-1}
                        onClick={() => onOpenChange(false)}
                        className="fixed inset-0 z-10 cursor-default"
                    />
                    <div className="absolute bottom-full left-0 z-20 mb-2 w-80 overflow-hidden rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] shadow-xl shadow-black/30">
                        <div className="px-3 pt-3 pb-1">
                            <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                                Memory
                            </p>
                            <p className="mt-0.5 text-[11px] leading-4 text-[var(--color-text-muted)]">
                                Your Drive is my memory. I can search only what you turn on here —
                                and only inside the enclave, over your sealed session.
                            </p>
                        </div>

                        <div className="flex items-start gap-2 px-3 py-2">
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm text-[var(--color-text-primary)]">
                                    What I remember about you
                                </span>
                                <span className="block text-[11px] text-[var(--color-text-muted)]">
                                    Notes I keep and write back as we talk.
                                </span>
                            </span>
                            <span className="mt-0.5 shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                Always on
                            </span>
                        </div>

                        <div className="border-t border-[var(--color-border-dark)]">
                            <button
                                type="button"
                                onClick={() => void onSetMode(on ? 'off' : 'past-chats')}
                                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[var(--color-surface-2)]/60"
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm text-[var(--color-text-primary)]">
                                        Use my Drive as memory
                                    </span>
                                    <span className="block text-[11px] text-[var(--color-text-muted)]">
                                        {on ? `Recalling: ${summary}.` : 'Off — I only use what I remember about you.'}
                                    </span>
                                </span>
                                <Switch on={on} />
                            </button>
                        </div>

                        {on && (
                            <div className="flex gap-1 px-3 pb-2">
                                <ModeChip
                                    label="Past chats"
                                    active={mode === 'past-chats'}
                                    onClick={() => void onSetMode('past-chats')}
                                />
                                <ModeChip
                                    label="Entire Drive"
                                    active={mode === 'entire-drive'}
                                    onClick={() => void onSetMode('entire-drive')}
                                />
                                {mode === 'folders' && (
                                    <ModeChip
                                        label={scoped.length === 1 ? scoped[0].name : `${scoped.length} folders`}
                                        active
                                        onClick={() => onManage?.()}
                                    />
                                )}
                            </div>
                        )}

                        {onManage && (
                            <button
                                type="button"
                                onClick={() => {
                                    onOpenChange(false);
                                    onManage();
                                }}
                                className="flex w-full items-center gap-2 border-t border-[var(--color-border-dark)] px-3 py-2.5 text-left text-sm text-[var(--color-primary-blue)] hover:bg-[var(--color-surface-2)]/60"
                            >
                                Manage in Memory settings…
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function ModeChip({
    label,
    active,
    onClick
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${active
                ? 'border-[var(--color-primary-blue)] text-[var(--color-primary-blue)]'
                : 'border-[var(--color-border-dark)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
        >
            {label}
        </button>
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

// One choice in the Attach menu: the two §8.7 intents.
function AttachOption({
    title,
    description,
    onSelect
}: {
    title: string;
    description: string;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-[var(--color-surface-2)]/60"
        >
            <span className="text-sm text-[var(--color-text-primary)]">{title}</span>
            <span className="text-[11px] leading-4 text-[var(--color-text-muted)]">{description}</span>
        </button>
    );
}

// A single attachment chip. The behaviour label reflects how the file will be
// used: "read in full" for small files vs "indexed" for large ones.
function AttachmentPill({ chip }: { chip: AttachmentChip }) {
    const behaviour =
        chip.status === 'uploading'
            ? 'uploading…'
            : chip.status === 'error'
                ? chip.error || 'failed'
                : chip.intent === 'knowledge'
                    ? 'in knowledge base'
                    : chip.indexed
                        ? 'indexed — I’ll look up relevant sections'
                        : 'read in full';
    return (
        <span
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
                chip.status === 'error'
                    ? 'border-red-300/50 text-red-500 dark:text-red-300'
                    : 'border-[var(--color-border-dark)] text-[var(--color-text-secondary)]'
            }`}
            title={`${chip.name} (${formatBytes(chip.sizeBytes)}) — ${behaviour}`}
        >
            <PaperclipIcon />
            <span className="truncate">{chip.name}</span>
            <span className="shrink-0 text-[var(--color-text-muted)]">· {behaviour}</span>
        </span>
    );
}

function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} kB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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
