'use client';

import { useAuth } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback } from 'react';
import { getUserInfo, updateProfile } from '~/lib/api';
import type { UserInfo } from '~/lib/api';

export default function SettingsPage() {
    const { session, signOut } = useAuth();
    const [profile, setProfile] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyDomain, setCompanyDomain] = useState('');
    const [isIndividual, setIsIndividual] = useState(false);

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        try {
            const data = await getUserInfo(session.accessToken);
            setProfile(data);
            setCompanyName(data.company_name || '');
            setCompanyDomain(data.company_domain || '');
            setIsIndividual(data.is_individual ?? false);
        } catch { /* ignore */ }
        setLoading(false);
    }, [session?.accessToken]);

    useEffect(() => { load(); }, [load]);

    async function handleSave() {
        if (!session?.accessToken) return;
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const data = await updateProfile(session.accessToken, {
                company_name: companyName.trim(),
                company_domain: companyDomain.trim(),
                is_individual: isIndividual
            });
            setProfile(data);
            setCompanyName(data.company_name || '');
            setCompanyDomain(data.company_domain || '');
            setIsIndividual(data.is_individual ?? false);
            setSuccess('Settings updated.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update settings');
        }
        setSaving(false);
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Manage your account and organisation details.
            </p>

            {/* Identity (read-only, sourced from IdP via management-service) */}
            <section className="mt-10">
                <h2 className="text-lg font-medium">Identity</h2>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                    Your identity is managed by your authentication provider and cannot be changed here.
                </p>
                {loading ? (
                    <div className="mt-4 text-sm text-black/40 dark:text-white/40">Loading…</div>
                ) : (
                    <div className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-4">
                        {profile?.name && (
                            <div>
                                <div className="text-xs font-medium text-black/50 dark:text-white/50">Name</div>
                                <div className="text-sm mt-0.5">{profile.name}</div>
                            </div>
                        )}
                        {profile?.email && (
                            <div>
                                <div className="text-xs font-medium text-black/50 dark:text-white/50">Email</div>
                                <div className="text-sm mt-0.5">{profile.email}</div>
                            </div>
                        )}
                        {!profile?.name && !profile?.email && (
                            <div className="text-sm text-black/40 dark:text-white/40">
                                No profile information available. Sign in again to share your name and email.
                            </div>
                        )}
                        {profile?.sub && (
                            <div>
                                <div className="text-xs font-medium text-black/50 dark:text-white/50">Subject ID</div>
                                <div className="text-sm mt-0.5 font-mono text-black/40 dark:text-white/40">{profile.sub}</div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Organisation */}
            <section className="mt-10">
                <h2 className="text-lg font-medium">Organisation</h2>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                    Tell us about yourself or your company. This information is shown on the App Store.
                </p>

                {loading ? (
                    <div className="mt-4 text-sm text-black/40 dark:text-white/40">Loading…</div>
                ) : (
                    <div className="mt-4 space-y-4">
                        {/* Individual toggle */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isIndividual}
                                onClick={() => setIsIndividual(!isIndividual)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 ${isIndividual ? 'bg-black dark:bg-white' : 'bg-black/20 dark:bg-white/20'}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow ring-0 transition-transform ${isIndividual ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                            <label className="text-sm font-medium">I am an individual developer</label>
                        </div>
                        <p className="text-xs text-black/40 dark:text-white/40 -mt-2">
                            {isIndividual
                                ? 'Your personal name will be shown as the publisher.'
                                : 'Enter your company details below.'}
                        </p>

                        {!isIndividual && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Company name</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={e => setCompanyName(e.target.value)}
                                        placeholder="Acme Corp"
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Company domain</label>
                                    <input
                                        type="text"
                                        value={companyDomain}
                                        onChange={e => setCompanyDomain(e.target.value)}
                                        placeholder="acme.com"
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                    />
                                    <p className="mt-1 text-xs text-black/40 dark:text-white/40">Used to verify your organisation.</p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </section>

            {/* Save */}
            {!loading && (
                <section className="mt-8">
                    {error && <div className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
                    {success && <div className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">{success}</div>}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </section>
            )}

            {/* Sign out */}
            <section className="mt-10 pt-8 border-t border-black/5 dark:border-white/10">
                <button
                    type="button"
                    onClick={async () => { await signOut(); window.location.href = '/'; }}
                    className="px-5 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                    Sign out
                </button>
            </section>
        </div>
    );
}
