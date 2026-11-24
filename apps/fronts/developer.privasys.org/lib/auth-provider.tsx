'use client';

import type { ReactNode } from 'react';
import { PrivasysAuthProvider } from '~/lib/privasys-auth';
import { getApiBaseUrl, platformSignIn } from './api-base-url';

// rpId is the wallet's sign-in identity and stays privasys.id everywhere;
// the test portal differs only by its client and audience (platformSignIn).
const SDK_CONFIG = {
    apiBase: getApiBaseUrl(),
    appName: 'Privasys Developer Platform',
    authOrigin: process.env.NEXT_PUBLIC_IDP_ORIGIN || 'https://privasys.id',
    rpId: process.env.NEXT_PUBLIC_IDP_RP_ID || 'privasys.id',
    brokerUrl: process.env.NEXT_PUBLIC_BROKER_URL || 'wss://relay.privasys.org/relay',
    ...platformSignIn(),
    scope: ['openid', 'email', 'profile', 'offline_access'] as const
};

export function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <PrivasysAuthProvider config={SDK_CONFIG}>
            {children}
        </PrivasysAuthProvider>
    );
}
