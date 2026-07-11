import type { Metadata } from 'next';
import { FileHashTile } from '~/components/file-hash-tile';

export const metadata: Metadata = {
    title: 'Utils · Privasys App Explorer',
    description: 'Local utilities for working with confidential apps. Compute a file hash in your browser without the file ever leaving your device.'
};

export default function UtilsPage() {
    return (
        <div>
            <section className='mb-10'>
                <h1 className='text-4xl lg:text-5xl font-semibold tracking-tight'>Utils</h1>
                <p className='mt-4 max-w-2xl text-black/60 dark:text-white/60'>
                    Local utilities for working with confidential apps. Everything runs in your browser.
                </p>
            </section>

            <div className='max-w-xl'>
                <FileHashTile />
            </div>
        </div>
    );
}
