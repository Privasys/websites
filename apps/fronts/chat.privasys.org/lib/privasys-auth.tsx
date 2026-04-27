'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { AuthFrame, type AuthFrameConfig } from '@privasys/auth';

// Auth context for the Privasys Chat front-end.
//
// Mirrors the developer-portal implementation
// (`developer.privasys.org/lib/privasys-auth.tsx`). The full
// portal version also handles role decoding and a session-cookie
// for Next.js middleware; chat doesn't currently need either, so
// this is the trimmed-down variant.
//
// All websites use the hosted `@privasys/auth` SDK against
// privasys.id (OIDC PKCE inside an iframe). See
// `.operations/identity-platform/auth.md`.

export interface AuthSession {
    /** JWT access_token issued by the IdP. */
    accessToken: string;
    /** RP ID this session is authenticated for. */
    rpId: string;
    /** When the session was established (epoch ms). */
    authenticatedAt: number;
}

interface AuthContextValue {
    session: AuthSession | null;
    loading: boolean;
    expired: boolean;
    /** Open the auth ceremony in a full-screen overlay (default). */
    signIn: () => Promise<void>;
    /**
     * Mount the auth iframe inline inside `container` (instead of a
     * full-screen overlay). Used by the in-panel sign-in view so the
     * surrounding chat shell stays visible. The provider builds a
     * one-shot `AuthFrame` per call; once the ceremony resolves, the
     * persistent renewal frame picks up the session via cross-origin
     * SSO and starts the silent-renewal timer.
     */
    signInInto: (container: HTMLElement) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    session: null,
    loading: true,
    expired: false,
    signIn: async () => {},
    signInInto: async () => {},
    signOut: async () => {},
});

export function useAuth(): AuthContextValue {
    return useContext(AuthContext);
}

function isJwt(token: string): boolean {
    return typeof token === 'string' && token.split('.').length === 3;
}

function sessionFromToken(
    token: string,
    rpId: string,
    authenticatedAt?: number,
): AuthSession {
    return {
        accessToken: token,
        rpId,
        authenticatedAt: authenticatedAt ?? Date.now(),
    };
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

    const getFrame = useCallback(() => {
        if (!frameRef.current) {
            frameRef.current = new AuthFrame(config);
            frameRef.current.onSessionExpired = () => {
                setSession(null);
                setExpired(true);
            };
            frameRef.current.onSessionRenewed = () => {
                frameRef.current?.getSession().then((s) => {
                    if (s) {
                        setSession(sessionFromToken(s.token, s.rpId, s.authenticatedAt));
                        setExpired(false);
                    }
                });
            };
        }
        return frameRef.current;
    }, [config]);

    // Cross-site SSO check on mount.
    useEffect(() => {
        const frame = getFrame();
        frame
            .getSession()
            .then((s) => {
                if (s) {
                    if (!isJwt(s.token)) {
                        // Stale opaque session token. Clear it; next interaction
                        // will trigger a fresh OIDC sign-in.
                        frame.clearSession().catch(() => undefined);
                    } else {
                        setSession(
                            sessionFromToken(s.token, s.rpId, s.authenticatedAt),
                        );
                    }
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [getFrame]);

    const acceptResultToken = useCallback(
        (token: string) => {
            setSession(sessionFromToken(token, config.rpId ?? config.appName));
            setExpired(false);
            // Bootstrap (or refresh) the silent-renewal iframe via the
            // persistent frame; it reads the session out of the auth
            // origin's localStorage.
            getFrame().getSession();
        },
        [config, getFrame],
    );

    const signIn = useCallback(async () => {
        const frame = getFrame();
        const result = await frame.signIn();
        acceptResultToken(result.accessToken ?? result.sessionToken);
    }, [getFrame, acceptResultToken]);

    const signInInto = useCallback(
        async (container: HTMLElement) => {
            // One-shot inline frame. We don't reuse `frameRef` because
            // `container` is a constructor-only option in @privasys/auth
            // and the persistent frame must keep its renewal iframe
            // attached to <body>.
            const inline = new AuthFrame({ ...config, container });
            const result = await inline.signIn();
            acceptResultToken(result.accessToken ?? result.sessionToken);
        },
        [config, acceptResultToken],
    );

    const signOut = useCallback(async () => {
        const frame = getFrame();
        await frame.clearSession();
        setSession(null);
    }, [getFrame]);

    return (
        <AuthContext.Provider
            value={{ session, loading, expired, signIn, signInInto, signOut }}
        >
            {children}
        </AuthContext.Provider>
    );
}
