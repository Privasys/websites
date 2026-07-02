---
title: "Enclave Vaults Speaks PKCS#11 and KMIP"
author: "B Foing"
date: "2026-07-02"
---

Two earlier posts set out where Enclave Vaults had reached. In [the v0.19 redesign](/blog/enclave-vaults-v0-19-typed-keys-and-policy-driven-operations) the vault became a small virtual HSM: typed keys that live inside an SGX enclave, cryptographic operations that run in the hardware, and a per-key policy the silicon enforces. In [upgrading an enclave without handing it your data](/blog/upgrading-an-enclave-without-handing-it-your-data) we showed how a key owner, not the platform, decides when new code may reach existing secrets. Both are still the foundation.

There was one thing left. A vault could hold a signing key and sign inside the enclave, but only software written against our RA-TLS protocol could ask it to. The tools that most teams already run, an OpenSSL TLS server, a Java service, a code-signing pipeline, an enterprise key manager, do not speak that protocol. They speak PKCS#11 and KMIP. So this release makes the vault reachable through those, and turns the developer-facing surface into a proper key-management service that anyone can use, not only the platform's own enclaves.

## The rule we followed

The parts of this vault that make it worth using are exactly the parts that appear in no standard. A policy principal can be an attested measurement, so a key answers only to a specific enclave binary. A sensitive operation can require a fresh approval tapped on a phone. A secret can be split with Shamir's scheme across independent machines so no single vault holds it. PKCS#11, KMIP, and the cloud KMS APIs have no vocabulary for any of that.

So we did not bend the core to fit a standard. We kept the attested-policy engine as it is and wrapped standard-shaped surfaces around it. A standard client gets the baseline cryptographic operations a key allows; the richer policy is authored through our own API; and anything a key gates on an attested condition or a wallet approval is unavailable over the standard interface and fails closed. The interoperability is real, and the properties that matter are still enforced by the enclave underneath, where a standard client cannot switch them off.

## Anyone can own keys now

The first change is who gets to hold keys. Key custody used to be reserved for platform enclaves. Now any user can create a vault, hold signing and wrapping keys in it, and author the policy that governs them, with the same attested guarantees the platform uses for its own secrets.

The important detail is where the key material goes, which is nowhere near the platform. When you create a key, the platform verifies you may use the vault, authors the owner-bound policy, and mints a short-lived grant bound to your client. Your own machine then creates the material directly on the constellation. The REST facade, `privasys vault serve`, follows the same pattern: it is a client-side proxy, so the data plane stays a direct, attested channel from your machine to the enclave. The platform enforces quotas and catalogues the key. It never sees the bytes.

From the command line it looks ordinary, which is the point:

```bash
privasys vault create billing
privasys vault key create <vault-id> release-signer --type p256
privasys vault key sign   <vault-id> release-signer "the message"
```

The signature comes back; the private key stays in the enclave.

## A TLS server whose key never leaves the enclave

The clearest demonstration is a confidential TLS server. Our [PKCS#11 provider module](https://github.com/Privasys/pkcs11-provider) presents a vault-held key to any application that speaks Cryptoki, which includes OpenSSL. The module carries no key material of its own. It translates the PKCS#11 C interface into calls on a local agent that holds the RA-TLS session to the constellation, so the application links against a normal library and the crypto happens in the hardware.

You mint a certificate whose private key lives in the vault, then serve TLS against it with stock OpenSSL:

```bash
export PKCS11_PROVIDER_MODULE=/path/to/libprivasys_pkcs11.so
export PRIVASYS_PKCS11_VAULT=<vault-id>

openssl req -new -x509 -provider pkcs11 -provider default \
  -key "pkcs11:object=tls-key;type=private" -subj "/CN=example" -out cert.pem

openssl s_server -provider pkcs11 -provider default \
  -key "pkcs11:object=tls-key;type=private" -cert cert.pem -accept 4443 -www
```

We ran exactly this. A client connected, verified the certificate as normal, and completed a TLS 1.3 handshake. Every handshake asks the vault to sign, so the server's private key never exists in the server's process. Compromising the web server host yields no key to steal, because the key was never there.

Making this work needed one addition to the vault itself. A TLS handshake signs a value the client and server have already hashed, so the signer must sign that digest as it is rather than hashing it a second time. The vault gained a raw signing mode for exactly this, which is also what code-signing tools and cloud SDKs expect. Java reaches vault-held keys through the same module, using its standard `KeyStore` and `Cipher` classes, so a JVM service can encrypt and decrypt under a key it never holds.

## KMIP for the software a bank already runs

The other interface is for organisations with existing key-management software and a network key manager it expects to talk to. Our [KMIP 2.1 gateway](https://github.com/Privasys/kmip-gateway) lets that software point at the constellation and use it as a remote key manager, unchanged. Create, locate, encrypt, decrypt, sign, and destroy map onto the vault's operations.

The gateway is itself a Privasys confidential workload, so it runs inside a TEE and authenticates to the vault with an attested identity minted by the measured platform manager. There is no plaintext hop between the client and the enclave, and a small proxy verifies the gateway's own attestation before a standard KMIP client sends anything through it. A regulated buyer can keep their tooling and still get a key manager whose custody rests on hardware they can verify.

## The limit, stated plainly

The same boundary applies to every standard interface here, and it is worth being precise about. A PKCS#11 or KMIP client authenticates with a certificate or a credential, and that is all it can present. It has no way to carry the two conditions from earlier that make this vault more than a key store: the fresh approval a person taps on their phone, and a check on which piece of attested code is calling. So a key whose policy asks for someone to approve the operation on their phone, or that answers only to one named enclave, will refuse those operations when the request arrives over PKCS#11 or KMIP. The standard client gets the operations it can safely be given; anything that depends on those extra conditions stays behind the native API, which is the one surface able to express them. We would rather a request fail cleanly than let a strong policy quietly weaken to fit a protocol that cannot carry it.

## What did not change

Everything that made the design defensible is intact. Signing and wrapping keys are non-exportable by default and operate only inside the enclave. Highly sensitive shared secrets are still split with Shamir's scheme across the constellation, so one compromised vault reveals nothing. Every connection is a mutually attested RA-TLS channel, the client checking the vault's measurement and the vault checking the caller's. The vault directory that lists the constellation is an untrusted phonebook and sees no keys, policies, or approvals. And all of it remains open source under the AGPL-3.0.

A vault could already do the work of an HSM. Now the software you already run can ask it to, through the interfaces it already speaks, while the guarantees that a plain HSM cannot offer stay enforced by the hardware underneath. That is the whole point of building the standard surface on top of the attested core rather than in place of it.

---

*Enclave Vaults is open source under the AGPL-3.0 licence: [github.com/Privasys/enclave-vaults](https://github.com/Privasys/enclave-vaults). The [solution page](/solutions/enclave-vaults) has the short version, and the [Standard Interfaces](https://docs.privasys.org/solutions/enclave-vaults/standard-interfaces) documentation has the detail.*
