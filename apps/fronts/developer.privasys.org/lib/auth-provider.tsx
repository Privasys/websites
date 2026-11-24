'use client';

import type { ReactNode } from 'react';
import { PrivasysAuthProvider } from '~/lib/privasys-auth';
import { getApiBaseUrl } from './api-base-url';

// The test portal signs in exactly as production does for now: asking for
// the test audience from the sign-in frame gave the portal a session the
// control plane could not tie to the person's account. The test control
// plane accepts privasys-platform tokens too.
const SDK_CONFIG = {
    apiBase: getApiBaseUrl(),
    appName: 'Privasys Developer Platform',
    authOrigin: process.env.NEXT_PUBLIC_IDP_ORIGIN || 'https://privasys.id',
    rpId: process.env.NEXT_PUBLIC_IDP_RP_ID || 'privasys.id',
    brokerUrl: process.env.NEXT_PUBLIC_BROKER_URL || 'wss://relay.privasys.org/relay',
    clientId: 'privasys-platform',
    scope: ['openid', 'email', 'profile', 'offline_access'] as const
};

export function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <PrivasysAuthProvider config={SDK_CONFIG}>
            {children}
        </PrivasysAuthProvider>
    );
}
