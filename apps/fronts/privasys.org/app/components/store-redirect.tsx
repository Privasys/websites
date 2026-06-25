'use client';

import { useEffect } from 'react';

// Client-side redirect used by the legacy /[country]/apps routes, which now
// point at the real store at store.privasys.org. Works under static export
// (no server redirects) and degrades to a visible link without JS.
export function StoreRedirect({ to }: { to: string }) {
    useEffect(() => {
        window.location.replace(to);
    }, [to]);
    return (
        <div className='min-h-[50vh] flex flex-col items-center justify-center gap-2 text-center'>
            <p className='text-sm text-[#1d1d1f]/60 dark:text-[#f5f5f7]/60'>Taking you to the Privasys App Store…</p>
            <a href={to} className='text-sm underline'>Continue</a>
        </div>
    );
}
