'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { getUserInfo, updateProfile } from '~/lib/api';
import type { UserInfo } from '~/lib/api';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [displayEmail, setDisplayEmail] = useState('');

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        try {
            const data = await getUserInfo(session.accessToken);
            setProfile(data);
            setDisplayName(data.display_name || '');
            setDisplayEmail(data.display_email || '');
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
            const data = await updateProfile(session.accessToken, displayName.trim(), displayEmail.trim());
            setProfile(data);
            setDisplayName(data.display_name || '');
            setDisplayEmail(data.display_email || '');
            setSuccess('Profile updated.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update profile');
        }
        setSaving(false);
    }

    const oidcName = profile?.name || session?.user?.name || '';
    const oidcEmail = profile?.email || session?.user?.email || '';

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Manage your account and profile details.
            </p>

            {/* OIDC identity (read-only) */}
            <section className="mt-10">
                <h2 className="text-lg font-medium">Identity</h2>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                    These fields come from your identity provider and cannot be changed here.
                </p>
                <div className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-4">
                    <div>
                        <div className="text-xs font-medium text-black/50 dark:text-white/50">Provider</div>
                        <div className="text-sm mt-0.5">Zitadel (GitHub)</div>
                    </div>
                    {oidcName && (
                        <div>
                            <div className="text-xs font-medium text-black/50 dark:text-white/50">Name</div>
                            <div className="text-sm mt-0.5">{oidcName}</div>
                        </div>
                    )}
                    {oidcEmail && (
                        <div>
                            <div className="text-xs font-medium text-black/50 dark:text-white/50">Email</div>
                            <div className="text-sm mt-0.5">{oidcEmail}</div>
                        </div>
                    )}
                    {profile?.sub && (
                        <div>
                            <div className="text-xs font-medium text-black/50 dark:text-white/50">Subject ID</div>
                            <div className="text-sm mt-0.5 font-mono text-black/40 dark:text-white/40">{profile.sub}</div>
                        </div>
                    )}
                </div>
            </section>

            {/* Editable profile */}
            <section className="mt-10">
                <h2 className="text-lg font-medium">Profile</h2>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                    Override how your name and email appear on the platform.
                </p>

                {loading ? (
                    <div className="mt-4 text-sm text-black/40 dark:text-white/40">Loading…</div>
                ) : (
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Display name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                placeholder={oidcName || 'Your name'}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                            />
                            <p className="mt-1 text-xs text-black/40 dark:text-white/40">Leave empty to use your identity provider name.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Display email</label>
                            <input
                                type="email"
                                value={displayEmail}
                                onChange={e => setDisplayEmail(e.target.value)}
                                placeholder={oidcEmail || 'your@email.com'}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                            />
                            <p className="mt-1 text-xs text-black/40 dark:text-white/40">Leave empty to use your identity provider email.</p>
                        </div>

                        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
                        {success && <div className="text-sm text-emerald-600 dark:text-emerald-400">{success}</div>}

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                )}
            </section>

            {/* Sign out */}
            <section className="mt-10 pt-8 border-t border-black/5 dark:border-white/10">
                <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="px-5 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                    Sign out
                </button>
            </section>
        </div>
    );
}
