'use client';

import * as React from 'react';
import {
    AttestationResultView,
    useAttestation
} from '@privasys/attestation-view';
import type {
    AggregateAttestationStatus,
    AttestationExpectations
} from '@privasys/attestation-view';
import type { Instance } from '~/lib/types';
import { useAuth } from '~/lib/privasys-auth';
import { API_BASE_URL } from '~/lib/resolve-app';

// Full-pane Security view rendered inside the chat shell.
//
// Scope: the confidential-ai INFERENCE CONTAINER's attestation — the
// session's core promise and the only input to the sidebar pill. Each AI
// TOOL is attested separately, co-located with the tool in the AI Tools
// view, so a tool can never redden the session's secure-enclave status.
export function SecurityView({
    instance,
    onStatus
}: {
    instance: Instance;
    onStatus?: (_status: AggregateAttestationStatus) => void;
}) {
    const { getTokenForAudience } = useAuth();
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

    return (
        <div className='flex flex-1 flex-col overflow-y-auto'>
            <div className='mx-auto w-full max-w-3xl px-6 py-8'>
                <header className='mb-6'>
                    <h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>
                        Security
                    </h1>
                    <p className='mt-1 text-sm text-[var(--color-text-secondary)]'>
                        Live attestation for{' '}
                        <span className='font-medium text-[var(--color-text-primary)]'>
                            {instance.alias ?? instance.id}
                        </span>
                        . The secure enclave below answers your prompts; each AI
                        tool is verified in the AI Tools view.
                    </p>
                </header>

                <section className='mb-10'>
                    <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]'>
                        Secure enclave
                    </h2>
                    <AIAttestation
                        attestUrl={attestUrl}
                        verifyQuoteUrl={verifyQuoteUrl}
                        verifyQuoteAuth={verifyQuoteAuth}
                        expectations={aiExpectations}
                        onStatus={onStatus}
                    />
                </section>
            </div>
        </div>
    );
}

// The inference container's attestation. Its status alone feeds the
// sidebar pill via onStatus.
function AIAttestation({
    attestUrl,
    verifyQuoteUrl,
    verifyQuoteAuth,
    expectations,
    onStatus
}: {
    attestUrl: string;
    verifyQuoteUrl?: string;
    verifyQuoteAuth?: () => Promise<string>;
    expectations?: AttestationExpectations;
    onStatus?: (_status: AggregateAttestationStatus) => void;
}) {
    const [state, actions] = useAttestation({
        attestUrl,
        verifyQuoteUrl,
        verifyQuoteToken: verifyQuoteAuth,
        autoInspect: Boolean(attestUrl),
        autoVerifyQuote: Boolean(verifyQuoteUrl)
    });

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

    if (!attestUrl) {
        return (
            <div className='rounded-xl border border-black/10 p-5 text-sm text-black/60 dark:border-white/10 dark:text-white/60'>
                No app is currently deployed on this fleet, so there is nothing
                to attest yet.
            </div>
        );
    }
    if (state.error && !state.result) {
        return (
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
        );
    }
    if (!state.result) {
        return (
            <div className='flex items-center gap-3 rounded-xl border border-black/10 p-5 text-sm text-black/60 dark:border-white/10 dark:text-white/60'>
                <svg className='h-4 w-4 animate-spin' viewBox='0 0 24 24' aria-hidden='true'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z' />
                </svg>
                Inspecting certificate...
            </div>
        );
    }
    return (
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
    );
}
