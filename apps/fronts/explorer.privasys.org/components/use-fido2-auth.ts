// Per-WASM-app FIDO2/EncAuth session lifecycle, backed by the hosted Privasys
// auth SDK's AuthFrame. Ported from the legacy explorer.js auth flow: the
// frame signs the user into the app-specific RP (`<appName>.<gatewayDomain>`),
// and the resulting session token rides API calls as `X-App-Auth`.
//
// The auth *state* lives here (lifted above the tabs) so the connected-view
// header can show the auth badge / sign-out, and the API Testing tab can read
// the session token. The iframe *container* is owned by the Authenticate tab,
// which passes its ref into restoreInto()/signInInto().

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ENV_CONFIG, FIDO2_TIMEOUT, type ConnectionConfig } from '~/lib/config';
import { getPrivasys, type AuthFrame } from '~/lib/privasys-sdk';

export type Fido2Status = 'idle' | 'complete' | 'error';

export interface Fido2State {
    status: Fido2Status;
    token: string;
    sessionId: string;
    attestation: Record<string, unknown> | null;
    error: string;
    sessionChecked: boolean;
    /** A sign-in ceremony is currently running in the embedded frame. */
    signingIn: boolean;
}

export interface Fido2Actions {
    restoreInto: (_container: HTMLElement) => void;
    signInInto: (_container: HTMLElement) => void;
    signOut: () => void;
    reauthenticate: () => void;
    retry: () => void;
    /** Clear the app session locally (e.g. after an expired-token RPC). */
    expireLocally: () => void;
}

const INITIAL: Fido2State = {
    status: 'idle',
    token: '',
    sessionId: '',
    attestation: null,
    error: '',
    sessionChecked: false,
    signingIn: false
};

export function useFido2Auth(connection: ConnectionConfig | null): [Fido2State, Fido2Actions] {
    const [state, setState] = useState<Fido2State>(INITIAL);
    const frameRef = useRef<AuthFrame | null>(null);
    // Synchronous concurrency guard for signInInto (state updates are async).
    const signingInRef = useRef(false);

    const rpId = connection ? `${connection.appName}.${connection.gatewayDomain}` : '';

    // Reset everything (and tear down any live frame) whenever the connection
    // target changes — a different app is a different RP and session.
    useEffect(() => {
        return () => {
            if (frameRef.current) {
                frameRef.current.destroy();
                frameRef.current = null;
            }
        };
    }, [rpId]);

    useEffect(() => {
        setState(INITIAL);
    }, [rpId]);

    const makeFrame = useCallback((container: HTMLElement): AuthFrame | null => {
        if (!connection) return null;
        const sdk = getPrivasys();
        if (!sdk) return null;
        const frame = new sdk.AuthFrame({
            apiBase: connection.baseUrl,
            appName: connection.appName,
            rpId,
            brokerUrl: connection.brokerUrl,
            authOrigin: ENV_CONFIG[connection.env].authOrigin,
            timeout: FIDO2_TIMEOUT,
            container,
            // Without a clientId the IdP ceremony returns only its own session
            // token, which the WASM enclave can never validate (it accepts its
            // own FIDO2 sessions or a platform at+jwt). With it, signIn() also
            // returns the IdP access token (aud privasys-platform) — the token
            // this hook already prefers — which the enclave's OIDC path
            // verifies. Mirrors chat/drive's auth-provider config.
            clientId: 'privasys-platform'
        });
        frame.onSessionExpired = () => {
            frameRef.current = null;
            setState({ ...INITIAL, sessionChecked: false });
        };
        frame.onSessionRenewed = (_id, accessToken) => {
            if (accessToken) {
                setState((s) => ({ ...s, token: accessToken }));
            } else {
                frame.getSession().then((session) => {
                    if (session?.token) setState((s) => ({ ...s, token: session.token as string }));
                }).catch(() => {});
            }
        };
        frameRef.current = frame;
        return frame;
    }, [connection, rpId]);

    const signInInto = useCallback((container: HTMLElement) => {
        // One ceremony at a time: a second AuthFrame while a wallet push is
        // in flight orphans the first — the phone approval then lands on a
        // ceremony nobody is listening to while the visible one times out
        // (two stacked auth frames in the UI).
        if (signingInRef.current) return;
        signingInRef.current = true;
        if (frameRef.current) {
            frameRef.current.destroy();
            frameRef.current = null;
        }
        // Belt and braces: never let a stray iframe from a destroyed frame
        // linger in the container alongside the new one.
        container.replaceChildren();
        const frame = makeFrame(container);
        if (!frame) {
            signingInRef.current = false;
            setState((s) => ({ ...s, status: 'error', signingIn: false, error: 'Auth SDK not loaded. The hosted privasys-auth-client.iife.js bundle on privasys.id may be unavailable.' }));
            return;
        }
        setState((s) => ({ ...s, signingIn: true }));
        frame.signIn().then((result) => {
            signingInRef.current = false;
            setState({
                status: 'complete',
                token: result.accessToken || result.sessionToken || '',
                attestation: result.attestation ?? null,
                sessionId: result.sessionId || '',
                error: '',
                sessionChecked: true,
                signingIn: false
            });
        }).catch((e: unknown) => {
            signingInRef.current = false;
            const msg = e instanceof Error ? e.message : 'Authentication failed';
            if (msg === 'Authentication cancelled') {
                // User closed the auth iframe — discard the stale frame and fall
                // back to the sign-in prompt.
                frameRef.current = null;
                setState((s) => ({ ...s, status: 'idle', sessionChecked: true, signingIn: false }));
                return;
            }
            setState((s) => ({ ...s, status: 'error', signingIn: false, error: msg }));
        });
    }, [makeFrame]);

    const restoreInto = useCallback((container: HTMLElement) => {
        // Restore an existing privasys.id session if there is one — but never
        // auto-start a sign-in ceremony: a wallet push fired without a user
        // gesture races the explicit Sign in button (two concurrent
        // ceremonies, one orphaned). No session → the tab simply shows the
        // Sign in button.
        setState((s) => ({ ...s, sessionChecked: true }));
        const frame = frameRef.current ?? makeFrame(container);
        if (!frame) {
            setState((s) => ({ ...s, status: 'error', error: 'Auth SDK not loaded. The hosted privasys-auth-client.iife.js bundle on privasys.id may be unavailable.' }));
            return;
        }
        frame.getSession().then((session) => {
            if (session?.token) {
                setState((s) => ({ ...s, status: 'complete', token: session.token as string }));
            }
        }).catch(() => {
            // No restorable session — stay idle; the user signs in explicitly.
        });
    }, [makeFrame]);

    const signOut = useCallback(() => {
        const frame = frameRef.current;
        frameRef.current = null;
        signingInRef.current = false;
        const finish = () => setState({ ...INITIAL, sessionChecked: true });
        if (frame) {
            frame.clearSession().catch(() => {}).then(finish);
        } else {
            finish();
        }
    }, []);

    const reauthenticate = useCallback(() => {
        if (frameRef.current) {
            frameRef.current.destroy();
            frameRef.current = null;
        }
        signingInRef.current = false;
        setState({ ...INITIAL, sessionChecked: true });
    }, []);

    const retry = useCallback(() => {
        if (frameRef.current) {
            frameRef.current.destroy();
            frameRef.current = null;
        }
        signingInRef.current = false;
        setState(INITIAL);
    }, []);

    const expireLocally = useCallback(() => {
        frameRef.current?.clearSession().catch(() => {});
        frameRef.current = null;
        signingInRef.current = false;
        setState({ ...INITIAL, sessionChecked: false });
    }, []);

    return [state, { restoreInto, signInInto, signOut, reauthenticate, retry, expireLocally }];
}
