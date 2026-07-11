'use client';

import type { ReactNode } from 'react';
import { PrivasysAuthProvider } from './privasys-auth';

// SDK config for drive.privasys.org (Privasys wallet auth via privasys.id).
//
// Reuses the shared `privasys-platform` OIDC client on privasys.id
// (the hosted iframe handles redirect_uri internally on privasys.id,
// so no per-adopter redirect registration is required). When chat
// gets its own backend audience we'll switch this to a `privasys-chat`
// client.
const SDK_CONFIG = {
    // Read the same env var the rest of the chat app uses
    // (`NEXT_PUBLIC_API_BASE_URL`, set in deploy-chat.yml). The legacy
    // `NEXT_PUBLIC_API_BASE` was never set anywhere, so the SDK config
    // silently fell back to the prod default and the cached session row
    // ended up with `origin: https://api.developer.privasys.org` even
    // on chat-test. Cosmetic for the FIDO2 path (frame-host overrides
    // apiBase to the iframe origin), but actively misleading when
    // diagnosing wallet trust-store rows.
    apiBase:
        process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.developer.privasys.org',
    appName: 'Privasys Drive',
    authOrigin:
        process.env.NEXT_PUBLIC_IDP_ORIGIN ?? 'https://privasys.id',
    rpId: process.env.NEXT_PUBLIC_IDP_RP_ID ?? 'privasys.id',
    brokerUrl:
        process.env.NEXT_PUBLIC_BROKER_URL ?? 'wss://relay.privasys.org/relay',
    clientId: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID ?? 'privasys-platform',
    scope: ['openid', 'email', 'profile', 'offline_access'] as const
};

export function AuthProvider({ children }: { children: ReactNode }) {
    return <PrivasysAuthProvider config={SDK_CONFIG}>{children}</PrivasysAuthProvider>;
}
