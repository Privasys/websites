'use client';

import type { Reproducibility } from '~/lib/chat-stream';
import type { SamplingParams } from '~/lib/sampling';

// Modal that surfaces what the enclave actually ran with for a given
// assistant turn: sampling parameters sent in the request, plus the
// reproducibility block returned by confidential-ai.
//
// The "Re-run with the same model, weights and parameters on the same
// hardware should produce a byte-identical reply" guarantee is the
// core demo of the platform; this dialog is how a non-technical user
// can see all of those inputs at once.
export function MetadataDialog({
    sampling,
    reproducibility,
    elapsedMs,
    onClose,
}: {
    sampling?: SamplingParams;
    reproducibility?: Reproducibility;
    elapsedMs?: number;
    onClose: () => void;
}) {
    const meta = reproducibility ?? {};
    const samp = sampling ?? {};
    const elapsed = elapsedMs ? (elapsedMs / 1000).toFixed(2) : null;

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
            onClick={onClose}
            role='presentation'
        >
            <div
                className='max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] p-5 text-sm text-[var(--color-text-primary)] shadow-2xl'
                onClick={(e) => e.stopPropagation()}
                role='dialog'
                aria-modal='true'
                aria-labelledby='metadata-title'
            >
                <div className='mb-3 flex items-center justify-between'>
                    <h2 id='metadata-title' className='text-base font-semibold'>
                        Reproducibility metadata
                    </h2>
                    <button
                        type='button'
                        onClick={onClose}
                        className='text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        aria-label='Close'
                    >
                        {'\u2715'}
                    </button>
                </div>

                <p className='mb-3 text-xs text-[var(--color-text-secondary)]'>
                    Re-running with the same model, weights and parameters on the
                    same hardware should produce a byte-identical reply.
                </p>

                <Section title='Request'>
                    <Row k='seed' v={samp.seed} />
                    <Row k='temperature' v={samp.temperature} />
                    <Row k='top_p' v={samp.top_p} />
                    <Row k='top_k' v={samp.top_k} />
                    <Row k='max_tokens' v={samp.max_tokens} />
                </Section>

                <Section title='Reply'>
                    <Row k='model' v={meta.model} />
                    <Row k='model_digest' v={meta.model_digest} mono />
                    <Row k='quantization' v={meta.quantization} />
                    <Row k='vllm_version' v={meta.vllm_version} />
                    <Row k='cuda_version' v={meta.cuda_version} />
                    <Row k='gpu_type' v={meta.gpu_type} />
                    <Row k='image_digest' v={meta.image_digest} mono />
                    <Row k='tee_type' v={meta.tee_type} />
                    {elapsed && <Row k='wall_time_s' v={elapsed} />}
                </Section>

                <details className='mt-3 text-xs'>
                    <summary className='cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'>
                        Raw JSON
                    </summary>
                    <pre className='mt-2 max-h-64 overflow-auto rounded border border-[var(--color-border-dark)] bg-[var(--color-surface-2)] p-3 text-[12px]'>
                        {JSON.stringify(
                            { sampling: samp, reproducibility: meta },
                            null,
                            2,
                        )}
                    </pre>
                </details>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className='mb-4'>
            <h3 className='mb-1 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase'>
                {title}
            </h3>
            <dl className='divide-y divide-[var(--color-border-dark)]'>{children}</dl>
        </div>
    );
}

function Row({
    k,
    v,
    mono,
}: {
    k: string;
    v: string | number | undefined;
    mono?: boolean;
}) {
    if (v === undefined || v === null || v === '') return null;
    return (
        <div className='flex items-baseline gap-3 py-1'>
            <dt className='w-32 shrink-0 text-xs text-[var(--color-text-muted)]'>{k}</dt>
            <dd
                className={`min-w-0 flex-1 break-all ${mono ? 'font-mono text-xs' : ''}`}
            >
                {String(v)}
            </dd>
        </div>
    );
}
