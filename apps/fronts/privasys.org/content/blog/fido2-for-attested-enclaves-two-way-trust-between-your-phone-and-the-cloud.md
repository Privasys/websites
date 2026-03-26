---
title: "FIDO2 for Attested Enclaves: Two-Way Trust Between Your Phone and the Cloud"
author: "Privasys Engineering Team"
date: "2026-03-26"
---

Authentication has always been a one-way street. You prove who you are to the server. The server tells you nothing about itself. You type a password, scan a fingerprint, tap a security key, and you trust that the service on the other end is what it claims to be. For most of the web, this is fine. For services that promise to protect your most sensitive data inside hardware enclaves, it is not enough.

Today we are announcing **Privasys Wallet**, a mobile authenticator for iOS and Android that flips the script. Before your private key is ever used, the wallet verifies that the server is running inside genuine secure hardware, running the expected code, with the expected configuration. Two-way trust, cryptographically enforced. The app is currently in beta with early testers and will be available on the App Store and Google Play in the coming weeks.

This post explains why we built it, how it works, and what it means for the future of authentication in a world where compute is confidential.

## The trust gap in Confidential Computing

Confidential Computing solves one of cloud computing's oldest problems: data must be decrypted to be processed, and during that window anyone with privileged access (the cloud provider, the hypervisor, a compromised administrator) can observe it.

Technologies like Intel SGX, Intel TDX, and AMD SEV-SNP close this gap by running workloads inside hardware-enforced Trusted Execution Environments (TEEs). Memory is encrypted by the processor itself. CPU state is isolated. Even a compromised host operating system cannot peek inside.

But there is a second gap that hardware alone cannot close: **how does a remote client know it is talking to a genuine TEE?**

The traditional answer is remote attestation. The TEE produces a cryptographic quote, signed by the hardware, that proves its identity. A verifier checks this quote against the chip vendor's root of trust. This works, but it requires custom tooling, specialised SDKs, and a verification flow that is alien to the normal web experience.

At Privasys, we solved this for server-to-server communication with [RA-TLS](/blog/a-practical-guide-for-an-attested-web): the attestation evidence is embedded directly into a standard X.509 certificate, so clients verify the enclave's identity during a normal TLS handshake. No custom protocol. HTTPS just works.

But what about the other direction? The user is still authenticating blindly. They scan a QR code, enter a password, or tap a passkey prompt, and they hope the server is what it says it is. There is no mechanism for the user's device to verify the server's hardware attestation before deciding whether to authenticate.

That is the gap Privasys Wallet closes.

## What the wallet does

Privasys Wallet is a FIDO2 authenticator with a twist: it verifies the server's hardware attestation before it signs anything.

Here is what happens when you connect to an enclave-backed service:

1. **You scan a QR code or tap a deep link.** The wallet opens a connection to the enclave over HTTPS.
2. **The wallet inspects the TLS certificate.** It extracts the attestation evidence from the X.509 extension, verifies the hardware quote against the chip vendor's attestation infrastructure, and confirms the code measurement and configuration root.
3. **You see the attestation summary.** The wallet shows you what hardware is running, what code is loaded, and what configuration is active. You can compare this against the measurements you expect.
4. **You approve, and the wallet authenticates.** A FIDO2 challenge-response ceremony runs between the enclave and your device's secure hardware. Your private key signs the challenge. The enclave verifies the signature. Both sides now have cryptographic proof of the other's identity.

If the attestation check fails (wrong hardware, unexpected code, tampered configuration) the wallet refuses to proceed. Your private key is never used.

## FIDO2: the right primitive for enclave authentication

We chose FIDO2/WebAuthn as the authentication layer for specific reasons:

### No shared secrets

FIDO2 is based on public-key cryptography. During registration, the device generates a key pair. The public key is sent to the server. The private key stays in the hardware. There is no password, no OTP seed, no bearer token. Nothing that can be phished, leaked, or brute-forced. If the server is breached, the attacker gets public keys that are useless without the corresponding hardware.

### Hardware-bound keys

On iOS, keys are generated inside the Secure Enclave using P-256 ECDSA. On Android, keys are stored in StrongBox (or the platform TEE when StrongBox is unavailable). In both cases, the private key is non-exportable. It cannot be read by the operating system, the app, or any other process. Signing operations happen inside the secure hardware, gated by biometric authentication.

This mirrors the architecture of the server side. The enclave's TLS private key is generated inside the TEE and never leaves it. The user's FIDO2 private key is generated inside the device's secure hardware and never leaves it. We have hardware-to-hardware trust where both endpoints are backed by dedicated security hardware.

### Phishing resistance

FIDO2 credentials are scoped to a relying party ID (an origin). The wallet will not sign a challenge from a domain that does not match the registered credential. Combined with the RA-TLS check, this means the user is protected against both phishing (wrong origin) and server impersonation (wrong attestation).

### Biometric gating

Every signing operation requires biometric authentication (Face ID, Touch ID, fingerprint, or equivalent). Even if someone has physical access to the device, they cannot use the credential without the enrolled biometric.

## Under the hood: RA-TLS verification on mobile

The wallet includes a native RA-TLS verification library that runs on both iOS and Android. Here is what verification involves:

### Extracting the attestation evidence

The server presents a standard X.509 certificate during the TLS handshake. The wallet extracts the attestation quote from a custom certificate extension using the Privasys OID arc (`1.3.6.1.4.1.65230`). The quote contains: the TEE type (SGX or TDX), the hardware measurements, and the ReportData field that binds the quote to the TLS public key.

### Verifying the hardware quote

For Intel SGX, the wallet verifies the quote against Intel's Provisioning Certification Service (PCS) and the Quoting Enclave's certificate chain. For Intel TDX, it verifies the TD Quote against Intel's TDX attestation infrastructure, checking the RTMR (Runtime Measurement Register) values that represent the VM's boot chain and runtime state.

### Checking the configuration root

Privasys enclaves embed a Configuration Merkle Tree in the attestation. This tree captures every configuration input: the CA certificate, loaded application modules, trust anchors, network policies. The wallet verifies the Merkle root, which means a single hash proves the integrity of the entire configuration. If anything changes, the root changes, and the wallet flags it.

### Confirming the cryptographic binding

The wallet re-derives the expected `ReportData` from the TLS certificate's public key and compares it against the value in the attestation quote. This confirms that the attestation is inseparable from the TLS session. The quote was generated by the exact process that controls the TLS private key.

## End-to-end encrypted notifications

One challenge with mobile apps is push notifications. Both Apple (APNs) and Google (FCM) act as intermediaries, and notification payloads pass through their infrastructure in transit.

For a privacy-focused authenticator, this is unacceptable. Authentication requests, approval prompts, and status updates should never be visible to any intermediary.

Privasys Wallet solves this with end-to-end encrypted notifications:

- The app and the enclave share a symmetric AES-256 key via the device's shared keychain.
- When the enclave needs to send a notification, it encrypts the payload (title, body, metadata) with AES-256-GCM and sends the ciphertext through APNs/FCM.
- On the device, a Notification Service Extension decrypts the payload before it is displayed.
- The extension runs in a separate process and has access to the shared keychain but not to the main app's memory.

Apple and Google see only encrypted blobs. The notification content is never available in plaintext outside the enclave and the device.

## The trusted app registry

The wallet maintains a local, encrypted registry of verified enclave applications. Each entry records the relying party, the TEE type, and the measurements from the last successful attestation.

When you reconnect to a previously verified enclave, the wallet automatically compares the current attestation against the stored measurements. If the measurements match, the experience is seamless. If something has changed, the wallet shows you what changed and asks you to re-verify.

This is the digital equivalent of checking that the bank's SSL certificate has not changed between visits. Except instead of verifying a domain name, you are verifying the exact code, configuration, and hardware running the service.

## Why this matters

The thesis behind Privasys Wallet is simple: **authentication without verification is incomplete trust**.

In a world where cloud services process our most sensitive data (financial records, medical histories, legal documents, AI conversations) the ability to verify what is on the other side of the connection is not a nice-to-have. It is a fundamental requirement.

FIDO2 gives us phishing-resistant, hardware-bound authentication. RA-TLS gives us cryptographic proof of the server's identity. Privasys Wallet combines them to create the first authentication flow where both parties prove their identity through hardware, and neither can impersonate the other.

This is what we mean when we say **do not trust, verify**. Not as a slogan, but as an engineering principle implemented in every connection.

## What is next

Privasys Wallet is currently in closed beta with early testers. We are working through the final rounds of testing and app store review, and plan to release on the App Store and Google Play in the coming weeks.

The application is open source under the AGPL-3.0 licence, like all Privasys software. We believe that an authenticator you cannot audit is an authenticator you should not trust.

If you are interested in the beta or want to integrate enclave-backed FIDO2 authentication into your service, reach out to us at [contact@privasys.org](mailto:contact@privasys.org).
