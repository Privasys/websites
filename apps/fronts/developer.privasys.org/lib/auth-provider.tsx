'use client';

import type { ReactNode } from 'react';
import type { AuthFrameConfig } from '@privasys/auth';
import { PrivasysAuthProvider } from '~/lib/privasys-auth';
import { getApiBaseUrl, isTestPortal, platformAudienceScope } from './api-base-url';

// The test portal keeps its session under its own rpId: both portals are on
// one site, so with one rpId they would share the frame's stored session and
// trade tokens of each other's audience.
const SDK_CONFIG = {
    apiBase: getApiBaseUrl(),
    appName: 'Privasys Developer Platform',
    authOrigin: process.env.NEXT_PUBLIC_IDP_ORIGIN || 'https://privasys.id',
    rpId: process.env.NEXT_PUBLIC_IDP_RP_ID || (isTestPortal() ? 'privasys.id:test' : 'privasys.id'),
    brokerUrl: process.env.NEXT_PUBLIC_BROKER_URL || 'wss://relay.privasys.org/relay',
    clientId: 'privasys-platform',
    scope: ['openid', 'email', 'profile', 'offline_access', ...platformAudienceScope()] as AuthFrameConfig['scope']
};

export function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <PrivasysAuthProvider config={SDK_CONFIG}>
            {children}
        </PrivasysAuthProvider>
    );
}
