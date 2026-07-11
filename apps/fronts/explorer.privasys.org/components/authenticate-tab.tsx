// Authenticate tab — signs the user into the app-specific RP via the hosted
// Privasys auth SDK (passkey or Privasys wallet), embedding the SDK's auth
// iframe. The resulting session token is lifted into the shared FIDO2 state so
// the header badge and the API Testing tab can use it. Ported from the legacy
// explorer.js renderAuth().

'use client';

import { useEffect, useRef, useState } from 'react';
import type { ConnectionConfig } from '~/lib/config';
import type { Fido2Actions, Fido2State } from '~/components/use-fido2-auth';

export function AuthenticateTab({ connection, fido2, actions }: { connection: ConnectionConfig; fido2: Fido2State; actions: Fido2Actions }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const rpId = `${connection.appName}.${connection.gatewayDomain}`;

    // On first entry (no session checked yet), restore the privasys.id session
    // or fall straight into sign-in, driven into the embedded iframe container.
    useEffect(() => {
        if (fido2.status === 'idle' && !fido2.sessionChecked && containerRef.current) {
            actions.restoreInto(containerRef.current);
        }
    }, [fido2.status, fido2.sessionChecked, actions]);

    if (fido2.status === 'complete' && fido2.token) {
        const masked = '●'.repeat(8) + fido2.token.slice(-6);
        const method = fido2.sessionId ? 'Privasys Wallet' : 'Passkey';
        const methodDetail = fido2.sessionId ? 'Attestation verified' : 'This device';
        return (
            <div className='space-y-4'>
                <section className='rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-400/10 p-5'>
                    <div className='flex items-center gap-2'>
                        <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-emerald-600 dark:text-emerald-400'>
                            <circle cx='12' cy='12' r='10' />
                            <path d='M8 12l3 3 5-6' />
                        </svg>
                        <strong>Authenticated</strong>
                        <span className='rounded-full border border-black/10 dark:border-white/15 px-2 py-0.5 text-[11px]'>{method}</span>
                        <span className='text-xs text-black/45 dark:text-white/45'>{methodDetail}</span>
                    </div>
                    <div className='mt-4 space-y-2'>
                        <div className='flex items-center gap-3'>
                            <span className='w-14 shrink-0 text-xs text-black/45 dark:text-white/45'>Session</span>
                            <span className='font-mono text-xs'>{masked}</span>
                            <button
                                type='button'
                                onClick={() => { navigator.clipboard.writeText(fido2.token).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                                className='rounded-md border border-black/10 dark:border-white/15 px-2 py-0.5 text-[11px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                            >
                                {copied ? 'Copied ✓' : 'Copy'}
                            </button>
                        </div>
                        <div className='flex items-center gap-3'>
                            <span className='w-14 shrink-0 text-xs text-black/45 dark:text-white/45'>App</span>
                            <span className='font-mono text-xs break-all'>{rpId}</span>
                        </div>
                    </div>
                    <p className='mt-3 text-xs text-black/45 dark:text-white/45'>Your session token is sent automatically as <code>X-App-Auth</code> on API calls.</p>
                    <div className='mt-4 flex gap-2'>
                        <button type='button' onClick={actions.signOut} className='rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5'>Sign out</button>
                        <button type='button' onClick={actions.reauthenticate} className='rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5'>Re-authenticate</button>
                    </div>
                </section>

                {fido2.attestation && Object.keys(fido2.attestation).length > 0 && (
                    <section className='rounded-xl border border-black/10 dark:border-white/10 p-5'>
                        <h3 className='text-sm font-semibold'>Wallet attestation</h3>
                        <div className='mt-3 space-y-1.5'>
                            {Object.entries(fido2.attestation).map(([key, value]) => (
                                <div key={key} className='flex items-baseline gap-3 text-xs'>
                                    <span className='w-40 shrink-0 text-black/45 dark:text-white/45'>{key}</span>
                                    <span className='font-mono break-all'>{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        );
    }

    if (fido2.status === 'error' && fido2.error) {
        return (
            <div className='rounded-xl border border-red-500/30 bg-red-500/5 dark:bg-red-400/10 p-4 flex items-center gap-3'>
                <span className='text-sm text-red-700 dark:text-red-300'>{fido2.error}</span>
                <button type='button' onClick={actions.retry} className='rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5'>Retry</button>
            </div>
        );
    }

    return (
        <section className='rounded-xl border border-black/10 dark:border-white/10 p-5'>
            <div ref={containerRef} className='min-h-[320px]' />
            {fido2.sessionChecked && (
                <div className='mt-4 text-center'>
                    <p className='mb-3 text-sm text-black/50 dark:text-white/50'>You are not signed in.</p>
                    <button
                        type='button'
                        onClick={() => { if (containerRef.current) actions.signInInto(containerRef.current); }}
                        className='rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-semibold hover:opacity-90'
                    >
                        Sign in
                    </button>
                </div>
            )}
        </section>
    );
}
