// Thin typed wrapper around the hosted Privasys auth SDK
// (`https://privasys.id/auth/privasys-auth-client.iife.js`, loaded via
// next/script in the layout and exposed as `window.Privasys`).
//
// The explorer uses two distinct AuthFrames:
//   * a per-WASM-app frame (rpId `<appName>.<gatewayDomain>`) for the
//     Authenticate tab's EncAuth sign-in, and
//   * a Privasys.id frame (OIDC `privasys-platform` client) used ONLY to
//     mint `aud=attestation-server` JWTs for the "Get Token" button.

'use client';

import { ENV_CONFIG, type EnvKey } from './config';

export interface AuthFrameOptions {
    apiBase: string;
    appName: string;
    rpId: string;
    brokerUrl?: string;
    authOrigin: string;
    timeout?: number;
    container?: HTMLElement;
    clientId?: string;
    scope?: string[];
}

export interface AuthSignInResult {
    accessToken?: string;
    sessionToken?: string;
    attestation?: Record<string, unknown> | null;
    sessionId?: string;
}

export interface AuthSession {
    token?: string;
}

export interface AuthFrame {
    rpId: string;
    onSessionExpired?: (rpId: string) => void;
    onSessionRenewed?: (rpId: string, accessToken?: string) => void;
    signIn(): Promise<AuthSignInResult>;
    getSession(): Promise<AuthSession | null>;
    getTokenForAudience(audience: string): Promise<string>;
    clearSession(): Promise<void>;
    destroy(): void;
}

export interface PrivasysSdk {
    AuthFrame: new (opts: AuthFrameOptions) => AuthFrame;
}

declare global {
    interface Window {
        Privasys?: PrivasysSdk;
    }
}

// Return the loaded SDK, or null if the hosted bundle has not (yet) loaded.
export function getPrivasys(): PrivasysSdk | null {
    if (typeof window === 'undefined') return null;
    return window.Privasys ?? null;
}

// A separate Privasys.id AuthFrame, memoised per environment. Distinct from
// the per-app auth frame the Authenticate tab drives: minting an
// `aud=attestation-server` token needs the user's *Privasys.id* identity
// (OIDC `privasys-platform` client), not the per-WASM-app RP.
let idpFrame: AuthFrame | null = null;
let idpFrameEnv: EnvKey | null = null;

function getIdpAuthFrame(env: EnvKey): AuthFrame | null {
    const sdk = getPrivasys();
    if (!sdk) return null;
    if (idpFrame && idpFrameEnv === env) return idpFrame;
    idpFrame = new sdk.AuthFrame({
        apiBase: ENV_CONFIG[env].baseUrl,
        appName: 'Privasys Explorer',
        rpId: 'privasys.id',
        authOrigin: ENV_CONFIG[env].authOrigin,
        clientId: 'privasys-platform',
        scope: ['openid', 'email', 'profile', 'offline_access']
    });
    idpFrameEnv = env;
    return idpFrame;
}

// Drive a full sign-in + audience-token mint against privasys.id.
//
// getSession() returns a cached session or null (tearing down the SSO probe
// iframe); getTokenForAudience() needs a live session iframe, so if there is
// no cached session we sign in and re-fetch the session before minting.
export async function mintAudienceToken(env: EnvKey, audience: string): Promise<string> {
    const frame = getIdpAuthFrame(env);
    if (!frame) {
        throw new Error('Auth SDK not loaded. The hosted privasys-auth-client.iife.js bundle on privasys.id may be unavailable.');
    }
    let session = await frame.getSession();
    if (!session) {
        await frame.signIn();
        session = await frame.getSession();
    }
    if (!session) {
        throw new Error('Sign-in completed but no session was established');
    }
    return frame.getTokenForAudience(audience);
}
