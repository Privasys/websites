'use client';

// ToolActivity renders one assistant turn's tool calls as a single grouped
// activity block: a verb header, one row per call, favicons for pages, an
// auto-fold to a one-line summary once the run completes, and the developer
// detail (verbatim args, duration, serving code hash) behind a per-step
// "details" toggle.
//
// DELIBERATELY GENERIC (no per-tool code): the renderer never keys on a tool
// or server NAME. Row titles come from the SHAPE of the call's arguments —
// any argument value that parses as an http(s) URL becomes the row's link,
// favicon host and title; otherwise the most salient string argument is shown
// quoted. Display names come from the fleet's tool rows (label), which are
// data, not code. A tool this cannot describe falls back to its bare tool
// name, humanised by a uniform rule. Results are NOT interpreted.
//
// Trust: every step carries a shield chip — filled when the serving MCP
// server is an attested enclave (its fleet row pins a code hash), hollow
// "external" when it is not.
//
// Fold behaviour: expanded while any step is running or awaiting consent;
// auto-folds when the run completes, unless the user toggled it by hand.

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
    /** Fleet tool rows (labels + the attested shield / code hash). */
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

    const title = headerVerb(invocations, tools, running);
    const chips = argHostChips(invocations);
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
                <div className='relative border-t border-[var(--color-border-dark)] px-3.5 pt-1 pb-2.5'>
                    {/* One continuous rail behind the step tiles: rows vary in
                        height (one- and two-line), so per-gap segments never
                        span cleanly. The tiles are opaque and stack above it,
                        masking the rail where they sit. */}
                    {invocations.length + (!running && !consentPending ? 1 : 0) > 1 && (
                        <span
                            className='absolute top-[24px] bottom-[24px] left-[24px] w-[1.5px] bg-[var(--color-border-dark)]'
                            aria-hidden
                        />
                    )}
                    {invocations.map((inv) => (
                        <Step
                            key={inv.id}
                            inv={inv}
                            tool={toolRowFor(inv, tools)}
                            onAllow={() => onAllow(inv.id)}
                            onDeny={() => onDeny(inv.id)}
                        />
                    ))}
                    {!running && !consentPending && (
                        <div className='flex items-center gap-2.5 pt-2'>
                            <span className='relative z-[1] grid h-[21px] w-[21px] shrink-0 place-items-center rounded-full bg-[var(--color-surface-1)] text-[var(--color-primary-green)]'>
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
    tool,
    onAllow,
    onDeny
}: {
    inv: ToolInvocation;
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
            <div className='flex items-start gap-2.5 py-[7px]'>
                <StepTile view={view} seed={server || fn} />
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
                        This tool call performs a write action. The exact request is shown below;
                        the assistant is paused until you decide.
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
                    {detailStatusLine(inv, server || fn, tool)}
                </div>
            )}
        </>
    );
}

// Favicon of the page the call targets, falling back to a coloured letter
// tile when the site has none (or blocks the fetch). Non-URL steps get the
// letter tile straight away, seeded by the server name for a stable colour.
function StepTile({ view, seed }: { view: StepView; seed: string }) {
    const [failed, setFailed] = useState(false);
    const host = view.href ? safeHost(view.href) : null;
    if (host && !failed) {
        return (
            <img
                src={`https://${host}/favicon.ico`}
                onError={() => setFailed(true)}
                alt=''
                className='relative z-[1] mt-px h-[21px] w-[21px] shrink-0 rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)] object-contain p-0.5'
            />
        );
    }
    return <LetterTile seed={host ?? seed} />;
}

function LetterTile({ seed }: { seed: string }) {
    // Stable colour per seed, no network: hash → hue.
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return (
        <span
            className='relative z-[1] mt-px grid h-[21px] w-[21px] shrink-0 place-items-center rounded-md text-[10px] font-bold text-white'
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

// --- argument-shape interpretation ------------------------------------------

interface StepView {
    title: string;
    sub: string;
    href?: string;
}

// A step is described from its ARGUMENTS only, by shape:
//   1. first http(s) URL value  → link + favicon + "host + path" title
//   2. else most salient string → quoted title
//   3. else                     → the bare tool name, humanised uniformly
function describe(inv: ToolInvocation, tool?: AvailableTool): StepView {
    const [server, fn] = splitName(inv.name);
    const label = tool?.label ?? humanise(server || fn);
    const strings = argStrings(inv.args);

    const url = strings.find((s) => isHttpUrl(s));
    if (url) {
        const host = safeHost(url);
        return {
            title: host ? host + shortPath(url) : url,
            sub: inv.status === 'error' ? errorSub(inv) : label,
            href: url
        };
    }

    const salient = pickSalientString(strings);
    if (salient) {
        return {
            title: `“${truncate(salient, 90)}”`,
            sub: inv.status === 'error' ? errorSub(inv) : label
        };
    }

    return {
        title: humanise(fn),
        sub: inv.status === 'error' ? errorSub(inv) : label
    };
}

function headerVerb(
    invocations: ToolInvocation[],
    tools: AvailableTool[] | undefined,
    running: boolean
): string {
    const servers = [...new Set(invocations.map((i) => splitName(i.name)[0]))];
    if (servers.length === 1) {
        const label =
            tools?.find((t) => t.name === servers[0])?.label ?? humanise(servers[0]);
        return running ? `Using ${label}…` : `Used ${label}`;
    }
    return running ? 'Looking things up…' : 'Looked things up';
}

// Hosts of every URL-shaped argument, for the folded summary chips.
function argHostChips(invocations: ToolInvocation[]): string[] {
    const chips: string[] = [];
    const seen = new Set<string>();
    for (const inv of invocations) {
        for (const s of argStrings(inv.args)) {
            if (!isHttpUrl(s)) continue;
            const h = safeHost(s);
            if (h && !seen.has(h)) {
                seen.add(h);
                chips.push(h);
            }
        }
    }
    return chips;
}

// Collect string values from the args object, two levels deep — enough for
// every MCP arg shape seen in practice without walking arbitrary payloads.
function argStrings(args: unknown): string[] {
    const out: string[] = [];
    const visit = (v: unknown, depth: number) => {
        if (typeof v === 'string') {
            out.push(v);
            return;
        }
        if (depth <= 0 || v === null || typeof v !== 'object') return;
        const values = Array.isArray(v) ? v : Object.values(v as Record<string, unknown>);
        for (const x of values) visit(x, depth - 1);
    };
    visit(args, 2);
    return out;
}

// The most salient non-URL string: the longest one that still reads as an
// input (not an id-like token, not an essay).
function pickSalientString(strings: string[]): string | null {
    const candidates = strings
        .filter((s) => !isHttpUrl(s))
        .map((s) => s.trim())
        .filter((s) => s.length >= 3 && s.length <= 400 && /\s|\p{L}{4,}/u.test(s));
    if (candidates.length === 0) return null;
    return candidates.reduce((a, b) => (b.length > a.length ? b : a));
}

function detailStatusLine(inv: ToolInvocation, server: string, tool?: AvailableTool): string {
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
            ? `· attested ${server} (code hash ${tool.expected_digest.slice(0, 8)}…)`
            : `· ${server} — external, not attested`
    );
    return parts.join(' ');
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

function errorSub(inv: ToolInvocation): string {
    const e = inv.error ?? 'failed';
    return truncate(e, 90);
}

function isHttpUrl(s: string): boolean {
    if (!/^https?:\/\//i.test(s)) return false;
    try {
        const u = new URL(s);
        return u.hostname.includes('.');
    } catch {
        return false;
    }
}

function safeHost(url: string): string | null {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

function shortPath(url: string): string {
    try {
        const u = new URL(url);
        const p = u.pathname === '/' ? '' : u.pathname;
        return truncate(p, 40);
    } catch {
        return '';
    }
}

function truncate(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max)}…` : s;
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
