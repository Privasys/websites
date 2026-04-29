---
title: "Bringing Attestation to the Browser: The Session-Relay Pattern"
author: "B Foing"
date: "2026-04-23"
---

Confidential computing makes a strong promise. The hardware can prove, cryptographically, what code is running and what configuration it was given. A client that *can* check that proof — verify the quote, parse the OIDs, compare them against a policy — gets an end-to-end-confidential channel into a workload that even the cloud operator cannot inspect. Our [RA-TLS](https://docs.privasys.org/concepts/ra-tls) integration uses exactly that. A Go client, a Rust client, our own iOS and Android wallet — they all dial the enclave, verify the quote on the leaf certificate, and only then send a single byte.

The browser cannot do any of that.

It does not parse SGX/TDX quotes. It will not let JavaScript inspect the TLS leaf chain. It will refuse a self-signed RA-TLS certificate with `ERR_CERT_AUTHORITY_INVALID` and never reach your enclave at all. And yet a huge fraction of what people actually want to build on top of confidential computing — chat clients, dashboards, document editors, custom UIs over a private model — runs in a browser. The mobile-app version of the same product runs in a WebView with the same constraints. Third-party SDKs embedded into someone else's web app don't even have a domain of their own.

So the question is not *whether* attestation should reach those clients. It is *how*, given that they are structurally incapable of doing the verification themselves.

This post is about the pattern we landed on, which we call **session relay**. It is now in production behind the Privasys identity platform, and `chat.privasys.org` is the first consumer.

## The constraint we refused to relax

A tempting, and wrong, answer is "have a server verify the quote on behalf of the browser, and then trust the server". That collapses the trust model to whatever box runs the verifier. The whole point of attestation is to remove that box from the trust path. If we end up with "trust this gateway because it told us the enclave is fine", we have built a more elaborate version of the cloud we were trying to leave behind.

The constraint we refused to relax was this: **the only entity that performs attestation verification is the user's own device, and nothing else makes a security decision based on it**. The browser inherits the result, but it inherits it as a *signed statement of the user's own wallet's verification*, not as a third party's claim. The wallet was already doing this for the FIDO2 sign-in flow — it RA-TLS-handshakes the enclave, verifies the quote, parses the OIDs, shows them in the UI, and only then prompts for a biometric. We needed to extend that single act of verification so that it covered, in addition to "I signed in", "and the channel my browser is about to open to that same enclave is bound to the exact attestation the wallet just verified".

That is a small extension of the protocol, but it has a load-bearing consequence: a single sentence ends up doing the work of an entire trust argument. We will get to that sentence in a moment.

## The shape of the flow

There are three parties on the user's side: the **wallet** (Privasys Wallet, on the user's phone), the **SDK** (running in an iframe under `privasys.id`, which is itself embedded in the consuming app), and the **parent page** (e.g. `chat.privasys.org`). On the platform side there is the **enclave**, the **platform gateway** that fronts it, the **identity provider** (`privasys.id`), and an **untrusted relay** that brokers the wallet ↔ SDK QR-code rendezvous.

The interesting part is the choreography:

1. The SDK iframe generates an ephemeral P-256 keypair, `(sdk_priv, sdk_pub)`. The public key goes into the QR code that the user scans with their wallet, alongside a fresh nonce and a `mode: "session-relay"` marker.
2. The wallet opens an RA-TLS connection to the enclave — the same kind of connection it has always opened — and verifies the leaf and the attestation OIDs. It then calls a small bootstrap endpoint inside the enclave: `POST /__privasys/session-bootstrap`, with `sdk_pub` in the body.
3. The enclave generates its own ephemeral P-256 keypair `(enc_priv, enc_pub)` and a fresh `session_id`. It computes `K = HKDF(ECDH(enc_priv, sdk_pub), salt = session_id, info = "privasys-session/v1")` and stashes `K` next to the `session_id` in an in-memory table. It returns `session_id` and `enc_pub` to the wallet.
4. The wallet now has every piece it needs. It computes a single SHA-256 over `"privasys-session-relay/v1" || nonce || sdk_pub || quote_hash || enc_pub || session_id`, and uses that hash as the **WebAuthn challenge** for the biometric ceremony.
5. The IdP, when it receives the assertion, recomputes the same hash from the same inputs (every input is sent to the IdP for this purpose). It constant-time-compares the recomputed value against the assertion's `clientDataJSON.challenge`. **Mismatch → 400, no JWT minted.**
6. The IdP signs a JWT that carries the attestation result (`att_verified`, `att_quote_hash`, `att_oids`) and the session binding (`session.{id, enc_pub, expires_at, sdk_pub_bind}`). The wallet hands this back through the relay.
7. The SDK iframe receives the JWT, computes the same `K` (it has `sdk_priv` and the JWT carries `enc_pub`), and verifies that `sdk_pub_bind` matches the SHA-256 of *its own* `sdk_pub`. From here on, every request body the parent page wants to send is sealed in the iframe with `K` (AES-256-GCM, sealed-CBOR envelope, monotonic counters), forwarded through the public TLS the gateway terminates, and unsealed inside the enclave.

The gateway terminates a perfectly ordinary Let's Encrypt wildcard certificate, so the user's browser shows the green padlock it expects. The gateway does not see plaintext; it sees AEAD ciphertext in `application/privasys-sealed+cbor`. The enclave receives ciphertext, looks `K` up in its session table, and unwraps it before the application code ever sees the request.

## The single sentence that holds the protocol up

Step 5 above. The IdP recomputes the binding-challenge hash from query-string inputs and constant-time-compares it against `clientDataJSON.challenge`.

Without that check, the JWT is just "a wallet talked to an IdP". With it, the JWT is "a wallet — the one holding the FIDO2 private key for this account — verified attestation OIDs `X` for an enclave whose RA-TLS leaf hashes to `Y`, and bound a session whose key was derived from `sdk_pub`/`enc_pub` to that result". Every property the SDK gets to assume — that the JWT belongs to *this* SDK instance, that the enclave whose attestation is in the claims is the same enclave the session key is shared with, that the wallet really did the verification — flows from that one comparison.

It is the smallest possible amount of code, it has known-answer test vectors that the wallet (TypeScript), the IdP (Go), and the future enclave-side recomputations all reproduce byte-for-byte, and it is the only check we will ever soften over our dead bodies.

## What this looks like end-to-end

Once the JWT is in the iframe, the steady-state shape is unsurprising. Inside the iframe is a small `PrivasysSession` class. It exposes `request(method, path, body)` and `json(method, path, body)`. The parent page asks it to make an HTTP call; the class wraps the body, increments a per-direction counter, and ships the request to the public gateway URL. A response comes back, the class unwraps it, and the parent gets back the plaintext it would have gotten from `fetch`. From the application code's point of view, very little changes. From a network operator's point of view, the body bytes are AES-256-GCM ciphertext bound to a session key that lives only in the iframe and only in the enclave.

The wallet UI also caught up. We just shipped a build where the Home tab shows a `SESSIONS` section above the existing `CONNECTED SERVICES`, with one row per active session-relay binding. Each row is a green dot and a live countdown — "Relaying · 47m left" — that ticks down to the enclave-side TTL and disappears when it expires. The phone is not just an authenticator; it is a real-time view of which browser tabs are speaking sealed-CBOR to which enclaves on the user's behalf.

## Why this matters beyond chat

Browsers are not the only structurally-incapable client out there. A native mobile app embedded into a host with no crypto-extension API, a third-party JavaScript SDK distributed under someone else's domain, a smart-card terminal that can do TLS but not RA-TLS, a custom hardware client whose firmware update cycle is incompatible with quote-format changes — they all face the same fundamental problem: they cannot perform attestation verification themselves, but they want to talk to attested workloads end-to-end. The session-relay pattern is the answer for any of them. Pair the incapable client with a *capable* device the user already trusts (in our case, the Privasys Wallet), have the capable device do the verification once, and let the incapable client inherit the result through a JWT it cannot forge and a session key it cannot derive without holding the right ephemeral keypair.

You are not extending the trust model. You are extending the *reach* of the existing trust model. The wallet was already the verifier for sign-in. It is now the verifier for the session.

## Closing note

Confidential computing has a long-standing problem with reach. Server-side software that is happy to integrate quote verification has been the only first-class citizen for too long. If we want this technology to actually replace the "trust me" cloud, the surface area has to grow. It has to grow into browsers, into mobile WebViews, into third-party SDKs that have no domain of their own. It has to grow into surfaces that — by hard structural constraint, not by laziness — cannot perform the verification themselves.

Session relay is our answer for that. It is small, it pivots on a single hash, and it lets a phone the user already owns be the verification anchor for any other surface they happen to be using. The wallet is in their pocket. The phone is the one the manufacturer's secure element is wired into. The phone is the one the FIDO2 credential lives on. The phone is the one we are willing to bet the trust argument on. We are now extending that bet to cover the whole connection, not just the sign-in.

If you want the engineering details, the [identity-platform documentation](https://docs.privasys.org/) covers how the wallet, SDK, and IdP fit together. The full wire contract — QR payload, key derivation, AEAD framing, challenge binding, JWT claims — is locked in our internal spec and reproduced byte-for-byte across four codebases (TypeScript SDK, Go IdP, Go enclave-os-virtual middleware, Rust enclave-os-mini middleware), with known-answer tests for the binding hash already shipped and HKDF/AEAD vectors next on the list. The wallet is live on both its iOS and Android versions, and a rebuild with the live-sessions Home view is in the next submission.

We will write again when the iframe RPC lands and `chat.privasys.org` is talking sealed-CBOR end-to-end. For now, the protocol is in production, and the green padlock on a confidential-ai endpoint is a downstream consequence of the user's wallet having done the work.

---

*The Privasys identity platform — wallet, SDK, IdP, broker — is open source under the AGPL-3.0 licence at [github.com/Privasys/identity-platform](https://github.com/Privasys/identity-platform). The platform gateway and enclave runtimes (`enclave-os-virtual`, `enclave-os-mini`) are at [github.com/Privasys](https://github.com/Privasys).*
