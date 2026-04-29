---
title: "Beyond Code Identity: Why Attestation Must Cover Configuration"
author: "B Foing"
date: "2026-03-01"
---

Remote attestation is the mechanism that makes Confidential Computing trustworthy. Without it, a TEE is just an opaque box. You know the hardware can protect data, but you have no proof that the right software is actually running inside it.

In our [first blog post on RA-TLS](/blog/a-practical-guide-for-an-attested-web), we showed how attestation evidence can be embedded in a standard X.509 certificate so that any TLS client can verify the TEE's identity over a normal HTTPS connection. That solved the *transport* problem: attestation rides along with TLS, no custom protocol needed.

But transport is only part of the story. The deeper question is: **what exactly should attestation prove?**

## The Limits of Code Identity

Every TEE attestation scheme produces a measurement of the code loaded into the secure environment. Intel SGX calls it MRENCLAVE. Intel TDX calls it MRTD. AMD SEV-SNP calls it MEASUREMENT. The idea is the same: a cryptographic hash of the binary at launch time, signed by the hardware.

This is powerful. A verifier who knows the expected measurement can confirm that the exact binary they trust is running on the remote machine. No tampering, no substitution, no backdoors.

But here is the gap: **the same binary can behave very differently depending on how it is configured.**

Consider an enclave that fetches data from external web services. To establish HTTPS connections, it needs a set of trusted CA root certificates. These root certificates change regularly as certificate authorities rotate keys, expire, or get revoked. They cannot be hard-coded into the binary; they must be passed in as configuration at deployment time.

Now imagine two deployments of the same enclave binary. One receives the genuine Mozilla CA root store. The other receives a modified root store that includes a rogue certificate authority. Both enclaves have the same MRENCLAVE. A verifier checking only the code measurement would see them as identical, yet the second enclave could be tricked into trusting a man-in-the-middle when it reaches out to the web.

This is the **configuration attestation problem**, and it is one of the most underappreciated gaps in Confidential Computing today.

## Configuration Is Part of the Trust Model

Most attestation frameworks treat configuration as an afterthought. The hardware attests the binary; everything after that is the application's responsibility. But from a user's perspective, the configuration is just as important as the code.

When you connect to a confidential service, you want to know:

1. **Is the right code running?** (Code identity, solved by MRENCLAVE.)
2. **Is it configured the way I expect?** (Configuration identity, not covered by the hardware quote.)

If attestation only answers question one, you are trusting the operator for questions two. That undermines the entire premise of Confidential Computing, which is to *remove* the operator from the trust model.

## Our Approach: Merkle Trees Over Configuration

At Privasys, we took the position that configuration attestation should be as rigorous as code attestation: cryptographic, deterministic, and embedded in every certificate.

The mechanism is a **Merkle tree**: a binary hash tree where each leaf represents a configuration input, and the root is a single 32-byte value that represents the entire configuration state. Any change to any input changes the root.

When Enclave OS starts, it collects every configuration input (the CA certificate, the egress trust store, each WASM module's code hash) and hashes each one into a Merkle leaf. The tree is then built deterministically, and the root is embedded as a custom X.509 extension in every RA-TLS certificate the enclave generates.

The result: a single hash in the certificate proves the complete configuration. A verifier who knows the expected root can confirm that the enclave is configured exactly as expected, without trusting the operator.

### Why a Merkle Tree?

A simpler approach would be to concatenate all configuration inputs and hash the result. That would produce a single fingerprint too. But a Merkle tree offers two important advantages:

1. **Selective verification.** A verifier who only cares about one input (say, "which WASM app is deployed?") can verify that single leaf against the root without seeing the rest of the tree. This is a logarithmic-size proof, not an all-or-nothing check.

2. **Modular contribution.** Each module in the system contributes its own leaves to the tree. The core OS contributes the CA certificate. The egress module contributes its trust store hash. The WASM runtime contributes each app's code hash. This is extensible: adding a new module automatically adds new leaves to the tree without changing the core logic.

### Fast-Path Verification

For convenience, each module also publishes its most important hashes as individual X.509 extensions, separate from the Merkle root. A client that only needs to confirm the WASM code hash can read a single OID from the certificate without performing any Merkle computation. The Merkle tree is there for full auditability; the individual OIDs are there for speed.

This gives verifiers a spectrum of options: from a quick single-OID check ("is the right app deployed?") to a full manifest audit ("show me every input and let me recompute the root myself").

## Going Further: Per-App Attestation

Once you have configuration attestation, a natural extension emerges: **per-application attestation**.

A single enclave can host many applications simultaneously. In our case, these are WASM components deployed at runtime. The enclave-wide Merkle root covers all of them, but from a client's perspective, that is too broad. A client connecting to `payments-api` should not need to know or care about `analytics-api` running in the same enclave.

We solved this with a two-tier certificate hierarchy:

1. **The Enclave CA certificate** carries the SGX quote and the enclave-wide Merkle root. This proves the hardware identity and the platform configuration.
2. **Per-app leaf certificates** are signed by the Enclave CA and carry app-specific OIDs: the app's code hash and its own independent Merkle root.

When a client connects, the TLS handshake uses SNI (Server Name Indication) to select the right leaf certificate. A client connecting to `payments-api.enclave.example.com` receives a certificate that proves **exactly which code** that specific API is running — without revealing anything about other apps in the same enclave.

This design gives us three properties that matter in production:

- **Tenant isolation.** Each app's attestation is independent. One tenant cannot learn about another's code or configuration.
- **Independent lifecycle.** Deploying, updating, or removing one app does not affect any other app's certificate. Clients only re-verify when their app changes.
- **Scalability.** The SGX quote is generated once at boot and bound to the Enclave CA key. Per-app leaf certificates are cheap ECDSA signatures, so the system can host thousands of apps without hitting any attestation bottleneck.

## The Honest Reporter Model

There is a philosophical point that underpins all of this. The enclave is an **honest reporter**. It computes and publishes its configuration state in every certificate it issues. There is no owner key, no authorisation gate, no way to suppress or filter what the certificate reveals.

Service administrators can change the configuration: load different WASM apps, swap the CA, reconfigure the egress store. But the Merkle root will change accordingly, and any client pinning the expected root will immediately detect the change.

This is not about preventing misconfiguration. It is about making misconfiguration **visible**. The enclave cannot lie about its state. The mathematics of the Merkle tree guarantee that.

## What This Means in Practice

Consider a concrete scenario. A financial institution deploys a risk scoring model as a WASM component inside an enclave. Their compliance team needs assurance that:

1. The enclave is running the correct, audited binary. → Verified by MRENCLAVE in the SGX quote.
2. The model code has not been changed since the last audit. → Verified by the per-app code hash (OID `3.2`).
3. The enclave is using the institution's own CA, not someone else's. → Verified by the egress CA hash (OID `2.1`) and the Merkle root.
4. No other applications have access to the same sealed keys. → Verified by namespace isolation plus per-app Merkle root (OID `3.1`).

All of this happens during a standard TLS handshake. The compliance team does not need special tooling or a custom attestation protocol. They connect, inspect the certificate, and either trust it or reject it.

## From Silicon to Application

The result is a trust chain that stretches from the hardware to the individual application:

- **Silicon** → The CPU produces a signed attestation quote.
- **Platform** → The quote contains MRENCLAVE, proving the enclave binary.
- **Configuration** → The Merkle root in the certificate proves the complete runtime configuration.
- **Application** → Per-app OIDs prove the exact code and configuration of the specific service the client is talking to.

Each layer is cryptographically bound to the one below it. The TLS key is bound to the quote. The Merkle root is bound to the certificate. The per-app hashes are signed by the Enclave CA. There are no gaps, no trust-me assertions, no metadata that could be forged.

This is what we mean by **full-stack attestation**: from silicon to application code, delivered over a standard HTTPS connection.

## What's Next

We are working on several extensions to this model:

- **Attestation verification libraries** in multiple languages, so any client can verify RA-TLS certificates with a single function call. Our [open-source RA-TLS clients](https://github.com/Privasys/ra-tls-clients) already support Python, Go, Rust, TypeScript, and C#.
- **Cross-TEE attestation**, enabling enclaves to verify each other's certificates and establish mutually attested channels.
- **Merkle tree introspection API**, a new standard and core feature of Enclave OS, allowing any verifier to retrieve the full set of leaves from the enclave and recompute the Merkle root independently.

Attestation is not an optional add-on. It is the mechanism that turns a hardware isolation primitive into a **verifiable trust relationship**. And configuration attestation is what makes that relationship precise enough to be useful in production.

---

*Enclave OS and its attestation framework are open source under the AGPL-3.0 licence. Explore the code at [github.com/Privasys/enclave-os-mini](https://github.com/Privasys/enclave-os-mini).*
