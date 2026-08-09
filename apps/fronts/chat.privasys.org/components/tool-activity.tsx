'use client';

// ToolActivity renders one assistant turn's tool calls as a single grouped
// activity block (approved mock: tool-activity-proposal): a human verb in the
// header ("Searching the web…" → "Searched the web"), one row per call titled
// by its SALIENT ARGUMENT (the query text, the page read, the note recalled)
// rather than the qualified function name, favicons for pages with letter
// tiles as fallback, and the developer detail (verbatim args, result size,
// serving code hash) one level down behind a per-step "details" toggle.
//
// Trust: every step carries a shield chip — filled when the serving MCP
// server is an attested enclave (the fleet row pins its code hash), hollow
// "external" when it is not. This is the transparency layer the old
// ToolCallCard shouted from every row; here it is present but calm.
//
// Fold behaviour: expanded while any step is running or awaiting consent;
// auto-folds to a one-line summary with source chips when the run completes,
// unless the user has toggled it by hand (their choice wins).

import { useEffect, useRef, useState } from 'react';
import type { ToolInvocation } from '~/lib/conversations';
import type { AvailableTool } from '~/lib/types';

export function ToolActivity({
    invocations,
    tools,
    onAllow,
    onDeny
}: {
    invocations: ToolInvocation[];
    /** Fleet tool rows (for the attested shield + code hash in details). */
    tools?: AvailableTool[];
    onAllow: (_callId: string) => void;
    onDeny: (_callId: string) => void;
}) {
    const running = invocations.some((i) => i.status === 'running');
    const consentPending = invocations.some(
        (i) => i.requiresConfirmation && i.status === 'running' && !i.consent
    );

    const [open, setOpen] = useState(true);
    const userToggled = useRef(false);
    // Auto-fold on completion — but never against an explicit user toggle.
    useEffect(() => {
        if (!running && !userToggled.current) setOpen(false);
        if (running && !userToggled.current) setOpen(true);
    }, [running]);

    const title = headerVerb(invocations, running);
    const chips = sourceChips(invocations);
    const totalMs = totalDuration(invocations);

    return (
        <div className='overflow-hidden rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)]'>
            <button
                type='button'
                onClick={() => {
                    userToggled.current = true;
                    setOpen((v) => !v);
                }}
                aria-expanded={open}
                className='flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left'
            >
                {running ? (
                    <Spinner />
                ) : (
                    <SearchGlyph className='h-[15px] w-[15px] shrink-0 text-[var(--color-text-secondary)]' />
                )}
                <span className='text-[13.5px] font-semibold text-[var(--color-text-primary)]'>
                    {title}
                </span>
                <span className='ml-auto flex shrink-0 items-center gap-2 text-xs text-[var(--color-text-muted)]'>
                    {!open && chips.length > 0 && (
                        <span className='hidden gap-1 sm:flex'>
                            {chips.slice(0, 3).map((c) => (
                                <span
                                    key={c}
                                    className='rounded-full border border-[var(--color-border-dark)] bg-[var(--color-surface-2)] px-2 py-px text-[11px] text-[var(--color-text-secondary)]'
                                >
                                    {c}
                                </span>
                            ))}
                            {chips.length > 3 && <span>+{chips.length - 3}</span>}
                        </span>
                    )}
                    {open && !running && (
                        <span>
                            {invocations.length} step{invocations.length === 1 ? '' : 's'}
                            {totalMs ? ` · ${(totalMs / 1000).toFixed(1)}s` : ''}
                        </span>
                    )}
                    <span
                        className={`transition-transform ${open ? 'rotate-90' : ''}`}
                        aria-hidden
                    >
                        ›
                    </span>
                </span>
            </button>

            {open && (
                <div className='border-t border-[var(--color-border-dark)] px-3.5 pt-1 pb-2.5'>
                    {invocations.map((inv, i) => (
                        <Step
                            key={inv.id}
                            inv={inv}
                            first={i === 0}
                            tool={toolRowFor(inv, tools)}
                            onAllow={() => onAllow(inv.id)}
                            onDeny={() => onDeny(inv.id)}
                        />
                    ))}
                    {!running && !consentPending && (
                        <div className='relative flex items-center gap-2.5 pt-2'>
                            <Connector />
                            <span className='grid h-[21px] w-[21px] shrink-0 place-items-center text-[var(--color-primary-green)]'>
                                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' className='h-[15px] w-[15px]' aria-hidden>
                                    <path d='M20 6L9 17l-5-5' />
                                </svg>
                            </span>
                            <span className='text-[13px] text-[var(--color-text-secondary)]'>Done</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- one step ---------------------------------------------------------------

function Step({
    inv,
    first,
    tool,
    onAllow,
    onDeny
}: {
    inv: ToolInvocation;
    first: boolean;
    tool?: AvailableTool;
    onAllow: () => void;
    onDeny: () => void;
}) {
    const [showDetails, setShowDetails] = useState(false);
    const [server, fn] = splitName(inv.name);
    const view = describe(inv, tool);
    const needsConsent = inv.requiresConfirmation && inv.status === 'running' && !inv.consent;
    const attested = !!tool?.expected_digest;

    return (
        <>
            <div className='relative flex items-start gap-2.5 py-[7px]'>
                {!first && <Connector />}
                <StepTile view={view} server={server} />
                <span className='min-w-0 flex-1'>
                    <span className='block overflow-hidden text-[13.5px] text-ellipsis whitespace-nowrap text-[var(--color-text-primary)]'>
                        {view.href ? (
                            <a
                                href={view.href}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='hover:text-[var(--color-primary-blue)]'
                            >
                                {view.title}
                            </a>
                        ) : (
                            view.title
                        )}
                    </span>
                    <span
                        className={`flex items-center gap-1.5 text-xs ${inv.status === 'error' ? 'text-red-500 dark:text-red-300' : 'text-[var(--color-text-muted)]'}`}
                    >
                        <span className='truncate'>{view.sub}</span>
                        <Shield attested={attested} />
                    </span>
                </span>
                <span className='ml-auto flex shrink-0 items-center gap-2 pt-0.5 text-[11.5px] text-[var(--color-text-muted)]'>
                    {inv.status === 'running' && !needsConsent && <Spinner small />}
                    {view.href && (
                        <a
                            href={view.href}
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label='Open source'
                            className='hover:text-[var(--color-primary-blue)]'
                        >
                            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
                                <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
                                <path d='M15 3h6v6' />
                                <path d='M10 14L21 3' />
                            </svg>
                        </a>
                    )}
                    <button
                        type='button'
                        onClick={() => setShowDetails((v) => !v)}
                        className='underline decoration-[var(--color-text-muted)]/50 underline-offset-2 hover:text-[var(--color-primary-blue)]'
                    >
                        details
                    </button>
                </span>
            </div>

            {needsConsent && (
                <div className='mx-0 mt-1 mb-1.5 ml-[31px] grid gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[12.5px] text-[var(--color-text-secondary)]'>
                    <span>
                        {consentSentence(server)} The exact request is shown below; the assistant
                        is paused until you decide.
                    </span>
                    <pre className='max-h-36 overflow-auto rounded bg-[var(--color-surface-2)]/60 px-2 py-1.5 font-mono text-[11px] break-all whitespace-pre-wrap text-[var(--color-text-primary)]'>
                        {stringify(inv.args)}
                    </pre>
                    <span className='flex gap-2'>
                        <button
                            type='button'
                            onClick={onAllow}
                            className='rounded-md border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-amber-500/30'
                        >
                            Allow
                        </button>
                        <button
                            type='button'
                            onClick={onDeny}
                            className='rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] px-3 py-1 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:text-red-500'
                        >
                            Deny
                        </button>
                    </span>
                </div>
            )}
            {inv.consent === 'denied' && (
                <p className='mb-1 ml-[31px] text-[11.5px] text-red-500 dark:text-red-300'>
                    Denied — the assistant will try something else.
                </p>
            )}

            {showDetails && (
                <div className='mt-1 mb-1.5 ml-[31px] max-h-40 overflow-auto rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/60 px-2.5 py-2 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-[var(--color-text-secondary)]'>
                    {stringify(inv.args) || '{}'}
                    {'\n'}
                    {detailStatusLine(inv, server, fn, tool)}
                </div>
            )}
        </>
    );
}

// Icon or favicon for a step. Pages get the site's real favicon and fall
// back to a coloured letter tile when it fails to load (or CSP blocks it).
function StepTile({ view, server }: { view: StepView; server: string }) {
    const [failed, setFailed] = useState(false);
    const host = view.href ? safeHost(view.href) : null;
    if (host && !failed) {
        return (
            <img
                src={`https://${host}/favicon.ico`}
                onError={() => setFailed(true)}
                alt=''
                className='mt-px h-[21px] w-[21px] shrink-0 rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)] object-contain p-0.5'
            />
        );
    }
    if (view.kind === 'drive') {
        return (
            <span className='mt-px grid h-[21px] w-[21px] shrink-0 place-items-center rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'>
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-3 w-3' aria-hidden>
                    <path d='M3 7l3-4h12l3 4M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7M3 7h18' />
                </svg>
            </span>
        );
    }
    return <LetterTile seed={host ?? server} />;
}

function LetterTile({ seed }: { seed: string }) {
    // Stable colour per seed, no network: hash → hue.
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return (
        <span
            className='mt-px grid h-[21px] w-[21px] shrink-0 place-items-center rounded-md text-[10px] font-bold text-white'
            style={{ background: `hsl(${hue} 55% 45%)` }}
            aria-hidden
        >
            {(seed[0] ?? '?').toUpperCase()}
        </span>
    );
}

function Shield({ attested }: { attested: boolean }) {
    return (
        <span
            className='inline-flex shrink-0 items-center gap-0.5 text-[11px]'
            title={
                attested
                    ? 'Served by an attested Privasys enclave'
                    : 'External tool — runs outside the platform, not attested'
            }
        >
            <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.4'
                className={`h-[11px] w-[11px] ${attested ? 'text-[var(--color-primary-green)]' : 'text-[var(--color-text-muted)]'}`}
                aria-hidden
            >
                <path d='M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z' />
            </svg>
            {attested ? 'enclave' : 'external'}
        </span>
    );
}

function Connector() {
    return (
        <span
            className='absolute top-[-7px] left-[10px] h-[13px] border-l-[1.5px] border-[var(--color-border-dark)]'
            aria-hidden
        />
    );
}

function Spinner({ small }: { small?: boolean }) {
    const size = small ? 'h-[11px] w-[11px]' : 'h-[13px] w-[13px]';
    return (
        <span
            className={`${size} shrink-0 animate-spin rounded-full border-2 border-[var(--color-border-dark)] border-t-[var(--color-primary-blue)] motion-reduce:animate-none`}
            aria-hidden
        />
    );
}

function SearchGlyph({ className }: { className?: string }) {
    return (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={className} aria-hidden>
            <circle cx='11' cy='11' r='7' />
            <path d='M21 21l-4.3-4.3' />
        </svg>
    );
}

// --- interpretation ---------------------------------------------------------

interface StepView {
    kind: 'web-search' | 'web-read' | 'drive' | 'other';
    title: string;
    sub: string;
    href?: string;
}

function describe(inv: ToolInvocation, tool?: AvailableTool): StepView {
    const [server, fn] = splitName(inv.name);
    const args = (inv.args ?? {}) as Record<string, unknown>;
    const label = tool?.label ?? humanise(server || fn);

    if (server === 'web_search' || fn === 'web_search') {
        const q = typeof args.query === 'string' ? args.query : '';
        const n = resultCount(inv.result);
        return {
            kind: 'web-search',
            title: q ? `“${q}”` : label,
            sub: inv.status === 'error' ? errorSub(inv) : `${label}${n !== null ? ` · ${n} result${n === 1 ? '' : 's'}` : ''}`
        };
    }
    if (server === 'web_reader' || fn === 'browse') {
        const url = typeof args.url === 'string' ? args.url : undefined;
        const host = url ? safeHost(url) : null;
        const title = resultTitle(inv.result) ?? (host ? `Reading ${host}` : label);
        return {
            kind: 'web-read',
            title,
            sub: inv.status === 'error' ? errorSub(inv) : `${host ?? label} · read in full`,
            href: url
        };
    }
    if (server === 'drive') {
        if (fn === 'get_memory') {
            return { kind: 'drive', title: 'Recalled your memory notes', sub: memorySub(inv) };
        }
        if (fn === 'search_semantic') {
            const q = typeof args.query === 'string' ? args.query : '';
            const n = resultCount(inv.result);
            return {
                kind: 'drive',
                title: q ? `Searched your Drive for “${q}”` : 'Searched your Drive',
                sub: inv.status === 'error' ? errorSub(inv) : `Memory${n !== null ? ` · ${n} passage${n === 1 ? '' : 's'}` : ''}`
            };
        }
        if (fn === 'read_file' || fn === 'read_section') {
            return {
                kind: 'drive',
                title: 'Read a document from your Drive',
                sub: inv.status === 'error' ? errorSub(inv) : 'Memory'
            };
        }
        if (fn === 'get_folder_tree') {
            return {
                kind: 'drive',
                title: 'Browsed your Drive folders',
                sub: inv.status === 'error' ? errorSub(inv) : 'Memory'
            };
        }
        return { kind: 'drive', title: humanise(fn), sub: inv.status === 'error' ? errorSub(inv) : 'Memory' };
    }
    return {
        kind: 'other',
        title: humanise(fn),
        sub: inv.status === 'error' ? errorSub(inv) : label
    };
}

function headerVerb(invocations: ToolInvocation[], running: boolean): string {
    const servers = new Set(invocations.map((i) => splitName(i.name)[0]));
    const hasWeb = servers.has('web_search') || servers.has('web_reader');
    const write = invocations.some((i) => i.requiresConfirmation);
    if (hasWeb) return running ? 'Searching the web…' : 'Searched the web';
    if (servers.size === 1 && servers.has('drive')) {
        if (write) return running ? 'Working in your Drive…' : 'Worked in your Drive';
        return running ? 'Searching your Drive…' : 'Searched your Drive';
    }
    if (servers.size === 1) {
        const s = humanise([...servers][0]);
        return running ? `Using ${s}…` : `Used ${s}`;
    }
    return running ? 'Looking things up…' : 'Looked things up';
}

// Domains + sources for the folded summary.
function sourceChips(invocations: ToolInvocation[]): string[] {
    const chips: string[] = [];
    const seen = new Set<string>();
    const push = (c: string) => {
        if (!seen.has(c)) {
            seen.add(c);
            chips.push(c);
        }
    };
    for (const inv of invocations) {
        const [server] = splitName(inv.name);
        const args = (inv.args ?? {}) as Record<string, unknown>;
        if (server === 'web_reader' && typeof args.url === 'string') {
            const h = safeHost(args.url);
            if (h) push(h);
        } else if (server === 'web_search') {
            for (const u of resultUrls(inv.result).slice(0, 3)) {
                const h = safeHost(u);
                if (h) push(h);
            }
        } else if (server === 'drive') {
            push('Memory');
        }
    }
    return chips;
}

function detailStatusLine(
    inv: ToolInvocation,
    server: string,
    fn: string,
    tool?: AvailableTool
): string {
    const parts: string[] = ['→'];
    if (inv.status === 'error') parts.push(`error: ${inv.error ?? 'unknown'}`);
    else if (inv.status === 'ok') {
        parts.push('ok');
        const size = inv.result === undefined ? 0 : stringify(inv.result).length;
        if (size > 0) parts.push(`· ${size >= 2048 ? `${(size / 1024).toFixed(0)} KB` : `${size} B`} result`);
    } else parts.push('running');
    if (inv.durationMs !== undefined) parts.push(`· ${inv.durationMs}ms`);
    parts.push(
        tool?.expected_digest
            ? `· attested ${server || fn} (code hash ${tool.expected_digest.slice(0, 8)}…)`
            : `· ${server || fn} — external, not attested`
    );
    return parts.join(' ');
}

function consentSentence(server: string): string {
    if (server === 'drive') return 'This writes to your Drive.';
    return 'This performs an action outside the conversation.';
}

// --- small helpers ----------------------------------------------------------

function toolRowFor(inv: ToolInvocation, tools?: AvailableTool[]): AvailableTool | undefined {
    const [server] = splitName(inv.name);
    return tools?.find((t) => t.name === server);
}

function totalDuration(invocations: ToolInvocation[]): number | null {
    const start = Math.min(...invocations.map((i) => i.startedAt));
    const ends = invocations.map((i) => i.finishedAt ?? 0).filter(Boolean);
    if (!Number.isFinite(start) || ends.length === 0) return null;
    return Math.max(...ends) - start;
}

function memorySub(inv: ToolInvocation): string {
    if (inv.status === 'error') return errorSub(inv);
    const r = inv.result as { memories?: unknown[]; mode?: string } | undefined;
    if (r?.mode === 'disabled') return 'Memory is switched off';
    const n = Array.isArray(r?.memories) ? r.memories.length : null;
    return `Memory${n !== null ? ` · ${n} note${n === 1 ? '' : 's'}` : ''}`;
}

function errorSub(inv: ToolInvocation): string {
    const e = inv.error ?? 'failed';
    return e.length > 90 ? `${e.slice(0, 90)}…` : e;
}

function resultCount(result: unknown): number | null {
    if (!result || typeof result !== 'object') return null;
    const r = result as Record<string, unknown>;
    for (const key of ['results', 'hits', 'memories']) {
        if (Array.isArray(r[key])) return (r[key] as unknown[]).length;
    }
    const web = r.web as Record<string, unknown> | undefined;
    if (web && Array.isArray(web.results)) return (web.results as unknown[]).length;
    return null;
}

function resultUrls(result: unknown): string[] {
    if (!result || typeof result !== 'object') return [];
    const r = result as Record<string, unknown>;
    const arr = (Array.isArray(r.results) ? r.results : undefined) ??
        (Array.isArray((r.web as Record<string, unknown> | undefined)?.results)
            ? ((r.web as Record<string, unknown>).results as unknown[])
            : undefined);
    if (!arr) return [];
    return arr
        .map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>).url : undefined))
        .filter((u): u is string => typeof u === 'string');
}

function resultTitle(result: unknown): string | null {
    if (!result || typeof result !== 'object') return null;
    const t = (result as Record<string, unknown>).title;
    return typeof t === 'string' && t.trim() ? t.trim() : null;
}

function safeHost(url: string): string | null {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

function splitName(qualified: string): [string, string] {
    const i = qualified.indexOf('__');
    if (i < 0) return ['', qualified];
    return [qualified.slice(0, i), qualified.slice(i + 2)];
}

function humanise(name: string): string {
    const s = name.replace(/[_-]+/g, ' ').trim();
    return s ? s[0].toUpperCase() + s.slice(1) : name;
}

function stringify(v: unknown): string {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    try {
        return JSON.stringify(v, null, 1);
    } catch {
        return String(v);
    }
}
