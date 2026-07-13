// Attestation tab — renders the SHARED @privasys/attestation-view component
// directly (the same one the developer portal uses), so this view is identical
// to the portal and can never drift. Replaces the legacy shadow-DOM bundle.

'use client';

import { useCallback, useRef, useState } from 'react';
import { AttestationConnect, AttestationResultView, useAttestation } from '@privasys/attestation-view';
import type { ConnectionConfig } from '~/lib/config';
import { mintAudienceToken, mintAudienceTokenSilent } from '~/lib/privasys-sdk';

export function AttestationTab({ connection }: { connection: ConnectionConfig }) {
    const attestUrl = `${connection.baseUrl}/api/v1/apps/${encodeURIComponent(connection.appName)}/attest`;
    const verifyQuoteUrl = connection.attestationServerUrl ? `${connection.attestationServerUrl}/verify-quote` : undefined;

    // The attestation-server bearer token. Seeded from the connect screen; the
    // thunk tops it up silently from an existing Privasys.id session, and
    // "Get token & verify" mints one interactively.
    const tokenRef = useRef(connection.attestationServerToken);
    const [minting, setMinting] = useState(false);

    // A quote is only trustworthy once the attestation server has verified it,
    // so we ALWAYS auto-verify. The token comes from the connect screen or a
    // silent mint against an existing Privasys.id session; with no session the
    // verify 401s and we surface a clear warning + "Get token & verify" (below)
    // instead of silently skipping verification.
    const verifyQuoteToken = useCallback(async () => {
        if (tokenRef.current) return tokenRef.current;
        const t = await mintAudienceTokenSilent(connection.env, 'attestation-server').catch(() => '');
        if (t) tokenRef.current = t;
        return tokenRef.current;
    }, [connection.env]);

    const [state, actions] = useAttestation({
        attestUrl,
        verifyQuoteUrl,
        verifyQuoteToken,
        autoVerifyQuote: !!connection.attestationServerUrl,
        // Deep-linked (URL-driven) connections inspect immediately.
        autoInspect: connection.autoInspect
    });

    // Mint a token interactively (opens the Privasys.id sign-in) and re-verify.
    const getTokenAndVerify = async () => {
        setMinting(true);
        try {
            const t = await mintAudienceToken(connection.env, 'attestation-server');
            if (t) {
                tokenRef.current = t;
                await actions.verifyQuoteSignature();
            }
        } catch {
            // A cancelled sign-in / mint failure leaves the warning in place.
        } finally {
            setMinting(false);
        }
    };

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

    // Verification could not reach a verdict because the attestation-server
    // token is missing or invalid: the quote is UNVERIFIED, so warn clearly and
    // offer to mint a token. (A verdict of *failed* is a different, worse case
    // that the shared component renders itself — do not mask it here.)
    const tokenIssue = !!verifyQuoteUrl
        && !state.verifying
        && !state.quoteVerify
        && !!state.quoteVerifyError
        && /token|unauthor|401|403/i.test(state.quoteVerifyError);

    return (
        <div>
            {tokenIssue && (
                <div className='mb-6 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                        <p>
                            <strong className='font-semibold'>Quote not verified.</strong>{' '}
                            We couldn&rsquo;t verify this quote with the attestation service: your token is missing or invalid.
                            A quote is only trustworthy once the attestation server has checked its signature and certificate chain.
                        </p>
                        <button
                            type='button'
                            onClick={() => void getTokenAndVerify()}
                            disabled={minting}
                            className='shrink-0 rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50'
                        >
                            {minting ? 'Signing in…' : 'Get token & verify'}
                        </button>
                    </div>
                </div>
            )}
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
        </div>
    );
}
