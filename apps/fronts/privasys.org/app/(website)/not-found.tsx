import Link from 'next/link';
import { PageShell } from '~/app/components/page-shell';

// A real 404 page. We deliberately do NOT redirect to the homepage: a
// client-side redirect makes search engines treat every unknown URL as a
// soft 404. Rendering genuine "not found" content lets nginx serve 404.html
// with a 404 status and lets crawlers drop the missing URL cleanly.
export default function NotFound() {
    return (
        <PageShell>
            <div className='min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center'>
                <p className='text-sm font-medium tracking-widest text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50'>
                    404
                </p>
                <h1 className='text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]'>
                    This page could not be found
                </h1>
                <p className='text-sm text-[#1d1d1f]/60 dark:text-[#f5f5f7]/60'>
                    The page you are looking for may have moved or no longer exists.
                </p>
                <Link href='/' className='text-sm underline'>
                    Back to home
                </Link>
            </div>
        </PageShell>
    );
}
