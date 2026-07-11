'use client';

import { useState } from 'react';
import { Navbar, Footer } from '@privasys/ui';
import { useDrive } from '~/lib/use-drive';
import { avatarColor, initials } from '~/lib/format';
import { FileBrowser } from './file-browser';
import { SharedView } from './shared-view';
import { HomeIcon, PeopleIcon, ShieldCheck } from './icons';

type View = 'my-drive' | 'shared';

const FOOTER_LINKS = [
    { label: 'Developer portal', href: 'https://developer.privasys.org', external: true },
    { label: 'Docs', href: 'https://docs.privasys.org', external: true },
    { label: 'Website', href: 'https://privasys.org', external: true },
    { label: 'Privacy', href: 'https://privasys.org/legal/privacy/', external: true },
    { label: 'Terms', href: 'https://privasys.org/legal/terms/', external: true }
];

export function DriveApp() {
    const { me, name, tenant, session, signOut } = useDrive();
    const [view, setView] = useState<View>('my-drive');

    if (!session || !tenant) return null;

    return (
        <div className="flex min-h-screen flex-col" style={{ background: 'var(--drv-surface)' }}>
            <Navbar
                brandSuffix="Drive"
                fullWidth
                trailing={
                    <div className="flex items-center gap-3">
                        <span
                            className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex"
                            style={{ background: 'var(--drv-accent-weak)', color: 'var(--drv-accent)' }}
                            title="Files are sealed end-to-end to an attested enclave"
                        >
                            <ShieldCheck /> Sealed and attested
                        </span>
                        <UserMenu name={name} email={me?.email} onSignOut={signOut} />
                    </div>
                }
            />

            <div className="flex flex-1 pt-14">
                {/* Sidebar */}
                <nav
                    className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col gap-1 border-r p-3 sm:flex"
                    style={{ borderColor: 'var(--drv-border)' }}
                >
                    <SidebarItem
                        active={view === 'my-drive'}
                        onClick={() => setView('my-drive')}
                        icon={<HomeIcon width={18} height={18} />}
                        label="My Drive"
                    />
                    <SidebarItem
                        active={view === 'shared'}
                        onClick={() => setView('shared')}
                        icon={<PeopleIcon width={18} height={18} />}
                        label="Shared with me"
                    />
                </nav>

                {/* Main */}
                <main className="min-w-0 flex-1" style={{ background: 'var(--drv-surface-2)' }}>
                    {view === 'my-drive' ? (
                        <FileBrowser session={session} tenant={tenant} me={me} />
                    ) : (
                        <SharedView session={session} />
                    )}
                </main>
            </div>

            <Footer
                companyLine="Every file is sealed inside a hardware-protected enclave. Attestation is verified independently, no trust required."
                links={FOOTER_LINKS}
            />
        </div>
    );
}

function UserMenu({
    name,
    email,
    onSignOut
}: {
    name: string;
    email?: string;
    onSignOut: () => void;
}) {
    const [open, setOpen] = useState(false);
    const label = name || email || 'You';
    return (
        <div className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: avatarColor(label) }}
                title={label}
            >
                {initials(label)}
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div
                        className="absolute right-0 z-20 mt-2 w-64 rounded-xl border p-2 shadow-lg"
                        style={{ background: 'var(--drv-surface)', borderColor: 'var(--drv-border)' }}
                    >
                        <div className="px-3 py-2">
                            <div className="truncate text-sm font-medium">{name || 'Your account'}</div>
                            {email && (
                                <div className="mt-0.5 truncate text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                    {email}
                                </div>
                            )}
                            <div className="mt-0.5 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                Your personal drive
                            </div>
                        </div>
                        <button
                            onClick={onSignOut}
                            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--drv-hover)]"
                        >
                            Sign out
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function SidebarItem({
    active,
    onClick,
    icon,
    label
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
                background: active ? 'var(--drv-accent-weak)' : 'transparent',
                color: active ? 'var(--drv-accent)' : 'var(--drv-text)'
            }}
        >
            {icon}
            {label}
        </button>
    );
}
