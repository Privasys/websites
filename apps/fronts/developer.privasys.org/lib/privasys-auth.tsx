'use client';

import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@privasys/auth';
import { isTestPortal } from './api-base-url';
import { portalAuth } from './portal-auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthSession {
    /** JWT access token from the IdP (used for management service API calls). */
    accessToken: string;
    /** Roles from the JWT claims (e.g. 'privasys-platform:admin'). */
    roles?: string[];
    /** The signed-in person's subject on the platform. */
    sub?: string;
}

interface AuthContextValue {
    /** The current authenticated session (null when not logged in). */
    session: AuthSession | null;
    /** Whether the initial session check is still in progress. */
    loading: boolean;
    /** Whether the session ended while in use (expired, or an API returned 401). */
    expired: boolean;
    /** Restore the session, or run the sign-in gate. */
    signIn: () => Promise<void>;
    /** End the portal's session, in every tab. */
    signOut: () => Promise<void>;
    /** Renew the session now, so its token carries roles granted since. */
    renew: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue>({
    session: null,
    loading: true,
    expired: false,
    signIn: async () => {},
    signOut: async () => {},
    renew: async () => {}
});

export function useAuth(): AuthContextValue {
    return useContext(AuthContext);
}

/**
 * A "Try again" that first renews the session, so a role granted since the
 * sign-in counts. `attempt` changes on every retry: make the load depend on it.
 */
export function useRetryWithRenewal(): { attempt: number; retry: () => void } {
    const { renew } = useAuth();
    const [attempt, setAttempt] = useState(0);
    const retry = useCallback(() => {
        renew().catch(() => undefined).then(() => setAttempt((n) => n + 1));
    }, [renew]);
    return { attempt, retry };
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------
// Accept both the short-form role names (e.g. `platform:admin`, issued by
// privasys.id) and the legacy `privasys-platform:admin` aliases used by
// older clients so sessions established against either form keep working.

// The test environment's roles carry its own audience, privasys-platform-test,
// and count only on the test portal.
const TEST = isTestPortal();
const ADMIN_ROLES = new Set([
    'platform:admin', 'privasys-platform:admin',
    ...(TEST ? ['privasys-platform-test:admin'] : [])
]);
const MANAGER_ROLES = new Set([
    'platform:admin', 'platform:manager',
    'privasys-platform:admin', 'privasys-platform:manager',
    ...(TEST ? ['privasys-platform-test:admin', 'privasys-platform-test:manager'] : [])
]);

export function hasAdminRole(roles: string[] | undefined | null): boolean {
    return !!roles?.some(r => ADMIN_ROLES.has(r));
}

export function hasManagerRole(roles: string[] | undefined | null): boolean {
    return !!roles?.some(r => MANAGER_ROLES.has(r) || r.endsWith(':manager'));
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const AUTH_COOKIE = 'privasys_session';

/** Decode the payload of a JWT (no verification: the IdP already signed it). */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
    try {
        const parts = jwt.split('.');
        if (parts.length !== 3) return {};
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(payload));
    } catch {
        return {};
    }
}

function sessionFromToken(token: string): AuthSession {
    const claims = decodeJwtPayload(token);
    return {
        accessToken: token,
        roles: Array.isArray(claims.roles) ? (claims.roles as string[]) : undefined,
        sub: typeof claims.sub === 'string' ? claims.sub : undefined
    };
}

function setSessionCookie(token: string): void {
    // Set a cookie readable by Next.js middleware.
    // Max-Age = 5 min (matches IdP access_token TTL).
    document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=300; SameSite=Lax`;
}

function clearSessionCookie(): void {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

export function PrivasysAuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [expired, setExpired] = useState(false);
    // Whether this page holds a session, and whether it is signing out on
    // purpose: a session that ends otherwise (expiry, another tab) shows the
    // "session expired" banner rather than a fresh gate.
    const signedIn = useRef(false);
    const signingOut = useRef(false);

    // The frame reports the stored session first, then every renewal,
    // sign-in, sign-out and expiry, from any tab of the portal.
    useEffect(() => {
        const auth = portalAuth();
        return auth.onSessionChange((s: Session | null) => {
            if (s) {
                signedIn.current = true;
                setSession(sessionFromToken(s.token));
                setSessionCookie(s.token);
                setExpired(false);
            } else {
                if (signedIn.current && !signingOut.current) setExpired(true);
                signedIn.current = false;
                setSession(null);
                clearSessionCookie();
            }
            setLoading(false);
        });
    }, []);

    const signIn = useCallback(async () => {
        const s = await portalAuth().connect();
        signedIn.current = true;
        setSession(sessionFromToken(s.token));
        setSessionCookie(s.token);
        setExpired(false);
    }, []);

    const signOut = useCallback(async () => {
        signingOut.current = true;
        try {
            await portalAuth().signOut();
        } finally {
            signingOut.current = false;
        }
        setSession(null);
        clearSessionCookie();
    }, []);

    const renew = useCallback(async () => {
        await portalAuth().renew();
    }, []);

    // Listen for auth:expired from api.ts (401 responses).
    useEffect(() => {
        const handler = () => {
            setExpired(true);
            setSession(null);
            clearSessionCookie();
        };
        window.addEventListener('auth:expired', handler);
        return () => window.removeEventListener('auth:expired', handler);
    }, []);

    return (
        <AuthContext.Provider value={{ session, loading, expired, signIn, signOut, renew }}>
            {children}
        </AuthContext.Provider>
    );
}
