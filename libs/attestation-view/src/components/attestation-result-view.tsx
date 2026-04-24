'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
    AttestationExtension,
    AttestationResult,
    QuoteVerifyResult,
} from '../types';
import { TEXT_OIDS } from '../types';
import { hexToPrintableText } from '../internal/use-copy';
import { verifyReportData } from '../use-attestation';
import { FieldRow } from './field-row';

// Read-only renderer for an AttestationResult.
//
// Sections rendered (in order):
//   1. Challenge-mode banner (only when result.challenge_mode)
//   2. TLS connection summary
//   3. x.509 certificate fields
//   4. Attestation quote fields (with auto-verified ReportData)
//   5. Platform OID extensions
//   6. Workload OID extensions (if app_extensions present)
//
// RTMR event-log replay verification is intentionally out of scope
// here - it lives in a separate component (RtmrVerifier) in the
// developer-portal and will be ported as a follow-up.

const OID_DESCRIPTIONS: Record<string, string> = {
    'Config Merkle Root':
        'Hash of the enclave configuration tree. Changes if any config parameter is modified.',
    'Egress CA Hash':
        'Hash of the CA certificate used for egress TLS connections from the enclave.',
    'Runtime Version Hash':
        'Hash identifying the exact runtime version running inside the enclave.',
    'Combined Workloads Hash':
        'Aggregate hash of all loaded WASM workloads. Proves which code is running.',
    'DEK Origin':
        "Data Encryption Key origin - indicates how the enclave's encryption key was derived.",
    'Attestation Servers Hash':
        'Hash of the attestation server list the enclave trusts for quote verification.',
    'Workload Config Merkle Root':
        "Merkle root of this specific workload's configuration.",
    'Workload Code Hash':
        'SHA-256 hash of the compiled WASM bytecode for this workload.',
    'Workload Image Ref':
        'Container image reference from which the workload was loaded.',
    'Workload Key Source':
        "Indicates how the workload's encryption keys are sourced and managed.",
    'Workload Permissions Hash':
        'Hash of the security permissions granted to this workload.',
};

export function AttestationResultView({
    result,
    quoteVerify,
    onRefresh,
    onReset,
    extra,
}: {
    result: AttestationResult;
    quoteVerify?: QuoteVerifyResult | null;
    onRefresh?: () => void;
    onReset?: () => void;
    /**
     * Optional extra content rendered between the certificate section
     * and the platform-extensions section. Used by the developer
     * portal to drop in its RTMR event-log replay component.
     */
    extra?: React.ReactNode;
}) {
    const reportDataCheck = useReportDataCheck(result);

    return (
        <div className='space-y-6'>
            {result.challenge_mode && result.challenge && (
                <ChallengeBanner result={result} reportDataCheck={reportDataCheck} />
            )}

            {(onRefresh || onReset) && (
                <div className='flex items-center gap-3'>
                    {onRefresh && (
                        <button
                            type='button'
                            onClick={onRefresh}
                            className='rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5'
                        >
                            Refresh
                        </button>
                    )}
                    {result.pem && (
                        <DownloadPemButton pem={result.pem} />
                    )}
                    {onReset && (
                        <button
                            type='button'
                            onClick={onReset}
                            className='ml-auto rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5'
                        >
                            New Challenge
                        </button>
                    )}
                </div>
            )}

            <Section title='TLS Connection'>
                <div className='grid grid-cols-2 gap-3 text-sm'>
                    <Stat label='Protocol' value={result.tls.version} />
                    <Stat label='Cipher Suite' value={result.tls.cipher_suite} />
                </div>
            </Section>

            <Section title='x.509 Certificate'>
                <div className='space-y-3'>
                    <FieldRow label='Subject' value={result.certificate.subject} description='The entity this certificate identifies.' />
                    <FieldRow label='Issuer' value={result.certificate.issuer} description='Self-signed for enclaves.' />
                    <FieldRow label='Serial Number' value={result.certificate.serial_number} />
                    <FieldRow label='Valid From' value={result.certificate.not_before} />
                    <FieldRow label='Valid Until' value={result.certificate.not_after} />
                    <FieldRow label='Signature Algorithm' value={result.certificate.signature_algorithm} />
                    <FieldRow
                        label='Public Key SHA-256'
                        value={result.certificate.public_key_sha256}
                        description="SHA-256 fingerprint of the subject's public key."
                    />
                </div>
            </Section>

            {result.quote && (
                <QuoteSection
                    quote={result.quote}
                    quoteVerify={quoteVerify}
                    reportDataCheck={reportDataCheck}
                    challengeMode={result.challenge_mode}
                />
            )}

            {extra}

            {result.extensions.length > 0 && (
                <ExtensionsSection
                    title='Platform Attestation Extensions'
                    description='Platform-level x.509 extensions (OIDs 1.x/2.x). These bind the enclave configuration and runtime to the attestation.'
                    extensions={result.extensions}
                />
            )}

            {result.app_extensions && result.app_extensions.length > 0 && (
                <ExtensionsSection
                    title='Workload Attestation Extensions'
                    description='Per-workload x.509 extensions (OIDs 3.x). These bind the specific application code, model and permissions to a dedicated attestation.'
                    extensions={result.app_extensions}
                    accent
                />
            )}
        </div>
    );
}

// --- internals ---------------------------------------------------------

type ReportDataCheck =
    | { state: 'idle' }
    | { state: 'verifying' }
    | { state: 'match'; computed: string; actual: string }
    | { state: 'mismatch'; computed: string; actual: string }
    | { state: 'error' };

function useReportDataCheck(result: AttestationResult): ReportDataCheck {
    const [check, setCheck] = useState<ReportDataCheck>({ state: 'idle' });

    useEffect(() => {
        const reportData = result.quote?.report_data;
        const pubKey = result.certificate?.public_key_sha256;
        const challenge = result.challenge;
        if (!result.challenge_mode || !reportData || !pubKey || !challenge) {
            setCheck({ state: 'idle' });
            return;
        }
        let cancelled = false;
        setCheck({ state: 'verifying' });
        verifyReportData({
            pubKeySha256Hex: pubKey,
            challengeHex: challenge,
            reportDataHex: reportData,
        }).then((r) => {
            if (cancelled) return;
            if (r.status === 'match') {
                setCheck({ state: 'match', computed: r.computed!, actual: r.actual! });
            } else if (r.status === 'mismatch') {
                setCheck({ state: 'mismatch', computed: r.computed!, actual: r.actual! });
            } else {
                setCheck({ state: 'error' });
            }
        });
        return () => {
            cancelled = true;
        };
    }, [result]);

    return check;
}

function ChallengeBanner({
    result,
    reportDataCheck,
}: {
    result: AttestationResult;
    reportDataCheck: ReportDataCheck;
}) {
    const tone =
        reportDataCheck.state === 'match'
            ? 'border-emerald-200/50 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-900/10'
            : reportDataCheck.state === 'mismatch' || reportDataCheck.state === 'error'
                ? 'border-red-200/50 bg-red-50/40 dark:border-red-500/20 dark:bg-red-900/10'
                : 'border-amber-200/50 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-900/10';
    return (
        <section className={`rounded-xl border p-4 ${tone}`}>
            <h3 className='mb-1 text-xs font-semibold'>Challenge Mode Active</h3>
            <p className='mb-2 text-[11px] opacity-80'>
                This certificate was freshly generated in response to your challenge nonce.
                The enclave bound your nonce into the quote&rsquo;s ReportData field.
            </p>
            <code className='block break-all rounded bg-black/5 dark:bg-white/10 px-2 py-1 font-mono text-[11px]'>
                {result.challenge}
            </code>
        </section>
    );
}

function QuoteSection({
    quote,
    quoteVerify,
    reportDataCheck,
    challengeMode,
}: {
    quote: NonNullable<AttestationResult['quote']>;
    quoteVerify?: QuoteVerifyResult | null;
    reportDataCheck: ReportDataCheck;
    challengeMode: boolean;
}) {
    const fields = useMemo(() => {
        const rows: Array<{ label: string; value: string; description?: string }> = [
            { label: 'Quote Type', value: quote.type, description: 'Attestation quote format embedded in the certificate.' },
        ];
        if (quote.format) rows.push({ label: 'Format', value: quote.format });
        if (quote.version != null) rows.push({ label: 'Version', value: String(quote.version) });
        if (quote.mr_enclave) rows.push({ label: 'MRENCLAVE', value: quote.mr_enclave, description: 'Hash of the enclave code and initial data.' });
        if (quote.mr_signer) rows.push({ label: 'MRSIGNER', value: quote.mr_signer, description: "Hash of the enclave signer's public key." });
        if (quote.mr_td) rows.push({ label: 'MR_TD', value: quote.mr_td, description: 'Measurement of the Trust Domain (TDX VM image and configuration).' });
        if (quote.rtmr0) rows.push({ label: 'RTMR[0]', value: quote.rtmr0, description: 'TD firmware (TDVF) and its configuration.' });
        if (quote.rtmr1) rows.push({ label: 'RTMR[1]', value: quote.rtmr1, description: 'EFI boot path: shim and GRUB binaries.' });
        if (quote.rtmr2) rows.push({ label: 'RTMR[2]', value: quote.rtmr2, description: 'OS boot: kernel, initrd and kernel command line (including dm-verity root hash).' });
        if (quote.rtmr3) rows.push({ label: 'RTMR[3]', value: quote.rtmr3, description: 'Application-defined measurements.' });
        if (quote.report_data) {
            rows.push({
                label: 'Report Data',
                value: quote.report_data,
                description: challengeMode
                    ? 'SHA-512( SHA-256(public_key_DER) || challenge_nonce ).'
                    : "SHA-512( SHA-256(public_key_DER) || timestamp ). Deterministic mode - the certificate's NotBefore is the nonce.",
            });
        }
        rows.push({ label: 'OID', value: quote.oid, description: 'Object Identifier of the x.509 extension containing the quote.' });
        return rows;
    }, [quote, challengeMode]);

    return (
        <Section
            title={quote.type || 'Attestation Quote'}
            badge={
                <>
                    {quote.is_mock && (
                        <Badge tone='warn'>Mock</Badge>
                    )}
                    {quoteVerify?.success && (
                        <Badge tone='ok'>{`✓ Verified${quoteVerify.message ? ` - ${quoteVerify.message}` : ''}`}</Badge>
                    )}
                    {quoteVerify && !quoteVerify.success && (
                        <Badge tone='err'>{`✗ ${quoteVerify.error || 'Verification failed'}`}</Badge>
                    )}
                </>
            }
        >
            <div className='space-y-3'>
                {fields.map((f) => (
                    <FieldRow
                        key={f.label}
                        label={f.label}
                        value={f.value}
                        description={f.description}
                        badge={
                            f.label === 'Report Data' && reportDataCheck.state === 'match'
                                ? <Badge tone='ok'>✓ Verified</Badge>
                                : f.label === 'Report Data' && reportDataCheck.state === 'mismatch'
                                    ? <Badge tone='err'>✗ Mismatch</Badge>
                                    : f.label === 'Report Data' && reportDataCheck.state === 'verifying'
                                        ? <Badge tone='neutral'>Verifying...</Badge>
                                        : /^RTMR\[\d\]$/.test(f.label) && quoteVerify?.success
                                            ? <Badge tone='ok'>✓</Badge>
                                            : null
                        }
                    >
                        {f.label === 'Report Data' && reportDataCheck.state === 'mismatch' && (
                            <div className='mt-2 space-y-1.5 rounded-lg border border-red-200/50 bg-red-50/50 p-3 dark:border-red-800/30 dark:bg-red-900/10'>
                                <p className='text-[11px] font-medium text-red-700 dark:text-red-400'>Hash comparison</p>
                                <DebugLine label='Computed' value={reportDataCheck.computed} />
                                <DebugLine label='Actual' value={reportDataCheck.actual} />
                            </div>
                        )}
                    </FieldRow>
                ))}
            </div>
        </Section>
    );
}

function ExtensionsSection({
    title,
    description,
    extensions,
    accent = false,
}: {
    title: string;
    description: string;
    extensions: AttestationExtension[];
    accent?: boolean;
}) {
    return (
        <section
            className={`rounded-xl border p-5 ${
                accent
                    ? 'border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-500/20 dark:bg-emerald-900/10'
                    : 'border-black/10 dark:border-white/10'
            }`}
        >
            <h2 className='mb-3 text-sm font-semibold'>{title}</h2>
            <p className='mb-4 text-xs text-black/40 dark:text-white/40'>{description}</p>
            <div className='space-y-4'>
                {extensions.map((ext) => {
                    const printable = TEXT_OIDS.has(ext.oid) ? hexToPrintableText(ext.value_hex) : null;
                    const display = printable ? `${printable}  (${ext.value_hex})` : ext.value_hex;
                    return (
                        <div
                            key={ext.oid}
                            className='border-b border-black/5 pb-3 last:border-0 last:pb-0 dark:border-white/5'
                        >
                            <FieldRow
                                label={ext.label}
                                value={display}
                                description={OID_DESCRIPTIONS[ext.label]}
                            />
                            <span className='mt-1 block font-mono text-[10px] text-black/30 dark:text-white/30'>
                                {ext.oid}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function Section({
    title,
    badge,
    children,
}: {
    title: string;
    badge?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className='rounded-xl border border-black/10 dark:border-white/10 p-5'>
            <div className='mb-3 flex flex-wrap items-center gap-2'>
                <h2 className='text-sm font-semibold'>{title}</h2>
                {badge}
            </div>
            {children}
        </section>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className='text-xs text-black/50 dark:text-white/50'>{label}</div>
            <div className='mt-0.5 font-mono text-xs'>{value}</div>
        </div>
    );
}

function Badge({
    tone,
    children,
}: {
    tone: 'ok' | 'warn' | 'err' | 'neutral';
    children: React.ReactNode;
}) {
    const cls = {
        ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        err: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        neutral: 'bg-black/5 text-black/50 dark:bg-white/5 dark:text-white/50',
    }[tone];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
            {children}
        </span>
    );
}

function DebugLine({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span className='text-[10px] text-red-600/60 dark:text-red-400/60'>{label}</span>
            <code className='mt-0.5 block break-all rounded bg-red-100/50 px-1.5 py-0.5 font-mono text-[10px] text-red-800 dark:bg-red-900/20 dark:text-red-300'>
                {value}
            </code>
        </div>
    );
}

function DownloadPemButton({ pem }: { pem: string }) {
    return (
        <button
            type='button'
            onClick={() => {
                const blob = new Blob([pem], { type: 'application/x-pem-file' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'enclave-certificate.pem';
                a.click();
                URL.revokeObjectURL(url);
            }}
            className='rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5'
        >
            Download PEM
        </button>
    );
}
