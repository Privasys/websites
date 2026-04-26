'use client';

import { AttestationConnect, AttestationResultView, useAttestation } from '@privasys/attestation-view';
import type { Instance } from '~/lib/types';

// Attestation drawer. Triggers a fresh attestation handshake
// against `instance.endpoint` and renders the unified result view from
// @privasys/attestation-view. Quote signature verification is delegated
// to the fleet's `attestation_server` (the attestation server contract).
export function AttestationDrawer({
    open,
    onClose,
    instance,
}: {
    open: boolean;
    onClose: () => void;
    instance: Instance;
}) {
    const [state, actions] = useAttestation({
        attestUrl: `${instance.endpoint.replace(/\/$/, '')}/attest`,
        verifyQuoteUrl: instance.attestation_server
            ? `${instance.attestation_server.replace(/\/$/, '')}/verify-quote`
            : undefined,
    });

    if (!open) return null;

    return (
        <aside className='fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-[var(--color-border-dark)] bg-[var(--color-surface-1)] shadow-2xl'>
            <header className='flex items-center justify-between border-b border-[var(--color-border-dark)] px-4 py-3'>
                <h2 className='text-sm font-semibold text-[var(--color-text-primary)]'>Attestation</h2>
                <button
                    type='button'
                    onClick={onClose}
                    className='rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/40 px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary-blue)]/60 hover:text-[var(--color-primary-blue)]'
                >
                    Close
                </button>
            </header>

            <div className='flex-1 overflow-y-auto px-4 py-4 text-[var(--color-text-primary)]'>
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
        </aside>
    );
}
