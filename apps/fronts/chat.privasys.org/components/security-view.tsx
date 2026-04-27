'use client';

import { AttestationConnect, AttestationResultView, useAttestation } from '@privasys/attestation-view';
import type { Instance } from '~/lib/types';

// Full-pane Security view rendered inside the chat shell when the user
// clicks "Your session is secure" in the sidebar.
//
// Same content as the previous AttestationDrawer, but in-place instead
// of a fixed-position overlay so it feels like a first-class page.
export function SecurityView({ instance }: { instance: Instance }) {
    const [state, actions] = useAttestation({
        attestUrl: `${instance.endpoint.replace(/\/$/, '')}/attest`,
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

                {!state.result ? (
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
