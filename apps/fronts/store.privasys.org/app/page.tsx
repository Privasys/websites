'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listStoreApps, resolveAsset, type StoreAppSummary } from '~/lib/store-api';

export default function BrowsePage() {
    const [apps, setApps] = useState<StoreAppSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string>('');

    useEffect(() => {
        listStoreApps().then(setApps).catch(() => setError('Could not load the store right now.'));
    }, []);

    const categories = useMemo(() => {
        const set = new Set<string>();
        (apps ?? []).forEach(a => { if (a.category) set.add(a.category); });
        return Array.from(set).sort();
    }, [apps]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (apps ?? []).filter(a => {
            if (category && a.category !== category) return false;
            if (!q) return true;
            return [a.name, a.developer, a.tagline, a.category, a.keywords]
                .filter(Boolean)
                .some(s => s.toLowerCase().includes(q));
        });
    }, [apps, query, category]);

    return (
        <div>
            <section className='mb-10'>
                <h1 className='text-4xl lg:text-5xl font-semibold tracking-tight'>Verified confidential apps</h1>
                <p className='mt-4 max-w-2xl text-black/60 dark:text-white/60'>
                    Every application here runs inside a hardware-protected enclave. Attestation is
                    verified independently, and each listing shows exactly which code is running.
                </p>
            </section>

            <div className='mb-8 flex flex-col sm:flex-row gap-3 sm:items-center'>
                <input
                    type='search'
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder='Search apps…'
                    className='flex-1 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/15 dark:focus:ring-white/20'
                />
                {categories.length > 0 && (
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className='px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 focus:outline-none'
                    >
                        <option value=''>All categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                )}
            </div>

            {error && <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>}
            {!apps && !error && <p className='text-sm text-black/40 dark:text-white/40'>Loading…</p>}
            {apps && filtered.length === 0 && !error && (
                <p className='text-sm text-black/40 dark:text-white/40'>No apps match your search.</p>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                {filtered.map(app => (
                    <Link
                        key={app.slug}
                        href={`/app/?slug=${encodeURIComponent(app.slug)}`}
                        className='block p-5 rounded-2xl border border-black/8 dark:border-white/10 hover:border-black/20 dark:hover:border-white/25 transition-colors'
                    >
                        <div className='flex items-start gap-4'>
                            <img src={resolveAsset(app.icon_url)} alt='' className='w-14 h-14 rounded-2xl object-cover border border-black/5 dark:border-white/10 bg-white dark:bg-white/5' />
                            <div className='min-w-0 flex-1'>
                                <div className='flex items-center gap-2 flex-wrap'>
                                    <h3 className='font-semibold truncate'>{app.name}</h3>
                                    <span className='px-1.5 py-0.5 text-[10px] font-medium rounded-full border border-black/10 dark:border-white/15'>{app.tee}</span>
                                    <span className='px-1.5 py-0.5 text-[10px] font-medium rounded-full border border-black/10 dark:border-white/15'>{app.target === 'wasm' ? 'WASM' : 'Container'}</span>
                                </div>
                                <p className='text-xs text-black/50 dark:text-white/50 mt-0.5'>{app.developer}{app.category ? ` · ${app.category}` : ''}</p>
                                {app.tagline && <p className='text-sm text-black/70 dark:text-white/65 mt-2 line-clamp-2'>{app.tagline}</p>}
                                {app.has_live && (
                                    <span className='inline-flex items-center gap-1 mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400'>
                                        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M20 6L9 17l-5-5' /></svg>
                                        Live · attestable
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
