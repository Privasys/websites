'use client';

import { AttestationConnect, AttestationResultView, useAttestation } from '@privasys/attestation-view';
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
    const [state, actions] = useAttestation({
        attestUrl,
        verifyQuoteUrl: instance.attestation_server
            ? `${instance.attestation_server.replace(/\/$/, '')}/verify-quote`
            : undefined,
    });

    return (
        <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-6 py-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                        Security
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Live attestation for{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">
                            {instance.alias ?? instance.id}
                        </span>
                        . Verify the hardware, firmware and model running this session.
                    </p>
                </header>

                {!attestUrl ? (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 p-5 text-sm text-black/60 dark:text-white/60">
                        No app is currently deployed on this fleet, so there is
                        nothing to attest yet.
                    </div>
                ) : !state.result ? (
                    <AttestationConnect state={state} actions={actions} />
                ) : (
                    <AttestationResultView
                        result={state.result}
                        quoteVerify={state.quoteVerify}
                        onRefresh={() => void actions.inspect()}
                        onReset={() => {
                            actions.reset();
                            actions.regenerateChallenge();
                        }}
                    />
                )}
            </div>
        </div>
    );
}
