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
import type { UserTool } from '~/lib/chat-service-api';
import { useAuth } from '~/lib/privasys-auth';
import { API_BASE_URL, resolveApp } from '~/lib/resolve-app';

// Full-pane Security view rendered inside the chat shell.
//
// Two SEPARATE trust statements, deliberately not blended:
//
//   1. "Secure enclave" — the confidential-ai inference container. This is
//      the session's core promise and the ONLY input to the sidebar pill:
//      green means the enclave answering your prompts is attested, red
//      means it is not. A tool can never redden it.
//   2. "AI tools" — each enabled tool attested individually: fleet tools
//      and the user's enclave tools verify against their expected digests;
//      EXTERNAL tools are shown as "not attested (external)" — a category
//      the user opted into, not a failure.
export function SecurityView({
    instance,
    userTools,
    onStatus
}: {
    instance: Instance;
    userTools?: UserTool[];
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
                        . The secure enclave below answers your prompts; tools
                        are verified separately.
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

                <ToolsAttestation
                    instance={instance}
                    userTools={userTools ?? []}
                    verifyQuoteUrl={verifyQuoteUrl}
                    verifyQuoteAuth={verifyQuoteAuth}
                />
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

// Tools section: fleet (admin) tools + the user's own tools. Enclave tools
// attest individually; external tools are a labelled category, never an
// attestation failure. Deliberately NOT wired into the sidebar pill.
function ToolsAttestation({
    instance,
    userTools,
    verifyQuoteUrl,
    verifyQuoteAuth
}: {
    instance: Instance;
    userTools: UserTool[];
    verifyQuoteUrl?: string;
    verifyQuoteAuth?: () => Promise<string>;
}) {
    const adminTools = instance.available_tools ?? [];
    const enclaveUserTools = userTools.filter((t) => t.kind === 'enclave');
    const externalUserTools = userTools.filter((t) => t.kind === 'external');

    // User enclave tools reference an app by name; resolve each to its
    // attest URL (public directory lookup) so it can be verified like the
    // fleet's own tools.
    const [resolvedUrls, setResolvedUrls] = React.useState<Record<string, string>>({});
    React.useEffect(() => {
        let cancelled = false;
        for (const t of enclaveUserTools) {
            if (resolvedUrls[t.ref] !== undefined) continue;
            void resolveApp(t.ref).then((r) => {
                if (cancelled) return;
                setResolvedUrls((prev) => ({
                    ...prev,
                    [t.ref]: r.ok && r.app.attest_url ? r.app.attest_url : ''
                }));
            });
        }
        return () => { cancelled = true; };
    }, [enclaveUserTools.map((t) => t.ref).join(',')]);

    const targets: AttestationTargetConfig[] = [
        ...adminTools
            .filter((t) => Boolean(t.attest_url))
            .map((t) => ({
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
            })),
        ...enclaveUserTools
            .filter((t) => resolvedUrls[t.ref])
            .map((t) => ({
                id: `usertool:${t.name}`,
                label: `Your tool: ${t.label || t.name}`,
                description: `app ${t.ref}`,
                attestUrl: new URL(resolvedUrls[t.ref], API_BASE_URL).toString(),
                verifyQuoteUrl,
                expectations: t.expected_digest
                    ? {
                        workloadImageDigest: t.expected_digest,
                        labels: {
                            workloadImageDigest: 'matches the digest verified when you added this tool'
                        }
                    }
                    : undefined
            }))
    ];

    if (targets.length === 0 && externalUserTools.length === 0) return null;

    return (
        <section>
            <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]'>
                AI tools
            </h2>
            {targets.length > 0 && (
                <CompositeAttestationView targets={targets} verifyQuoteAuth={verifyQuoteAuth} />
            )}
            {externalUserTools.length > 0 && (
                <ul className='mt-3 flex flex-col gap-2'>
                    {externalUserTools.map((t) => (
                        <li
                            key={t.id}
                            className='flex items-center justify-between rounded-xl border border-[var(--color-border-dark)] p-4'
                        >
                            <div className='min-w-0'>
                                <p className='text-sm font-medium text-[var(--color-text-primary)]'>
                                    Your tool: {t.label || t.name}
                                </p>
                                <p className='truncate text-xs text-[var(--color-text-muted)]'>{t.ref}</p>
                            </div>
                            <span className='shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400'>
                                not attested (external)
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
