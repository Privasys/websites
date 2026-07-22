'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { listAccountApiKeys, createAccountApiKey, revokeAccountApiKey, type ApiKey, type CreatedApiKey } from '~/lib/api';

// Account-level personal access tokens. Platform-wide: one token authenticates
// the caller against any Privasys app's API, billed to the token owner. (This
// replaces the old per-app "API Keys" tab — the keys were always account-scoped.)
export function PersonalAccessTokens() {
    const { session } = useAuth();
    const token = session?.accessToken;

    const [keys, setKeys] = useState<ApiKey[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [label, setLabel] = useState('');
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState<CreatedApiKey | null>(null);
    const [copied, setCopied] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        setError(null);
        try { setKeys((await listAccountApiKeys(token)).api_keys ?? []); }
        catch (e) { setError((e as Error).message); }
    }, [token]);
    useEffect(() => { void load(); }, [load]);

    const create = async () => {
        if (!token) return;
        setCreating(true); setError(null); setCreated(null);
        try {
            const k = await createAccountApiKey(token, label.trim() || 'API key');
            setCreated(k); setLabel(''); void load();
        } catch (e) { setError((e as Error).message); }
        finally { setCreating(false); }
    };
    const revoke = async (sid: string) => {
        if (!token) return;
        setRevoking(sid); setError(null);
        try { await revokeAccountApiKey(token, sid); void load(); }
        catch (e) { setError((e as Error).message); }
        finally { setRevoking(null); }
    };
    const copy = (text: string) => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };

    return (
        <div className="space-y-4">
            <p className="text-sm text-black/50 dark:text-white/50 leading-relaxed">
                Long-lived bearer tokens for programmatic access. One token authenticates you against any
                Privasys app&rsquo;s API — send it as <code className="rounded bg-black/5 dark:bg-white/10 px-1">Authorization: Bearer &lt;token&gt;</code> to
                the app&rsquo;s endpoint (<code className="rounded bg-black/5 dark:bg-white/10 px-1">https://&lt;app&gt;.apps.privasys.org</code>).
                Usage is billed to you; revoke any time.
            </p>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <label className="block text-xs text-black/50 dark:text-white/50 mb-1">Label</label>
                    <input
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        placeholder="e.g. production backend"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                </div>
                <button
                    onClick={() => void create()}
                    disabled={creating}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40"
                >
                    {creating ? 'Creating…' : 'Create token'}
                </button>
            </div>

            {created && (
                <div className="rounded-lg border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-900/15 dark:border-emerald-500/25 p-3">
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Copy your token now — it won&rsquo;t be shown again.</p>
                    <div className="mt-2 flex items-center gap-2">
                        <code className="flex-1 rounded bg-black/5 dark:bg-white/10 px-2 py-1 font-mono text-xs break-all">{created.token}</code>
                        <button onClick={() => copy(created.token)} className="shrink-0 rounded-md border border-black/10 dark:border-white/15 px-2 py-1 text-[11px] text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white">
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}

            {keys === null ? (
                <p className="text-sm text-black/40 dark:text-white/40">Loading…</p>
            ) : keys.length === 0 ? (
                <p className="text-sm text-black/40 dark:text-white/40">No tokens yet.</p>
            ) : (
                <ul className="divide-y divide-black/5 dark:divide-white/5 rounded-lg border border-black/10 dark:border-white/10">
                    {keys.map(k => (
                        <li key={k.sid} className="flex items-center justify-between px-3 py-2 text-sm">
                            <div className="min-w-0">
                                <span className="font-medium">{k.label || 'API key'}</span>
                                <span className="ml-2 text-xs text-black/40 dark:text-white/40 font-mono">…{k.sid.slice(-8)}</span>
                            </div>
                            <button
                                onClick={() => void revoke(k.sid)}
                                disabled={revoking === k.sid}
                                className="shrink-0 text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-40"
                            >
                                {revoking === k.sid ? 'Revoking…' : 'Revoke'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
