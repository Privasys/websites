'use client';

export default function SettingsPage() {
    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Manage your organisation and identity provider configuration.
            </p>

            <section className="mt-10">
                <h2 className="text-lg font-medium">Organisation</h2>
                <div className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="org-name" className="block text-sm font-medium mb-1">Name</label>
                        <input
                            id="org-name"
                            type="text"
                            placeholder="Your organisation"
                            className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                        />
                    </div>
                </div>
            </section>

            <section className="mt-10">
                <h2 className="text-lg font-medium">Identity provider</h2>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                    Authentication is handled via OIDC. Configure your identity provider below.
                </p>
                <div className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="oidc-issuer" className="block text-sm font-medium mb-1">Issuer URL</label>
                        <input
                            id="oidc-issuer"
                            type="url"
                            placeholder="https://auth.example.com"
                            className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                        />
                    </div>
                    <div>
                        <label htmlFor="oidc-client" className="block text-sm font-medium mb-1">Client ID</label>
                        <input
                            id="oidc-client"
                            type="text"
                            placeholder="your-client-id"
                            className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                        />
                    </div>
                </div>
            </section>

            <div className="mt-8">
                <button
                    type="button"
                    className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                >
                    Save changes
                </button>
            </div>
        </div>
    );
}
