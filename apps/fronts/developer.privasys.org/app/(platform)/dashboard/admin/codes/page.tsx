'use client';

import { useAuth, hasManagerRole } from '~/lib/privasys-auth';
import { useCallback, useEffect, useState } from 'react';
import { adminCreatePromoCode, adminListPromoCodes } from '~/lib/api';
import type { NewPromoCode, PromoCode } from '~/lib/api';

// Credit codes: redeemable by anyone signed in, on privasys.id/account or in
// the portal's billing page. A code can be restricted to one app: its credits
// then fund a pot spendable only on inference that app serves, until a date,
// with an optional smaller general allowance beside it.

const CREDITS_PER_GBP = 1_000_000;

function gbp(credits: number): string {
    return '£' + (credits / CREDITS_PER_GBP).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toCredits(pounds: string): number {
    const n = Number(pounds);
    return Number.isFinite(n) && n > 0 ? Math.round(n * CREDITS_PER_GBP) : 0;
}

// An <input type="date"> value, taken as the END of that day in UTC, so
// "until 12 December" includes the 12th.
function endOfDayRFC3339(date: string): string | undefined {
    if (!date) return undefined;
    return `${date}T23:59:59Z`;
}

function day(iso: string | null | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const input =
    'w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';

export default function AdminCodesPage() {
    const { session } = useAuth();
    const isManager = hasManagerRole(session?.roles);
    const [codes, setCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [pounds, setPounds] = useState('');
    const [maxRedemptions, setMaxRedemptions] = useState('');
    const [codeUntil, setCodeUntil] = useState('');
    const [scoped, setScoped] = useState(false);
    const [scopeApp, setScopeApp] = useState('');
    const [creditsUntil, setCreditsUntil] = useState('');
    const [platformPounds, setPlatformPounds] = useState('');

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        try {
            setCodes(await adminListPromoCodes(session.accessToken));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load codes');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => {
        load();
    }, [load]);

    async function create(e: React.FormEvent) {
        e.preventDefault();
        if (!session?.accessToken) return;
        setError(null);
        setSuccess(null);
        const credits = toCredits(pounds);
        if (!code.trim() || credits <= 0) {
            setError('A code and a positive amount are required.');
            return;
        }
        const body: NewPromoCode = { code: code.trim(), credits, description: description.trim() || undefined };
        const max = Number(maxRedemptions);
        if (maxRedemptions && (!Number.isInteger(max) || max <= 0)) {
            setError('The redemption limit must be a whole number above zero, or empty for no limit.');
            return;
        }
        if (max > 0) body.max_redemptions = max;
        if (codeUntil) body.expires_at = endOfDayRFC3339(codeUntil);
        if (scoped) {
            if (!scopeApp.trim() || !creditsUntil) {
                setError('A code for one app needs the app id and the date its credits lapse.');
                return;
            }
            body.scope_app_id = scopeApp.trim();
            body.credits_expire_at = endOfDayRFC3339(creditsUntil);
            const platform = toCredits(platformPounds);
            if (platform > 0) body.platform_credits = platform;
        }
        setBusy(true);
        try {
            const res = await adminCreatePromoCode(session.accessToken, body);
            setSuccess(`Code ${res.code} created.`);
            setCode('');
            setDescription('');
            setPounds('');
            setMaxRedemptions('');
            setCodeUntil('');
            setScopeApp('');
            setCreditsUntil('');
            setPlatformPounds('');
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create the code');
        } finally {
            setBusy(false);
        }
    }

    if (!isManager) {
        return (
            <div className="max-w-3xl">
                <h1 className="text-2xl font-semibold">Access denied</h1>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                    The <code>privasys-platform:manager</code> role is required to manage credit codes.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold">Credit codes</h1>
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Codes anyone signed in can redeem, on privasys.id/account or on the billing page. Each account can redeem a code once.
            </p>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}
            {success && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">{success}</div>
            )}

            <form onSubmit={create} className="mt-6 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-4">
                <h2 className="text-base font-semibold">New code</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="space-y-1 block">
                        <span className="block text-sm font-medium">Code</span>
                        <input className={input + ' uppercase'} value={code} onChange={(e) => setCode(e.target.value)} placeholder="IMPERIAL-AUTUMN-2026" />
                    </label>
                    <label className="space-y-1 block">
                        <span className="block text-sm font-medium">Credits (£)</span>
                        <input className={input} inputMode="decimal" value={pounds} onChange={(e) => setPounds(e.target.value)} placeholder="20" />
                    </label>
                    <label className="space-y-1 block sm:col-span-2">
                        <span className="block text-sm font-medium">Description</span>
                        <input className={input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Imperial College, autumn term cohort" />
                    </label>
                    <label className="space-y-1 block">
                        <span className="block text-sm font-medium">Redemption limit</span>
                        <input className={input} inputMode="numeric" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="No limit" />
                    </label>
                    <label className="space-y-1 block">
                        <span className="block text-sm font-medium">Code redeemable until</span>
                        <input className={input} type="date" value={codeUntil} onChange={(e) => setCodeUntil(e.target.value)} />
                    </label>
                </div>

                <label className="flex items-start gap-3 pt-2">
                    <input type="checkbox" className="mt-1" checked={scoped} onChange={(e) => setScoped(e.target.checked)} />
                    <span>
                        <span className="block text-sm font-medium">Only for one app</span>
                        <span className="block text-sm text-black/50 dark:text-white/50">
                            The credits can be spent only on inference that app serves, and lapse on a date. They never count toward the general balance.
                        </span>
                    </span>
                </label>

                {scoped && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
                        <label className="space-y-1 block sm:col-span-2">
                            <span className="block text-sm font-medium">App id</span>
                            <input className={input + ' font-mono'} value={scopeApp} onChange={(e) => setScopeApp(e.target.value)} placeholder="3a545cb7-740e-4d31-839b-7341359631a2" />
                            <span className="block text-xs text-black/40 dark:text-white/40">
                                The app id stays the same across upgrades, so the credits keep working through every new version.
                            </span>
                        </label>
                        <label className="space-y-1 block">
                            <span className="block text-sm font-medium">Credits usable until</span>
                            <input className={input} type="date" value={creditsUntil} onChange={(e) => setCreditsUntil(e.target.value)} />
                        </label>
                        <label className="space-y-1 block">
                            <span className="block text-sm font-medium">Plus general credits (£)</span>
                            <input className={input} inputMode="decimal" value={platformPounds} onChange={(e) => setPlatformPounds(e.target.value)} placeholder="Optional" />
                        </label>
                    </div>
                )}

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={busy}
                        className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                    >
                        {busy ? 'Creating…' : 'Create code'}
                    </button>
                </div>
            </form>

            <h2 className="mt-10 text-base font-semibold">Codes</h2>
            {loading ? (
                <div className="mt-4 animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div>
            ) : codes.length === 0 ? (
                <p className="mt-4 text-sm text-black/50 dark:text-white/50">No codes yet.</p>
            ) : (
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm min-w-[40rem]">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50 border-b border-black/10 dark:border-white/10">
                                <th className="py-2 pr-4 font-medium">Code</th>
                                <th className="py-2 pr-4 font-medium">Grants</th>
                                <th className="py-2 pr-4 font-medium">Redeemed</th>
                                <th className="py-2 pr-4 font-medium">Redeemable until</th>
                            </tr>
                        </thead>
                        <tbody>
                            {codes.map((c) => (
                                <tr key={c.code} className="border-b border-black/5 dark:border-white/5 align-top">
                                    <td className="py-3 pr-4">
                                        <span className="font-mono">{c.code}</span>
                                        {!c.active && <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">inactive</span>}
                                        {c.description && <span className="block text-xs text-black/50 dark:text-white/50">{c.description}</span>}
                                    </td>
                                    <td className="py-3 pr-4">
                                        {c.scope_app_id ? (
                                            <>
                                                {gbp(c.credits)} for app <span className="font-mono text-xs">{c.scope_app_id.slice(0, 8)}</span>, until {day(c.credits_expire_at)}
                                                {c.platform_credits > 0 && <span className="block text-xs text-black/50 dark:text-white/50">plus {gbp(c.platform_credits)} general</span>}
                                            </>
                                        ) : (
                                            <>{gbp(c.credits)} general</>
                                        )}
                                    </td>
                                    <td className="py-3 pr-4 tabular-nums">
                                        {c.redemption_count}
                                        {c.max_redemptions != null && <> of {c.max_redemptions}</>}
                                    </td>
                                    <td className="py-3 pr-4">{c.expires_at ? day(c.expires_at) : 'No end date'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
