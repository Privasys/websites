// Authenticate tab: signs the person in to the explorer (passkey or Privasys
// wallet), with the SDK's gate embedded in the tab. The session is lifted into
// the shared state so the header badge and the API Testing tab can use it.

'use client';

import { useRef, useState } from 'react';
import type { ConnectionConfig } from '~/lib/config';
import type { Fido2Actions, Fido2State } from '~/components/use-fido2-auth';

export function AuthenticateTab({ connection, fido2, actions }: { connection: ConnectionConfig; fido2: Fido2State; actions: Fido2Actions }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const appHost = `${connection.appName}.${connection.gatewayDomain}`;

    if (fido2.status === 'complete' && fido2.token) {
        const masked = '●'.repeat(8) + fido2.token.slice(-6);
        const method = fido2.method === 'wallet' ? 'Privasys Wallet' : fido2.method === 'social' ? 'External account' : 'Passkey';
        const methodDetail = fido2.method === 'wallet' ? 'Attestation verified' : fido2.method === 'social' ? 'Identity provider' : 'This device';
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
                            <span className='font-mono text-xs break-all'>{appHost}</span>
                        </div>
                    </div>
                    <p className='mt-3 text-xs text-black/45 dark:text-white/45'>App sign-in from the explorer is paused while it moves to app-scoped tokens: this sign-in proves the wallet flow, but its token is not sent to the app, so functions that require a signed-in caller answer 401 here.</p>
                    <div className='mt-4 flex gap-2'>
                        <button type='button' onClick={actions.signOut} className='rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5'>Sign out</button>
                    </div>
                </section>
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
            {/* Hidden while a ceremony runs in the frame — a second click would
                start a concurrent ceremony and orphan the in-flight one. */}
            {fido2.sessionChecked && !fido2.signingIn && (
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
