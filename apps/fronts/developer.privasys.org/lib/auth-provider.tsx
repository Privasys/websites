'use client';

import type { ReactNode } from 'react';
import { PrivasysAuthProvider } from '~/lib/privasys-auth';

// The portal's AuthFrame and its configuration live in portal-auth.ts, so the
// enclave channels (enclave-session.ts) use the same frame as the provider.
export function AuthProvider({ children }: { children: ReactNode }) {
    return <PrivasysAuthProvider>{children}</PrivasysAuthProvider>;
}
