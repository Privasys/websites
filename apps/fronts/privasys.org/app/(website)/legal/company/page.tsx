'use client';

import { PageShell } from '~/app/components/page-shell';

export default function CompanyInformation() {
    return (
        <PageShell activePage='legal'>

            <article className='mt-24 lg:mt-40 prose-legal'>
                <p className='text-sm text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Last updated: March 2026</p>
                <h1 className='text-4xl lg:text-5xl'>Company Information</h1>

                <p className='mt-8'>
                    Registered information relating to the identity of Privasys Ltd.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Registered number</h2>
                <p>Company number: UK-16866500</p>

                <h2 className='text-2xl mt-12 mb-4'>Place of registration</h2>
                <p>United Kingdom</p>

                <h2 className='text-2xl mt-12 mb-4'>Contact</h2>
                <p>
                    Email: <a href='mailto:contact@privasys.org' className='underline'>contact@privasys.org</a>
                </p>
            </article>

            <div className='mb-30' />

        </PageShell>
    );
}
