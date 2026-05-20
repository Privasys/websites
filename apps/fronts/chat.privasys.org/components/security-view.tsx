'use client';

import * as React from 'react';
import {
    AttestationResultView,
    CompositeAttestationView,
    useAttestation
} from '@privasys/attestation-view';
import type {
    AggregateAttestationStatus,
    AttestationExpectations,
    AttestationTargetConfig
} from '@privasys/attestation-view';
import type { Instance } from '~/lib/types';
import { useAuth } from '~/lib/privasys-auth';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.developer.privasys.org';

// Full-pane Security view rendered inside the chat shell when the user
// clicks "Secure enclaves attestations" in the sidebar.
//
// When the instance exposes one or more AI Tools (each backed by an
// MCP server in its own enclave), the view renders a composite
// attestation: one row per component (the AI container + each tool
// server), with a top banner that turns green only when every quote
// verifies and every expected digest matches.
export function SecurityView({ instance, onStatus }: { instance: Instance; onStatus?: (_status: AggregateAttestationStatus) => void }) {
    const { getTokenForAudience } = useAuth();
    // Stable thunk so React.memo / dep arrays inside attestation-view
    // don't re-fire on every render. The actual token mint is short and
    // happens at request time only.
    const verifyQuoteAuth = React.useCallback(
        () => getTokenForAudience('attestation-server'),
        [getTokenForAudience]
    );
    const attestUrl = instance.attest_url
        ? new URL(instance.attest_url, API_BASE_URL).toString()
        : '';
    const verifyQuoteUrl = instance.attestation_server
        ? `${instance.attestation_server.replace(/\/$/, '')}/verify-quote`
        : undefined;

    const aiExpectations: AttestationExpectations | undefined = instance.loaded_model?.digest
        ? {
            modelDigest: instance.loaded_model.digest,
            labels: {
                modelDigest: `matches expected model "${instance.loaded_model.label ?? instance.loaded_model.name}"`
            }
        }
        : undefined;

    const tools = instance.available_tools ?? [];
    const useComposite = tools.length > 0;

    const containerHeader = (
        <header className='mb-6'>
            <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>
                Security
            </h1>
            <p className='mt-1 text-sm text-[var(--color-text-secondary)]'>
                Live attestation for{' '}
                <span className='font-medium text-[var(--color-text-primary)]'>
                    {instance.alias ?? instance.id}
                </span>
                . Verify the hardware, firmware{useComposite ? ', model and AI tools' : ' and model'} running this session.
            </p>
        </header>
    );

    if (useComposite) {
        const targets: AttestationTargetConfig[] = [
            ...(attestUrl
                ? [{
                    id: 'ai',
                    label: 'AI inference container',
                    description: 'confidential-ai on the fleet enclave',
                    attestUrl,
                    verifyQuoteUrl,
                    expectations: aiExpectations
                }]
                : []),
            ...tools
                .filter(t => Boolean(t.attest_url))
                .map(t => ({
                    id: `tool:${t.name}`,
                    label: `Tool: ${t.label}`,
                    description: t.description,
                    attestUrl: new URL(t.attest_url!, API_BASE_URL).toString(),
                    verifyQuoteUrl,
                    expectations: t.expected_digest
                        ? {
                            workloadImageDigest: t.expected_digest,
                            labels: {
                                workloadImageDigest: `matches the expected ${t.label} image digest`
                            }
                        }
                        : undefined
                }))
        ];
        return (
            <div className='flex flex-1 flex-col overflow-y-auto'>
                <div className='mx-auto w-full max-w-3xl px-6 py-8'>
                    {containerHeader}
                    {targets.length === 0 ? (
                        <div className='rounded-xl border border-black/10 p-5 text-sm text-black/60 dark:border-white/10 dark:text-white/60'>
                            No attestable component is currently exposed on this
                            fleet.
                        </div>
                    ) : (
                        <>
                            {!attestUrl && (
                                <div className='mb-4 rounded-xl border border-amber-200/50 bg-amber-50/40 p-4 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-900/10 dark:text-amber-200'>
                                    The AI inference container does not expose an
                                    attestation endpoint on this fleet. Only the
                                    enabled MCP tool enclaves are listed below.
                                </div>
                            )}
                            <CompositeAttestationView targets={targets} verifyQuoteAuth={verifyQuoteAuth} onAggregateStatus={onStatus} />
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <SingleAttestation
            attestUrl={attestUrl}
            verifyQuoteUrl={verifyQuoteUrl}
            verifyQuoteAuth={verifyQuoteAuth}
            expectations={aiExpectations}
            header={containerHeader}
            onStatus={onStatus}
        />
    );
}

function SingleAttestation({
    attestUrl,
    verifyQuoteUrl,
    verifyQuoteAuth,
    expectations,
    header,
    onStatus
}: {
    attestUrl: string;
    verifyQuoteUrl?: string;
    verifyQuoteAuth?: () => Promise<string>;
    expectations?: AttestationExpectations;
    header: React.ReactNode;
    onStatus?: (_status: AggregateAttestationStatus) => void;
}) {
    const [state, actions] = useAttestation({
        attestUrl,
        verifyQuoteUrl,
        verifyQuoteToken: verifyQuoteAuth,
        autoInspect: Boolean(attestUrl),
        autoVerifyQuote: Boolean(verifyQuoteUrl)
    });

    // Mirror CompositeAttestationView's status semantics for the single-target case
    // so the sidebar pill behaves the same when no tools are exposed.
    React.useEffect(() => {
        if (!onStatus) return;
        if (!attestUrl) { onStatus('failed'); return; }
        if (!state.result && !state.error) { onStatus('verifying'); return; }
        if (state.error && !state.result) { onStatus('failed'); return; }
        if (verifyQuoteUrl) {
            if (state.verifying || (!state.quoteVerify && !state.quoteVerifyError)) { onStatus('verifying'); return; }
            if (state.quoteVerifyError || (state.quoteVerify && !state.quoteVerify.success)) { onStatus('failed'); return; }
        }
        onStatus('verified');
    }, [onStatus, attestUrl, verifyQuoteUrl, state.result, state.error, state.verifying, state.quoteVerify, state.quoteVerifyError]);

    return (
        <div className='flex flex-1 flex-col overflow-y-auto'>
            <div className='mx-auto w-full max-w-3xl px-6 py-8'>
                {header}

                {!attestUrl ? (
                    <div className='rounded-xl border border-black/10 p-5 text-sm text-black/60 dark:border-white/10 dark:text-white/60'>
                        No app is currently deployed on this fleet, so there is
                        nothing to attest yet.
                    </div>
                ) : state.error && !state.result ? (
                    <div className='space-y-3 rounded-xl border border-red-200/50 bg-red-50/40 p-5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-900/10 dark:text-red-300'>
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
                    <div className='flex items-center gap-3 rounded-xl border border-black/10 p-5 text-sm text-black/60 dark:border-white/10 dark:text-white/60'>
                        <svg className='h-4 w-4 animate-spin' viewBox='0 0 24 24' aria-hidden='true'>
                            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z' />
                        </svg>
                        Inspecting certificate...
                    </div>
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
        </div>
    );
}
