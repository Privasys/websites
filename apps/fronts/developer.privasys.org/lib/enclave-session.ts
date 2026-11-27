// The portal's channels to enclave apps: an enclave's manager host for
// deploys (`<enclave>-mgr.<AppDomain>`), the monitor at its app host, an
// app's tools at its host.
//
// Each is `app(host)` on the portal's one AuthFrame (portal-auth.ts): never
// a sign-in, never another frame. For a wallet session the channel is
// sealed; it resumes silently from the wallet's approval for the host, or
// asks the wallet for one tap when there is none yet or the enclave refused
// the stored one (the platform or the app changed). The same host gives the
// same channel; a channel that stopped working is re-established by calling
// app() again, which `enclaveChannel` does on every call.

import type { AppChannel } from '@privasys/auth';
import { portalAuth } from './portal-auth';

/** A host waiting for the person's approval in the wallet, and why. */
export interface PendingApproval {
    host: string;
    /** null for a first approval; 'enc-changed' when the platform was
     *  upgraded, 'workload-changed' when the app changed, and so on. */
    reason: string | null;
}

let pending: PendingApproval | null = null;
const watchers = new Set<(p: PendingApproval | null) => void>();

function setPending(p: PendingApproval | null): void {
    pending = p;
    for (const cb of watchers) cb(p);
}

/** Be told when a channel waits for an approval in the wallet, and when it stops waiting. */
export function watchEnclaveApproval(cb: (p: PendingApproval | null) => void): () => void {
    watchers.add(cb);
    cb(pending);
    return () => watchers.delete(cb);
}

/** Readable text for the failures app() reports. */
function explain(err: unknown): Error {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not signed in') || msg.includes('no-session')) {
        return new Error('Your sign-in to the portal has ended. Sign in again, then retry.');
    }
    if (msg.includes('needs an audience') || msg.includes('no-push')) {
        return new Error('This needs a sign-in with the Privasys Wallet. Sign out, sign in with the wallet, then retry.');
    }
    if (msg.includes('timeout')) {
        return new Error('The request was not approved on your phone in time. Retry, then approve it in the Privasys Wallet.');
    }
    return err instanceof Error ? err : new Error(msg);
}

/**
 * The channel to the enclave app at `appHost` (a host name, no scheme):
 * ready at once when the wallet already approved this host, otherwise after
 * one approval on the phone, reported through {@link watchEnclaveApproval}.
 */
export async function enclaveChannel(appHost: string): Promise<AppChannel> {
    try {
        return await portalAuth().app(appHost, {
            onApproval: (reason) => setPending({ host: appHost, reason })
        });
    } catch (err) {
        throw explain(err);
    } finally {
        if (pending?.host === appHost) setPending(null);
    }
}
