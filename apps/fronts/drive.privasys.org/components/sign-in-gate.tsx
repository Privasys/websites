'use client';

import { useEffect, useRef } from 'react';
import { Navbar, Footer } from '@privasys/ui';
import { useDrive } from '~/lib/use-drive';

const FOOTER_LINKS = [{ label: 'Legal', href: 'https://privasys.org/legal/', external: true }];

export function SignInGate() {
    const { status, error, signInInto, approve } = useDrive();
    const ceremonyRef = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    // Mount the wallet SDK's sign-in surface inline. It handles the whole
    // ceremony itself: install the Privasys Wallet, or connect with a
    // passkey, or scan the QR code.
    useEffect(() => {
        if (status !== 'signed-out' || started.current || !ceremonyRef.current) return;
        started.current = true;
        void signInInto(ceremonyRef.current);
    }, [status, signInInto]);

    return (
        <div className="flex min-h-screen flex-col" style={{ background: 'var(--drv-surface)' }}>
            <Navbar brandSuffix="Drive" fullWidth />

            <main className="flex flex-1 items-center justify-center px-6 pt-14">
                <div className="grid w-full max-w-4xl items-center gap-10 py-12 md:grid-cols-2">
                    {/* Pitch */}
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--drv-text)' }}>
                            Your files, sealed.
                        </h1>
                        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--drv-text-muted)' }}>
                            Privasys Drive keeps every file end-to-end encrypted inside a
                            hardware-protected enclave. The operator can never read your data,
                            and you can verify it yourself by remote attestation.
                        </p>
                        <ul className="mt-6 space-y-3 text-sm" style={{ color: 'var(--drv-text)' }}>
                            <Feature text="Sealed browser-to-enclave transport. The gateway only sees ciphertext." />
                            <Feature text="Directories and per-file, per-folder sharing you control." />
                            <Feature text="No passwords. Sign in with the Privasys Wallet or a passkey." />
                            <Feature text="Attestation-verified confidential computing, no trust required." />
                        </ul>
                    </div>

                    {/* Sign-in. The auth SDK's iframe draws its own card
                        chrome, so the ceremony gets a bare, explicitly
                        sized container (the SDK fills 100% of it) rather
                        than a second nested card. */}
                    <div>
                        {status === 'misconfigured' ? (
                            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
                                {error ?? 'Drive is not configured.'}
                            </p>
                        ) : status === 'need-approval' ? (
                            <div
                                className="space-y-3 rounded-2xl border p-5 text-center shadow-sm"
                                style={{ background: 'var(--drv-surface)', borderColor: 'var(--drv-border)' }}
                            >
                                <p className="text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                                    Approve Privasys Drive on your phone to open a sealed channel
                                    to the enclave.
                                </p>
                                <button
                                    onClick={() => void approve()}
                                    className="drv-btn-primary w-full rounded-full px-5 py-3 text-[15px]"
                                >
                                    Approve on your wallet
                                </button>
                            </div>
                        ) : (
                            <div
                                ref={ceremonyRef}
                                className="h-[560px] w-full overflow-hidden rounded-2xl"
                                aria-busy={status === 'connecting'}
                            />
                        )}

                        {error && status !== 'misconfigured' && (
                            <p className="mt-3 text-center text-sm text-red-500">{error}</p>
                        )}
                    </div>
                </div>
            </main>

            <Footer
                className="!mt-0"
                companyLine="Every file is sealed inside a hardware-protected enclave. Attestation is verified independently, no trust required."
                links={FOOTER_LINKS}
            />
        </div>
    );
}

function Feature({ text }: { text: string }) {
    return (
        <li className="flex items-start gap-2.5">
            <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: 'var(--drv-accent)' }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5L20 7" />
                </svg>
            </span>
            {text}
        </li>
    );
}
