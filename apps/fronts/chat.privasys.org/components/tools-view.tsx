'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    AttestationResultView,
    AttestationStatusBadge,
    Badge,
    attestationStatusOf,
    computeAttestationSummary,
    useAttestation,
    type AttestationExpectations
} from '@privasys/attestation-view';
import type { Instance } from '~/lib/types';
import type { UserToolsState } from '~/lib/use-user-tools';
import type { UserTool } from '~/lib/chat-service-api';
import { useAuth } from '~/lib/privasys-auth';
import {
    API_BASE_URL,
    fetchToolDirectory,
    parseExternalRef,
    privasysAppFromUrl,
    resolveApp,
    type ToolDirectoryEntry
} from '~/lib/resolve-app';

// Full-pane AI Tools management view (chat-shell 'tools' view).
//
// The composer popover keeps only the on/off toggles; everything about
// CONFIGURING tools lives here:
//   - the user's saved tools, each showing what kind of thing it is
//     (attested enclave app vs external server) and its trust anchors;
//   - the add flow. Platform tools are SEARCH-AND-SELECT from the tools
//     directory (public apps + the user's own team's apps), showing the
//     trust anchors before the add. External MCP servers are added from
//     a URL or a standard mcpServers config snippet, policy-gated behind
//     an explicit acknowledgement — and a pasted URL that is actually a
//     Privasys app endpoint is auto-upgraded to the attested enclave path.
export function ToolsView({
    instance,
    userTools,
    token,
    enabledToolNames,
    onToggleFleetTool
}: {
    instance: Instance;
    userTools: UserToolsState;
    token?: string;
    /** Enabled-state of the fleet's built-in tools (composer toggles). */
    enabledToolNames?: Set<string>;
    onToggleFleetTool?: (_name: string, _on: boolean) => void;
}) {
    const policy = instance.tool_policy ?? 'enclave_only';
    const canAdd = policy !== 'locked';
    const allowExternal = policy === 'open';

    // Attestation plumbing so each enclave tool can verify itself, inline.
    // The verify-quote leg (challenge mode) needs an aud=attestation-server
    // token, minted lazily per call.
    const { getTokenForAudience } = useAuth();
    const verifyQuoteAuth = useCallback(
        () => getTokenForAudience('attestation-server'),
        [getTokenForAudience]
    );
    const verifyQuoteUrl = instance.attestation_server
        ? `${instance.attestation_server.replace(/\/$/, '')}/verify-quote`
        : undefined;

    // User enclave tools store only the app name; resolve each to its
    // public attest URL so the row can attest it like a fleet tool.
    const enclaveUserTools = userTools.tools.filter((t) => t.kind === 'enclave');
    const externalUserTools = userTools.tools.filter((t) => t.kind === 'external');
    const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
    const enclaveRefs = enclaveUserTools.map((t) => t.ref).join(',');
    useEffect(() => {
        let cancelled = false;
        for (const ref of enclaveRefs ? enclaveRefs.split(',') : []) {
            if (resolvedUrls[ref] !== undefined) continue;
            void resolveApp(ref).then((r) => {
                if (cancelled) return;
                setResolvedUrls((prev) => ({
                    ...prev,
                    [ref]: r.ok && r.app.attest_url ? r.app.attest_url : ''
                }));
            });
        }
        return () => { cancelled = true; };

    }, [enclaveRefs]);

    const absAttest = (u?: string) => (u ? new URL(u, API_BASE_URL).toString() : undefined);

    return (
        <div className='flex flex-1 flex-col overflow-y-auto'>
            <div className='mx-auto w-full max-w-3xl px-6 py-8'>
                <header className='mb-6'>
                    <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>
                        AI Tools
                    </h1>
                    <p className='mt-1 text-sm text-[var(--color-text-secondary)]'>
                        Tools the assistant can call during your chats. Enclave
                        tools run in attested Privasys enclaves — expand any tool
                        to see its live hardware attestation. External tools run
                        outside the platform and are not attested.
                    </p>
                </header>

                {(instance.available_tools?.length ?? 0) > 0 && (
                    <section className='mb-8'>
                        <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]'>
                            Fleet tools — included with this instance
                        </h2>
                        <ul className='flex flex-col gap-2'>
                            {(instance.available_tools ?? []).map((t) => (
                                <AttestedToolRow
                                    key={t.name}
                                    label={t.label || t.name}
                                    sublabel={t.description}
                                    attestUrl={absAttest(t.attest_url)}
                                    verifyQuoteUrl={verifyQuoteUrl}
                                    verifyQuoteAuth={verifyQuoteAuth}
                                    expectations={t.expected_digest ? { workloadImageDigest: t.expected_digest } : undefined}
                                    tags={<Tag>fleet</Tag>}
                                    on={enabledToolNames?.has(t.name) ?? false}
                                    onToggle={
                                        onToggleFleetTool
                                            ? () => onToggleFleetTool(t.name, !(enabledToolNames?.has(t.name) ?? false))
                                            : undefined
                                    }
                                />
                            ))}
                        </ul>
                    </section>
                )}

                <section className='mb-8'>
                    <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]'>
                        Your tools
                    </h2>
                    {userTools.tools.length === 0 ? (
                        <p className='rounded-xl border border-[var(--color-border-dark)] p-5 text-sm text-[var(--color-text-secondary)]'>
                            No tools yet. {canAdd ? 'Add one below.' : 'This fleet does not allow adding tools.'}
                        </p>
                    ) : (
                        <ul className='flex flex-col gap-2'>
                            {enclaveUserTools.map((t) => (
                                <AttestedToolRow
                                    key={t.id}
                                    label={t.label || t.name}
                                    sublabel={`app: ${t.ref}`}
                                    attestUrl={resolvedUrls[t.ref] ? absAttest(resolvedUrls[t.ref]) : undefined}
                                    verifyQuoteUrl={verifyQuoteUrl}
                                    verifyQuoteAuth={verifyQuoteAuth}
                                    expectations={t.expected_digest ? { workloadImageDigest: t.expected_digest } : undefined}
                                    on={t.enabled}
                                    onToggle={(on) => void userTools.setEnabled(t.id, on)}
                                    onRemove={() => void userTools.remove(t.id)}
                                />
                            ))}
                            {externalUserTools.map((t) => (
                                <ExternalToolRow
                                    key={t.id}
                                    tool={t}
                                    onToggle={(on) => void userTools.setEnabled(t.id, on)}
                                    onRemove={() => void userTools.remove(t.id)}
                                />
                            ))}
                        </ul>
                    )}
                    {userTools.error && (
                        <p className='mt-2 text-xs text-red-400'>{userTools.error}</p>
                    )}
                </section>

                {canAdd && (
                    <PlatformToolPicker
                        instanceId={instance.id}
                        userTools={userTools}
                        token={token}
                    />
                )}
                {canAdd && allowExternal && (
                    <ExternalToolPanel
                        instanceId={instance.id}
                        userTools={userTools}
                        token={token}
                    />
                )}
            </div>
        </div>
    );
}

// An enclave tool row with its hardware attestation CO-LOCATED: the header
// carries a live status badge ("✓ Enclave verified" / red on failure) and
// expands to the full attestation detail. Used for both fleet and
// user-added enclave tools; `onRemove` is present only for the latter.
function AttestedToolRow({
    label,
    sublabel,
    attestUrl,
    verifyQuoteUrl,
    verifyQuoteAuth,
    expectations,
    tags,
    on,
    onToggle,
    onRemove
}: {
    label: string;
    sublabel?: string;
    attestUrl?: string;
    verifyQuoteUrl?: string;
    verifyQuoteAuth?: () => Promise<string>;
    expectations?: AttestationExpectations;
    tags?: ReactNode;
    on: boolean;
    onToggle?: (_on: boolean) => void;
    onRemove?: () => void;
}) {
    const [state, actions] = useAttestation({
        attestUrl: attestUrl ?? '',
        verifyQuoteUrl,
        verifyQuoteToken: verifyQuoteAuth,
        autoInspect: Boolean(attestUrl),
        autoVerifyQuote: Boolean(attestUrl && verifyQuoteUrl)
    });
    const summary = computeAttestationSummary(state, expectations);
    const [open, setOpen] = useState(false);

    return (
        <li className='rounded-xl border border-[var(--color-border-dark)]'>
            <div className='flex items-start gap-3 p-4'>
                <button
                    type='button'
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    disabled={!attestUrl}
                    className='flex min-w-0 flex-1 items-start gap-2 text-left disabled:cursor-default'
                >
                    <ChevronIcon open={open} muted={!attestUrl} />
                    <span className='min-w-0 flex-1'>
                        <span className='flex flex-wrap items-center gap-2'>
                            <span className='text-sm font-medium text-[var(--color-text-primary)]'>{label}</span>
                            <AttestationStatusBadge
                                {...attestationStatusOf(summary, Boolean(attestUrl))}
                                verifiedLabel='Enclave verified'
                            />
                            {tags}
                        </span>
                        {sublabel && (
                            <span className='mt-0.5 block truncate text-xs text-[var(--color-text-muted)]'>{sublabel}</span>
                        )}
                    </span>
                </button>
                {onToggle && <Toggle on={on} onToggle={() => onToggle(!on)} />}
                {onRemove && (
                    <button
                        type='button'
                        onClick={onRemove}
                        title='Remove tool'
                        className='rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]/60 hover:text-red-400'
                    >
                        <TrashIcon />
                    </button>
                )}
            </div>
            {open && attestUrl && (
                <div className='border-t border-[var(--color-border-dark)] p-4'>
                    {state.error && !state.result ? (
                        <div className='space-y-3 text-sm text-red-600 dark:text-red-400'>
                            <div>{state.error}</div>
                            <button
                                type='button'
                                onClick={() => void actions.inspect()}
                                className='rounded-lg border border-[var(--color-border-dark)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-2)]/60'
                            >
                                Retry
                            </button>
                        </div>
                    ) : !state.result ? (
                        <div className='text-sm text-[var(--color-text-muted)]'>Inspecting certificate…</div>
                    ) : (
                        <AttestationResultView
                            result={state.result}
                            quoteVerify={state.quoteVerify}
                            quoteVerifying={state.verifying}
                            quoteVerifyError={state.quoteVerifyError}
                            expectations={expectations}
                            loading={state.loading}
                            challenge={state.challenge}
                            onChallengeChange={actions.setChallenge}
                            onRegenerateChallenge={actions.regenerateChallenge}
                            onRefresh={() => void actions.inspect()}
                            onReset={() => {
                                actions.regenerateChallenge();
                                void actions.inspect();
                            }}
                            verifyQuoteUrl={verifyQuoteUrl}
                        />
                    )}
                </div>
            )}
        </li>
    );
}

// An external (off-platform) tool: no attestation is possible, so it is
// labelled as such — a category the user opted into, not a failure.
function ExternalToolRow({
    tool,
    onToggle,
    onRemove
}: {
    tool: UserTool;
    onToggle: (_on: boolean) => void;
    onRemove: () => void;
}) {
    return (
        <li className='flex items-start gap-3 rounded-xl border border-[var(--color-border-dark)] p-4'>
            <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-medium text-[var(--color-text-primary)]'>
                        {tool.label || tool.name}
                    </span>
                    <Badge tone='warn'>External · not attested</Badge>
                </div>
                <p className='mt-0.5 truncate text-xs text-[var(--color-text-muted)]'>{tool.ref}</p>
                <p className='mt-0.5 text-[11px] text-amber-500'>
                    Runs outside Privasys — data sent to it is not attested or protected.
                </p>
            </div>
            <Toggle on={tool.enabled} onToggle={() => onToggle(!tool.enabled)} />
            <button
                type='button'
                onClick={onRemove}
                title='Remove tool'
                className='rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]/60 hover:text-red-400'
            >
                <TrashIcon />
            </button>
        </li>
    );
}

function Tag({ children }: { children: ReactNode }) {
    return <Badge tone='neutral'>{children}</Badge>;
}

function ChevronIcon({ open, muted }: { open: boolean; muted?: boolean }) {
    return (
        <svg
            aria-hidden='true'
            className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''} ${muted ? 'text-[var(--color-border-dark)]' : 'text-[var(--color-text-secondary)]'}`}
            viewBox='0 0 20 20'
            fill='currentColor'
        >
            <path d='M7.05 4.55a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 1 1-1.4-1.4L10.3 9.25 7.05 6a1 1 0 0 1 0-1.45z' />
        </svg>
    );
}

/** Sanitise an app name into a valid tool name (letters/digits/underscore). */
function toToolName(appName: string): string {
    return appName.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}

// Search-and-select over the tools directory: the user's own apps first,
// then the public catalogue — trust anchors visible before the add.
function PlatformToolPicker({
    instanceId,
    userTools,
    token
}: {
    instanceId: string;
    userTools: UserToolsState;
    token?: string;
}) {
    const [entries, setEntries] = useState<ToolDirectoryEntry[] | null>(null);
    const [dirErr, setDirErr] = useState<string | undefined>();
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<ToolDirectoryEntry | null>(null);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | undefined>();

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        fetchToolDirectory(token)
            .then((t) => { if (!cancelled) setEntries(t); })
            .catch((e) => { if (!cancelled) setDirErr((e as Error).message); });
        return () => { cancelled = true; };
    }, [token]);

    const filtered = useMemo(() => {
        if (!entries) return [];
        const q = query.trim().toLowerCase();
        const match = (e: ToolDirectoryEntry) =>
            !q ||
            e.name.toLowerCase().includes(q) ||
            e.display_name.toLowerCase().includes(q) ||
            (e.tagline ?? '').toLowerCase().includes(q);
        return {
            mine: entries.filter((e) => e.mine && match(e)),
            pub: entries.filter((e) => !e.mine && e.public && match(e))
        };
    }, [entries, query]) as { mine: ToolDirectoryEntry[]; pub: ToolDirectoryEntry[] } | never[];

    const groups = Array.isArray(filtered) ? { mine: [], pub: [] } : filtered;

    const pick = useCallback((e: ToolDirectoryEntry) => {
        setSelected(e);
        setName(toToolName(e.name));
        setErr(undefined);
    }, []);

    const add = useCallback(async () => {
        if (!selected) return;
        setErr(undefined);
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            setErr('Tool name must be letters, numbers, or underscores.');
            return;
        }
        setBusy(true);
        try {
            await userTools.add({
                kind: 'enclave',
                ref: selected.name,
                name,
                instance_id: instanceId
            });
            setSelected(null);
            setQuery('');
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Failed to add tool.');
        } finally {
            setBusy(false);
        }
    }, [selected, name, userTools, instanceId]);

    return (
        <section className='mb-8'>
            <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]'>
                Add a Privasys tool
            </h2>
            <div className='rounded-xl border border-[var(--color-border-dark)] p-4'>
                <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                    placeholder='Search apps (yours and public)…'
                    className={inputCls + ' w-full'}
                />
                {dirErr && <p className='mt-2 text-xs text-amber-500'>Directory unavailable: {dirErr}</p>}
                {!token && <p className='mt-2 text-xs text-[var(--color-text-muted)]'>Sign in to browse tools.</p>}
                {entries && groups.mine.length === 0 && groups.pub.length === 0 && (
                    <p className='mt-2 text-xs text-[var(--color-text-muted)]'>No matching apps.</p>
                )}

                {groups.mine.length > 0 && (
                    <DirectoryGroup label='Your apps' entries={groups.mine} selected={selected} onPick={pick} />
                )}
                {groups.pub.length > 0 && (
                    <DirectoryGroup label='Public apps' entries={groups.pub} selected={selected} onPick={pick} />
                )}

                {selected && (
                    <div className='mt-3 rounded-lg border border-emerald-300/40 bg-emerald-50/30 p-3 text-xs dark:border-emerald-500/20 dark:bg-emerald-900/10'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <span className='font-medium text-[var(--color-text-primary)]'>{selected.display_name}</span>
                            <KindBadge enclave />
                            <span className='rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--color-text-muted)]'>
                                {selected.app_type}{selected.tee_type ? ` · ${selected.tee_type}` : ''}
                            </span>
                        </div>
                        <p className='mt-1 text-[var(--color-text-secondary)]'>host {selected.hostname}</p>
                        {selected.image_digest && (
                            <p className='mt-0.5 font-mono text-[11px] text-[var(--color-text-muted)]'>
                                attested digest {selected.image_digest.slice(0, 20)}…
                            </p>
                        )}
                        <label className='mt-2 flex flex-col gap-1 text-[11px] text-[var(--color-text-secondary)]'>
                            Tool name (what the assistant will call it)
                            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                        </label>
                        {err && <p className='mt-2 text-red-400'>{err}</p>}
                        {userTools.awaitingApproval && <ApprovalHint />}
                        <button
                            type='button'
                            disabled={busy}
                            onClick={() => void add()}
                            className='mt-3 rounded-lg bg-[var(--color-primary-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
                        >
                            {busy ? 'Adding…' : `Add ${name || 'tool'}`}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}

function DirectoryGroup({
    label,
    entries,
    selected,
    onPick
}: {
    label: string;
    entries: ToolDirectoryEntry[];
    selected: ToolDirectoryEntry | null;
    onPick: (_e: ToolDirectoryEntry) => void;
}) {
    return (
        <div className='mt-3'>
            <p className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]'>{label}</p>
            <ul className='flex flex-col gap-1'>
                {entries.map((e) => (
                    <li key={e.name}>
                        <button
                            type='button'
                            onClick={() => onPick(e)}
                            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selected?.name === e.name ? 'border-[var(--color-primary-blue)] bg-[var(--color-primary-blue)]/5' : 'border-transparent hover:bg-[var(--color-surface-2)]/60'}`}
                        >
                            <span className='min-w-0 flex-1'>
                                <span className='block truncate font-medium text-[var(--color-text-primary)]'>{e.display_name}</span>
                                {e.tagline && (
                                    <span className='block truncate text-xs text-[var(--color-text-muted)]'>{e.tagline}</span>
                                )}
                            </span>
                            <span className='shrink-0 rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--color-text-muted)]'>
                                {e.app_type}
                            </span>
                            {!e.public && (
                                <span className='shrink-0 rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]'>private</span>
                            )}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// External MCP servers: a URL or a standard mcpServers config snippet.
// A pasted URL that is actually a Privasys app endpoint is redirected to
// the attested enclave path instead of being added unattested.
function ExternalToolPanel({
    instanceId,
    userTools,
    token
}: {
    instanceId: string;
    userTools: UserToolsState;
    token?: string;
}) {
    const [raw, setRaw] = useState('');
    const [name, setName] = useState('');
    const [ack, setAck] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | undefined>();
    const [added, setAdded] = useState(false);

    const parsed = useMemo(() => parseExternalRef(raw), [raw]);
    const privasysApp = parsed ? privasysAppFromUrl(parsed.url) : null;

    // Pre-fill the tool name from the snippet's server key.
    useEffect(() => {
        if (parsed?.name && !name) setName(toToolName(parsed.name));

    }, [parsed?.name]);

    const add = useCallback(async () => {
        setErr(undefined);
        setAdded(false);
        if (!parsed) {
            setErr('Enter an https:// URL or paste an mcpServers config snippet.');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            setErr('Tool name must be letters, numbers, or underscores.');
            return;
        }
        setBusy(true);
        try {
            if (privasysApp) {
                // The URL is a Privasys app endpoint: add it as an ATTESTED
                // enclave tool (never as unattested-external).
                await userTools.add({ kind: 'enclave', ref: privasysApp, name, instance_id: instanceId });
            } else {
                if (!ack) {
                    setErr('Please acknowledge the off-platform notice.');
                    return;
                }
                await userTools.add({ kind: 'external', ref: parsed.url, name, acknowledged: true, instance_id: instanceId });
            }
            setRaw('');
            setName('');
            setAck(false);
            setAdded(true);
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Failed to add tool.');
        } finally {
            setBusy(false);
        }
    }, [parsed, privasysApp, name, ack, userTools, instanceId]);

    return (
        <section>
            <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]'>
                Add an external MCP server
            </h2>
            <div className='flex flex-col gap-3 rounded-xl border border-[var(--color-border-dark)] p-4'>
                <label className='flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]'>
                    Server URL — or paste an mcpServers config snippet
                    <textarea
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                        rows={3}
                        placeholder={'https://mcp.example.com\nor { "mcpServers": { "my_tool": { "url": "https://…" } } }'}
                        className={inputCls + ' resize-y font-mono text-xs'}
                    />
                </label>
                <label className='flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]'>
                    Tool name (what the assistant will call it)
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder='e.g. my_tool' className={inputCls} />
                </label>

                {privasysApp && (
                    <div className='rounded-lg border border-emerald-300/40 bg-emerald-50/30 p-3 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-900/10 dark:text-emerald-300'>
                        This is the Privasys app <span className='font-mono'>{privasysApp}</span> — it will be
                        added as an attested enclave tool, not an external one.
                    </div>
                )}
                {parsed && !privasysApp && (
                    <div className='rounded-lg border border-amber-300/40 bg-amber-50/30 p-3 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-900/10 dark:text-amber-200'>
                        <p className='font-medium'>External tool</p>
                        <p className='mt-1'>
                            This server runs outside Privasys. Data the assistant sends to it
                            leaves the enclave and is not attested or protected.
                        </p>
                        <label className='mt-2 flex items-start gap-2'>
                            <input type='checkbox' className='mt-0.5' checked={ack} onChange={(e) => setAck(e.target.checked)} />
                            <span>I understand and want to add it anyway.</span>
                        </label>
                    </div>
                )}

                {err && <p className='text-xs text-red-400'>{err}</p>}
                {added && <p className='text-xs text-emerald-500'>Tool added.</p>}
                {userTools.awaitingApproval && <ApprovalHint />}
                {!token && <p className='text-xs text-[var(--color-text-muted)]'>Sign in to add tools.</p>}

                <div>
                    <button
                        type='button'
                        disabled={busy || !parsed}
                        onClick={() => void add()}
                        className='rounded-lg bg-[var(--color-primary-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
                    >
                        {busy ? 'Adding…' : 'Add tool'}
                    </button>
                </div>
            </div>
        </section>
    );
}

function ApprovalHint() {
    return (
        <p className='flex items-center gap-1.5 text-xs text-[var(--color-primary-blue)]'>
            <span className='inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-primary-blue)]' />
            Approve adding this tool on your phone…
        </p>
    );
}

function KindBadge({ enclave }: { enclave: boolean }) {
    return enclave ? (
        <Badge tone='ok'>Enclave</Badge>
    ) : (
        <Badge tone='warn'>External · not attested</Badge>
    );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button
            type='button'
            role='switch'
            aria-checked={on}
            onClick={onToggle}
            className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-[var(--color-primary-blue)]' : 'bg-[var(--color-surface-2)]'}`}
        >
            <span
                className='absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform'
                style={{ transform: on ? 'translateX(16px)' : 'translateX(0)' }}
            />
        </button>
    );
}

function TrashIcon() {
    return (
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
            <path d='M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' />
        </svg>
    );
}

const inputCls =
    'rounded-lg border border-[var(--color-border-dark)] bg-transparent px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary-blue)]';
