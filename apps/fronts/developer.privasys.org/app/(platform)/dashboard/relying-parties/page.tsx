'use client';

// Relying parties — self-serve OIDC client onboarding (api-fees plan §8).
// An account registers its own clients here: name, redirect URIs, the
// attribute whitelist it may request, and whether it is billable (sponsored
// x-privasys.price calls and attribute disclosures charge THIS account).
// The client secret is shown exactly once, at creation.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { listOAuthClients, createOAuthClient, updateOAuthClientBilling, type OAuthClient, type CreatedOAuthClient } from '~/lib/api';

export default function RelyingPartiesPage() {
    const { session } = useAuth();
    const token = session?.accessToken;
    const [clients, setClients] = useState<OAuthClient[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [redirects, setRedirects] = useState('');
    const [attributes, setAttributes] = useState('');
    const [billable, setBillable] = useState(true);

    // Canonical attribute referential (the IdP's golden list — registration
    // refuses anything outside it), rendered as checkboxes. Falls back to a
    // free-text input if the referential cannot be fetched.
    const [catalog, setCatalog] = useState<{ key: string; label: string; verifiable?: boolean }[] | null>(null);
    const [selectedAttrs, setSelectedAttrs] = useState<Set<string>>(new Set());
    useEffect(() => {
        fetch('https://privasys.id/referential/canonical-attributes.json')
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { attributes?: { key: string; label: string; verifiable?: boolean }[] } | null) => {
                if (d?.attributes?.length) setCatalog(d.attributes.map((a) => ({ key: a.key, label: a.label, verifiable: a.verifiable })));
            })
            .catch(() => { /* fallback input stays */ });
    }, []);
    const [rpId, setRpId] = useState('');
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState<CreatedOAuthClient | null>(null);
    const [secretCopied, setSecretCopied] = useState(false);

    const load = useCallback(() => {
        if (!token) return;
        listOAuthClients(token)
            .then(setClients)
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load clients'));
    }, [token]);

    useEffect(() => { load(); }, [load]);

    async function create() {
        if (!token || creating) return;
        setError(null);
        const redirectUris = redirects.split(/\s+/).map((s) => s.trim()).filter(Boolean);
        const requiredAttributes = catalog
            ? Array.from(selectedAttrs)
            : attributes.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
        if (!name.trim() || redirectUris.length === 0) {
            setError('Name and at least one redirect URI are required.');
            return;
        }
        setCreating(true);
        try {
            const c = await createOAuthClient(token, {
                client_name: name.trim(),
                redirect_uris: redirectUris,
                required_attributes: requiredAttributes,
                billable_rp: billable,
                rp_id: rpId.trim() || undefined
            });
            setCreated(c);
            setShowForm(false);
            setName(''); setRedirects(''); setAttributes(''); setRpId(''); setBillable(true); setSelectedAttrs(new Set());
            load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Registration failed');
        } finally {
            setCreating(false);
        }
    }

    async function toggleBilling(c: OAuthClient) {
        if (!token) return;
        try {
            await updateOAuthClientBilling(token, c.client_id, { billable_rp: !c.billable, rp_id: c.rp_id || undefined });
            load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Billing update failed');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Relying parties</h1>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                        OIDC clients your account operates. A billable relying party&apos;s sponsored calls and
                        attribute disclosures charge this account&apos;s credit balance.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
                >
                    {showForm ? 'Cancel' : 'Register client'}
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

            {/* One-time secret reveal */}
            {created && (
                <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-400/10 p-5 space-y-3">
                    <div className="text-sm font-semibold">Client registered — copy the secret now. It is shown once and cannot be retrieved again.</div>
                    <div className="space-y-1.5 font-mono text-xs">
                        <div><span className="text-black/45 dark:text-white/45">client_id&nbsp;&nbsp;&nbsp;&nbsp;</span>{created.client_id}</div>
                        <div><span className="text-black/45 dark:text-white/45">client_secret&nbsp;</span>{created.client_secret}</div>
                        <div><span className="text-black/45 dark:text-white/45">rp_id&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>{created.rp_id}</div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { navigator.clipboard.writeText(created.client_secret).catch(() => {}); setSecretCopied(true); setTimeout(() => setSecretCopied(false), 1500); }}
                            className="rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                        >
                            {secretCopied ? 'Copied ✓' : 'Copy secret'}
                        </button>
                        <button onClick={() => setCreated(null)} className="rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5">
                            Done
                        </button>
                    </div>
                </section>
            )}

            {/* Create form */}
            {showForm && (
                <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Age Check Service"
                            className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Redirect URIs (one per line)</label>
                        <textarea value={redirects} onChange={(e) => setRedirects(e.target.value)} rows={2} placeholder="https://example.com/callback"
                            className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-black/30 dark:focus:border-white/30" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Attribute whitelist (the attributes this client may request)</label>
                        {catalog ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 rounded-lg border border-black/10 dark:border-white/15 p-3">
                                {catalog.map((a) => (
                                    <label key={a.key} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedAttrs.has(a.key)}
                                            onChange={(e) => {
                                                setSelectedAttrs((prev) => {
                                                    const next = new Set(prev);
                                                    if (e.target.checked) next.add(a.key); else next.delete(a.key);
                                                    return next;
                                                });
                                            }}
                                            className="rounded"
                                        />
                                        <span>{a.label}</span>
                                        <code className="text-[10px] text-black/35 dark:text-white/35">{a.key}</code>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <input value={attributes} onChange={(e) => setAttributes(e.target.value)} placeholder="age_over_18, given_name"
                                className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-black/30 dark:focus:border-white/30" />
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} className="rounded" />
                            Billable relying party
                            <span className="text-xs text-black/40 dark:text-white/40">(disclosures and sponsored calls charge this account)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-black/60 dark:text-white/60">rp_id</label>
                            <input value={rpId} onChange={(e) => setRpId(e.target.value)} placeholder="defaults to client_id"
                                className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-xs font-mono focus:outline-none" />
                        </div>
                    </div>
                    <button onClick={create} disabled={creating}
                        className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40">
                        {creating ? 'Registering…' : 'Register'}
                    </button>
                </section>
            )}

            {/* List */}
            <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                {clients === null ? (
                    <div className="p-8 text-center text-sm text-black/40 dark:text-white/40">Loading…</div>
                ) : clients.length === 0 ? (
                    <div className="p-8 text-center text-sm text-black/40 dark:text-white/40">
                        No relying parties yet. Register a client to integrate Privasys ID sign-in and attribute verification into your service.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-black/10 dark:border-white/10 text-left text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40">
                                <th className="px-4 py-2.5 font-medium">Name</th>
                                <th className="px-4 py-2.5 font-medium">client_id</th>
                                <th className="px-4 py-2.5 font-medium">rp_id</th>
                                <th className="px-4 py-2.5 font-medium">Attributes</th>
                                <th className="px-4 py-2.5 font-medium">Billing</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((c) => (
                                <tr key={c.client_id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                                    <td className="px-4 py-3 font-medium">{c.client_name}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{c.client_id}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{c.rp_id}</td>
                                    <td className="px-4 py-3 text-xs">{c.required_attributes.join(', ') || '—'}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => toggleBilling(c)}
                                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                                                c.billable
                                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                    : 'border-black/10 dark:border-white/15 text-black/50 dark:text-white/50'
                                            }`}
                                            title={c.billable ? 'Billable: sponsored calls and disclosures charge this account. Click to disable.' : 'Not billable. Click to enable (charges this account).'}
                                        >
                                            {c.billable ? 'Billable' : 'Not billable'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}
