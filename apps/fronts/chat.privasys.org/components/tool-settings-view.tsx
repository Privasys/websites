'use client';

// Full-page settings view for one MCP server advertising the generic
// tool-settings contract (Drive's "Memory" page is the first). Everything
// rendered here comes from the server's own document: title, icon,
// description, fields. The master switch (whether the server's tools are
// available to the conversation at all) lives here too, mirroring the
// composer pill.

import type { SealedSession } from '@privasys/auth';
import type { ToolSettingsDisplay } from '~/lib/tool-settings';
import { useToolSettings, type ToolSettingsState } from '~/lib/use-tool-settings';
import { ToolSettingsFields, Toggle } from './tool-settings-fields';
import { ToolIcon } from './featured-tool-pill';

export function ToolSettingsView({
    session,
    server,
    display,
    enabled,
    onToggle,
    settings: sharedSettings
}: {
    /** The enclave sealed session (the settings ride the attested proxy). */
    session: SealedSession | null | undefined;
    server: string;
    display: ToolSettingsDisplay;
    /** Master switch: this server's tools on/off for conversations. */
    enabled: boolean;
    onToggle: (on: boolean) => void;
    /** Optional settings state owned by the parent (shared with the
     *  composer pill so both surfaces stay in sync). */
    settings?: ToolSettingsState;
}) {
    const ownSettings = useToolSettings(session, sharedSettings ? null : server);
    const settings = sharedSettings ?? ownSettings;
    const title = display.title ?? server;

    if (!session) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="max-w-md">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Sign in to manage {title}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        These settings live inside the attested enclave and are enforced there —
                        sign in with your Privasys Wallet to read or change them.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
                            <ToolIcon name={display.icon} size={20} />
                            {title}
                        </h2>
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            {display.description}
                            {' '}Changes apply immediately, on every device. They are stored and
                            enforced by the attested tool itself — the operator never sees them.
                        </p>
                    </div>
                    <div className="shrink-0 pt-1">
                        <Toggle on={enabled} onChange={onToggle} />
                    </div>
                </div>

                {!enabled && (
                    <p className="mb-4 rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/40 px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                        {title} is off: none of the options below are used until you switch it back
                        on. Your data is untouched.
                    </p>
                )}

                {settings.error && (
                    <div className="mb-4 rounded-lg border border-red-300/40 bg-red-50/40 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-900/10 dark:text-red-300">
                        {settings.error}
                    </div>
                )}

                {settings.doc ? (
                    <ToolSettingsFields
                        doc={settings.doc}
                        busyKey={settings.busyKey}
                        onSetValue={settings.setValue}
                        disabled={!enabled}
                    />
                ) : settings.loading ? (
                    <p className="px-1 text-sm text-[var(--color-text-muted)]">Loading…</p>
                ) : null}
            </div>
        </div>
    );
}
