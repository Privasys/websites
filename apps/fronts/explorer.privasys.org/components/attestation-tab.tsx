// Attestation tab — renders the SHARED @privasys/attestation-view component
// directly (the same one the developer portal uses), so this view is identical
// to the portal and can never drift. Replaces the legacy shadow-DOM bundle.

'use client';

import { AttestationConnect, AttestationResultView, useAttestation } from '@privasys/attestation-view';
import type { ConnectionConfig } from '~/lib/config';

export function AttestationTab({ connection }: { connection: ConnectionConfig }) {
    const attestUrl = `${connection.baseUrl}/api/v1/apps/${encodeURIComponent(connection.appName)}/attest`;
    const verifyQuoteUrl = connection.attestationServerUrl ? `${connection.attestationServerUrl}/verify-quote` : undefined;

    const [state, actions] = useAttestation({
        attestUrl,
        verifyQuoteUrl,
        verifyQuoteToken: () => Promise.resolve(connection.attestationServerToken),
        autoVerifyQuote: !!connection.attestationServerUrl
    });

    if (!state.result) {
        return (
            <AttestationConnect
                state={state}
                actions={actions}
                title='Remote Attestation'
                description='Connect to the enclave via RA-TLS and inspect the x.509 certificate, attestation quote, and all custom attestation extensions.'
            />
        );
    }

    return (
        <AttestationResultView
            result={state.result}
            quoteVerify={state.quoteVerify}
            quoteVerifying={state.verifying}
            quoteVerifyError={state.quoteVerifyError}
            onRefresh={() => void actions.inspect()}
            onReset={() => void actions.newChallenge()}
            challenge={state.challenge}
            onChallengeChange={actions.setChallenge}
            onRegenerateChallenge={actions.regenerateChallenge}
            loading={state.loading}
            verifyQuoteUrl={verifyQuoteUrl}
        />
    );
}
