// The person's sign-in to the explorer, on its one AuthFrame (passkey or
// Privasys wallet). The state lives here (lifted above the tabs) so the
// connected-view header can show the auth badge and sign-out, and the API
// Testing tab knows whether someone is signed in. The gate's container is
// owned by the tab that starts the sign-in, which passes it to signInInto().
//
// The session is the explorer's, the same for every app it connects to and
// in every tab of the site; it is never sent to an app.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectError, type Session } from '@privasys/auth';
import type { ConnectionConfig } from '~/lib/config';
import { explorerAuth } from '~/lib/explorer-auth';

export type Fido2Status = 'idle' | 'complete' | 'error';

export interface Fido2State {
    status: Fido2Status;
    token: string;
    /** How the person signed in, once they have. */
    method: Session['method'] | '';
    error: string;
    /** The frame has reported whether a session is stored. */
    sessionChecked: boolean;
    /** A sign-in ceremony is currently running in the embedded frame. */
    signingIn: boolean;
}

export interface Fido2Actions {
    signInInto: (_container: HTMLElement) => void;
    signOut: () => void;
    retry: () => void;
    /** Sign out after an app reported the session dead. */
    expireLocally: () => void;
}

const INITIAL: Fido2State = {
    status: 'idle',
    token: '',
    method: '',
    error: '',
    sessionChecked: false,
    signingIn: false
};

export function useFido2Auth(connection: ConnectionConfig | null): [Fido2State, Fido2Actions] {
    const [state, setState] = useState<Fido2State>(INITIAL);
    // Synchronous concurrency guard for signInInto (state updates are async).
    const signingInRef = useRef(false);
    const brokerUrl = connection?.brokerUrl;

    // The stored session first, then every sign-in, renewal, sign-out and
    // expiry, from any tab of the explorer.
    useEffect(() => {
        return explorerAuth(brokerUrl).onSessionChange((s) => {
            setState((prev) => s
                ? { ...prev, status: 'complete', token: s.token, method: s.method, error: '', sessionChecked: true }
                : { ...INITIAL, sessionChecked: true, signingIn: prev.signingIn });
        });
    }, [brokerUrl]);

    const signInInto = useCallback((container: HTMLElement) => {
        // One ceremony at a time: the SDK refuses a second gate while one runs.
        if (signingInRef.current) return;
        signingInRef.current = true;
        setState((s) => ({ ...s, signingIn: true }));
        explorerAuth(brokerUrl).connect({ container }).then((s) => {
            signingInRef.current = false;
            setState({ status: 'complete', token: s.token, method: s.method, error: '', sessionChecked: true, signingIn: false });
        }).catch((e: unknown) => {
            signingInRef.current = false;
            if (e instanceof ConnectError && e.code === 'cancelled') {
                // The person closed the gate: back to the sign-in prompt.
                setState((s) => ({ ...s, status: 'idle', sessionChecked: true, signingIn: false }));
                return;
            }
            const msg = e instanceof Error ? e.message : 'Authentication failed';
            setState((s) => ({ ...s, status: 'error', signingIn: false, error: msg }));
        });
    }, [brokerUrl]);

    const signOut = useCallback(() => {
        signingInRef.current = false;
        explorerAuth(brokerUrl).signOut().catch(() => {}).then(() => setState({ ...INITIAL, sessionChecked: true }));
    }, [brokerUrl]);

    const retry = useCallback(() => {
        signingInRef.current = false;
        setState((s) => ({ ...s, status: 'idle', error: '', sessionChecked: true, signingIn: false }));
    }, []);

    return [state, { signInInto, signOut, retry, expireLocally: signOut }];
}
