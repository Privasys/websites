'use client';

import { PageShell } from '~/app/components/page-shell';

export default function LegalIndex() {
    return (
        <PageShell activePage='legal'>

            <section className='mt-24 lg:mt-40'>
                <h1 className='text-5xl lg:text-[4rem]'>Legal</h1>
                <p className='hero-intro mt-8'>
                    Find legal information and resources for Privasys products and services.
                </p>
            </section>

            <section className='mt-16 lg:mt-24'>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>

                    <a href='/legal/privacy' className='block p-6 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors'>
                        <h2 className='text-xl font-semibold'>Privacy Policy</h2>
                        <p className='mt-2 text-sm text-[#1d1d1f]/60 dark:text-[#f5f5f7]/50'>
                            How we collect, use, and protect your personal information when you interact with Privasys websites and services.
                        </p>
                    </a>

                    <a href='/legal/terms' className='block p-6 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors'>
                        <h2 className='text-xl font-semibold'>Terms of Service</h2>
                        <p className='mt-2 text-sm text-[#1d1d1f]/60 dark:text-[#f5f5f7]/50'>
                            The terms and conditions governing your use of Privasys websites, the Developer Platform, and the App Store.
                        </p>
                    </a>

                    <a href='/legal/modern-slavery' className='block p-6 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors'>
                        <h2 className='text-xl font-semibold'>Modern Slavery Statement</h2>
                        <p className='mt-2 text-sm text-[#1d1d1f]/60 dark:text-[#f5f5f7]/50'>
                            Our commitment to ensuring that our business operations and supply chains are free from modern slavery and human trafficking.
                        </p>
                    </a>

                    <a href='/legal/company' className='block p-6 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors'>
                        <h2 className='text-xl font-semibold'>Company Information</h2>
                        <p className='mt-2 text-sm text-[#1d1d1f]/60 dark:text-[#f5f5f7]/50'>
                            Registered information relating to the identity of Privasys Ltd.
                        </p>
                    </a>

                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
