'use client';

// The account the portal works in, chosen in the top bar. Everything below
// it (the apps, team, billing, status and support) is that account's. A
// person with only their own account sees no switcher.

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { listMyAccounts } from '~/lib/api';
import type { AccountWithRole } from '~/lib/api';
import { getCurrentAccountId, setCurrentAccountId } from '~/lib/current-account';

function label(a: AccountWithRole): string {
    return a.kind === 'org' ? a.name : `${a.name || 'Personal'} (personal)`;
}

export function AccountSwitcher() {
    const { session } = useAuth();
    const [accounts, setAccounts] = useState<AccountWithRole[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!session?.accessToken) return;
        listMyAccounts(session.accessToken)
            .then((list) => {
                setAccounts(list);
                // A remembered account the person no longer belongs to is
                // forgotten, and the view reloads in their own.
                const id = getCurrentAccountId();
                if (id && !list.some((a) => a.id === id)) {
                    setCurrentAccountId(null);
                    window.location.reload();
                }
            })
            .catch(() => setAccounts([]));
    }, [session?.accessToken]);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    if (accounts.length < 2) return null;
    const currentId = getCurrentAccountId();
    const current = accounts.find((a) => a.id === currentId) ?? accounts[0];

    function choose(a: AccountWithRole) {
        setOpen(false);
        if (a.id === current.id) return;
        // The personal account is the default, so it is not remembered.
        setCurrentAccountId(a.kind === 'org' ? a.id : null);
        window.location.href = '/dashboard/';
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium bg-black/5 dark:bg-white/10 text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/20 transition-colors max-w-[14rem]"
                aria-haspopup="listbox"
                aria-expanded={open}
                title="Switch account"
            >
                <span className="truncate">{current.kind === 'org' ? current.name : 'Personal'}</span>
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div role="listbox" className="absolute right-0 mt-2 w-64 py-1 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-lg z-50">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">Accounts</div>
                    {accounts.map((a) => (
                        <button
                            key={a.id}
                            type="button"
                            role="option"
                            aria-selected={a.id === current.id}
                            onClick={() => choose(a)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-black/5 dark:hover:bg-white/10 ${a.id === current.id ? 'font-medium' : ''}`}
                        >
                            <span className="truncate">{label(a)}</span>
                            {a.id === current.id && (
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** The current account as the list knows it, for pages that need its details. */
export function useCurrentAccount(): AccountWithRole | null {
    const { session } = useAuth();
    const [account, setAccount] = useState<AccountWithRole | null>(null);
    useEffect(() => {
        if (!session?.accessToken) return;
        listMyAccounts(session.accessToken)
            .then((list) => {
                const id = getCurrentAccountId();
                setAccount(list.find((a) => a.id === id) ?? list[0] ?? null);
            })
            .catch(() => setAccount(null));
    }, [session?.accessToken]);
    return account;
}
