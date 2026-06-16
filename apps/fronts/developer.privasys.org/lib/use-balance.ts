'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { getBillingBalance } from '~/lib/api';

export interface BalanceState {
    loading: boolean;
    /** True only when billing is configured AND the caller may read the balance. */
    enabled: boolean;
    balance: number | null;
    frozen: boolean;
    reload: () => void;
}

/**
 * Fetches the account credit balance for the current session. `enabled` is false
 * when billing is disabled for the environment or the caller lacks billing
 * access (the balance endpoint requires the account admin/billing role), so
 * callers can treat "unknown" as "do not gate".
 */
export function useBalance(): BalanceState {
    const { session } = useAuth();
    const [state, setState] = useState<Omit<BalanceState, 'reload'>>({
        loading: true,
        enabled: false,
        balance: null,
        frozen: false
    });

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        try {
            const res = await getBillingBalance(session.accessToken);
            if (!res.enabled || !res.data) {
                setState({ loading: false, enabled: false, balance: null, frozen: false });
                return;
            }
            setState({
                loading: false,
                enabled: true,
                balance: res.data.balance,
                frozen: res.data.frozen
            });
        } catch {
            setState({ loading: false, enabled: false, balance: null, frozen: false });
        }
    }, [session?.accessToken]);

    useEffect(() => {
        load();
    }, [load]);

    return { ...state, reload: load };
}
