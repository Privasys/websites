// Per-enclave sealed session helper for direct portal -> enclave deploys.
//
// The developer portal does NOT relay deploys through the management
// service. Instead it opens a wallet-attested PrivasysSession against
// `<enclave-name>-mgr.<AppDomain>` (gateway sealed-relay path) and POSTs
// a `wasm_load` / `container_load` envelope directly to the enclave.
//
// Each call returns an `AuthFrame` already configured with
// `sessionRelay.appHost`. The caller calls `frame.signIn()` to trigger
// the wallet QR ceremony, then `frame.session()` to obtain the
// `SealedSession`. After the deploy the caller MUST call `frame.close()`
// to remove the iframe.

import { AuthFrame, type AuthFrameConfig } from '@privasys/auth';
import { getApiBaseUrl } from './api-base-url';

export interface OpenEnclaveSessionOptions {
    /** Hostname (no scheme) of the enclave's manager-mode SNI, e.g. `myenclave-mgr.apps.privasys.org`. */
    appHost: string;
}

/**
 * Construct an `AuthFrame` configured for sealed transport against the
 * given enclave host. The caller is responsible for `signIn()` and
 * `close()` (no automatic teardown — the iframe must stay mounted while
 * sealed requests are issued).
 */
export function newEnclaveAuthFrame(opts: OpenEnclaveSessionOptions): AuthFrame {
    const cfg: AuthFrameConfig = {
        apiBase: getApiBaseUrl(),
        appName: 'Privasys Developer Platform',
        authOrigin: process.env.NEXT_PUBLIC_IDP_ORIGIN || 'https://privasys.id',
        rpId: process.env.NEXT_PUBLIC_IDP_RP_ID || 'privasys.id',
        brokerUrl: process.env.NEXT_PUBLIC_BROKER_URL || 'wss://relay.privasys.org/relay',
        clientId: 'privasys-platform',
        scope: ['openid', 'offline_access'],
        sessionRelay: { appHost: opts.appHost },
    };
    return new AuthFrame(cfg);
}
