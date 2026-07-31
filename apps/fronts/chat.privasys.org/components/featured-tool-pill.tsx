'use client';

// A composer pill for one MCP server that advertises a settings surface
// (the generic tool-settings contract). The pill IS generic: title + icon
// come from the server's own descriptor, the popover is the master on/off
// switch plus the schema-rendered settings. The fleet's Drive server
// presents itself as "Memory" with the brain icon; any other server
// implementing the contract gets the same treatment for free.

import { useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import { settingsSummary, type ToolSettingsDisplay } from '~/lib/tool-settings';
import { useToolSettings, type ToolSettingsState } from '~/lib/use-tool-settings';
import { ToolSettingsFields, Toggle } from './tool-settings-fields';
import { MemoryIcon } from './memory-icon';

export function FeaturedToolPill({
    session,
    server,
    display,
    enabled,
    onToggle,
    onManage,
    settings: sharedSettings
}: {
    session: SealedSession | null | undefined;
    server: string;
    display: ToolSettingsDisplay;
    /** Master switch: whether this server's tools are enabled for the
     *  conversation (X-Privasys-Tools). Off = the enclave sees none of
     *  this server's tools at all. */
    enabled: boolean;
    onToggle: (on: boolean) => void;
    /** Open the full settings view. */
    onManage?: () => void;
    /** Optional settings state owned by the parent (so the parent can read
     *  the same values, e.g. for the client retrieval fallback). Without
     *  it, the pill manages its own. */
    settings?: ToolSettingsState;
}) {
    const [open, setOpen] = useState(false);
    const ownSettings = useToolSettings(session, sharedSettings ? null : server);
    const settings = sharedSettings ?? ownSettings;
    const title = display.title ?? server;
    const summary = enabled && settings.doc ? settingsSummary(settings.doc) : '';

    return (
        <div className="relative ml-1">
            <button
                type="button"
                onClick={() => setOpen((s) => !s)}
                aria-expanded={open}
                title={display.description ?? title}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    enabled
                        ? 'bg-[var(--color-primary-blue)]/10 text-[var(--color-primary-blue)]'
                        : open
                            ? 'text-[var(--color-text-primary)]'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
            >
                <ToolIcon name={display.icon} />
                <span className="hidden sm:inline">{title}</span>
                {summary && <span className="hidden max-w-40 truncate opacity-80 sm:inline">· {summary}</span>}
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
                    <div className="absolute bottom-full left-0 z-20 mb-2 w-80 overflow-hidden rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] shadow-xl shadow-black/30">
                        <div className="max-h-96 overflow-y-auto pb-1">
                            <div className="flex items-start justify-between gap-3 px-3 pt-3 pb-2">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">{title}</p>
                                    {display.description && (
                                        <p className="mt-0.5 text-[11px] leading-4 text-[var(--color-text-muted)]">
                                            {display.description}
                                            {!enabled && ' Off — none of this is used.'}
                                        </p>
                                    )}
                                </div>
                                <Toggle on={enabled} onChange={onToggle} />
                            </div>

                            {settings.error && (
                                <p className="px-3 pb-1 text-[11px] text-red-500 dark:text-red-300">
                                    {settings.error}
                                </p>
                            )}
                            {settings.doc && (
                                <div className="border-t border-[var(--color-border-dark)] pt-0.5">
                                    <ToolSettingsFields
                                        doc={settings.doc}
                                        busyKey={settings.busyKey}
                                        onSetValue={settings.setValue}
                                        disabled={!enabled}
                                        compact
                                    />
                                </div>
                            )}
                            {!settings.doc && settings.loading && (
                                <p className="px-3 pb-2 text-[11px] text-[var(--color-text-muted)]">Loading…</p>
                            )}
                        </div>

                        {onManage && (
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    onManage();
                                }}
                                className="flex w-full items-center gap-2 border-t border-[var(--color-border-dark)] px-3 py-2.5 text-left text-sm text-[var(--color-primary-blue)] hover:bg-[var(--color-surface-2)]/60"
                            >
                                Manage in {title} settings…
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/** Map a server-declared icon name onto the UI's icon set. */
export function ToolIcon({ name, size = 15 }: { name?: string; size?: number }) {
    switch (name) {
        case 'brain':
            return <MemoryIcon size={size} />;
        default:
            return (
                <svg width={size - 1} height={size - 1} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5Z" />
                </svg>
            );
    }
}
