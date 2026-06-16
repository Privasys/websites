'use client';

import { useAuth } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback } from 'react';
import {
    getAccount,
    getBillingBalance,
    getBillingUsage,
    getBillingLedger,
    getBillingSubscription,
    startMembershipCheckout,
    startCreditsCheckout,
    openBillingPortal,
    redeemPromoCode
} from '~/lib/api';
import type {
    AccountRole,
    BillingBalance,
    BillingUsage,
    BillingLedger,
    BillingSubscription
} from '~/lib/api';

// 1 credit = £0.000001 (£1 = 1,000,000 credits). See pricing-plan.md §4.1.
const CREDITS_PER_GBP = 1_000_000;

function gbp(credits: number): string {
    return `£${(credits / CREDITS_PER_GBP).toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function fmtCredits(credits: number): string {
    return credits.toLocaleString('en-GB');
}

const RESOURCE_LABEL: Record<string, string> = {
    wasm_fuel: 'Compute (WASM fuel)',
    deploy: 'Deployments',
    ledger_read: 'Ledger reads',
    ledger_write: 'Ledger writes',
    crypto_digest: 'Crypto · digest',
    crypto_encrypt: 'Crypto · encrypt',
    crypto_decrypt: 'Crypto · decrypt',
    crypto_sign: 'Crypto · sign',
    crypto_verify: 'Crypto · verify',
    crypto_random: 'Crypto · random',
    https_plain: 'Outbound HTTPS',
    https_ratls: 'Outbound HTTPS (RA-TLS)'
};

const KIND_LABEL: Record<string, string> = {
    grant: 'Included allowance',
    topup: 'Top-up',
    usage: 'Usage',
    adjustment: 'Adjustment'
};

export default function BillingPage() {
    const { session } = useAuth();
    const [role, setRole] = useState<AccountRole | ''>('');
    const [enabled, setEnabled] = useState(true);
    const [balance, setBalance] = useState<BillingBalance | null>(null);
    const [usage, setUsage] = useState<BillingUsage | null>(null);
    const [ledger, setLedger] = useState<BillingLedger | null>(null);
    const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionBusy, setActionBusy] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [promoBusy, setPromoBusy] = useState(false);
    const [promoMsg, setPromoMsg] = useState('');

    const canView = role === 'admin' || role === 'billing';

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        setError('');
        try {
            const acc = await getAccount(session.accessToken);
            setRole(acc.role);
            if (acc.role !== 'admin' && acc.role !== 'billing') {
                setLoading(false);
                return;
            }
            const [bal, use, led, sub] = await Promise.all([
                getBillingBalance(session.accessToken),
                getBillingUsage(session.accessToken),
                getBillingLedger(session.accessToken, 50),
                getBillingSubscription(session.accessToken)
            ]);
            setEnabled(bal.enabled);
            setBalance(bal.data);
            setUsage(use.data);
            setLedger(led.data);
            setSubscription(sub);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load billing');
        }
        setLoading(false);
    }, [session?.accessToken]);

    useEffect(() => {
        load();
    }, [load]);

    const redirectTo = useCallback(
        async (action: string, fn: (token: string) => Promise<string | null>) => {
            if (!session?.accessToken) return;
            setActionBusy(action);
            setError('');
            try {
                const url = await fn(session.accessToken);
                if (url) {
                    window.location.href = url;
                    return;
                }
                setError('Billing is not enabled for this environment.');
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Action failed');
            }
            setActionBusy('');
        },
        [session?.accessToken]
    );

    const subscribe = useCallback(
        () => redirectTo('subscribe', startMembershipCheckout),
        [redirectTo]
    );
    const deposit = useCallback(
        () => redirectTo('deposit', startCreditsCheckout),
        [redirectTo]
    );
    const manage = useCallback(
        () => redirectTo('portal', openBillingPortal),
        [redirectTo]
    );

    const redeem = useCallback(async () => {
        if (!session?.accessToken || !promoCode.trim()) return;
        setPromoBusy(true);
        setPromoMsg('');
        setError('');
        try {
            const res = await redeemPromoCode(session.accessToken, promoCode.trim());
            setPromoMsg(
                res.already_redeemed
                    ? `You have already redeemed ${res.code}.`
                    : `${res.code} redeemed — ${fmtCredits(res.credits)} credits (${gbp(res.credits)}) added.`
            );
            setPromoCode('');
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not redeem code');
        }
        setPromoBusy(false);
    }, [session?.accessToken, promoCode, load]);

    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold">Billing</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Credit balance and usage for your account. Every account includes a
                monthly allowance; usage is metered per resource. 1 credit = £0.000001.
            </p>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="mt-8 text-sm text-black/40 dark:text-white/40">Loading…</div>
            ) : !canView ? (
                <div className="mt-8 p-4 rounded-xl border border-black/10 dark:border-white/10 text-sm text-black/60 dark:text-white/60">
                    Only account admins or billing-role members can view billing.
                </div>
            ) : !enabled ? (
                <div className="mt-8 p-4 rounded-xl border border-black/10 dark:border-white/10 text-sm text-black/60 dark:text-white/60">
                    Billing is not yet enabled for this environment.
                </div>
            ) : (
                <>
                    {/* Balance */}
                    <section className="mt-8">
                        <div className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <div className="flex items-baseline justify-between">
                                <span className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
                                    Current balance
                                </span>
                                {balance?.frozen ? (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                        Allowance exhausted
                                    </span>
                                ) : (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                        Active
                                    </span>
                                )}
                            </div>
                            <div className="mt-2 text-3xl font-semibold tabular-nums">
                                {fmtCredits(balance?.balance ?? 0)}
                                <span className="ml-2 text-base font-normal text-black/40 dark:text-white/40">
                                    credits
                                </span>
                            </div>
                            <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                                ≈ {gbp(balance?.balance ?? 0)} remaining
                            </div>
                        </div>
                    </section>

                    {/* Membership & deposits (Stripe) */}
                    {subscription?.enabled && (
                        <section className="mt-8">
                            <div className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
                                        Membership
                                    </span>
                                    {subscription.active ? (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60">
                                            {subscription.subscription_status || 'Not subscribed'}
                                        </span>
                                    )}
                                </div>
                                {subscription.active ? (
                                    <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                                        Your £100/year membership is active and includes a
                                        £10/month credit allowance.
                                        {subscription.current_period_end && (
                                            <>
                                                {' '}
                                                {subscription.cancel_at_period_end
                                                    ? 'Cancels on'
                                                    : 'Renews on'}{' '}
                                                {new Date(subscription.current_period_end).toLocaleDateString()}.
                                            </>
                                        )}
                                    </p>
                                ) : (
                                    <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                                        Subscribe to the £100/year membership to receive a
                                        £10/month credit allowance. Top up pre-paid credits any
                                        time to cover overage.
                                    </p>
                                )}
                                <div className="mt-4 flex flex-wrap gap-3">
                                    {!subscription.active && (
                                        <button
                                            onClick={subscribe}
                                            disabled={actionBusy !== ''}
                                            className="px-4 py-2 text-sm font-medium rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
                                        >
                                            {actionBusy === 'subscribe' ? 'Redirecting…' : 'Subscribe'}
                                        </button>
                                    )}
                                    <button
                                        onClick={deposit}
                                        disabled={actionBusy !== ''}
                                        className="px-4 py-2 text-sm font-medium rounded-full border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                                    >
                                        {actionBusy === 'deposit' ? 'Redirecting…' : 'Add credits'}
                                    </button>
                                    {subscription.active && (
                                        <button
                                            onClick={manage}
                                            disabled={actionBusy !== ''}
                                            className="px-4 py-2 text-sm font-medium rounded-full border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                                        >
                                            {actionBusy === 'portal' ? 'Redirecting…' : 'Manage billing'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Redeem a promo code */}
                    <section className="mt-8">
                        <div className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                            <span className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
                                Have a code?
                            </span>
                            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                                Redeem a promo code for free platform credits.
                            </p>
                            <form
                                onSubmit={(e) => { e.preventDefault(); redeem(); }}
                                className="mt-4 flex flex-wrap gap-3"
                            >
                                <input
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    placeholder="WELCOME-JUNE-2026"
                                    spellCheck={false}
                                    className="flex-1 min-w-[12rem] px-4 py-2 text-sm rounded-full border border-black/15 dark:border-white/15 bg-transparent uppercase placeholder:normal-case placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                                />
                                <button
                                    type="submit"
                                    disabled={promoBusy || promoCode.trim() === ''}
                                    className="px-4 py-2 text-sm font-medium rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
                                >
                                    {promoBusy ? 'Redeeming…' : 'Redeem'}
                                </button>
                            </form>
                            {promoMsg && (
                                <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{promoMsg}</p>
                            )}
                        </div>
                    </section>

                    {/* Usage by resource */}
                    <section className="mt-8">
                        <h2 className="text-lg font-medium">Usage by resource</h2>
                        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                            {usage?.since
                                ? `Since ${new Date(usage.since).toLocaleDateString()}`
                                : 'Recent period'}
                        </p>
                        {!usage || usage.by_resource.length === 0 ? (
                            <div className="mt-4 p-4 rounded-xl border border-black/10 dark:border-white/10 text-sm text-black/40 dark:text-white/40">
                                No usage recorded yet.
                            </div>
                        ) : (
                            <div className="mt-4 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-black/3 dark:bg-white/5 text-black/50 dark:text-white/50">
                                        <tr>
                                            <th className="text-left font-medium px-4 py-2">Resource</th>
                                            <th className="text-right font-medium px-4 py-2">Calls</th>
                                            <th className="text-right font-medium px-4 py-2">Credits</th>
                                            <th className="text-right font-medium px-4 py-2">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usage.by_resource.map((r) => (
                                            <tr key={r.resource} className="border-t border-black/5 dark:border-white/5">
                                                <td className="px-4 py-2">{RESOURCE_LABEL[r.resource] ?? r.resource}</td>
                                                <td className="px-4 py-2 text-right tabular-nums">{r.calls.toLocaleString('en-GB')}</td>
                                                <td className="px-4 py-2 text-right tabular-nums">{fmtCredits(r.credits)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-black/60 dark:text-white/60">{gbp(r.credits)}</td>
                                            </tr>
                                        ))}
                                        <tr className="border-t border-black/10 dark:border-white/10 font-medium">
                                            <td className="px-4 py-2">Total</td>
                                            <td className="px-4 py-2" />
                                            <td className="px-4 py-2 text-right tabular-nums">{fmtCredits(usage.total_credits)}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{gbp(usage.total_credits)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Ledger history */}
                    <section className="mt-8 mb-12">
                        <h2 className="text-lg font-medium">Ledger history</h2>
                        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                            Grants, top-ups and usage charges in credit units.
                        </p>
                        {!ledger || ledger.entries.length === 0 ? (
                            <div className="mt-4 p-4 rounded-xl border border-black/10 dark:border-white/10 text-sm text-black/40 dark:text-white/40">
                                No ledger entries yet.
                            </div>
                        ) : (
                            <div className="mt-4 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-black/3 dark:bg-white/5 text-black/50 dark:text-white/50">
                                        <tr>
                                            <th className="text-left font-medium px-4 py-2">Date</th>
                                            <th className="text-left font-medium px-4 py-2">Type</th>
                                            <th className="text-left font-medium px-4 py-2">Reason</th>
                                            <th className="text-right font-medium px-4 py-2">Credits</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledger.entries.map((e) => (
                                            <tr key={e.id} className="border-t border-black/5 dark:border-white/5">
                                                <td className="px-4 py-2 text-black/60 dark:text-white/60 whitespace-nowrap">{new Date(e.ts).toLocaleString()}</td>
                                                <td className="px-4 py-2">{KIND_LABEL[e.kind] ?? e.kind}</td>
                                                <td className="px-4 py-2 text-black/60 dark:text-white/60">{e.reason || '—'}</td>
                                                <td className={`px-4 py-2 text-right tabular-nums ${e.credits < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {e.credits > 0 ? '+' : ''}{fmtCredits(e.credits)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
