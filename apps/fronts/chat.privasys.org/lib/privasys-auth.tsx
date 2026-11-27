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
import { AuthFrame, type AppChannel, type AuthFrameConfig, type Session } from '@privasys/auth';

// Auth context for the Privasys Chat front-end.
//
// One AuthFrame for the page: the person's session with chat's client, and
// the channel to every enclave chat talks to (the inference instance, the
// chat-service back-end, the Drive enclave), each reached with app(host) on
// this same frame. A channel that stopped working is re-established by
// calling app() again, never by another frame.

export interface AuthSession {
    /** JWT access_token issued by the IdP. */
    accessToken: string;
}

/**
 * Outcome of a sealed-channel (re-)establish attempt.
 *
 * - `ok`         — the channel is live.
 * - `no-voucher` — no one is signed in, so there is no channel to open.
 * - `rejected`   — the wallet approval the enclave needs was not given
 *                  (declined, or not in time).
 * - `unavailable`— transient transport failure, worth retrying.
 */
export type SealedResumeOutcome = 'ok' | 'no-voucher' | 'rejected' | 'unavailable';

/**
 * Why the enclave asked for a new wallet approval, when it said:
 * `workload-changed` = the app's code/config was updated since the user
 * verified it; `enc-changed` = the hosting platform's identity changed.
 * The wallet then shows the user exactly what changed. Null otherwise.
 */
export type SealedStaleReason = 'workload-changed' | 'enc-changed' | null;

function parseStaleReason(msg: string): SealedStaleReason {
    if (msg.includes('workload-changed')) return 'workload-changed';
    if (msg.includes('enc-changed')) return 'enc-changed';
    return null;
}

interface AuthContextValue {
    session: AuthSession | null;
    loading: boolean;
    expired: boolean;
    /** The channel to the inference instance, once established. */
    sealedSession: AppChannel | null;
    /**
     * Mint a per-audience JWT without rotating the session. Used to call
     * attestation-server's verify-quote endpoint with `aud=attestation-server`.
     * Never persisted into the session context.
     */
    token: (audience: string) => Promise<string>;
    /**
     * The gate (SDK `connect()`): silent restore, or the sign-in rendered by
     * the SDK inside `container`. With `appHost`, then opens the channel to
     * that instance (one tap in the wallet when it has no approval yet) and
     * installs it as `sealedSession`. Rejects with the SDK's ConnectError
     * (`code: 'cancelled' | 'timeout' | 'failed'`).
     */
    connectInto: (container: HTMLElement, opts?: { appHost?: string }) => Promise<void>;
    /**
     * Re-establish the channel to the inference instance: at once when it is
     * live, from the stored approval, or after one tap in the wallet (then
     * `sealedApprovalPending` is true and `staleReason` says what changed).
     */
    reestablishSealed: (appHost: string) => Promise<SealedResumeOutcome>;
    /** What changed when the enclave last asked for a new approval. */
    staleReason: SealedStaleReason;
    /** True while a channel waits for an approval in the Privasys Wallet. */
    sealedApprovalPending: boolean;
    /**
     * The channel to another enclave `appHost` (chat-service, Drive). The
     * same host gives the same channel. When the wallet must approve it,
     * `onApproval` is called while it waits. Null when not signed in or
     * when it cannot be established: callers degrade gracefully.
     */
    getSealedSession: (appHost: string, onApproval?: () => void) => Promise<AppChannel | null>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    session: null,
    loading: true,
    expired: false,
    sealedSession: null,
    token: async () => {
        throw new Error('token called outside PrivasysAuthProvider');
    },
    connectInto: async () => {},
    reestablishSealed: async () => 'unavailable',
    staleReason: null,
    sealedApprovalPending: false,
    getSealedSession: async () => null,
    signOut: async () => {}
});

export function useAuth(): AuthContextValue {
    return useContext(AuthContext);
}

interface PrivasysAuthProviderProps {
    children: ReactNode;
    /** The page's AuthFrame configuration, read once. */
    config: () => AuthFrameConfig;
}

export function PrivasysAuthProvider({ children, config }: PrivasysAuthProviderProps) {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [expired, setExpired] = useState(false);
    const [sealedSession, setSealedSession] = useState<AppChannel | null>(null);
    const [staleReason, setStaleReason] = useState<SealedStaleReason>(null);
    const [sealedApprovalPending, setSealedApprovalPending] = useState(false);
    const frameRef = useRef<AuthFrame | null>(null);
    const configRef = useRef(config);
    // Whether this page holds a session and whether it is signing out on
    // purpose: a session that ends otherwise reads as expired.
    const signedIn = useRef(false);
    const signingOut = useRef(false);

    const getFrame = useCallback((): AuthFrame => {
        if (!frameRef.current) frameRef.current = new AuthFrame(configRef.current());
        return frameRef.current;
    }, []);

    // The stored session first, then every renewal, sign-in, sign-out and
    // expiry, from any tab of the site.
    useEffect(() => {
        return getFrame().onSessionChange((s: Session | null) => {
            if (s) {
                signedIn.current = true;
                setSession({ accessToken: s.token });
                setExpired(false);
            } else {
                if (signedIn.current && !signingOut.current) setExpired(true);
                signedIn.current = false;
                setSession(null);
                setSealedSession(null);
            }
            setLoading(false);
        });
    }, [getFrame]);

    // A primary channel that can no longer continue is dropped: the shell
    // then re-establishes it with reestablishSealed (app() again).
    useEffect(() => {
        if (!sealedSession) return;
        return sealedSession.onState((s) => {
            if (s === 'signed-out') setSealedSession(null);
        });
    }, [sealedSession]);

    /** app(host) on the page's frame, reporting a wait for the wallet. */
    const openChannel = useCallback(async (appHost: string, onApproval?: () => void): Promise<AppChannel> => {
        try {
            return await getFrame().app(appHost, {
                onApproval: (reason) => {
                    setSealedApprovalPending(true);
                    setStaleReason(parseStaleReason(reason ?? ''));
                    onApproval?.();
                }
            });
        } finally {
            setSealedApprovalPending(false);
        }
    }, [getFrame]);

    const connectInto = useCallback(
        async (container: HTMLElement, opts?: { appHost?: string }): Promise<void> => {
            const s = await getFrame().connect({ container });
            signedIn.current = true;
            setSession({ accessToken: s.token });
            setExpired(false);
            if (opts?.appHost) {
                const ch = await openChannel(opts.appHost);
                setSealedSession(ch);
                setStaleReason(null);
            }
        },
        [getFrame, openChannel]
    );

    const reestablishSealed = useCallback(
        async (appHost: string): Promise<SealedResumeOutcome> => {
            // The SDK is already re-establishing it: wait for that.
            if (sealedSession?.state === 'reconnecting') return 'unavailable';
            try {
                const ch = await openChannel(appHost);
                setSealedSession(ch);
                setStaleReason(null);
                return 'ok';
            } catch (err) {
                const msg = (err as Error).message ?? '';
                if (msg.includes('not signed in')) return 'no-voucher';
                if (/rejected|declined|timeout/i.test(msg)) {
                    console.warn(`[chat-auth] channel to ${appHost} not approved:`, msg);
                    if (parseStaleReason(msg)) setStaleReason(parseStaleReason(msg));
                    return 'rejected';
                }
                console.log('[chat-auth] channel re-establish failed:', msg);
                return 'unavailable';
            }
        },
        [openChannel, sealedSession]
    );

    const getSealedSession = useCallback(
        async (appHost: string, onApproval?: () => void): Promise<AppChannel | null> => {
            if (!session) return null;
            try {
                return await openChannel(appHost, onApproval);
            } catch (err) {
                console.log(`[chat-auth] channel to ${appHost} unavailable:`, (err as Error).message);
                return null;
            }
        },
        [openChannel, session]
    );

    const signOut = useCallback(async () => {
        signingOut.current = true;
        try {
            await getFrame().signOut();
        } finally {
            signingOut.current = false;
        }
        setSession(null);
        setSealedSession(null);
    }, [getFrame]);

    const token = useCallback((audience: string) => getFrame().token(audience), [getFrame]);

    // Expose a minimal helper on `window.PrivasysAuth` so the copy-paste
    // quote-verification snippet (and other dev-console flows) can mint
    // an audience-scoped token without having to wire the React context
    // out by hand. Only the audience-token method is exposed: sign-in and
    // sign-out stay routed through the React context.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const w = window as unknown as {
            PrivasysAuth?: { getTokenForAudience: (_audience: string) => Promise<string> };
        };
        const helper = { getTokenForAudience: token };
        w.PrivasysAuth = helper;
        return () => {
            if (w.PrivasysAuth === helper) delete w.PrivasysAuth;
        };
    }, [token]);

    return (
        <AuthContext.Provider
            value={{ session, loading, expired, sealedSession, token, connectInto, reestablishSealed, staleReason, sealedApprovalPending, getSealedSession, signOut }}
        >
            {children}
        </AuthContext.Provider>
    );
}
