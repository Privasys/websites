'use client';

import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AuthFrame, type AuthFrameConfig } from '@privasys/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthSession {
    /** JWT access token from the IdP (used for management service API calls). */
    accessToken: string;
    /** RP ID this session is authenticated for. */
    rpId: string;
    /** Roles from the JWT claims (e.g. 'privasys-platform:admin'). */
    roles?: string[];
    /** When the session was established (epoch ms). */
    authenticatedAt: number;
}

interface AuthContextValue {
    /** The current authenticated session (null when not logged in). */
    session: AuthSession | null;
    /** Whether the initial session check is still in progress. */
    loading: boolean;
    /** Whether the session expired mid-use (API returned 401). */
    expired: boolean;
    /** Trigger the SDK sign-in modal (OIDC PKCE via privasys.id iframe). */
    signIn: () => Promise<void>;
    /** Clear the session (both local and privasys.id iframe). */
    signOut: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue>({
    session: null,
    loading: true,
    expired: false,
    signIn: async () => {},
    signOut: async () => {}
});

export function useAuth(): AuthContextValue {
    return useContext(AuthContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const AUTH_COOKIE = 'privasys_session';

/** Decode the payload of a JWT (no verification — the IdP already signed it). */
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

function sessionFromToken(token: string, rpId: string, authenticatedAt?: number): AuthSession {
    const claims = decodeJwtPayload(token);
    return {
        accessToken: token,
        rpId,
        roles: Array.isArray(claims.roles) ? (claims.roles as string[]) : undefined,
        authenticatedAt: authenticatedAt ?? Date.now()
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

interface PrivasysAuthProviderProps {
    children: ReactNode;
    config: AuthFrameConfig;
}

export function PrivasysAuthProvider({ children, config }: PrivasysAuthProviderProps) {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [expired, setExpired] = useState(false);
    const frameRef = useRef<AuthFrame | null>(null);

    // Lazy-init the AuthFrame instance.
    const getFrame = useCallback(() => {
        if (!frameRef.current) {
            frameRef.current = new AuthFrame(config);
            frameRef.current.onSessionExpired = () => {
                setSession(null);
                setExpired(true);
                clearSessionCookie();
            };
            frameRef.current.onSessionRenewed = () => {
                // Re-fetch session to get the refreshed token.
                frameRef.current?.getSession().then((s) => {
                    if (s) {
                        setSession(sessionFromToken(s.token, s.rpId, s.authenticatedAt));
                        setSessionCookie(s.token);
                    }
                });
            };
        }
        return frameRef.current;
    }, [config]);

    // Check for existing session on mount (cross-site SSO).
    useEffect(() => {
        const frame = getFrame();
        frame.getSession().then((s) => {
            if (s?.token) {
                setSession(sessionFromToken(s.token, s.rpId, s.authenticatedAt));
                setSessionCookie(s.token);
            }
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }, [getFrame]);

    const signIn = useCallback(async () => {
        const frame = getFrame();
        const result = await frame.signIn();
        const token = result.accessToken ?? result.sessionToken;
        setSession(sessionFromToken(token, config.rpId ?? config.appName));
        setSessionCookie(token);
        setExpired(false);

        // Bootstrap the hidden renewal iframe so the frame-host can
        // silently renew the session before the 5-minute TTL expires.
        frame.getSession();
    }, [getFrame, config]);

    const signOut = useCallback(async () => {
        const frame = getFrame();
        await frame.clearSession();
        setSession(null);
        clearSessionCookie();
    }, [getFrame]);

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
        <AuthContext.Provider value={{ session, loading, expired, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
