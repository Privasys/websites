'use client';

// The top-bar switcher: the person's accounts, and Management for the
// platform's managers. A person with only their own account and no
// Management sees no switcher.

import { useEffect, useRef, useState } from 'react';
import type { AccountWithRole } from '~/lib/api';
import { MANAGEMENT } from '~/lib/current-account';
import { useAccount } from '~/components/account-context';

export { useCurrentAccount } from '~/components/account-context';

function label(a: AccountWithRole): string {
    return a.kind === 'org' ? a.name : 'Personal';
}

export function AccountSwitcher() {
    const { accounts, account, management, canManage, switchTo } = useAccount();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    if (accounts.length < 2 && !canManage) return null;

    const choose = (id: string) => {
        setOpen(false);
        switchTo(id);
    };
    const item = (id: string, text: string, selected: boolean) => (
        <button
            key={id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => choose(id)}
            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-black/5 dark:hover:bg-white/10 ${selected ? 'font-medium' : ''}`}
        >
            <span className="truncate">{text}</span>
            {selected && (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            )}
        </button>
    );
    const heading = (text: string) => (
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">{text}</div>
    );

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors max-w-[14rem] ${management
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                    : 'bg-black/5 dark:bg-white/10 text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/20'}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                title="Switch account"
            >
                <span className="truncate">{management ? 'Management' : account ? label(account) : 'Account'}</span>
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div role="listbox" className="absolute right-0 mt-2 w-64 py-1 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-lg z-50">
                    {heading('Accounts')}
                    {accounts.map((a) => item(a.id, label(a), !management && a.id === account?.id))}
                    {canManage && (
                        <>
                            <div className="my-1 border-t border-black/5 dark:border-white/10" />
                            {heading('Platform')}
                            {item(MANAGEMENT, 'Management', management)}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
