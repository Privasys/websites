// Sealed app calls: how a browser talks to an app running in an enclave.
//
// A browser cannot fetch an enclave directly — an RA-TLS leaf is self-signed
// and no browser will verify it — which is why the management-service once
// relayed these calls (`/apps/{id}/rpc/{fn}`, `/apps/{id}/call/{fn}`). That
// relay costs the caller its attestation: mgmt sits in the middle, and its
// control-plane body cap (1 MiB) applies to app data, which already truncates
// payloads like the ICAO CSCA master list.
//
// The sealed session replaced it. The SDK opens a wallet-attested channel to
// the app's own host; bytes are sealed browser->enclave, the gateway sees only
// ciphertext, and the enclave's own gates (freeze, configure authorisation,
// function auth policy, price consent) see the real inner request. This module
// is the shared plumbing so the portal and the explorer agree on tool
// resolution, defaults, and error shape.
//
// What still belongs to mgmt: deploy and lifecycle, attestation extensions,
// schema discovery, `/apps/{id}/attest`, and the app MCP surface. Those are
// control plane. App calls are data plane.

export * from './manifest';
export * from './call';
