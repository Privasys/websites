'use client';

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import type { SamplingParams } from '~/lib/sampling';
import type { UserTool } from '~/lib/chat-service-api';
import type { AttachIntent } from '~/lib/drive-chat-api';
import type { ChatContextPrefs } from '~/lib/conversations';
import type { ScopeFolder } from '~/lib/use-ai-scope';
import { ModelPicker } from './model-picker';
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
    contextEnabled,
    contextPrefs,
    onToggleContext,
    knowledgeFolders,
    knowledgeAllScoped,
    onManageKnowledge,
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
    /** Drive §8.7: per-conversation Context control. When contextEnabled, the
     *  composer shows a Context chip letting the user choose, for THIS chat,
     *  whether the assistant may use their Memory, past conversations and
     *  knowledge folders — defaulting to their global Knowledge settings. */
    contextEnabled?: boolean;
    contextPrefs?: ChatContextPrefs;
    onToggleContext?: (field: keyof ChatContextPrefs, value: boolean) => void;
    knowledgeFolders?: ScopeFolder[];
    knowledgeAllScoped?: boolean;
    onManageKnowledge?: () => void;
    /** Fleet governance: 'locked' | 'enclave_only' | 'open'. Gates adding. */
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
    const [showContext, setShowContext] = useState(false);
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

                    {contextEnabled && contextPrefs && onToggleContext && (
                        <ContextControl
                            open={showContext}
                            onOpenChange={setShowContext}
                            prefs={contextPrefs}
                            onToggle={onToggleContext}
                            folders={knowledgeFolders ?? []}
                            allScoped={!!knowledgeAllScoped}
                            onManage={onManageKnowledge}
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
function ContextControl({
    open,
    onOpenChange,
    prefs,
    onToggle,
    folders,
    allScoped,
    onManage
}: {
    open: boolean;
    onOpenChange: (_v: boolean) => void;
    prefs: ChatContextPrefs;
    onToggle: (_field: keyof ChatContextPrefs, _value: boolean) => void;
    folders: ScopeFolder[];
    allScoped: boolean;
    onManage?: () => void;
}) {
    const activeCount =
        (prefs.memory ? 1 : 0) +
        (prefs.pastConversations ? 1 : 0) +
        (prefs.knowledge ? 1 : 0);
    const enabledFolders = folders.filter((f) => f.scoped);
    const noKnowledge = !allScoped && enabledFolders.length === 0;
    return (
        <div className="relative ml-1">
            <button
                type="button"
                onClick={() => onOpenChange(!open)}
                aria-expanded={open}
                title="What I can draw on for this chat"
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${open || activeCount > 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
                <ContextIcon />
                <span className="hidden sm:inline">Context</span>
                {activeCount > 0 && (
                    <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-primary-blue)] px-1 text-[10px] font-semibold text-white">
                        {activeCount}
                    </span>
                )}
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
                                Context for this chat
                            </p>
                            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                                What I can draw on. Applies to this conversation only.
                            </p>
                        </div>
                        <ul className="py-1">
                            <ContextRow
                                title="Memory"
                                description="Notes I keep about you and your work."
                                on={prefs.memory}
                                onToggle={() => onToggle('memory', !prefs.memory)}
                            />
                            <ContextRow
                                title="Past conversations"
                                description="Recall from your previous chats."
                                on={prefs.pastConversations}
                                onToggle={() => onToggle('pastConversations', !prefs.pastConversations)}
                            />
                            <ContextRow
                                title="Knowledge"
                                description={
                                    allScoped
                                        ? 'Your entire Drive.'
                                        : enabledFolders.length
                                            ? enabledFolders.map((f) => f.name).join(', ')
                                            : 'No folders enabled yet — add some below.'
                                }
                                on={prefs.knowledge && !noKnowledge}
                                disabled={noKnowledge}
                                onToggle={() => onToggle('knowledge', !prefs.knowledge)}
                            />
                        </ul>
                        {onManage && (
                            <button
                                type="button"
                                onClick={() => {
                                    onOpenChange(false);
                                    onManage();
                                }}
                                className="flex w-full items-center gap-2 border-t border-[var(--color-border-dark)] px-3 py-2.5 text-left text-sm text-[var(--color-primary-blue)] hover:bg-[var(--color-surface-2)]/60"
                            >
                                Manage folders &amp; defaults…
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function ContextRow({
    title,
    description,
    on,
    disabled,
    onToggle
}: {
    title: string;
    description: string;
    on: boolean;
    disabled?: boolean;
    onToggle: () => void;
}) {
    return (
        <li className="hover:bg-[var(--color-surface-2)]/60">
            <button
                type="button"
                disabled={disabled}
                onClick={onToggle}
                className="flex w-full items-start gap-2 px-3 py-2 text-left disabled:cursor-default disabled:opacity-50"
            >
                <span className="min-w-0 flex-1">
                    <span className="block text-sm text-[var(--color-text-primary)]">{title}</span>
                    <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
                        {description}
                    </span>
                </span>
                <Switch on={on} />
            </button>
        </li>
    );
}

function ContextIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 2 9 5-9 5-9-5 9-5z" />
            <path d="m3 12 9 5 9-5" />
            <path d="m3 17 9 5 9-5" />
        </svg>
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
