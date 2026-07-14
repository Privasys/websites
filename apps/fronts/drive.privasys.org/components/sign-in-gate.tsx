'use client';

import { useEffect, useRef } from 'react';
import { Navbar, Footer } from '@privasys/ui';
import { useDrive } from '~/lib/use-drive';

const FOOTER_LINKS = [{ label: 'Legal', href: 'https://privasys.org/legal/', external: true }];

// Full-page sign-in gate. The auth SDK renders the ENTIRE surface (page
// presentation): drive's pitch in the left panel, and every ceremony state
// on the right — sign-in options, push/QR, the one-tap re-approval after a
// back-end redeploy, success. Drive's integration is one container plus
// connectInto(); the only outcomes it reacts to are success (drive
// bootstraps to 'ready') and failure (error banner with a retry).
export function SignInGate() {
    const { status, error, connectInto } = useDrive();
    const ceremonyRef = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    useEffect(() => {
        if (status !== 'signed-out' || started.current || !ceremonyRef.current) return;
        started.current = true;
        void connectInto(ceremonyRef.current).finally(() => {
            started.current = false;
        });
    }, [status, connectInto]);

    return (
        <div className="flex min-h-screen flex-col" style={{ background: 'var(--drv-surface)' }}>
            <Navbar brandSuffix="Drive" fullWidth />

            <main className="flex flex-1 flex-col pt-14">
                {status === 'misconfigured' ? (
                    <p className="mx-auto mt-16 max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
                        {error ?? 'Drive is not configured.'}
                    </p>
                ) : (
                    <>
                        {status === 'error' && (
                            <div className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                                <span className="flex-1">{error ?? 'Could not connect to Drive.'}</span>
                                <button
                                    onClick={() => {
                                        if (ceremonyRef.current) void connectInto(ceremonyRef.current);
                                    }}
                                    className="shrink-0 rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium hover:bg-red-500/10"
                                >
                                    Try again
                                </button>
                            </div>
                        )}
                        {/* The SDK gate fills this container (page presentation). */}
                        <div ref={ceremonyRef} className="min-h-[620px] w-full flex-1" />
                    </>
                )}
            </main>

            <Footer
                className="!mt-0"
                companyLine="Every file is sealed inside a hardware-protected enclave. Attestation is verified independently, no trust required."
                links={FOOTER_LINKS}
            />
        </div>
    );
}
