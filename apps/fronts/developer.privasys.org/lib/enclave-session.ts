// Per-enclave sealed session helper for direct portal -> enclave deploys.
//
// The developer portal does NOT relay deploys through the management
// service. Instead it opens a wallet-attested PrivasysSession against
// `<enclave-name>-mgr.<AppDomain>` (gateway sealed-relay path) and POSTs
// a `wasm_load` / `container_load` envelope directly to the enclave.
//
// Sealed `AuthFrame`s are cached per `appHost` and reused for the
// lifetime of the page. Each new sealed sign-in triggers a fresh wallet
// push notification AND kicks off a parallel OIDC PKCE ceremony inside
// privasys.id — that ceremony shares the `('privasys-platform',
// 'privasys.id')` (clientId, rpId) tuple with the app-wide
// `PrivasysAuthProvider`, so a fresh sign-in here rotates the same
// localStorage session entry the provider depends on. Reusing one
// AuthFrame per appHost means:
//   1. Repeated deploys to the same enclave do NOT trigger a new wallet
//      push (the cached sealed session is reused).
//   2. The OIDC token rotation happens at most once per appHost, so the
//      provider's renewal iframe is never starved of a refresh_token.
//
// If a sealed session ever errors out or expires, evict the cache entry
// via `dropEnclaveAuthFrame(appHost)` so the next deploy can rebuild it.

import { AuthFrame, type AuthFrameConfig, type SealedSession } from '@privasys/auth';
import { getApiBaseUrl } from './api-base-url';

export interface OpenEnclaveSessionOptions {
    /** Hostname (no scheme) of the enclave's manager-mode SNI, e.g. `myenclave-mgr.apps.privasys.org`. */
    appHost: string;
}

interface CacheEntry {
    frame: AuthFrame;
    /** In-flight signIn() promise, or null once it has resolved. */
    pending: Promise<void> | null;
    /** True once `signIn()` has resolved successfully at least once. */
    signedIn: boolean;
}

const frameCache = new Map<string, CacheEntry>();

function buildAuthFrame(appHost: string): AuthFrame {
    // CRITICAL: do NOT pass `clientId` here.
    //
    // The sealed AuthFrame's only job is to run the wallet ECDH
    // ceremony so the enclave can derive a shared session key
    // (`installSessionRelay()` inside the IdP frame-host). The user's
    // identity for the deploy is carried separately as a Bearer header
    // inside the sealed envelope (see `deployDirect()` in api.ts).
    //
    // If we set `clientId='privasys-platform'` here, the IdP frame-host
    // takes the OIDC PKCE branch — it runs a fresh `/authorize` +
    // `/token` exchange, stores the resulting session in privasys.id
    // localStorage under the SAME `(rpId='privasys.id', clientId=
    // 'privasys-platform')` key the app-wide PrivasysAuthProvider uses,
    // and calls `scheduleRenewal()` — which `cancelRenewal(rpId)`
    // first. That cancels the provider's existing renewal timer.
    // After this AuthFrame goes idle, no OIDC refresh runs, the JWT
    // expires after 15 minutes, the next API call returns 401, and the
    // portal shows "session expired".
    //
    // Using a distinct `rpId` per appHost adds belt-and-braces
    // isolation: even the non-OIDC branch stores an opaque session
    // under that rpId, so it can never collide with the provider's
    // entry under `rpId='privasys.id'`.
    const cfg: AuthFrameConfig = {
        apiBase: getApiBaseUrl(),
        appName: `Privasys Deploy (${appHost})`,
        authOrigin: process.env.NEXT_PUBLIC_IDP_ORIGIN || 'https://privasys.id',
        rpId: `privasys-platform-deploy:${appHost}`,
        brokerUrl: process.env.NEXT_PUBLIC_BROKER_URL || 'wss://relay.privasys.org/relay',
        sessionRelay: { appHost },
    };
    return new AuthFrame(cfg);
}

/**
 * Return a wallet-attested {@link SealedSession} for `appHost`,
 * establishing it on first call and reusing the cached one thereafter.
 *
 * The first call triggers a wallet push notification (the wallet attests
 * the SDK's ECDH public key into the FIDO2 ceremony so the enclave can
 * derive the shared session key). Subsequent calls within the same page
 * load resolve immediately with the cached session — no second push, no
 * second OIDC token rotation.
 */
export async function getEnclaveSealedSession(opts: OpenEnclaveSessionOptions): Promise<SealedSession> {
    let entry = frameCache.get(opts.appHost);
    if (!entry) {
        entry = {
            frame: buildAuthFrame(opts.appHost),
            pending: null,
            signedIn: false,
        };
        frameCache.set(opts.appHost, entry);
    }

    if (!entry.signedIn) {
        if (!entry.pending) {
            entry.pending = entry.frame.signIn().then(
                () => { if (entry) entry.signedIn = true; },
                (err) => {
                    // Sign-in failed — drop the cache entry so the next
                    // attempt starts from a clean iframe.
                    dropEnclaveAuthFrame(opts.appHost);
                    throw err;
                },
            ).finally(() => { if (entry) entry.pending = null; });
        }
        await entry.pending;
    }

    return entry.frame.session();
}

/**
 * Tear down the cached sealed `AuthFrame` for `appHost` (if any). Call
 * this when a sealed request fails in a way that suggests the session
 * is dead (gateway 5xx, decryption failure, explicit
 * `AuthFrame destroyed`, etc.) so the next deploy can rebuild it from
 * a fresh wallet ceremony.
 */
export function dropEnclaveAuthFrame(appHost: string): void {
    const entry = frameCache.get(appHost);
    if (!entry) return;
    frameCache.delete(appHost);
    try { entry.frame.destroy(); } catch { /* ignore */ }
}
