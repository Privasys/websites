'use client';

// Admin price book: view and edit every billable rate, publish as a NEW
// price-book version (versions are immutable — historical usage stays
// priced under the version that charged it). Backed by
// GET/POST /api/v1/admin/pricing (mgmt admin proxy → credit-ledger).

import { useAuth, hasAdminRole } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { adminGetPricing, adminPublishPricing } from '~/lib/api';
import type { Pricebook, PricebookRule } from '~/lib/api';

// 1 credit = £0.000001 (£1 = 1,000,000 credits).
const GBP_PER_CREDIT = 0.000001;

function gbp(credits: number): string {
    const v = credits * GBP_PER_CREDIT;
    if (v >= 100) return `£${v.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    if (v >= 0.01) return `£${v.toFixed(2)}`;
    return `£${v.toPrecision(2)}`;
}

// Per-resource presentation: friendly label, what "one unit" means, and a
// derived effective-price line so edits can be sanity-checked at a glance.
interface ResourceMeta {
    label: string;
    unit: string; // what quantity/divisor units mean
    effective?: (r: PricebookRule) => string;
}

const perToken = (r: PricebookRule) => `${gbp((r.per_unit / r.divisor) * 1_000_000)} / 1M tokens`;
const perMinute = (r: PricebookRule) => `${gbp((r.per_unit / r.divisor) * 60)} /hr · ${gbp((r.per_unit / r.divisor) * 60 * 720)} /720h mo`;
const perHour = (r: PricebookRule) => `${gbp(r.per_unit / r.divisor)} /hr · ${gbp((r.per_unit / r.divisor) * 720)} /720h mo`;

const RESOURCE_META: Record<string, ResourceMeta> = {
    container_minute_micro: { label: 'Confidential-Micro', unit: 'minute', effective: perMinute },
    container_minute_small: { label: 'Confidential-Small', unit: 'minute', effective: perMinute },
    container_minute_medium: { label: 'Confidential-Medium', unit: 'minute', effective: perMinute },
    container_minute_large: { label: 'Confidential-Large', unit: 'minute', effective: perMinute },
    container_minute_xlarge: { label: 'Confidential-XLarge', unit: 'minute', effective: perMinute },
    instance_hour_c3_standard_4: { label: 'Dedicated c3-standard-4 (Medium)', unit: 'started hour', effective: perHour },
    instance_hour_c3_standard_8: { label: 'Dedicated c3-standard-8 (Large)', unit: 'started hour', effective: perHour },
    instance_hour_a3_highgpu_1g: { label: 'Dedicated a3-highgpu-1g (1× H100 80GB)', unit: 'started hour', effective: perHour },
    ai_input_tokens_qwen36_35b_a3b: { label: 'Qwen 3.6 35B A3B — input', unit: 'token', effective: perToken },
    ai_output_tokens_qwen36_35b_a3b: { label: 'Qwen 3.6 35B A3B — output', unit: 'token', effective: perToken },
    ai_input_tokens_qwen3_embedding_06b: { label: 'Qwen3 Embedding 0.6B — input', unit: 'token', effective: perToken },
    ai_input_tokens_qwen3_reranker_06b: { label: 'Qwen3 Reranker 0.6B — input', unit: 'token', effective: perToken },
    storage_retained_gb_day: {
        label: 'Retained storage (stopped instance)', unit: 'GB·day',
        effective: r => `${gbp(r.per_unit / r.divisor)} /GB/day · ${gbp((r.per_unit / r.divisor) * 30)} /GB/mo`,
    },
    wasm_fuel: { label: 'WASM fuel', unit: 'instruction', effective: r => `${gbp((r.per_unit / r.divisor) * 1e9)} / 1e9 instructions` },
    deploy: { label: 'Deploy', unit: 'KB of artifact' },
    ledger_read: { label: 'Ledger read', unit: 'KB' },
    ledger_write: { label: 'Ledger write', unit: 'KB' },
    crypto_digest: { label: 'Crypto digest', unit: 'KB' },
    crypto_encrypt: { label: 'Crypto encrypt', unit: 'KB' },
    crypto_decrypt: { label: 'Crypto decrypt', unit: 'KB' },
    crypto_sign: { label: 'Crypto sign', unit: 'call' },
    crypto_verify: { label: 'Crypto verify', unit: 'call' },
    crypto_random: { label: 'Crypto random', unit: 'byte' },
    https_plain: { label: 'HTTPS fetch (plain)', unit: 'KB transferred' },
    https_ratls: { label: 'HTTPS fetch (RA-TLS)', unit: 'KB transferred' },
};

// Display groups, in order. Resources not matched fall into the last group.
const GROUPS: { title: string; match: (res: string) => boolean }[] = [
    { title: 'Container compute — shared hosts', match: r => r.startsWith('container_minute_') },
    { title: 'Dedicated machines', match: r => r.startsWith('instance_hour_') },
    { title: 'Confidential AI tokens', match: r => r.startsWith('ai_') },
    { title: 'Storage', match: r => r.startsWith('storage_') },
    { title: 'WASM & platform operations', match: () => true },
];

export default function AdminPricingPage() {
    const { session } = useAuth();
    const [book, setBook] = useState<Pricebook | null>(null);
    const [edits, setEdits] = useState<Record<string, Partial<PricebookRule>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [note, setNote] = useState('');

    const isAdmin = hasAdminRole(session?.roles);

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        setError(null);
        try {
            setBook(await adminGetPricing(session.accessToken));
            setEdits({});
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load the price book');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => { load(); }, [load]);

    // The effective (edited) view of every rule, and which ones changed.
    const effectiveRules = useMemo(() => {
        if (!book) return [];
        return book.rules.map(r => ({ ...r, ...edits[r.resource] }));
    }, [book, edits]);
    const changed = useMemo(() => {
        if (!book) return new Set<string>();
        const base = new Map(book.rules.map(r => [r.resource, r]));
        const out = new Set<string>();
        for (const r of effectiveRules) {
            const b = base.get(r.resource);
            if (b && (b.fixed_per_call !== r.fixed_per_call || b.per_unit !== r.per_unit || b.divisor !== r.divisor)) out.add(r.resource);
        }
        return out;
    }, [book, effectiveRules]);

    function setField(resource: string, field: keyof PricebookRule, value: string) {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return;
        setEdits(prev => ({ ...prev, [resource]: { ...prev[resource], [field]: Math.floor(n) } }));
        setSuccess(null);
    }

    async function publish() {
        if (!session?.accessToken || !book || changed.size === 0 || !note.trim()) return;
        setPublishing(true);
        setError(null);
        try {
            const res = await adminPublishPricing(session.accessToken, note.trim(), effectiveRules);
            setSuccess(`Published price book v${res.version}. New usage prices at this version; history is unaffected.`);
            setConfirming(false);
            setNote('');
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Publish failed');
        } finally {
            setPublishing(false);
        }
    }

    if (!isAdmin) {
        return <div className="p-8 text-sm text-black/50 dark:text-white/50">This page requires the platform admin role.</div>;
    }

    const inputCls = 'w-28 px-2 py-1 text-sm text-right rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';

    // Assign each rule to its first matching group.
    const grouped: { title: string; rules: typeof effectiveRules }[] = [];
    if (effectiveRules.length > 0) {
        const taken = new Set<string>();
        for (const g of GROUPS) {
            const rules = effectiveRules.filter(r => !taken.has(r.resource) && g.match(r.resource));
            rules.forEach(r => taken.add(r.resource));
            if (rules.length > 0) grouped.push({ title: g.title, rules });
        }
    }

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-semibold">Pricing</h1>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                        The platform price book (1 credit = £0.000001). Edits publish a <span className="font-medium">new version</span> — past usage keeps the version that priced it.
                        {book && <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-black/5 dark:bg-white/10">current: v{book.current_version}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {changed.size > 0 && (
                        <button onClick={() => setEdits({})} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
                            Discard changes
                        </button>
                    )}
                    <button
                        onClick={() => setConfirming(true)}
                        disabled={changed.size === 0 || publishing}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {changed.size > 0 ? `Publish ${changed.size} change${changed.size === 1 ? '' : 's'}…` : 'No changes'}
                    </button>
                </div>
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {success && <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-300">{success}</div>}
            {loading && <div className="text-sm text-black/40 dark:text-white/40">Loading price book…</div>}

            {grouped.map(g => (
                <section key={g.title}>
                    <h2 className="text-sm font-semibold mb-2">{g.title}</h2>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-black/40 dark:text-white/40 border-b border-black/5 dark:border-white/5">
                                    <th className="px-4 py-2 font-medium">Resource</th>
                                    <th className="px-4 py-2 font-medium text-right">Fixed / call</th>
                                    <th className="px-4 py-2 font-medium text-right">Credits / unit</th>
                                    <th className="px-4 py-2 font-medium text-right">Per (divisor)</th>
                                    <th className="px-4 py-2 font-medium">Effective</th>
                                </tr>
                            </thead>
                            <tbody>
                                {g.rules.map(r => {
                                    const meta = RESOURCE_META[r.resource];
                                    const dirty = changed.has(r.resource);
                                    return (
                                        <tr key={r.resource} className={`border-b border-black/5 dark:border-white/5 last:border-0 ${dirty ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}`}>
                                            <td className="px-4 py-2">
                                                <div className="font-medium">{meta?.label ?? r.resource}</div>
                                                <div className="text-[11px] text-black/40 dark:text-white/40 font-mono">{r.resource}{meta ? ` · per ${meta.unit}` : ''}</div>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <input className={inputCls} type="number" min={0} value={r.fixed_per_call} onChange={e => setField(r.resource, 'fixed_per_call', e.target.value)} />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <input className={inputCls} type="number" min={0} value={r.per_unit} onChange={e => setField(r.resource, 'per_unit', e.target.value)} />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <input className={inputCls} type="number" min={1} value={r.divisor} onChange={e => setField(r.resource, 'divisor', e.target.value)} />
                                            </td>
                                            <td className="px-4 py-2 text-xs text-black/60 dark:text-white/60 whitespace-nowrap">{meta?.effective?.(r) ?? ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}

            {book && book.versions.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold mb-2">Version history</h2>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
                        {book.versions.map(v => (
                            <div key={v.version} className="px-4 py-2.5 flex items-baseline gap-3 text-sm">
                                <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${v.version === book.current_version ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/5 dark:bg-white/10'}`}>v{v.version}</span>
                                <span className="flex-1">{v.note || '—'}</span>
                                <span className="text-xs text-black/40 dark:text-white/40 whitespace-nowrap">{v.created_by || 'system'} · {new Date(v.created_at).toLocaleString('en-GB')}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {confirming && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !publishing && setConfirming(false)}>
                    <div className="w-full max-w-lg rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-5 space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-semibold">Publish price book v{(book?.current_version ?? 0) + 1}</h3>
                        <div className="text-sm text-black/60 dark:text-white/60">
                            {changed.size} rate{changed.size === 1 ? '' : 's'} will change. New usage prices at the new version immediately; already-recorded usage is untouched.
                        </div>
                        <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                            {book && effectiveRules.filter(r => changed.has(r.resource)).map(r => {
                                const before = book.rules.find(b => b.resource === r.resource)!;
                                return (
                                    <li key={r.resource} className="font-mono">
                                        {r.resource}: {before.fixed_per_call}/{before.per_unit}/{before.divisor} → {r.fixed_per_call}/{r.per_unit}/{r.divisor}
                                    </li>
                                );
                            })}
                        </ul>
                        <div>
                            <label className="text-xs text-black/50 dark:text-white/50 block mb-1">Change note (required, shown in history)</label>
                            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" placeholder="e.g. H100 to £7/hr; storage margin adjustment" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setConfirming(false)} disabled={publishing} className="px-3 py-1.5 text-sm rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">Cancel</button>
                            <button onClick={publish} disabled={publishing || !note.trim()} className="px-4 py-1.5 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40">
                                {publishing ? 'Publishing…' : 'Publish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
