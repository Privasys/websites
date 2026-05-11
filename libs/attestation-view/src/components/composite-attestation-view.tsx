'use client';

import { useCallback, useEffect, useState } from 'react';
import { AttestationResultView } from './attestation-result-view';
import { useAttestation } from '../use-attestation';
import type { AttestationExpectations } from '../types';

// One target the composite view should attest. Mirrors the inputs to
// useAttestation, plus a human label and an optional kind hint used for
// the summary line ("AI container", "Tool: lightpanda", etc.).
export interface AttestationTargetConfig {
    /** Stable id for React keys. Typically the server name or "ai". */
    id: string;
    /** Display label, e.g. "AI container" or "Tool: lightpanda". */
    label: string;
    /** Optional one-line description shown under the label. */
    description?: string;
    /** mgmt-service /attest proxy URL for this enclave. */
    attestUrl: string;
    /** Attestation server /verify-quote URL. */
    verifyQuoteUrl?: string;
    /** Expected digests for green-badge stamping. */
    expectations?: AttestationExpectations;
}

export interface CompositeAttestationViewProps {
    targets: AttestationTargetConfig[];
    /** When true, every row auto-inspects on mount. */
    autoInspect?: boolean;
}

interface RowSummary {
    ready: boolean;     // an inspection has completed (success or hard error)
    quoteOk: boolean;   // verify-quote returned ok
    digestsOk: boolean; // every supplied expectation matched its OID
    error?: string;
}

export function CompositeAttestationView({ targets, autoInspect = true }: CompositeAttestationViewProps) {
    const [rows, setRows] = useState<Record<string, RowSummary>>({});

    const onRowSummary = useCallback((id: string, summary: RowSummary) => {
        setRows(prev => {
            const cur = prev[id];
            if (cur && cur.ready === summary.ready
                && cur.quoteOk === summary.quoteOk
                && cur.digestsOk === summary.digestsOk
                && cur.error === summary.error) {
                return prev;
            }
            return { ...prev, [id]: summary };
        });
    }, []);

    const total = targets.length;
    const ready = targets.filter(t => rows[t.id]?.ready).length;
    const allReady = ready === total && total > 0;
    const allOk = allReady && targets.every(t => {
        const r = rows[t.id];
        return r && r.quoteOk && r.digestsOk;
    });

    return (
        <div className='flex flex-col gap-6'>
            <SummaryBanner total={total} ready={ready} allOk={allOk} />
            {targets.map(t => (
                <AttestationRow
                    key={t.id}
                    target={t}
                    autoInspect={autoInspect}
                    onSummary={s => onRowSummary(t.id, s)}
                />
            ))}
        </div>
    );
}

function SummaryBanner({ total, ready, allOk }: { total: number; ready: number; allOk: boolean }) {
    if (total === 0) {
        return (
            <div className='rounded-xl border border-black/10 p-4 text-sm text-black/60 dark:border-white/10 dark:text-white/60'>
                Nothing to attest yet.
            </div>
        );
    }
    if (ready < total) {
        return (
            <div className='rounded-xl border border-black/10 p-4 text-sm text-black/60 dark:border-white/10 dark:text-white/60'>
                Verifying {ready}/{total} components...
            </div>
        );
    }
    if (allOk) {
        return (
            <div className='rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-4 text-sm text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-900/10 dark:text-emerald-200'>
                <strong>All {total} components verified.</strong> Hardware quotes valid; every
                expected workload, model and tool-set digest matches.
            </div>
        );
    }
    return (
        <div className='rounded-xl border border-red-300/40 bg-red-50/40 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-900/10 dark:text-red-300'>
            <strong>One or more components failed attestation.</strong> See the per-row details
            below for which quotes did not verify or which digests did not match.
        </div>
    );
}

function AttestationRow({
    target,
    autoInspect,
    onSummary
}: {
    target: AttestationTargetConfig;
    autoInspect: boolean;
    // eslint-disable-next-line no-unused-vars
    onSummary: (_summary: RowSummary) => void;
}) {
    const [state, actions] = useAttestation({
        attestUrl: target.attestUrl,
        verifyQuoteUrl: target.verifyQuoteUrl,
        autoInspect: autoInspect && Boolean(target.attestUrl),
        autoVerifyQuote: autoInspect && Boolean(target.verifyQuoteUrl)
    });

    // Compute the per-row summary on every render and notify the parent.
    // useAttestation already debounces network work; this is cheap.
    const summary = computeSummary(state, target.expectations);
    useEffect(() => {
        onSummary(summary);
    }, [onSummary, summary.ready, summary.quoteOk, summary.digestsOk, summary.error]);

    return (
        <section className='rounded-xl border border-black/10 dark:border-white/10'>
            <header className='flex items-center justify-between gap-3 border-b border-black/10 p-4 dark:border-white/10'>
                <div>
                    <div className='text-sm font-semibold text-[var(--color-text-primary)]'>
                        {target.label}
                    </div>
                    {target.description && (
                        <div className='text-xs text-[var(--color-text-secondary)]'>
                            {target.description}
                        </div>
                    )}
                </div>
                <RowStatus summary={summary} />
            </header>
            <div className='p-4'>
                {!target.attestUrl ? (
                    <div className='text-sm text-black/60 dark:text-white/60'>
                        No attest URL configured for this component.
                    </div>
                ) : state.error && !state.result ? (
                    <div className='space-y-3 text-sm text-red-700 dark:text-red-300'>
                        <div>{state.error}</div>
                        <button
                            type='button'
                            onClick={() => void actions.inspect()}
                            className='rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5'
                        >
                            Retry
                        </button>
                    </div>
                ) : !state.result ? (
                    <div className='text-sm text-black/60 dark:text-white/60'>Inspecting...</div>
                ) : (
                    <AttestationResultView
                        result={state.result}
                        quoteVerify={state.quoteVerify}
                        quoteVerifying={state.verifying}
                        quoteVerifyError={state.quoteVerifyError}
                        expectations={target.expectations}
                        loading={state.loading}
                        challenge={state.challenge}
                        onChallengeChange={actions.setChallenge}
                        onRegenerateChallenge={actions.regenerateChallenge}
                        onRefresh={() => void actions.inspect()}
                        onReset={() => {
                            actions.regenerateChallenge();
                            void actions.inspect();
                        }}
                    />
                )}
            </div>
        </section>
    );
}

function RowStatus({ summary }: { summary: RowSummary }) {
    if (!summary.ready) {
        return <span className='text-xs text-black/50 dark:text-white/50'>verifying...</span>;
    }
    if (summary.quoteOk && summary.digestsOk) {
        return <span className='text-xs font-medium text-emerald-700 dark:text-emerald-300'>verified</span>;
    }
    if (!summary.quoteOk) {
        return <span className='text-xs font-medium text-red-700 dark:text-red-300'>quote failed</span>;
    }
    return <span className='text-xs font-medium text-red-700 dark:text-red-300'>digest mismatch</span>;
}

function computeSummary(
    state: ReturnType<typeof useAttestation>[0],
    expectations: AttestationExpectations | undefined
): RowSummary {
    const ready = Boolean(state.result || state.error);
    if (!ready) {
        return { ready: false, quoteOk: false, digestsOk: false };
    }
    if (state.error && !state.result) {
        return { ready: true, quoteOk: false, digestsOk: false, error: state.error };
    }
    const quoteOk = !state.quoteVerifyError
        && (!state.verifying)
        && (state.quoteVerify ? state.quoteVerify.success : true);

    let digestsOk = true;
    if (expectations && state.result) {
        const exts = state.result.extensions ?? [];
        const get = (oid: string) => exts.find((e: { oid: string; value_hex?: string }) => e.oid === oid)?.value_hex?.toLowerCase();
        const norm = (v?: string) => (v || '').toLowerCase().replace(/^0x/, '');
        const checks: Array<[string, string | undefined]> = [
            ['1.3.6.1.4.1.65230.3.2', expectations.workloadImageDigest],
            ['1.3.6.1.4.1.65230.3.5', expectations.modelDigest],
            ['1.3.6.1.4.1.65230.3.6', expectations.multimodalDigest],
            ['1.3.6.1.4.1.65230.3.7', expectations.toolsDigest]
        ];
        for (const [oid, want] of checks) {
            if (!want) continue;
            const have = get(oid);
            if (!have || have !== norm(want)) {
                digestsOk = false;
                break;
            }
        }
    }
    return { ready: true, quoteOk, digestsOk };
}
