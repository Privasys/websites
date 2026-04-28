'use client';

import { AttestationResultView, useAttestation } from '@privasys/attestation-view';
import type { AttestationExpectations } from '@privasys/attestation-view';
import type { Instance } from '~/lib/types';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.developer.privasys.org';

// Full-pane Security view rendered inside the chat shell when the user
// clicks "Your session is secure" in the sidebar.
//
// The chat client never speaks to the enclave directly for attestation:
// the management-service publishes an `attest_url` on the instance
// discovery payload and proxies the RA-TLS handshake. That is the same
// attestation flow the developer portal uses.
export function SecurityView({ instance }: { instance: Instance }) {
    const attestUrl = instance.attest_url
        ? new URL(instance.attest_url, API_BASE_URL).toString()
        : '';
    const verifyQuoteUrl = instance.attestation_server
        ? `${instance.attestation_server.replace(/\/$/, '')}/verify-quote`
        : undefined;
    const [state, actions] = useAttestation({
        attestUrl,
        verifyQuoteUrl,
        autoInspect: Boolean(attestUrl),
        autoVerifyQuote: Boolean(verifyQuoteUrl)
    });

    // Build the expectations object from the instance discovery payload
    // so the result view can stamp green badges next to the workload
    // and AI-model digest extensions when they match what the chat
    // client expected to be running.
    const expectations: AttestationExpectations | undefined = instance.loaded_model?.digest
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
                        . Verify the hardware, firmware and model running this session.
                    </p>
                </header>

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
                    />
                )}
            </div>
        </div>
    );
}
