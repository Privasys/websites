'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode
} from 'react';
import { AuthFrame, type AuthFrameConfig, type SealedSession } from '@privasys/auth';

// Auth context for the Privasys Chat front-end.
//
// Mirrors the developer-portal implementation
// (`developer.privasys.org/lib/privasys-auth.tsx`). The full
// portal version also handles role decoding and a session-cookie
// for Next.js middleware; chat doesn't currently need either, so
// this is the trimmed-down variant.
//
// All websites use the hosted `@privasys/auth` SDK against
// privasys.id (OIDC PKCE inside an iframe).

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
    /**
     * Sealed CBOR-AES-GCM session against the enclave that the wallet
     * attested during sign-in. Only populated when the caller passed
     * `sessionRelayHost` to `signIn`/`signInInto` — typically the
     * `instance.session_relay.app_host` returned by the management
     * service.
     */
    sealedSession: SealedSession | null;
    /**
     * Mint a per-audience JWT (challenge mode) without rotating the
     * primary session. Used to call attestation-server's verify-quote
     * endpoint with `aud=attestation-server`. The returned token is
     * single-use-shaped (15-minute lifetime, audience-bound) and is
     * never persisted into the session context.
     */
    getTokenForAudience: (audience: string) => Promise<string>;
    /** Open the auth ceremony in a full-screen overlay (default). */
    signIn: (opts?: { sessionRelayHost?: string; extraAppHosts?: string[] }) => Promise<void>;
    /**
     * Mount the auth iframe inline inside `container` (instead of a
     * full-screen overlay). Used by the in-panel sign-in view so the
     * surrounding chat shell stays visible. The provider builds a
     * one-shot `AuthFrame` per call; once the ceremony resolves, the
     * persistent renewal frame picks up the session via cross-origin
     * SSO and starts the silent-renewal timer.
     */
    signInInto: (container: HTMLElement, opts?: { sessionRelayHost?: string; extraAppHosts?: string[] }) => Promise<void>;
    /**
     * Re-establish the sealed enclave session after a page reload with
     * no wallet ceremony and no push: the privasys.id iframe bootstraps
     * against the enclave using the EncAuth voucher stored at the IdP.
     * No-op when a sealed session is already live; silently leaves
     * `sealedSession` null when no voucher exists or the enclave
     * refused it (sign-in then re-creates it).
     */
    resumeSealed: (appHost: string) => Promise<void>;
    /**
     * Return a sealed session for an arbitrary enclave `appHost` (e.g. the
     * chat-service back-end), independent of the primary `sealedSession`
     * (which is the inference instance). Per-host cached; resumes silently
     * via the EncAuth voucher. Returns null when not signed in, no voucher
     * exists, or the enclave refused — callers then degrade gracefully.
     */
    getSealedSession: (appHost: string) => Promise<SealedSession | null>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    session: null,
    loading: true,
    expired: false,
    sealedSession: null,
    getTokenForAudience: async () => {
        throw new Error('getTokenForAudience called outside PrivasysAuthProvider');
    },
    signIn: async () => {},
    signInInto: async () => {},
    resumeSealed: async () => {},
    getSealedSession: async () => null,
    signOut: async () => {}
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
    authenticatedAt?: number
): AuthSession {
    return {
        accessToken: token,
        rpId,
        authenticatedAt: authenticatedAt ?? Date.now()
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
    const [sealedSession, setSealedSession] = useState<SealedSession | null>(null);
    const frameRef = useRef<AuthFrame | null>(null);
    // Dedicated frame for voucher-based sealed resume. Separate from the
    // persistent renewal frame because `sessionRelay.appHost` is a
    // constructor-only option and the appHost is per-instance (only
    // known once the instance metadata loads).
    const sealedFrameRef = useRef<AuthFrame | null>(null);
    const sealedHostRef = useRef<string | null>(null);
    const sealedResumeInFlight = useRef<Promise<void> | null>(null);
    // Per-host sealed sessions for enclaves other than the inference instance
    // (e.g. the chat-service back-end). Each enclave needs its own sealed
    // session; this map keeps one frame + session per appHost.
    const sealedByHost = useRef<Map<string, { frame: AuthFrame; session: SealedSession }>>(new Map());
    const sealedByHostInFlight = useRef<Map<string, Promise<SealedSession | null>>>(new Map());

    const getFrame = useCallback(() => {
        if (!frameRef.current) {
            frameRef.current = new AuthFrame(config);
            frameRef.current.onSessionExpired = () => {
                setSession(null);
                setExpired(true);
            };
            frameRef.current.onSessionRenewed = (_rpId, accessToken) => {
                // Adopt the freshly-renewed token directly. Round-tripping
                // through getSession() can return a cached, already-expired
                // token → false "session expired" cleared only by reload.
                if (accessToken) {
                    setSession(sessionFromToken(accessToken, config.rpId ?? config.appName));
                    setExpired(false);
                }
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
                            sessionFromToken(s.token, s.rpId, s.authenticatedAt)
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
        [config, getFrame]
    );

    const signIn = useCallback(
        async (opts?: { sessionRelayHost?: string; extraAppHosts?: string[] }) => {
            // For the sealed-transport flow we need a one-shot frame whose
            // `sessionRelay.appHost` was set at construction time so the QR
            // includes the SDK pubkey. The persistent frame (used for SSO
            // check + silent renewal) doesn't need it.
            if (opts?.sessionRelayHost) {
                const oneShot = new AuthFrame({
                    ...config,
                    sessionRelay: {
                        appHost: opts.sessionRelayHost,
                        ...(opts.extraAppHosts?.length ? { extraAppHosts: opts.extraAppHosts } : {})
                    }
                });
                const result = await oneShot.signIn();
                acceptResultToken(result.accessToken ?? result.sessionToken);
                if (result.sessionRelay) {
                    try {
                        const s = await oneShot.session();
                        setSealedSession(s);
                    } catch (err) {
                        console.warn('[chat-auth] sealed session install failed:', err);
                    }
                }
                return;
            }
            const frame = getFrame();
            const result = await frame.signIn();
            acceptResultToken(result.accessToken ?? result.sessionToken);
        },
        [config, getFrame, acceptResultToken]
    );

    const signInInto = useCallback(
        async (container: HTMLElement, opts?: { sessionRelayHost?: string; extraAppHosts?: string[] }) => {
            // One-shot inline frame. We don't reuse `frameRef` because
            // `container` is a constructor-only option in @privasys/auth
            // and the persistent frame must keep its renewal iframe
            // attached to <body>.
            const inline = new AuthFrame({
                ...config,
                container,
                ...(opts?.sessionRelayHost
                    ? {
                        sessionRelay: {
                            appHost: opts.sessionRelayHost,
                            ...(opts.extraAppHosts?.length ? { extraAppHosts: opts.extraAppHosts } : {})
                        }
                    }
                    : {})
            });
            const result = await inline.signIn();
            acceptResultToken(result.accessToken ?? result.sessionToken);
            if (opts?.sessionRelayHost && result.sessionRelay) {
                try {
                    const s = await inline.session();
                    setSealedSession(s);
                } catch (err) {
                    console.warn('[chat-auth] sealed session install failed:', err);
                }
            }
        },
        [config, acceptResultToken]
    );

    const resumeSealed = useCallback(
        async (appHost: string) => {
            if (sealedSession) return;
            if (sealedResumeInFlight.current) return sealedResumeInFlight.current;
            const run = (async () => {
                let frame = sealedFrameRef.current;
                if (!frame || sealedHostRef.current !== appHost) {
                    sealedFrameRef.current?.destroy();
                    frame = new AuthFrame({
                        ...config,
                        sessionRelay: { appHost }
                    });
                    sealedFrameRef.current = frame;
                    sealedHostRef.current = appHost;
                }
                try {
                    const s = await frame.resumeSession();
                    setSealedSession(s);
                } catch (err) {
                    // no-voucher    → user never completed a sealed sign-in here
                    // rejected      → enclave identity/measurement changed; a
                    //                 wallet ceremony is required
                    // unavailable   → transient transport failure
                    // All three leave sealedSession null; the sign-in flow
                    // (or a later retry) re-creates the sealed transport.
                    console.log('[chat-auth] sealed resume unavailable:', (err as Error).message);
                }
            })();
            sealedResumeInFlight.current = run;
            try {
                await run;
            } finally {
                sealedResumeInFlight.current = null;
            }
        },
        [config, sealedSession]
    );

    // getSealedSession returns (and caches) a sealed session for an arbitrary
    // enclave appHost, independent of the primary instance session. Used to
    // reach the chat-service back-end (a separate enclave) without the bearer
    // or tool data ever crossing the gateway's terminate path.
    const getSealedSession = useCallback(
        async (appHost: string): Promise<SealedSession | null> => {
            if (!session) return null;
            const cached = sealedByHost.current.get(appHost);
            if (cached) return cached.session;
            const inflight = sealedByHostInFlight.current.get(appHost);
            if (inflight) return inflight;
            const run = (async (): Promise<SealedSession | null> => {
                const frame = new AuthFrame({ ...config, sessionRelay: { appHost } });
                try {
                    const s = await frame.resumeSession();
                    sealedByHost.current.set(appHost, { frame, session: s });
                    return s;
                } catch (err) {
                    frame.destroy();
                    // no-voucher / rejected / unavailable — caller degrades.
                    console.log(`[chat-auth] sealed session for ${appHost} unavailable:`, (err as Error).message);
                    return null;
                }
            })();
            sealedByHostInFlight.current.set(appHost, run);
            try {
                return await run;
            } finally {
                sealedByHostInFlight.current.delete(appHost);
            }
        },
        [config, session]
    );

    const signOut = useCallback(async () => {
        const frame = getFrame();
        await frame.clearSession();
        setSession(null);
        setSealedSession(null);
        sealedFrameRef.current?.destroy();
        sealedFrameRef.current = null;
        sealedHostRef.current = null;
        for (const { frame: f } of sealedByHost.current.values()) f.destroy();
        sealedByHost.current.clear();
    }, [getFrame]);

    const getTokenForAudience = useCallback(
        async (audience: string) => {
            const frame = getFrame();
            // The persistent renewal iframe must be live for the
            // postMessage relay; cross-site SSO bootstraps it on mount,
            // but call getSession() defensively to ensure it's mounted
            // (no-op if a session iframe is already attached).
            await frame.getSession();
            return frame.getTokenForAudience(audience);
        },
        [getFrame]
    );

    // Expose a minimal helper on `window.PrivasysAuth` so the copy-paste
    // quote-verification snippet (and other dev-console flows) can mint
    // an audience-scoped token without having to wire the React context
    // out by hand. Only the audience-token method is exposed - sign-in /
    // sign-out flows stay routed through the React context.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const w = window as unknown as {
            PrivasysAuth?: { getTokenForAudience: (_audience: string) => Promise<string> };
        };
        w.PrivasysAuth = { getTokenForAudience };
        return () => {
            if (w.PrivasysAuth?.getTokenForAudience === getTokenForAudience) {
                delete w.PrivasysAuth;
            }
        };
    }, [getTokenForAudience]);

    return (
        <AuthContext.Provider
            value={{ session, loading, expired, sealedSession, getTokenForAudience, signIn, signInInto, resumeSealed, getSealedSession, signOut }}
        >
            {children}
        </AuthContext.Provider>
    );
}
