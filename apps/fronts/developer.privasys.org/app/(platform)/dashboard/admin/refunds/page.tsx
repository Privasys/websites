'use client';

import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import { useCallback, useEffect, useState } from 'react';
import { adminDecideRefundCase, adminListRefundCases } from '~/lib/api';
import type { RefundCase, RefundCasesResponse } from '~/lib/api';

// Refunds: when someone deletes their account (or asks for their refund
// early), their money balance becomes a case here. Only money they paid in is
// ever in a case; credit we gave is not. A refund leaves our account only when
// a manager approves it: approving refunds the payments they topped up with.
// A donation needs no approval here: it joins the year's total, which
// Privasys gives to Cancer Research UK once a year through Work for Good.

function pence(p: number): string {
    return '£' + (p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function day(iso: string | null | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS: Record<RefundCase['status'], string> = {
    awaiting_approval: 'Awaiting approval',
    refunded: 'Refunded',
    failed: 'Needs attention',
    rejected: 'Declined',
    donated: 'Donation'
};

const button =
    'px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors';

export default function AdminRefundsPage() {
    const { session } = useAuth();
    const isManager = hasManagerRole(session?.roles);
    const [data, setData] = useState<RefundCasesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        try {
            setData(await adminListRefundCases(session.accessToken));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load refund cases');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => {
        load();
    }, [load]);

    async function decide(c: RefundCase, action: 'approve' | 'reject' | 'mark-paid') {
        if (!session?.accessToken) return;
        let note = '';
        if (action === 'approve') {
            if (!window.confirm(`Refund ${pence(c.amount_pence - c.paid_pence)} to ${c.account_name || 'this account'}'s payments? The money leaves our account.`)) return;
        } else if (action === 'reject') {
            const n = window.prompt('Decline this refund and put the money back on the account. Why? (kept with the case)');
            if (n === null) return;
            note = n;
        } else {
            const n = window.prompt('How was it paid? (for example: bank transfer, 24 Nov, reference)');
            if (!n) return;
            note = n;
        }
        setBusy(c.id);
        setError(null);
        try {
            await adminDecideRefundCase(session.accessToken, c.id, action, note);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed');
        } finally {
            setBusy(null);
        }
    }

    if (!isManager) {
        return (
            <div className="max-w-3xl">
                <h1 className="text-2xl font-semibold">Access denied</h1>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                    The <code>privasys-platform:manager</code> role is required to see refunds.
                </p>
            </div>
        );
    }

    const cases = data?.cases ?? [];
    const open = cases.filter((c) => c.status === 'awaiting_approval' || c.status === 'failed');
    const done = cases.filter((c) => c.status !== 'awaiting_approval' && c.status !== 'failed');

    return (
        <div>
            <h1 className="text-2xl font-semibold">Refunds</h1>
            <p className="max-w-3xl mt-1 text-sm text-black/50 dark:text-white/50">
                The money balance of people who deleted their account or asked for their refund. Only money they paid in is here, never credit we gave. Nothing is refunded until you approve it.
            </p>

            {error && <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}

            {data && (
                <div className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10">
                    <h2 className="text-base font-semibold">Donations in {data.donations.year}</h2>
                    <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                        <span className="text-xl font-semibold tabular-nums text-black dark:text-white">{pence(data.donations.total_pence)}</span> from {data.donations.cases} {data.donations.cases === 1 ? 'person' : 'people'}, to give to Cancer Research UK through Work for Good once a year.
                    </p>
                </div>
            )}

            <h2 className="mt-10 text-base font-semibold">To decide</h2>
            {loading ? (
                <div className="mt-4 animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div>
            ) : open.length === 0 ? (
                <p className="mt-4 text-sm text-black/50 dark:text-white/50">Nothing waiting.</p>
            ) : (
                <CaseTable cases={open} busy={busy} onDecide={decide} />
            )}

            <h2 className="mt-10 text-base font-semibold">Decided</h2>
            {!loading && (done.length === 0 ? <p className="mt-4 text-sm text-black/50 dark:text-white/50">None yet.</p> : <CaseTable cases={done} busy={busy} />)}
        </div>
    );
}

function CaseTable({ cases, busy, onDecide }: {
    cases: RefundCase[];
    busy: string | null;
    onDecide?: (_c: RefundCase, _a: 'approve' | 'reject' | 'mark-paid') => void;
}) {
    return (
        <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[44rem]">
                <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50 border-b border-black/10 dark:border-white/10">
                        <th className="py-2 pr-4 font-medium">Account</th>
                        <th className="py-2 pr-4 font-medium">Amount</th>
                        <th className="py-2 pr-4 font-medium">Why</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 pr-4 font-medium">Opened</th>
                        {onDecide && <th className="py-2 pr-4 font-medium" />}
                    </tr>
                </thead>
                <tbody>
                    {cases.map((c) => (
                        <tr key={c.id} className="border-b border-black/5 dark:border-white/5 align-top">
                            <td className="py-3 pr-4">
                                {c.account_name || 'Personal account'}
                                <span className="block font-mono text-xs text-black/40 dark:text-white/40">{c.account_id.slice(0, 8)}</span>
                            </td>
                            <td className="py-3 pr-4 tabular-nums">
                                {pence(c.amount_pence)}
                                {c.paid_pence > 0 && c.paid_pence < c.amount_pence && <span className="block text-xs text-black/50 dark:text-white/50">{pence(c.paid_pence)} paid so far</span>}
                            </td>
                            <td className="py-3 pr-4">
                                {c.destination === 'donation' ? 'Gave it for the donation' : c.reason === 'deletion' ? 'Account deleted' : 'Asked for it early'}
                            </td>
                            <td className="py-3 pr-4">
                                {STATUS[c.status]}
                                {c.note && <span className="block text-xs text-black/50 dark:text-white/50 max-w-xs">{c.note}</span>}
                                {c.decided_at && <span className="block text-xs text-black/40 dark:text-white/40">{day(c.decided_at)}</span>}
                            </td>
                            <td className="py-3 pr-4">{day(c.created_at)}</td>
                            {onDecide && (
                                <td className="py-3 pr-4">
                                    <div className="flex flex-wrap gap-2">
                                        <button className={button} disabled={busy === c.id} onClick={() => onDecide(c, 'approve')}>
                                            {c.status === 'failed' ? 'Retry refund' : 'Approve refund'}
                                        </button>
                                        {c.status === 'failed' && (
                                            <button className={button} disabled={busy === c.id} onClick={() => onDecide(c, 'mark-paid')}>Mark paid</button>
                                        )}
                                        <button className={button} disabled={busy === c.id} onClick={() => onDecide(c, 'reject')}>Decline</button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
