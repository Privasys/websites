// The portal's one AuthFrame: the person's session with the portal's client,
// and the channel to every enclave app the portal talks to (the monitor, an
// enclave's manager host, an app's tools), each reached with app(host) on
// this same frame.

import { AuthFrame } from '@privasys/auth';
import { platformSignIn } from './api-base-url';
import { APP_NAME } from './constants';

let auth: AuthFrame | null = null;

/** The page's AuthFrame, created on first use (in the browser only). */
export function portalAuth(): AuthFrame {
    if (typeof window === 'undefined') throw new Error('portalAuth() runs in the browser only');
    if (!auth) {
        auth = new AuthFrame({
            // The test portal differs only by its client and audience.
            ...platformSignIn(),
            // The name on the gate, in the wallet's approvals and its session list.
            appName: APP_NAME,
            authOrigin: process.env.NEXT_PUBLIC_IDP_ORIGIN || 'https://privasys.id',
            brokerUrl: process.env.NEXT_PUBLIC_BROKER_URL || 'wss://relay.privasys.org/relay',
            scope: ['openid', 'email', 'profile', 'offline_access']
        });
    }
    return auth;
}
