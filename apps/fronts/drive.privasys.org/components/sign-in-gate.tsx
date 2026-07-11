'use client';

import { useDrive } from '~/lib/use-drive';
import { LockIcon, ShieldCheck } from './icons';

export function SignInGate() {
    const { status, error, signIn, approve } = useDrive();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
            <div className="max-w-md w-full">
                <div
                    className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
                    style={{ background: 'linear-gradient(135deg, var(--drv-accent), #0b57d0)' }}
                >
                    <LockIcon width={30} height={30} />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Privasys Drive</h1>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--drv-text-muted)' }}>
                    Your files, sealed. Every file is end-to-end encrypted inside a
                    hardware-protected enclave — the operator can never read your data, and
                    you can verify it by remote attestation.
                </p>

                <div className="mt-8">
                    {status === 'misconfigured' ? (
                        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
                            {error ?? 'Drive is not configured.'}
                        </p>
                    ) : status === 'need-approval' ? (
                        <div className="space-y-3">
                            <p className="text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                                Approve Privasys Drive on your phone to open a sealed channel to
                                the enclave.
                            </p>
                            <button
                                onClick={() => void approve()}
                                className="w-full rounded-full px-5 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
                                style={{ background: 'var(--drv-accent)' }}
                            >
                                Approve on your wallet
                            </button>
                        </div>
                    ) : status === 'connecting' ? (
                        <button
                            disabled
                            className="w-full rounded-full px-5 py-3 text-[15px] font-medium text-white opacity-70"
                            style={{ background: 'var(--drv-accent)' }}
                        >
                            Connecting…
                        </button>
                    ) : (
                        <button
                            onClick={() => void signIn()}
                            className="w-full rounded-full px-5 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
                            style={{ background: 'var(--drv-accent)' }}
                        >
                            Sign in with Privasys Wallet
                        </button>
                    )}

                    {error && status !== 'misconfigured' && (
                        <p className="mt-3 text-sm text-red-500">{error}</p>
                    )}
                </div>

                <div
                    className="mt-8 flex items-center justify-center gap-2 text-xs"
                    style={{ color: 'var(--drv-text-muted)' }}
                >
                    <ShieldCheck />
                    Sealed browser-to-enclave transport · attestation-verified
                </div>
            </div>
        </div>
    );
}
