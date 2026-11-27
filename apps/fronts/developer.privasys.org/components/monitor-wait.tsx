'use client';

// What a page says while it waits for the monitor: when the channel to the
// monitor waits for an approval in the Privasys Wallet, it says so.

import { useEffect, useState } from 'react';
import { watchEnclaveApproval, type PendingApproval } from '~/lib/enclave-session';
import { getMonitorHost } from '~/lib/monitor';

export function MonitorWait({ className }: { className: string }) {
    const [pending, setPending] = useState<PendingApproval | null>(null);
    useEffect(() => {
        const host = getMonitorHost();
        return watchEnclaveApproval((p) => setPending(p?.host === host ? p : null));
    }, []);
    if (!pending) {
        return <div className={className}>Asking the monitor… The first time, your wallet may ask you to approve a secure connection to it.</div>;
    }
    return (
        <div className={className}>
            {pending.reason === null
                ? 'Approve the secure connection to the monitor on your phone, in the Privasys Wallet.'
                : 'The monitor or the platform was updated since your last approval: approve the secure connection again on your phone, in the Privasys Wallet.'}
        </div>
    );
}
