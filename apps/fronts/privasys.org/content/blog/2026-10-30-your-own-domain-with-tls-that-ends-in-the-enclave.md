---
title: "Your Own Domain, with TLS That Ends in the Enclave"
author: "B Foing"
date: "2026-10-30"
---

An application on our platform has an attested address, `<app>.apps.privasys.org`, and the clients we ship check the enclave behind it on every connection: the wallet, the CLI and the [RA-TLS clients](/blog/level-3-proven-attested-tls-inside-the-handshake) read the enclave's evidence inside the TLS handshake before they send anything. A business putting a product in front of its customers wants its own name in the address bar, though, such as `app.example.com`, and a browser cannot read attestation evidence. Since 29 October, an application served on its own domain gets a certificate that only its enclave can hold, and the TLS connection to that name ends inside the enclave. Direct names are built for the people who reach an application without the Privasys Wallet: the wallet checks the enclave itself, and it remains the way we recommend to use a confidential application.

## Where TLS ends decides who can read the traffic

Every request to an application on the platform first reaches a gateway, which routes it to the machine running the enclave. The usual way to serve a custom name behind a gateway or a load balancer is for that gateway to hold the name's certificate: it terminates TLS, reads the request, and opens a second connection to the application. That is how most hosting works, and it is how our gateway handled custom names until this release.

On our platform, user data has never travelled in the clear through the gateway. Every request carrying it goes through a [sealed session](/blog/bringing-attestation-to-the-browser-the-session-relay-pattern): the browser encrypts it to a key held in the enclave, so the gateway only ever carries ciphertext, whoever holds the TLS certificate. What the gateway did terminate on a custom name was the delivery of the page itself: its HTML and scripts, served by the enclave, crossed the gateway in the clear on their way to the browser. The gateway is ordinary infrastructure, and the code that will encrypt the person's data should come straight from the enclave too.

## The gateway passes bytes, the enclave holds the certificate

A name in **direct** mode is passed through by the gateway at the TCP level. It looks at the name the browser asks for in the TLS ClientHello, forwards the connection to the right enclave, and from then on only carries encrypted bytes. It holds no certificate for the name.

The enclave obtains the certificate itself, from Let's Encrypt, using the TLS-ALPN-01 challenge: Let's Encrypt connects to the name and the enclave answers the challenge in the TLS handshake. The certificate's private key is generated inside the enclave and stored on its encrypted volume (or, for a WebAssembly application, sealed by the enclave). Browsers see an ordinary certificate from a public authority, with the usual padlock, and the page's code arrives straight from the measured code running in the enclave.

## Only the enclave can obtain a certificate for the name

The gateway owns the IP address the name points to, so on its own a TLS-ALPN-01 challenge proves nothing: whoever controls that address could answer it. The protection comes from a DNS record the domain owner publishes, under [RFC 8657](https://www.rfc-editor.org/rfc/rfc8657):

```
example.com.  CAA 0 issue "letsencrypt.org; accounturi=https://acme-v02.api.letsencrypt.org/acme/acct/<id>; validationmethods=tls-alpn-01"
```

The record tells every certificate authority that only Let's Encrypt may issue for the name, only to this ACME account, and only through this challenge. The account's key is derived from the application's vault-backed key, which the vault releases only to code whose measurement the owner approved. Anything else on the path, our gateway included, cannot use the account, so it cannot obtain a certificate for the name. The key survives upgrades, so the domain owner publishes the record once. We refuse to switch a name to direct until the record is in place.

Two more mechanisms make any other certificate for the name visible:

- **The enclave announces the key it serves.** The application's attested address carries a certificate extension (OID `1.3.6.1.4.1.65230.7.4`) listing each direct name with the hash of its public key. A client that attests the application can compare it with the certificate the name presents.
- **The enclave watches Certificate Transparency.** Every public certificate is logged. The container runtime searches the logs for its names every six hours and reports any certificate whose key it did not generate.

## Setting it up

The owner claims the name and proves control with a TXT record, then approves the application's signed policy with the name in it, which takes one tap in the wallet:

```bash
privasys apps domains add my-app app.example.com
privasys apps domains verify my-app app.example.com
privasys apps policy approve my-app --domains app.example.com
```

The enclave then registers its ACME account, and `privasys apps domains list` prints the exact CAA record to publish. Once that record and an A record pointing at the gateway are in place, `privasys apps domains mode my-app app.example.com direct` switches the name over, and the certificate is issued within minutes. The [custom domains guide](https://docs.privasys.org/solutions/platform/developer-platform/custom-domains) walks through each step, including the order that avoids Let's Encrypt's limit on failed validations.

## What a browser can check, and what the wallet adds

A browser has no way to read an enclave's attestation evidence: the page's JavaScript cannot even see the server's certificate. So on a direct name, the person's assurance does not come from a check on each connection, as it does for the wallet or the CLI on the attested address. It comes from how the certificate was issued. The CAA record means that only the approved code could have obtained a certificate for the name, so a browser that completes a TLS handshake with it is talking to that code. That moves the guarantee from the connection to the issuance: it rests on the CAA record staying in place and on the vault releasing the account key only to approved measurements. This is the assurance a visitor without the wallet gets, and it is a real improvement on a gateway holding the certificate, but it is weaker than an attestation checked on the connection itself.

The application can tell these requests apart from the others. The runtime marks every request with the way it arrived, in a header the client cannot set: `attested` when TLS ended in the enclave on the attested address, `sealed` for a body encrypted to the enclave, and `direct` for a request on a direct name. By default a direct name serves what the gateway served before, the application's public pages and its sealed requests. An application opens its private routes to direct names only by declaring it in its measured manifest, and those routes then require a token issued by privasys.id for that application, which the runtime verifies and turns into the person's identity before the request reaches the code. The runtime also says how the person signed in, so an application can keep its sensitive routes for people who signed in with the wallet.

The wallet gives the stronger guarantee, and it is the mode we recommend. When someone signs in with it, the wallet connects to the application's platform address, checks the enclave's evidence and approves the session there, and a sealed session then runs inside the direct TLS connection. What the person sees in the address bar is the organisation's name, and what their wallet checked is the code behind it.

The domain owner keeps control of the name. They manage its DNS and can change or remove the CAA record at any time, which would let another certificate be issued. That is their right as the owner of the name, and it is also why the certificate extension and the Certificate Transparency watch exist: a certificate obtained after such a change shows up in the public logs, and its key differs from the one the enclave announces.

Every application already served on a custom name has been moved to direct mode, so the gateway no longer terminates TLS for any customer's name, for the page files either.

*The enclave runtimes are open source under the AGPL-3.0 licence at [github.com/Privasys](https://github.com/Privasys). The [custom domains guide](https://docs.privasys.org/solutions/platform/developer-platform/custom-domains) covers the full setup.*
