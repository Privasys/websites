'use client';

import type { ReactNode } from 'react';
import { PrivasysAuthProvider } from './privasys-auth';

// SDK config for chat.privasys.org / chat-test.privasys.org.
//
// Reuses the shared `privasys-platform` OIDC client on privasys.id
// (the hosted iframe handles redirect_uri internally on privasys.id,
// so no per-adopter redirect registration is required). When chat
// gets its own backend audience we'll switch this to a `privasys-chat`
// client.
const SDK_CONFIG = {
    apiBase:
        process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.developer.privasys.org',
    appName: 'Privasys Chat',
    authOrigin:
        process.env.NEXT_PUBLIC_IDP_ORIGIN ?? 'https://privasys.id',
    rpId: process.env.NEXT_PUBLIC_IDP_RP_ID ?? 'privasys.id',
    brokerUrl:
        process.env.NEXT_PUBLIC_BROKER_URL ?? 'wss://relay.privasys.org/relay',
    clientId: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID ?? 'privasys-platform',
    scope: ['openid', 'email', 'profile', 'offline_access'] as const,
};

export function AuthProvider({ children }: { children: ReactNode }) {
    return <PrivasysAuthProvider config={SDK_CONFIG}>{children}</PrivasysAuthProvider>;
}
