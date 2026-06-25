'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    AttestationConnect,
    AttestationResultView,
    useAttestation
} from '@privasys/attestation-view';
import {
    attestUrlFor,
    getStoreApp,
    resolveAsset,
    type StoreAppDetail
} from '~/lib/store-api';

function ReproRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className='py-2 border-b border-black/5 dark:border-white/5 last:border-0'>
            <div className='text-xs text-black/45 dark:text-white/45'>{label}</div>
            <div className='mt-0.5 text-sm break-all'>{children}</div>
        </div>
    );
}

function Reproducibility({ app }: { app: StoreAppDetail }) {
    const r = app.reproducibility;
    return (
        <section className='p-5 rounded-2xl border border-black/10 dark:border-white/10'>
            <h2 className='text-sm font-semibold mb-1'>Reproducibility</h2>
            <p className='text-xs text-black/45 dark:text-white/45 mb-3'>
                What runs inside the enclave, and how to reproduce or verify it yourself.
            </p>
            <ReproRow label='Runtime'>{r.tee} · {r.target === 'container' ? 'Container' : 'WASM'}</ReproRow>
            <ReproRow label='Enclave OS'>
                <a href={r.enclave_os_release_url} target='_blank' rel='noreferrer' className='text-blue-600 dark:text-blue-400 hover:underline'>Official releases &amp; predicted measurements ↗</a>
            </ReproRow>
            {r.container_image && <ReproRow label='Container image'><code className='text-xs'>{r.container_image}</code></ReproRow>}
            {r.cwasm_hash && <ReproRow label='WASM module SHA-256'><code className='text-xs'>{r.cwasm_hash}</code></ReproRow>}
            {r.cwasm_url && <ReproRow label='Reproducible build artifact'><a href={r.cwasm_url} target='_blank' rel='noreferrer' className='text-blue-600 dark:text-blue-400 hover:underline'>Download .cwasm ↗</a></ReproRow>}
            {r.commit_url && <ReproRow label='Source commit'><a href={r.commit_url} target='_blank' rel='noreferrer' className='text-blue-600 dark:text-blue-400 hover:underline'>{r.commit_url.replace('https://github.com/', '')} ↗</a></ReproRow>}
            {r.build_run_url && <ReproRow label='Build run'><a href={r.build_run_url} target='_blank' rel='noreferrer' className='text-blue-600 dark:text-blue-400 hover:underline'>GitHub Actions run ↗</a></ReproRow>}
        </section>
    );
}

function LiveAttestation({ app }: { app: StoreAppDetail }) {
    const [state, actions] = useAttestation({
        attestUrl: attestUrlFor(app.id),
        autoInspect: true
    });
    return (
        <section className='p-5 rounded-2xl border border-black/10 dark:border-white/10'>
            <h2 className='text-sm font-semibold mb-3'>Live attestation</h2>
            {!state.result ? (
                <AttestationConnect
                    state={state}
                    actions={actions}
                    title='Remote attestation'
                    description='Connect to the running enclave over RA-TLS and inspect its certificate, quote and measurements.'
                />
            ) : (
                <AttestationResultView
                    result={state.result}
                    quoteVerify={state.quoteVerify}
                    onRefresh={() => void actions.inspect()}
                />
            )}
        </section>
    );
}

function AppDetail() {
    const slug = useSearchParams().get('slug') ?? '';
    const [app, setApp] = useState<StoreAppDetail | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) { setError('No app specified.'); return; }
        getStoreApp(slug).then(setApp).catch((e) => setError(e.message === 'not found' ? 'This app is not on the store.' : 'Could not load this app.'));
    }, [slug]);

    if (error) {
        return (
            <div>
                <p className='text-sm text-black/50 dark:text-white/50'>{error}</p>
                <Link href='/' className='text-sm text-blue-600 dark:text-blue-400 hover:underline'>&larr; Back to the store</Link>
            </div>
        );
    }
    if (!app) return <p className='text-sm text-black/40 dark:text-white/40'>Loading…</p>;

    return (
        <div className='space-y-6'>
            <Link href='/' className='text-sm text-black/50 dark:text-white/50 hover:underline'>&larr; All apps</Link>

            <header className='flex gap-5 items-start'>
                <img src={resolveAsset(app.icon_url)} alt='' className='w-20 h-20 rounded-3xl object-cover border border-black/10 dark:border-white/10 bg-white dark:bg-white/5' />
                <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                        <h1 className='text-2xl font-semibold'>{app.name}</h1>
                        <span className='px-2 py-0.5 text-[11px] font-medium rounded-full border border-black/10 dark:border-white/15'>{app.tee}</span>
                        <span className='px-2 py-0.5 text-[11px] font-medium rounded-full border border-black/10 dark:border-white/15'>{app.target === 'wasm' ? 'WASM' : 'Container'}</span>
                    </div>
                    <p className='text-sm text-black/50 dark:text-white/50 mt-1'>{app.developer}{app.category ? ` · ${app.category}` : ''}</p>
                    {app.tagline && <p className='mt-2 text-black/75 dark:text-white/70'>{app.tagline}</p>}
                </div>
            </header>

            {app.screenshots.length > 0 && (
                <div className='flex gap-4 overflow-x-auto pb-2'>
                    {app.screenshots.map((s, i) => (
                        <img key={i} src={resolveAsset(s)} alt={`Screenshot ${i + 1}`} className='shrink-0 h-60 rounded-xl border border-black/10 dark:border-white/10 object-cover' />
                    ))}
                </div>
            )}

            {app.description && (
                <section className='p-5 rounded-2xl border border-black/10 dark:border-white/10'>
                    <h2 className='text-sm font-semibold mb-2'>About</h2>
                    <p className='text-sm text-black/75 dark:text-white/70 whitespace-pre-line'>{app.description}</p>
                </section>
            )}

            <Reproducibility app={app} />

            <LiveAttestation app={app} />

            {(app.website_url || app.support_email || app.privacy_url || app.tos_url) && (
                <section className='p-5 rounded-2xl border border-black/10 dark:border-white/10'>
                    <h2 className='text-sm font-semibold mb-2'>Links &amp; support</h2>
                    <div className='flex flex-wrap gap-x-6 gap-y-1.5 text-sm'>
                        {app.website_url && <a href={app.website_url} target='_blank' rel='noreferrer' className='text-blue-600 dark:text-blue-400 hover:underline'>Website</a>}
                        {app.support_email && <a href={`mailto:${app.support_email}`} className='text-blue-600 dark:text-blue-400 hover:underline'>Support</a>}
                        {app.privacy_url && <a href={app.privacy_url} target='_blank' rel='noreferrer' className='text-blue-600 dark:text-blue-400 hover:underline'>Privacy</a>}
                        {app.tos_url && <a href={app.tos_url} target='_blank' rel='noreferrer' className='text-blue-600 dark:text-blue-400 hover:underline'>Terms</a>}
                    </div>
                </section>
            )}
        </div>
    );
}

export default function AppDetailPage() {
    return (
        <Suspense fallback={<p className='text-sm text-black/40 dark:text-white/40'>Loading…</p>}>
            <AppDetail />
        </Suspense>
    );
}
