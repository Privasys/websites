// Per-app-host sealed session for the explorer's API Testing tab.
//
// A tested API call goes over a wallet-attested sealed session DIRECT to the
// enclave — the caller gets real attestation, and the mgmt /call relay it
// replaces is being retired. The first call per app host runs a wallet
// ceremony; that is the explorer's contract now (the ATTESTATION viewer stays
// public — only calling an API needs the wallet).
//
// Mirrors the portal's enclave-session.ts, including the CRITICAL per-host
// rpId: SessionManager keys sessions solely by rpId, so reusing 'privasys.id'
// would overwrite the front's own session and cancel its renewal timer.

import { AuthFrame, type AuthFrameConfig, type SealedSession } from '@privasys/auth';
import type { ConnectionConfig } from '~/lib/config';

interface CacheEntry {
    frame: AuthFrame;
    pending: Promise<void> | null;
    signedIn: boolean;
}

const frameCache = new Map<string, CacheEntry>();

export function appHostFor(connection: ConnectionConfig): string {
    return `${connection.appName}.${connection.gatewayDomain}`;
}

function buildAuthFrame(connection: ConnectionConfig, appHost: string): AuthFrame {
    const cfg: AuthFrameConfig = {
        apiBase: connection.baseUrl,
        appName: `Privasys Explorer (${appHost})`,
        authOrigin: 'https://privasys.id',
        rpId: `privasys-explorer:${appHost}`,
        brokerUrl: connection.brokerUrl,
        clientId: 'privasys-platform',
        scope: ['openid', 'offline_access'],
        sessionRelay: { appHost }
    };
    return new AuthFrame(cfg);
}

/** Wallet-attested sealed session for the app, cached per host. */
export async function getAppSealedSession(connection: ConnectionConfig): Promise<SealedSession> {
    const appHost = appHostFor(connection);
    let entry = frameCache.get(appHost);
    if (!entry) {
        entry = { frame: buildAuthFrame(connection, appHost), pending: null, signedIn: false };
        frameCache.set(appHost, entry);
    }
    if (!entry.signedIn) {
        if (!entry.pending) {
            entry.pending = entry.frame.signIn().then(
                () => { if (entry) entry.signedIn = true; },
                (err) => { dropAppSealedSession(appHost); throw err; }
            ).finally(() => { if (entry) entry.pending = null; });
        }
        await entry.pending;
    }
    return entry.frame.session();
}

/** Tear down a dead sealed frame so the next call rebuilds it. */
export function dropAppSealedSession(appHost: string): void {
    const entry = frameCache.get(appHost);
    if (!entry) return;
    frameCache.delete(appHost);
    try { entry.frame.destroy(); } catch { /* ignore */ }
}
