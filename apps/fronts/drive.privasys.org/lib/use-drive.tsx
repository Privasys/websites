'use client';

// DriveProvider — owns the sealed session to the Drive enclave and the
// caller's personal drive (tenant). Wraps the wallet auth context.
//
// Flow: the user signs in with `sessionRelayHost = driveHost()`, so the
// wallet attests the Drive enclave's quote and binds the session to a
// sealed CBOR-AES-GCM transport in the same ceremony. We then resume that
// sealed session with getSealedSession(driveHost()) (silent across
// reloads; a voucher request covers the cold case), and bootstrap the
// personal tenant.

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode
} from 'react';
import type { SealedSession } from '@privasys/auth';
import { useAuth } from './privasys-auth';
import { driveHost, ensurePersonalTenant, getMe, type Me, type Tenant } from './drive-api';

export type DriveStatus =
    | 'signed-out'
    | 'connecting'
    | 'need-approval'
    | 'ready'
    | 'error'
    | 'misconfigured';

interface DriveContextValue {
    status: DriveStatus;
    error: string | null;
    session: SealedSession | null;
    me: Me | null;
    tenant: Tenant | null; // the active workspace (personal drive for v1)
    signIn: () => Promise<void>;
    signOut: () => void;
    /** Re-request the wallet approval when no sealed voucher exists yet. */
    approve: () => Promise<void>;
}

const DriveContext = createContext<DriveContextValue>({
    status: 'signed-out',
    error: null,
    session: null,
    me: null,
    tenant: null,
    signIn: async () => {},
    signOut: () => {},
    approve: async () => {}
});

export function useDrive(): DriveContextValue {
    return useContext(DriveContext);
}

export function DriveProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const host = driveHost();
    const [status, setStatus] = useState<DriveStatus>('connecting');
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<SealedSession | null>(null);
    const [me, setMe] = useState<Me | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const bootstrapping = useRef(false);

    const bootstrap = useCallback(
        async (s: SealedSession) => {
            const [meRes, tenantRes] = await Promise.all([getMe(s), ensurePersonalTenant(s)]);
            setMe(meRes);
            setTenant(tenantRes);
            setSession(s);
            setStatus('ready');
        },
        []
    );

    // Resolve the sealed Drive session whenever the wallet session changes.
    useEffect(() => {
        if (!host) {
            setStatus('misconfigured');
            setError('NEXT_PUBLIC_DRIVE_APP_HOST is not set.');
            return;
        }
        if (auth.loading) {
            setStatus('connecting');
            return;
        }
        if (!auth.session) {
            setStatus('signed-out');
            setSession(null);
            setMe(null);
            setTenant(null);
            return;
        }
        let cancelled = false;
        setStatus('connecting');
        setError(null);
        void auth
            .getSealedSession(host)
            .then(async (s) => {
                if (cancelled) return;
                if (!s) {
                    // Signed in, but no sealed voucher for Drive yet.
                    setStatus('need-approval');
                    return;
                }
                await bootstrap(s);
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setStatus('error');
                setError(e instanceof Error ? e.message : 'Could not connect to Drive.');
            });
        return () => {
            cancelled = true;
        };
    }, [auth.session, auth.loading, auth.getSealedSession, host, bootstrap]);

    const signIn = useCallback(async () => {
        setError(null);
        try {
            await auth.signIn({ sessionRelayHost: host });
        } catch (e) {
            if (e instanceof Error && e.message !== 'Authentication cancelled') {
                setError(e.message);
                setStatus('error');
            }
        }
    }, [auth, host]);

    const approve = useCallback(async () => {
        if (bootstrapping.current) return;
        bootstrapping.current = true;
        setError(null);
        setStatus('connecting');
        try {
            let s = await auth.getSealedSession(host);
            if (!s) {
                await auth.requestAppVoucher(host); // phone push approval
                s = await auth.getSealedSession(host);
            }
            if (!s) throw new Error('Drive approval was not completed.');
            await bootstrap(s);
        } catch (e) {
            setStatus('need-approval');
            setError(e instanceof Error ? e.message : 'Approval failed.');
        } finally {
            bootstrapping.current = false;
        }
    }, [auth, host, bootstrap]);

    const signOut = useCallback(() => {
        auth.signOut();
        setSession(null);
        setMe(null);
        setTenant(null);
        setStatus('signed-out');
    }, [auth]);

    return (
        <DriveContext.Provider
            value={{ status, error, session, me, tenant, signIn, signOut, approve }}
        >
            {children}
        </DriveContext.Provider>
    );
}
