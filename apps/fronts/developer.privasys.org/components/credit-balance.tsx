'use client';

import Link from 'next/link';
import { useBalance } from '~/lib/use-balance';

const CREDITS_PER_GBP = 1_000_000;

function gbp(credits: number): string {
    return `£${(credits / CREDITS_PER_GBP).toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * Compact credit-balance pill for the top bar. Links to the billing page.
 * Renders nothing when billing is disabled or the caller has no billing access.
 */
export function CreditBalance() {
    const { loading, enabled, balance, frozen } = useBalance();
    if (loading || !enabled || balance === null) return null;

    return (
        <Link
            href="/dashboard/billing"
            title={frozen ? 'Credit balance empty — top up to deploy' : 'Credit balance'}
            className={`hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors ${
                frozen
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                    : 'bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/20'
            }`}
        >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="tabular-nums">{gbp(balance)}</span>
            {frozen && <span>· empty</span>}
        </Link>
    );
}
