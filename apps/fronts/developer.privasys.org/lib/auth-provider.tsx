'use client';

import type { ReactNode } from 'react';
import { PrivasysAuthProvider } from '~/lib/privasys-auth';

const SDK_CONFIG = {
    apiBase: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    appName: 'Developer Platform',
    rpId: 'privasys.id',
    brokerUrl: 'wss://relay.privasys.org/relay',
    clientId: process.env.NEXT_PUBLIC_PRIVASYS_CLIENT_ID || 'developer-portal-public',
    scope: ['openid', 'email', 'profile', 'offline_access'] as const
};

export function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <PrivasysAuthProvider config={SDK_CONFIG}>
            {children}
        </PrivasysAuthProvider>
    );
}
