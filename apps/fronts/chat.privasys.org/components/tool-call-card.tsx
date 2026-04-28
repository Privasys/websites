'use client';

import { useState } from 'react';
import type { ToolInvocation } from '~/lib/conversations';

// ToolCallCard renders a single MCP tool invocation inline in an
// assistant turn. Inspired by GitHub Copilot Chat's
// ChatToolInvocationPart: collapsed by default, click to expand and see
// the arguments + result. While the call is in flight we show an
// animated dot; on completion we flip to a green check or a red cross
// and surface the duration.
//
// The TDX trust signal layered on top of Copilot's pattern: the server
// portion of the qualified tool name (`<server>__<tool>`) is shown as a
// small badge so the user sees WHICH enclave served the call. A future
// iteration will pin the MRTD here.
export function ToolCallCard({ invocation }: { invocation: ToolInvocation }) {
    const [expanded, setExpanded] = useState(false);
    const [server, tool] = splitName(invocation.name);

    const status = invocation.status;
    const dur =
        invocation.durationMs !== undefined
            ? `${invocation.durationMs}ms`
            : status === 'running'
                ? 'running…'
                : '';

    return (
        <div
            className={`my-2 rounded-md border px-3 py-2 text-xs ${
                status === 'error'
                    ? 'border-red-500/30 bg-red-500/5'
                    : invocation.requiresConfirmation
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-[var(--color-surface-3)] bg-[var(--color-surface-2)]/40'
            }`}
        >
            <button
                type='button'
                onClick={() => setExpanded((v) => !v)}
                className='flex w-full items-center gap-2 text-left'
            >
                <StatusDot status={status} />
                <span className='inline-flex items-center gap-1'>
                    <span className='rounded-sm bg-[var(--color-surface-3)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]'>
                        {server}
                    </span>
                    <span className='font-mono text-[var(--color-text-primary)]'>{tool}</span>
                    {invocation.requiresConfirmation && (
                        <span
                            className='rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-300'
                            title='This tool can change state outside the enclave (write action). Review the arguments below.'
                        >
                            write
                        </span>
                    )}
                </span>
                <span className='ml-auto text-[var(--color-text-muted)]'>{dur}</span>
                <span className='text-[var(--color-text-muted)]'>{expanded ? '▾' : '▸'}</span>
            </button>
            {expanded && (
                <div className='mt-2 grid gap-2'>
                    {invocation.requiresConfirmation && (
                        <p className='rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-200'>
                            The agent invoked a write-capable tool. The
                            arguments below were sent verbatim to the
                            owning MCP server. If this looks wrong, hit
                            Stop and rephrase your prompt.
                        </p>
                    )}
                    <Pre label='args'>{stringify(invocation.args)}</Pre>
                    {status === 'error' ? (
                        <Pre label='error' tone='error'>
                            {invocation.error ?? 'unknown error'}
                        </Pre>
                    ) : status === 'ok' ? (
                        <Pre label='result'>{stringify(invocation.result)}</Pre>
                    ) : null}
                </div>
            )}
        </div>
    );
}

function StatusDot({ status }: { status: ToolInvocation['status'] }) {
    if (status === 'running') {
        return (
            <span className='relative inline-flex h-2 w-2'>
                <span className='absolute inset-0 animate-ping rounded-full bg-[var(--color-primary-blue)] opacity-60' />
                <span className='relative inline-flex h-2 w-2 rounded-full bg-[var(--color-primary-blue)]' />
            </span>
        );
    }
    if (status === 'ok') {
        return <span className='inline-block h-2 w-2 rounded-full bg-[var(--color-primary-green)]' />;
    }
    return <span className='inline-block h-2 w-2 rounded-full bg-red-500' />;
}

function Pre({
    label,
    children,
    tone
}: {
    label: string;
    children: string;
    tone?: 'error';
}) {
    return (
        <div>
            <div className='mb-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]'>
                {label}
            </div>
            <pre
                className={`max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-[var(--color-surface-3)]/40 px-2 py-1.5 font-mono text-[11px] ${
                    tone === 'error' ? 'text-red-300' : 'text-[var(--color-text-primary)]'
                }`}
            >
                {children}
            </pre>
        </div>
    );
}

function splitName(qualified: string): [string, string] {
    const i = qualified.indexOf('__');
    if (i < 0) return ['', qualified];
    return [qualified.slice(0, i), qualified.slice(i + 2)];
}

function stringify(v: unknown): string {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    try {
        return JSON.stringify(v, null, 2);
    } catch {
        return String(v);
    }
}
