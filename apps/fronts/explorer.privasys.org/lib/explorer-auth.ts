// The explorer's one AuthFrame: the person's session with the explorer's
// client at privasys.id, the attestation-server tokens minted from it, and
// the channel to each app the API Testing tab calls, reached with
// app(host) on this same frame.
//
// The session is the platform client's, so its token is a platform token:
// it never reaches an app, which runs code the explorer does not control.

'use client';

import { AuthFrame, type AppChannel } from '@privasys/auth';
import { DEFAULT_BROKER_URL, FIDO2_TIMEOUT, type ConnectionConfig } from './config';

let auth: AuthFrame | null = null;

/**
 * The page's AuthFrame, created on first use (in the browser only). The
 * wallet relay is fixed for the page by the first call that names one.
 */
export function explorerAuth(brokerUrl?: string): AuthFrame {
    if (typeof window === 'undefined') throw new Error('explorerAuth() runs in the browser only');
    if (!auth) {
        auth = new AuthFrame({
            clientId: 'privasys-platform',
            appName: 'Privasys Explorer',
            brokerUrl: brokerUrl || DEFAULT_BROKER_URL,
            timeout: FIDO2_TIMEOUT,
            scope: ['openid', 'offline_access']
        });
    }
    return auth;
}

export function appHostFor(connection: ConnectionConfig): string {
    return `${connection.appName}.${connection.gatewayDomain}`;
}

/**
 * The channel to the connected app. A wallet session reaches it sealed: at
 * once when the wallet already approved this app, otherwise after one tap
 * (`onApproval` is called while it waits). Throws when no one is signed in.
 */
export async function appChannel(connection: ConnectionConfig, onApproval?: (reason: string | null) => void): Promise<AppChannel> {
    const a = explorerAuth(connection.brokerUrl);
    try {
        return await a.app(appHostFor(connection), { onApproval });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('needs an audience')) {
            throw new Error('Calling an app from the explorer needs a sign-in with the Privasys Wallet. Sign out, sign in with the wallet, then send again.');
        }
        throw e;
    }
}

/** A token for `audience`, signing in first (the gate) when no one is. */
export async function mintAudienceToken(audience: string, brokerUrl?: string): Promise<string> {
    const a = explorerAuth(brokerUrl);
    await a.connect();
    return a.token(audience);
}

/** A token for `audience` from the current session, or '' when no one is
 *  signed in: never opens the gate. */
export async function mintAudienceTokenSilent(audience: string): Promise<string> {
    try {
        return await explorerAuth().token(audience);
    } catch {
        return '';
    }
}
