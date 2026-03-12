'use client';

import Balancer from 'react-wrap-balancer';
import { PageShell } from '~/app/components/page-shell';
import Link from 'next/link';
import { use } from 'react';

interface AppEntry {
    slug: string;
    name: string;
    developer: string;
    category: string;
    target: 'wasm' | 'container';
    tee: string;
    description: string;
    verified: boolean;
}

const PLACEHOLDER_APPS: AppEntry[] = [
    {
        slug: 'confidential-vault',
        name: 'Confidential Vault',
        developer: 'Privasys',
        category: 'Cryptography',
        target: 'wasm',
        tee: 'SGX',
        description: 'Hardware-protected secrets management with Shamir secret sharing and sealed storage.',
        verified: true
    },
    {
        slug: 'private-inference',
        name: 'Private Inference',
        developer: 'Privasys',
        category: 'AI/ML',
        target: 'container',
        tee: 'TDX',
        description: 'Run AI models on private data inside a Confidential VM. Full attestation, zero data exposure.',
        verified: true
    },
    {
        slug: 'secure-analytics',
        name: 'Secure Analytics',
        developer: 'Privasys',
        category: 'Data Processing',
        target: 'container',
        tee: 'TDX',
        description: 'Privacy-preserving analytics on sensitive datasets. Results leave the enclave, raw data never does.',
        verified: true
    }
];

export default function AppStorePage({ params }: { params: Promise<{ country: string }> }) {
    const { country } = use(params);
    const countryUpper = country.toUpperCase();

    return (
        <PageShell activePage='apps'>

            <section className='mt-24 lg:mt-40 w-full lg:w-3/4'>
                <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>
                    App Store &middot; {countryUpper}
                </p>
                <h1 className='text-5xl lg:text-[4rem]'>
                    Verified confidential applications
                </h1>
                <p className='hero-intro mt-8'>
                    <Balancer>
                        Every application listed here runs inside hardware-protected enclaves or confidential VMs.
                        Attestation is verified independently. No trust required.
                    </Balancer>
                </p>
            </section>

            <section className='mt-20 lg:mt-32'>
                <div className='flex items-center justify-between mb-8'>
                    <h2 className='text-2xl lg:text-3xl'>Applications</h2>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                    {PLACEHOLDER_APPS.map((app) => (
                        <Link
                            key={app.slug}
                            href={`/${country}/apps/${app.slug}`}
                            className='block p-6 rounded-xl border border-black/8 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-colors'
                        >
                            <div className='flex items-start justify-between gap-4'>
                                <div>
                                    <h3 className='text-lg font-semibold'>{app.name}</h3>
                                    <p className='text-sm text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mt-0.5'>
                                        {app.developer} &middot; {app.category}
                                    </p>
                                </div>
                                <div className='flex gap-2 shrink-0'>
                                    <span className='px-2 py-0.5 text-xs font-medium rounded-full border border-black/10 dark:border-white/10'>
                                        {app.tee}
                                    </span>
                                    <span className='px-2 py-0.5 text-xs font-medium rounded-full border border-black/10 dark:border-white/10'>
                                        {app.target === 'wasm' ? 'WASM' : 'Container'}
                                    </span>
                                </div>
                            </div>
                            <p className='mt-3 text-sm text-[#1d1d1f]/70 dark:text-[#f5f5f7]/60'>
                                {app.description}
                            </p>
                            {app.verified && (
                                <div className='mt-3 flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400'>
                                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                                        <path d='M20 6L9 17l-5-5' />
                                    </svg>
                                    Attestation verified
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            </section>

            <section className='mt-20 lg:mt-32'>
                <h2 className='text-2xl lg:text-3xl'>List your application</h2>
                <p className='mt-4'>
                    <Balancer>
                        Built a confidential application on the Privasys Platform?
                        Submit it to the App Store and let users discover and verify your service.
                    </Balancer>
                </p>
                <div className='mt-6'>
                    <a
                        href='https://developer.privasys.org'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'
                    >
                        Open the Developer Platform
                    </a>
                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
