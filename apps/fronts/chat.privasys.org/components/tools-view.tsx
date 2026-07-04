'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Instance } from '~/lib/types';
import type { UserToolsState } from '~/lib/use-user-tools';
import type { UserTool } from '~/lib/chat-service-api';
import { looksLikeUrl, resolveApp, type ResolvedApp } from '~/lib/resolve-app';

// Full-pane AI Tools management view (chat-shell 'tools' view).
//
// The composer popover keeps only the on/off toggles; everything about
// CONFIGURING tools lives here:
//   - the user's saved tools, each showing what kind of thing it is
//     (attested enclave app vs external server) and its trust anchors;
//   - the add flow, which AUTO-DETECTS the kind from the single ref input:
//     an app name resolves against the public app directory and shows a
//     preview of what is about to be trusted (display name, TEE, attested
//     digest) BEFORE the user confirms; a URL is an external tool, gated
//     by the fleet policy behind an explicit acknowledgement.
export function ToolsView({
    instance,
    userTools
}: {
    instance: Instance;
    userTools: UserToolsState;
}) {
    const policy = instance.tool_policy ?? 'enclave_only';
    const canAdd = policy !== 'locked';
    const allowExternal = policy === 'open';

    return (
        <div className='flex flex-1 flex-col overflow-y-auto'>
            <div className='mx-auto w-full max-w-3xl px-6 py-8'>
                <header className='mb-6'>
                    <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>
                        AI Tools
                    </h1>
                    <p className='mt-1 text-sm text-[var(--color-text-secondary)]'>
                        Tools the assistant can call during your chats. Enclave
                        tools run in attested Privasys enclaves; external tools
                        run outside the platform and are not attested.
                    </p>
                </header>

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
                            {userTools.tools.map((t) => (
                                <ToolRow
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
                    <AddToolPanel
                        instanceId={instance.id}
                        allowExternal={allowExternal}
                        userTools={userTools}
                    />
                )}
            </div>
        </div>
    );
}

function ToolRow({
    tool,
    onToggle,
    onRemove
}: {
    tool: UserTool;
    onToggle: (_on: boolean) => void;
    onRemove: () => void;
}) {
    const enclave = tool.kind === 'enclave';
    return (
        <li className='flex items-start gap-3 rounded-xl border border-[var(--color-border-dark)] p-4'>
            <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-medium text-[var(--color-text-primary)]'>
                        {tool.label || tool.name}
                    </span>
                    <KindBadge enclave={enclave} />
                </div>
                <p className='mt-0.5 truncate text-xs text-[var(--color-text-muted)]'>
                    {enclave ? `app: ${tool.ref}` : tool.ref}
                </p>
                {enclave && tool.expected_digest && (
                    <p className='mt-0.5 font-mono text-[11px] text-[var(--color-text-muted)]'>
                        digest {tool.expected_digest.slice(0, 16)}…
                    </p>
                )}
                {!enclave && (
                    <p className='mt-0.5 text-[11px] text-amber-500'>
                        Runs outside Privasys — data sent to it is not attested or protected.
                    </p>
                )}
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

// The add flow. One ref input; the kind is detected, never asked:
//   app name  → live resolve → preview card → confirm
//   URL       → external path (policy-gated, acknowledgement required)
function AddToolPanel({
    instanceId,
    allowExternal,
    userTools
}: {
    instanceId: string;
    allowExternal: boolean;
    userTools: UserToolsState;
}) {
    const [ref, setRef] = useState('');
    const [name, setName] = useState('');
    const [ack, setAck] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | undefined>();
    const [resolved, setResolved] = useState<ResolvedApp | null>(null);
    const [resolveErr, setResolveErr] = useState<string | undefined>();
    const [resolving, setResolving] = useState(false);
    const resolveSeq = useRef(0);

    const isUrl = looksLikeUrl(ref);

    // Debounced live resolution of app-name refs.
    useEffect(() => {
        setResolved(null);
        setResolveErr(undefined);
        const v = ref.trim();
        if (!v || looksLikeUrl(v)) return;
        const seq = ++resolveSeq.current;
        setResolving(true);
        const timer = setTimeout(() => {
            void resolveApp(v).then((r) => {
                if (seq !== resolveSeq.current) return;
                setResolving(false);
                if (r.ok) setResolved(r.app);
                else setResolveErr(r.error);
            });
        }, 400);
        return () => clearTimeout(timer);
    }, [ref]);

    const submit = useCallback(async () => {
        setErr(undefined);
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            setErr('Tool name must be letters, numbers, or underscores.');
            return;
        }
        if (!ref.trim()) {
            setErr('Enter an app name or a server URL.');
            return;
        }
        if (isUrl && !allowExternal) {
            setErr('This fleet only allows attested enclave tools.');
            return;
        }
        if (isUrl && !ack) {
            setErr('Please acknowledge the off-platform notice.');
            return;
        }
        if (!isUrl && !resolved) {
            setErr(resolveErr ?? 'The app has not resolved yet.');
            return;
        }
        setBusy(true);
        try {
            await userTools.add({
                kind: isUrl ? 'external' : 'enclave',
                ref: ref.trim(),
                name,
                acknowledged: isUrl ? ack : undefined,
                instance_id: instanceId
            });
            setRef('');
            setName('');
            setAck(false);
            setResolved(null);
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Failed to add tool.');
        } finally {
            setBusy(false);
        }
    }, [name, ref, isUrl, allowExternal, ack, resolved, resolveErr, userTools, instanceId]);

    return (
        <section>
            <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]'>
                Add a tool
            </h2>
            <div className='flex flex-col gap-3 rounded-xl border border-[var(--color-border-dark)] p-4'>
                <label className='flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]'>
                    Tool name (what the assistant will call it)
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder='e.g. kv_store'
                        className={inputCls}
                    />
                </label>
                <label className='flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]'>
                    Privasys app name{allowExternal ? ' — or an external MCP server URL' : ''}
                    <input
                        value={ref}
                        onChange={(e) => setRef(e.target.value)}
                        placeholder={allowExternal ? 'wasm-app-example or https://mcp.example.com' : 'wasm-app-example'}
                        className={inputCls}
                    />
                </label>

                {/* Detection outcome */}
                {!isUrl && resolving && (
                    <p className='text-xs text-[var(--color-text-muted)]'>Looking up app…</p>
                )}
                {!isUrl && resolveErr && ref.trim() && (
                    <p className='text-xs text-amber-500'>
                        Not a deployed Privasys app: {resolveErr}
                        {allowExternal ? ' — to add an external server, paste its full https:// URL.' : ''}
                    </p>
                )}
                {!isUrl && resolved && <ResolvePreview app={resolved} />}

                {isUrl && (
                    <div className='rounded-lg border border-amber-300/40 bg-amber-50/30 p-3 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-900/10 dark:text-amber-200'>
                        <p className='font-medium'>External tool</p>
                        <p className='mt-1'>
                            This server runs outside Privasys. Data the assistant
                            sends to it leaves the enclave and is not attested or
                            protected.
                        </p>
                        {allowExternal ? (
                            <label className='mt-2 flex items-start gap-2'>
                                <input
                                    type='checkbox'
                                    className='mt-0.5'
                                    checked={ack}
                                    onChange={(e) => setAck(e.target.checked)}
                                />
                                <span>I understand and want to add it anyway.</span>
                            </label>
                        ) : (
                            <p className='mt-2 font-medium'>
                                This fleet only allows attested enclave tools.
                            </p>
                        )}
                    </div>
                )}

                {err && <p className='text-xs text-red-400'>{err}</p>}
                {userTools.awaitingApproval && (
                    <p className='flex items-center gap-1.5 text-xs text-[var(--color-primary-blue)]'>
                        <span className='inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-primary-blue)]' />
                        Approve adding this tool on your phone…
                    </p>
                )}

                <div>
                    <button
                        type='button'
                        disabled={busy || (!isUrl && !resolved)}
                        onClick={() => void submit()}
                        className='rounded-lg bg-[var(--color-primary-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
                    >
                        {busy ? 'Adding…' : 'Add tool'}
                    </button>
                </div>
            </div>
        </section>
    );
}

// What the user is about to trust, shown BEFORE confirming the add.
function ResolvePreview({ app }: { app: ResolvedApp }) {
    return (
        <div className='rounded-lg border border-emerald-300/40 bg-emerald-50/30 p-3 text-xs dark:border-emerald-500/20 dark:bg-emerald-900/10'>
            <div className='flex flex-wrap items-center gap-2'>
                <span className='font-medium text-[var(--color-text-primary)]'>
                    {app.display_name || app.name}
                </span>
                <KindBadge enclave />
                <span className='rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--color-text-muted)]'>
                    {app.app_type}{app.tee_type ? ` · ${app.tee_type}` : ''}
                </span>
            </div>
            <p className='mt-1 text-[var(--color-text-secondary)]'>host {app.hostname}</p>
            <p className='mt-0.5 font-mono text-[11px] text-[var(--color-text-muted)]'>
                attested digest {app.image_digest.slice(0, 20)}…
            </p>
            {!app.has_mcp && (
                <p className='mt-1 text-amber-500'>
                    This app does not expose an MCP tool interface.
                </p>
            )}
        </div>
    );
}

function KindBadge({ enclave }: { enclave: boolean }) {
    return enclave ? (
        <span className='rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'>
            Enclave · attested
        </span>
    ) : (
        <span className='rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400'>
            External · not attested
        </span>
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
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4.5 left-0.5' : 'left-0.5'}`}
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
