'use client';

import { useAuth } from '~/lib/privasys-auth';
import { useCallback, useEffect, useState } from 'react';
import {
    getAttributeCatalog,
    getMyProvider,
    registerAttributeProvider,
    upsertAttribute,
    isApiStatus
} from '~/lib/api';
import type { Attribute, AttributeProvider, AttributeProviderStatus } from '~/lib/api';
import { RelyingPartiesSection } from '~/components/relying-parties-section';

const CREDITS_PER_GBP = 1_000_000;

function gbp(credits: number): string {
    return `£${(credits / CREDITS_PER_GBP).toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    })}`;
}

const STATUS_STYLE: Record<AttributeProviderStatus, string> = {
    approved: 'bg-green-500/10 text-green-700 dark:text-green-400',
    pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    suspended: 'bg-red-500/10 text-red-700 dark:text-red-400'
};

function StatusBadge({ status }: { status: AttributeProviderStatus }) {
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[status]}`}>
            {status}
        </span>
    );
}

export default function AttributesPage() {
    const { session } = useAuth();
    const token = session?.accessToken ?? null;
    const [catalog, setCatalog] = useState<Attribute[]>([]);
    const [provider, setProvider] = useState<AttributeProvider | null>(null);
    const [myAttributes, setMyAttributes] = useState<Attribute[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const cat = await getAttributeCatalog(token);
            setCatalog(cat.attributes ?? []);
            try {
                const mine = await getMyProvider(token);
                setProvider(mine.provider);
                setMyAttributes(mine.attributes ?? []);
            } catch (e) {
                if (isApiStatus(e, 404)) {
                    setProvider(null);
                    setMyAttributes([]);
                } else {
                    throw e;
                }
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load the attribute marketplace.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading) {
        return <div className="p-8 text-black/50 dark:text-white/50">Loading the attribute marketplace…</div>;
    }

    // Group the public catalog by provider namespace.
    const byNamespace = catalog.reduce<Record<string, Attribute[]>>((acc, a) => {
        (acc[a.namespace] ??= []).push(a);
        return acc;
    }, {});

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-10">
            <header>
                <h1 className="text-2xl font-semibold">Attributes</h1>
                <p className="mt-1 text-black/60 dark:text-white/60">
                    Attested, priced insights any confidential app can provide and any relying
                    party can consume. Consumers pay per disclosure; providers earn a revenue
                    share. Identity is never revealed to the platform.
                </p>
            </header>

            {/* Consume side first: register the OIDC clients (relying parties)
                this account operates and whitelist the attributes they may
                request. The provider/catalogue sections follow. */}
            <RelyingPartiesSection />

            {error && (
                <div className="rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            <ProviderPanel
                token={token}
                provider={provider}
                attributes={myAttributes}
                onChanged={load}
            />

            <section>
                <h2 className="text-lg font-medium mb-3">Marketplace catalog</h2>
                {catalog.length === 0 ? (
                    <p className="text-black/50 dark:text-white/50 text-sm">No attributes are published yet.</p>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(byNamespace).map(([ns, attrs]) => (
                            <div key={ns} className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                                <div className="px-4 py-2 bg-black/3 dark:bg-white/5 font-mono text-sm">{ns}</div>
                                <table className="w-full text-sm">
                                    <thead className="text-left text-black/50 dark:text-white/50">
                                        <tr>
                                            <th className="px-4 py-2 font-normal">Attribute</th>
                                            <th className="px-4 py-2 font-normal">Assurance</th>
                                            <th className="px-4 py-2 font-normal text-right">Price / disclosure</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attrs.map((a) => (
                                            <tr key={a.id} className="border-t border-black/5 dark:border-white/5">
                                                <td className="px-4 py-2">
                                                    <span className="font-mono">{a.key}</span>
                                                    {a.description && (
                                                        <p className="text-black/50 dark:text-white/50 text-xs mt-0.5">{a.description}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">{a.assurance}</td>
                                                <td className="px-4 py-2 text-right tabular-nums">
                                                    {gbp(a.price_credits)}
                                                    <span className="text-black/40 dark:text-white/40"> · {a.price_credits.toLocaleString('en-GB')} cr</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function ProviderPanel({
    token,
    provider,
    attributes,
    onChanged
}: {
    token: string | null;
    provider: AttributeProvider | null;
    attributes: Attribute[];
    onChanged: () => void | Promise<void>;
}) {
    if (!provider) {
        return <RegisterProvider token={token} onChanged={onChanged} />;
    }
    return (
        <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium flex items-center gap-2">
                        {provider.display_name || provider.namespace}
                        <StatusBadge status={provider.status} />
                    </h2>
                    <p className="text-sm text-black/50 dark:text-white/50 font-mono">{provider.namespace}</p>
                </div>
            </div>
            {provider.status === 'pending' && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                    Your provider registration is awaiting review. Attributes you define are held
                    until it is approved; consumers cannot see them yet.
                </p>
            )}
            {provider.status === 'suspended' && (
                <p className="text-sm text-red-700 dark:text-red-400">
                    This provider is suspended. Its attributes are not consumable until reinstated.
                </p>
            )}

            {attributes.length > 0 && (
                <div className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="text-left text-black/50 dark:text-white/50">
                            <tr>
                                <th className="px-4 py-2 font-normal">Attribute</th>
                                <th className="px-4 py-2 font-normal">Price source</th>
                                <th className="px-4 py-2 font-normal text-right">Price</th>
                                <th className="px-4 py-2 font-normal">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attributes.map((a) => (
                                <tr key={a.id} className="border-t border-black/5 dark:border-white/5">
                                    <td className="px-4 py-2 font-mono">{a.key}</td>
                                    <td className="px-4 py-2">{a.price_source}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{a.price_credits.toLocaleString('en-GB')} cr</td>
                                    <td className="px-4 py-2">{a.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <AddAttribute token={token} namespace={provider.namespace} onChanged={onChanged} />
        </section>
    );
}

function RegisterProvider({ token, onChanged }: { token: string | null; onChanged: () => void | Promise<void> }) {
    const [namespace, setNamespace] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async () => {
        if (!token) return;
        setBusy(true);
        setErr(null);
        try {
            await registerAttributeProvider(token, { namespace: namespace.trim().toLowerCase(), display_name: displayName.trim() });
            await onChanged();
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Registration failed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 space-y-3">
            <h2 className="text-lg font-medium">Become a provider</h2>
            <p className="text-sm text-black/60 dark:text-white/60">
                Claim a namespace to publish your own attested attributes. Attribute keys are
                <span className="font-mono"> namespace:name</span>. Registration is reviewed before
                your attributes become consumable.
            </p>
            {err && <div className="text-sm text-red-700 dark:text-red-400">{err}</div>}
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    value={namespace}
                    onChange={(e) => setNamespace(e.target.value)}
                    placeholder="namespace (e.g. acme-dna)"
                    className="flex-1 px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm font-mono"
                />
                <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    className="flex-1 px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm"
                />
                <button
                    onClick={submit}
                    disabled={busy || !namespace.trim()}
                    className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50"
                >
                    {busy ? 'Registering…' : 'Register'}
                </button>
            </div>
        </section>
    );
}

function AddAttribute({ token, namespace, onChanged }: { token: string | null; namespace: string; onChanged: () => void | Promise<void> }) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [assurance, setAssurance] = useState('self_asserted');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async () => {
        if (!token) return;
        setBusy(true);
        setErr(null);
        try {
            await upsertAttribute(token, namespace, {
                name: name.trim().toLowerCase(),
                price_credits: Math.max(0, Math.round(Number(price) || 0)),
                assurance: assurance.trim() || 'self_asserted',
                description: description.trim()
            });
            setName('');
            setPrice('');
            setDescription('');
            await onChanged();
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Failed to save the attribute.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="pt-3 border-t border-black/10 dark:border-white/10 space-y-3">
            <h3 className="text-sm font-medium">Add or update an attribute</h3>
            {err && <div className="text-sm text-red-700 dark:text-red-400">{err}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name (e.g. brca1_status)"
                    className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm font-mono" />
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="price (credits)" inputMode="numeric"
                    className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm tabular-nums" />
                <input value={assurance} onChange={(e) => setAssurance(e.target.value)} placeholder="assurance (e.g. gov_verified)"
                    className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm" />
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"
                    className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm" />
            </div>
            <button onClick={submit} disabled={busy || !name.trim()}
                className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50">
                {busy ? 'Saving…' : 'Save attribute'}
            </button>
        </div>
    );
}
