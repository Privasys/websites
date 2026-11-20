'use client';

// Where the portal is working: one of the person's accounts (personal or
// organisation), or, for platform managers, Management, the platform's own
// administration, which belongs to no account.
//
// The provider settles this before anything below it renders, so every
// request names the account from the first one. Switching remounts the
// page under the new account rather than reloading the browser.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import { listMyAccounts } from '~/lib/api';
import type { AccountWithRole } from '~/lib/api';
import { getCurrentAccountId, setCurrentAccountId, MANAGEMENT } from '~/lib/current-account';

interface AccountContextValue {
    accounts: AccountWithRole[];
    /** The account worked in; null in Management. */
    account: AccountWithRole | null;
    management: boolean;
    canManage: boolean;
    /** Changes with every switch: a key that remounts what depends on it. */
    key: string;
    switchTo: (id: string) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function useAccount(): AccountContextValue {
    const v = useContext(AccountContext);
    if (!v) throw new Error('useAccount outside AccountProvider');
    return v;
}

/** The account worked in, or null in Management. */
export function useCurrentAccount(): AccountWithRole | null {
    return useContext(AccountContext)?.account ?? null;
}

export function AccountProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const canManage = hasManagerRole(session?.roles);
    const [accounts, setAccounts] = useState<AccountWithRole[] | null>(null);
    const [current, setCurrent] = useState<string>('');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!session?.accessToken) return;
        listMyAccounts(session.accessToken)
            .then((list) => {
                const stored = getCurrentAccountId();
                // The person's own personal account, not one they were invited to.
                const personal = list.find((a) => a.kind !== 'org' && a.owner_sub === session?.sub)
                    ?? list.find((a) => a.kind !== 'org') ?? list[0];
                let id = stored && list.some((a) => a.id === stored) ? stored : personal?.id ?? '';
                if (stored === MANAGEMENT && canManage) id = MANAGEMENT;
                // An admin page opened directly is Management's.
                if (canManage && window.location.pathname.startsWith('/dashboard/admin')) id = MANAGEMENT;
                setCurrentAccountId(id || null);
                setAccounts(list);
                setCurrent(id);
            })
            .catch(() => setFailed(true));
    }, [session?.accessToken, canManage]);

    // Leaving Management for an account page, or the reverse, by a link.
    useEffect(() => {
        if (!accounts || !canManage) return;
        const onAdmin = pathname.startsWith('/dashboard/admin');
        if (onAdmin && current !== MANAGEMENT) {
            setCurrentAccountId(MANAGEMENT);
            setCurrent(MANAGEMENT);
        }
    }, [pathname, accounts, canManage, current]);

    const switchTo = useCallback((id: string) => {
        if (id === current) return;
        setCurrentAccountId(id);
        setCurrent(id);
        router.push(id === MANAGEMENT ? '/dashboard/admin' : '/dashboard');
    }, [current, router]);

    const value = useMemo<AccountContextValue | null>(() => {
        if (!accounts) return null;
        const management = current === MANAGEMENT;
        return {
            accounts,
            account: management ? null : accounts.find((a) => a.id === current) ?? null,
            management,
            canManage,
            key: current,
            switchTo
        };
    }, [accounts, current, canManage, switchTo]);

    if (failed) {
        return <div className="p-10 text-sm text-red-600 dark:text-red-400">Your accounts could not be loaded. Please reload the page.</div>;
    }
    if (!value) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div></div>;
    }
    return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
