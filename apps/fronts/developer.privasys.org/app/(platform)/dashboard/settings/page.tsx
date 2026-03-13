'use client';

import { useSession, signOut } from 'next-auth/react';

export default function SettingsPage() {
    const { data: session } = useSession();

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Manage your account and identity provider configuration.
            </p>

            {/* Profile section */}
            <section className="mt-10">
                <h2 className="text-lg font-medium">Profile</h2>
                <div className="mt-4 p-5 rounded-xl border border-black/10 dark:border-white/10 space-y-3">
                    {session?.user?.name && (
                        <div>
                            <div className="text-xs font-medium text-black/50 dark:text-white/50">Name</div>
                            <div className="text-sm mt-0.5">{session.user.name}</div>
                        </div>
                    )}
                    {session?.user?.email && (
                        <div>
                            <div className="text-xs font-medium text-black/50 dark:text-white/50">Email</div>
                            <div className="text-sm mt-0.5">{session.user.email}</div>
                        </div>
                    )}
                    <div>
                        <div className="text-xs font-medium text-black/50 dark:text-white/50">Provider</div>
                        <div className="text-sm mt-0.5">Zitadel (GitHub)</div>
                    </div>
                </div>
            </section>

            {/* Identity provider section — read-only for now */}
            <section className="mt-10">
                <h2 className="text-lg font-medium">Identity provider</h2>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                    Authentication is handled via OIDC through <code className="text-xs bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">auth.privasys.org</code> (Zitadel).
                    GitHub is configured as the external identity provider.
                </p>
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
