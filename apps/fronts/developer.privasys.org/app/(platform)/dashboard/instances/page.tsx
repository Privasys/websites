'use client';

import { useAuth } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
    listInstances,
    createInstance,
    stopInstance,
    startInstance,
    deleteInstance
} from '~/lib/api';
import type { Instance } from '~/lib/api';

// Dedicated instances are billed for the MACHINE per started hour (§5.6). The
// apps you run on one add no compute charge. Rates mirror the size the shape
// maps to (Medium/Large); 1 credit = £0.000001, 720 h = the published month.
const SHAPE: Record<string, { label: string; size: string; creditsPerHour: number }> = {
    'c3-standard-4': { label: 'Medium', size: 'medium', creditsPerHour: 240_000 },
    'c3-standard-8': { label: 'Large', size: 'large', creditsPerHour: 480_000 }
};

const SIZE_OPTIONS = [
    { slug: 'medium', label: 'Medium — 4 vCPU / 16 GB (c3-standard-4)' },
    { slug: 'large', label: 'Large — 8 vCPU / 32 GB (c3-standard-8)' }
];

function monthlyGBP(creditsPerHour: number): string {
    return `£${((creditsPerHour * 720) / 1_000_000).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATE_STYLE: Record<string, string> = {
    running: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    provisioning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    starting: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    stopped: 'bg-gray-200 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300',
    deleting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
};

const TRANSITIONAL = new Set(['provisioning', 'starting', 'deleting']);

export default function InstancesPage() {
    const { session } = useAuth();
    const token = session?.accessToken;

    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<Record<string, boolean>>({});

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newSize, setNewSize] = useState('medium');
    const [creating, setCreating] = useState(false);

    const refresh = useCallback(async () => {
        if (!token) return;
        try {
            const list = await listInstances(token);
            setInstances(list);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load instances');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { refresh(); }, [refresh]);

    // Poll while any instance is mid-transition (provisioning/starting/deleting).
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        const transitional = instances.some(i => TRANSITIONAL.has(i.state));
        if (transitional && !pollRef.current) {
            pollRef.current = setInterval(refresh, 8000);
        } else if (!transitional && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    }, [instances, refresh]);

    async function handleCreate() {
        if (!token) return;
        setCreating(true);
        setError(null);
        try {
            await createInstance(token, { name: newName.trim() || undefined, size: newSize });
            setShowCreate(false);
            setNewName('');
            setNewSize('medium');
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create instance');
        } finally {
            setCreating(false);
        }
    }

    async function act(id: string, fn: () => Promise<unknown>) {
        if (!token) return;
        setBusy(b => ({ ...b, [id]: true }));
        setError(null);
        try {
            await fn();
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Action failed');
        } finally {
            setBusy(b => ({ ...b, [id]: false }));
        }
    }

    const handleStop = (i: Instance) => act(i.id, () => stopInstance(token!, i.id));
    const handleStart = (i: Instance) => act(i.id, () => startInstance(token!, i.id));
    const handleDelete = (i: Instance) => {
        const force = i.app_count > 0;
        const msg = force
            ? `Delete instance "${i.name}"? ${i.app_count} app(s) are deployed on it — they will stop. The VM is removed; disks are retained.`
            : `Delete instance "${i.name}"? The VM is removed; disks are retained.`;
        if (!window.confirm(msg)) return;
        act(i.id, () => deleteInstance(token!, i.id, force));
    };

    const rate = (shape: string) => SHAPE[shape];

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-semibold">Dedicated instances</h1>
                    <p className="text-sm text-black/50 dark:text-white/50 mt-1 max-w-2xl">
                        A dedicated instance is a whole confidential VM you own — the strongest isolation
                        (your workloads get their own TD, not a cgroup). Deploy any number of your apps onto
                        it; the instance is the billed unit, and the apps on it add no compute charge.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(s => !s)}
                    className="shrink-0 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    {showCreate ? 'Cancel' : 'New instance'}
                </button>
            </div>

            {error && (
                <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                    {error}
                </div>
            )}

            {showCreate && (
                <div className="mt-4 p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <label className="block">
                            <span className="text-xs font-medium text-black/60 dark:text-white/60">Name</span>
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="my-instance"
                                className="mt-1 w-full px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-black/40 text-sm"
                            />
                        </label>
                        <label className="block">
                            <span className="text-xs font-medium text-black/60 dark:text-white/60">Size</span>
                            <select
                                value={newSize}
                                onChange={e => setNewSize(e.target.value)}
                                className="mt-1 w-full px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-black/40 text-sm"
                            >
                                {SIZE_OPTIONS.map(s => <option key={s.slug} value={s.slug}>{s.label}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-medium text-black/60 dark:text-white/60">Location</span>
                            <select disabled className="mt-1 w-full px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-black/40 text-sm opacity-70">
                                <option>Paris, France (europe-west9)</option>
                            </select>
                        </label>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-black/50 dark:text-white/50">
                            {(() => { const s = SHAPE[SIZE_OPTIONS.find(o => o.slug === newSize)?.slug === 'large' ? 'c3-standard-8' : 'c3-standard-4']; return `${(s.creditsPerHour).toLocaleString('en-GB')} credits/hour · ${monthlyGBP(s.creditsPerHour)}/mo`; })()}
                        </span>
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            {creating ? 'Provisioning…' : 'Provision instance'}
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-6">
                {loading ? (
                    <div className="text-sm text-black/40 dark:text-white/40 py-8 text-center">Loading…</div>
                ) : instances.length === 0 ? (
                    <div className="text-sm text-black/40 dark:text-white/40 py-12 text-center border border-dashed border-black/10 dark:border-white/10 rounded-xl">
                        No dedicated instances yet. Provision one to run your apps on a machine you own.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {instances.map(i => {
                            const r = rate(i.shape);
                            const isBusy = busy[i.id];
                            return (
                                <div key={i.id} className="p-4 rounded-xl border border-black/10 dark:border-white/10 flex items-center justify-between gap-4 flex-wrap">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{i.name}</span>
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATE_STYLE[i.state] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {i.state}
                                            </span>
                                        </div>
                                        <div className="text-xs text-black/50 dark:text-white/50 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                            <span>{r ? `${r.label} · ${i.shape}` : i.shape}</span>
                                            <span>{i.app_count} app{i.app_count === 1 ? '' : 's'}</span>
                                            {i.host && <span className="font-mono">{i.host}</span>}
                                            {r && <span>{monthlyGBP(r.creditsPerHour)}/mo</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {i.state === 'running' && (
                                            <button onClick={() => handleStop(i)} disabled={isBusy} className="px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/15 text-sm hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50">
                                                Stop
                                            </button>
                                        )}
                                        {i.state === 'stopped' && (
                                            <button onClick={() => handleStart(i)} disabled={isBusy} className="px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/15 text-sm hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50">
                                                Start
                                            </button>
                                        )}
                                        {i.state !== 'deleting' && (
                                            <button onClick={() => handleDelete(i)} disabled={isBusy} className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <p className="mt-6 text-xs text-black/40 dark:text-white/40">
                Stopping an instance halts machine billing; the encrypted disks and their vault keys are
                retained. Deploy an app onto an instance from the CLI with{' '}
                <code className="font-mono">privasys apps deploy &lt;app&gt; --instance &lt;id&gt;</code>.
            </p>
        </div>
    );
}
