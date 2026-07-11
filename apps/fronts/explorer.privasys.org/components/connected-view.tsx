// Connected view: the connection header (app + base URL, gateway badge, auth
// status, sign-out, disconnect) and the Attestation / Authenticate / API
// Testing tabs. Replaces the legacy explorer.js connected-view header + tabs.
//
// Tabs are kept mounted once visited so their state (attestation result, API
// history, auth session) survives tab switches, while still initialising
// lazily (the API tab only fetches its schema when first opened).

'use client';

import { useState } from 'react';
import type { ConnectionConfig } from '~/lib/config';
import type { Fido2Actions, Fido2State } from '~/components/use-fido2-auth';
import { AttestationTab } from '~/components/attestation-tab';
import { AuthenticateTab } from '~/components/authenticate-tab';
import { ApiTestingTab } from '~/components/api-testing-tab';

type TabKey = 'attestation' | 'auth' | 'api';

const TAB_LABELS: Record<TabKey, string> = {
    attestation: 'Attestation',
    auth: 'Authenticate',
    api: 'API Testing'
};

export function ConnectedView({ connection, fido2, fido2Actions, onDisconnect }: {
    connection: ConnectionConfig;
    fido2: Fido2State;
    fido2Actions: Fido2Actions;
    onDisconnect: () => void;
}) {
    const [tab, setTab] = useState<TabKey>('attestation');
    const [visited, setVisited] = useState<Set<TabKey>>(() => new Set<TabKey>(['attestation']));

    const select = (t: TabKey) => {
        setTab(t);
        setVisited((v) => new Set(v).add(t));
    };

    const authed = fido2.status === 'complete' && !!fido2.token;

    return (
        <div>
            {/* Connection header */}
            <div className='flex flex-wrap items-center gap-3 rounded-xl border border-black/8 dark:border-white/10 px-4 py-3'>
                <div className='flex min-w-0 flex-wrap items-center gap-2'>
                    <span className='font-semibold truncate'>{connection.appName}</span>
                    <span className='text-xs text-black/45 dark:text-white/45 truncate'>{connection.baseUrl}</span>
                    <span
                        title='Direct RA-TLS gateway endpoint for this app'
                        className='rounded-full border border-black/10 dark:border-white/15 px-2 py-0.5 text-[11px] font-mono text-black/55 dark:text-white/55'
                    >
                        {connection.gatewayUrl}:443
                    </span>
                </div>
                <div className='ml-auto flex items-center gap-2'>
                    {authed && (
                        <span className='inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400'>
                            ✓ Authenticated
                        </span>
                    )}
                    {authed && (
                        <button type='button' onClick={fido2Actions.signOut} className='rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5'>
                            Sign out
                        </button>
                    )}
                    <button type='button' onClick={onDisconnect} className='rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5'>
                        Disconnect
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className='mt-6 border-b border-black/10 dark:border-white/10'>
                <nav className='flex gap-6'>
                    {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
                        <button
                            key={key}
                            type='button'
                            onClick={() => select(key)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                                tab === key
                                    ? 'border-black dark:border-white text-black dark:text-white'
                                    : 'border-transparent text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                            }`}
                        >
                            {TAB_LABELS[key]}
                            {key === 'auth' && authed && <span className='ml-1.5 text-emerald-600 dark:text-emerald-400'>✓</span>}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab content — kept mounted once visited. */}
            <div className='mt-6'>
                <div hidden={tab !== 'attestation'}>
                    {visited.has('attestation') && <AttestationTab connection={connection} />}
                </div>
                <div hidden={tab !== 'auth'}>
                    {visited.has('auth') && <AuthenticateTab connection={connection} fido2={fido2} actions={fido2Actions} />}
                </div>
                <div hidden={tab !== 'api'}>
                    {visited.has('api') && <ApiTestingTab connection={connection} fido2={fido2} fido2Actions={fido2Actions} />}
                </div>
            </div>
        </div>
    );
}
