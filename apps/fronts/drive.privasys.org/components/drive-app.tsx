'use client';

import { useState } from 'react';
import { useDrive } from '~/lib/use-drive';
import { avatarColor, initials } from '~/lib/format';
import { FileBrowser } from './file-browser';
import { SharedView } from './shared-view';
import { HomeIcon, PeopleIcon, ShieldCheck } from './icons';

type View = 'my-drive' | 'shared';

export function DriveApp() {
    const { me, tenant, session, signOut } = useDrive();
    const [view, setView] = useState<View>('my-drive');
    const [menuOpen, setMenuOpen] = useState(false);

    if (!session || !tenant) return null;
    const email = me?.email || me?.sub || '';

    return (
        <div className="flex h-screen flex-col" style={{ background: 'var(--drv-surface)' }}>
            {/* Top bar */}
            <header
                className="flex h-14 shrink-0 items-center justify-between border-b px-4"
                style={{ borderColor: 'var(--drv-border)' }}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                        style={{ background: 'linear-gradient(135deg, var(--drv-accent), #0b57d0)' }}
                    >
                        <HomeIcon width={18} height={18} />
                    </div>
                    <span className="text-lg font-medium tracking-tight">Privasys Drive</span>
                </div>
                <div className="flex items-center gap-3">
                    <span
                        className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs sm:flex"
                        style={{ background: 'var(--drv-accent-weak)', color: 'var(--drv-accent)' }}
                        title="Files are sealed end-to-end to an attested enclave"
                    >
                        <ShieldCheck /> Sealed &amp; attested
                    </span>
                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen((v) => !v)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                            style={{ background: avatarColor(email) }}
                            title={email}
                        >
                            {initials(email)}
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                <div
                                    className="absolute right-0 z-20 mt-2 w-64 rounded-xl border p-2 shadow-lg"
                                    style={{ background: 'var(--drv-surface)', borderColor: 'var(--drv-border)' }}
                                >
                                    <div className="px-3 py-2">
                                        <div className="truncate text-sm font-medium">{email}</div>
                                        <div className="mt-0.5 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                            Your personal drive
                                        </div>
                                    </div>
                                    <button
                                        onClick={signOut}
                                        className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--drv-hover)]"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex min-h-0 flex-1">
                {/* Sidebar */}
                <nav
                    className="hidden w-56 shrink-0 flex-col gap-1 border-r p-3 sm:flex"
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
