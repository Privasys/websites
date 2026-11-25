// Per-app-host sealed session for the explorer's API Testing tab.
//
// A tested API call goes over a wallet-attested sealed session DIRECT to the
// enclave — the caller gets real attestation, and the mgmt /call relay it
// replaces is being retired. The first call per app host runs a wallet
// ceremony; that is the explorer's contract now (the ATTESTATION viewer stays
// public — only calling an API needs the wallet).
//
// Mirrors the portal's enclave-session.ts. rpId is privasys.id, so the wallet
// uses the person's one credential (another rpId would register another
// identity); the explorer's own client per environment keeps its session
// apart from any other on the page (the frame keeps one per rpId, client
// and platform).

import { AuthFrame, type AuthFrameConfig, type SealedSession } from '@privasys/auth';
import type { ConnectionConfig } from '~/lib/config';

export interface AppSession {
    session: SealedSession;
    /** Platform access token minted by the SAME ceremony that attested the
     *  sealed channel. Used as app_auth when the explorer has no separate app
     *  sign-in — the user just proved who they are to their wallet; asking
     *  again to satisfy an @auth function is the same identity twice. */
    accessToken: string;
}

interface CacheEntry {
    frame: AuthFrame;
    pending: Promise<AppSession> | null;
    ready: AppSession | null;
}

const frameCache = new Map<string, CacheEntry>();

export function appHostFor(connection: ConnectionConfig): string {
    return `${connection.appName}.${connection.gatewayDomain}`;
}

// The explorer's sign-in client for the environment it is connected to:
// development apps take the test platform's audience.
function explorerSignIn(connection: ConnectionConfig): { clientId: string; audience?: string } {
    return connection.env === 'development'
        ? { clientId: 'privasys-explorer-test', audience: 'privasys-platform-test' }
        : { clientId: 'privasys-explorer' };
}

function buildAuthFrame(connection: ConnectionConfig, appHost: string): AuthFrame {
    const cfg: AuthFrameConfig = {
        apiBase: connection.baseUrl,
        appName: `Privasys Explorer (${appHost})`,
        authOrigin: 'https://privasys.id',
        rpId: 'privasys.id',
        brokerUrl: connection.brokerUrl,
        ...explorerSignIn(connection),
        scope: ['openid', 'offline_access'],
        sessionRelay: { appHost }
    };
    return new AuthFrame(cfg);
}

/** Wallet-attested sealed session + the ceremony's own access token, cached
 *  per host. connect() restores silently when it can, so a reload does not
 *  re-run the ceremony. */
export async function getAppSealedSession(connection: ConnectionConfig): Promise<AppSession> {
    const appHost = appHostFor(connection);
    let entry = frameCache.get(appHost);
    if (!entry) {
        entry = { frame: buildAuthFrame(connection, appHost), pending: null, ready: null };
        frameCache.set(appHost, entry);
    }
    if (entry.ready) return entry.ready;
    if (!entry.pending) {
        entry.pending = entry.frame.connect().then(
            (r) => {
                if (!r.session) throw new Error('no sealed session');
                const ready = { session: r.session, accessToken: r.accessToken };
                if (entry) entry.ready = ready;
                return ready;
            },
            (err) => { dropAppSealedSession(appHost); throw err; }
        ).finally(() => { if (entry) entry.pending = null; });
    }
    return entry.pending;
}

/** Tear down a dead sealed frame so the next call rebuilds it. */
export function dropAppSealedSession(appHost: string): void {
    const entry = frameCache.get(appHost);
    if (!entry) return;
    frameCache.delete(appHost);
    try { entry.frame.destroy(); } catch { /* ignore */ }
}
