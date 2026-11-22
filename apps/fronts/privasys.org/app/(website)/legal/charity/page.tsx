'use client';

import { PageShell } from '~/app/components/page-shell';

export default function CharityDonations() {
    return (
        <PageShell activePage='legal'>

            <article className='mt-24 lg:mt-40 prose-legal'>
                <p className='text-sm text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Last updated: November 2026</p>
                <h1 className='text-4xl lg:text-5xl'>Charity Donations</h1>

                <p className='mt-8'>
                    Privasys is proud to support Cancer Research UK.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Commercial participation statement</h2>
                <p className='p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.05]'>
                    100% of unused balance on account deletion will be donated to Cancer Research UK via Work for Good.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>How it works</h2>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li>When you delete your Privasys account, the money balance left on it is refunded to you by default.</li>
                    <li>You can choose instead to give up that refund so that it goes to Cancer Research UK. This is your choice, made with a clear option when you delete your account, and never made for you.</li>
                    <li>Privasys makes the donation as a company, once a year, for the total of the balances given in that year. As the donation is made by Privasys rather than by you, Gift Aid does not apply and no donation receipt is issued to you.</li>
                    <li>Credits we have given you (such as promotional or included credits) are not part of your money balance and are not donated or refunded.</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>Work for Good</h2>
                <p>
                    Our donations are made through Work for Good, which helps businesses give to charity in line with charity law. You can see our profile at <a href='https://workforgood.co.uk/businesses/privasys-ltd' className='underline' target='_blank' rel='noopener noreferrer'>workforgood.co.uk</a>.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Contact</h2>
                <p>
                    For any question about our donations, email <a href='mailto:contact@privasys.org' className='underline'>contact@privasys.org</a>.
                </p>
            </article>

            <div className='mb-30' />

        </PageShell>
    );
}
