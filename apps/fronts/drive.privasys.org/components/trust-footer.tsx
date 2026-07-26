'use client';

import { useEffect, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    AttestationStatusBadge,
    attestationStatusOf,
    computeAttestationSummary,
    useAttestation
} from '@privasys/attestation-view';
import { useAuth } from '~/lib/privasys-auth';
import { getStatus } from '~/lib/drive-api';

// Sidebar footer trust block, mirroring chat's "Secure enclave ✓ Verified"
// pill. It runs a live attestation of the Drive enclave (the same handshake
// the Security view offers, but headless) and shows the UI and backend build
// ids so what you are looking at is always identifiable.
//
// The attestation needs the Drive app id (NEXT_PUBLIC_DRIVE_APP_ID, set per
// deployment) to address the platform attest endpoint; without it the pill
// reads "Not attested" rather than lying.

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.developer.privasys.org';
const APP_ID = process.env.NEXT_PUBLIC_DRIVE_APP_ID ?? '';
const UI_COMMIT = process.env.NEXT_PUBLIC_COMMIT_SHA ?? '';
const AS_VERIFY = 'https://as.privasys.org/verify-quote';

export function TrustFooter({ session }: { session: SealedSession }) {
    const { getTokenForAudience } = useAuth();

    const attestUrl = APP_ID ? `${API_BASE}/api/v1/apps/${APP_ID}/attest` : '';
    const [state] = useAttestation({
        attestUrl,
        verifyQuoteUrl: AS_VERIFY,
        token: () => getTokenForAudience('attestation-server'),
        verifyQuoteToken: () => getTokenForAudience('attestation-server'),
        autoInspect: Boolean(attestUrl),
        autoVerifyQuote: true
    });
    const summary = computeAttestationSummary(state, undefined);
    const { status, reason } = attestationStatusOf(summary, Boolean(attestUrl));

    // Backend build id, read once from /status over the sealed session.
    const [backend, setBackend] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        void getStatus(session)
            .then((s) => {
                if (!cancelled) setBackend(s.version ?? null);
            })
            .catch(() => {
                /* transient — the pill still carries the trust signal */
            });
        return () => {
            cancelled = true;
        };
    }, [session]);

    const short = (v: string) => (/^[0-9a-f]{7,}$/i.test(v) ? v.slice(0, 7) : v);

    return (
        <div
            className="mt-auto border-t px-4 py-3 text-xs"
            style={{ borderColor: 'var(--drv-border)', color: 'var(--drv-text-muted)' }}
        >
            <div className="flex items-center gap-2">
                <span style={{ color: 'var(--drv-text-secondary)' }}>Secure enclave</span>
                <AttestationStatusBadge status={status} reason={reason} className="shrink-0" />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {UI_COMMIT && <span>UI {short(UI_COMMIT)}</span>}
                {backend && <span>Drive {short(backend)}</span>}
            </div>
        </div>
    );
}
