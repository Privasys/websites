---
title: "Confidential Computing Is Not Broken: A Calm Look at the RA-TLS Attestation Flaw"
author: "B Foing"
date: "2026-07-09"
---

In January, security researchers presented a formal-methods result to the IETF SEAT working group. Analysing intra-handshake attested-TLS designs, they showed that the common construction fails to cryptographically bind the attestation evidence to the TLS session it is meant to protect. The finding is real, it is careful work, and it carries a CVE (CVE-2026-33697). It also, predictably, produced headlines. One outlet reported that confidential computing's [remote attestation protocol may have a fundamental flaw](https://www.scworld.com/brief/confidential-computings-remote-attestation-protocol-may-have-fundamental-flaw); another that the [trust mechanism is broken and the fix may not exist](https://www.theregister.com/security/2026/07/04/confidential-computings-trust-mechanism-is-broken-the-fix-may-not-exist/5266056). This post is about the gap between that framing and the engineering reality, and about what we actually did.

## What the flaw is

RA-TLS puts a hardware quote inside the TLS certificate. The quote commits to the certificate's public key, so a client can check that the key it is talking to was born inside a genuine, correctly measured enclave. What it does not commit to is the session itself: it vouches for the key, not for the fact that the enclave is the party on the other end of *this* connection. The whole guarantee therefore rests on one assumption, that the private key never leaves the enclave.

## Read the precondition

To exploit this, an attacker must first obtain the enclave's TLS private key. That key lives in encrypted enclave memory. Extracting it means defeating the hardware's memory isolation: a side channel, a transient-execution attack, or a firmware break, applied successfully against a specific enclave. In other words, the attack begins where confidential computing's core guarantee has already failed.

Sit with that for a moment. If an adversary has already cracked an enclave open and lifted its private keys, relaying a TLS session is close to the least of your problems. They are inside the box that was supposed to be sealed. The attestation gap is a missing layer of defence in depth on top of the memory-isolation assumption, not a standalone hole an attacker walks through against a healthy system. A high CVSS score reflects the severity *if* the precondition holds; it does not describe how often it holds. Here the precondition is "the TEE is already broken", which is exactly the event the whole architecture is built to prevent and which remains hard.

## The apocalypse that is not arriving

None of this makes the research less valuable. Formal analysis that finds a latent gap before it is weaponised is the system working as intended. What is unhelpful is turning "a defence-in-depth property is weaker than it should be, given an already-compromised enclave" into "the trust mechanism is broken". Confidential computing is foundational infrastructure. For anyone who today runs sensitive workloads in plaintext on hardware they do not control, a TEE is not a marginal improvement, it is orders of magnitude better: memory and disk encrypted under keys the host cannot read, with attestation you can verify. Declaring that broken over a gap that only bites after the enclave itself is broken is burning down the house to roast a pig.

The measure of a security technology is not whether formal analysis ever finds anything. It is whether findings get fixed. This one did.

## What we shipped

The gap closes if the quote commits to something only the true session participant can produce. That something is the session's key schedule. Both peers derive the same secrets from the Diffie-Hellman exchange, so both can compute a shared value that a relay on a different connection cannot reproduce. We derive a 32-byte binder with `HKDF-Expand-Label(client_handshake_traffic_secret, "privasys-ratls-binder-v1", ...)` and fold it into the quote:

```
ReportData = SHA-512( SHA-256(SPKI_DER) || nonce || binder )
```

The quote is signed by the hardware attestation key, which never leaves the CPU. An attacker who recovers the leaf TLS key still cannot mint a quote over a different session's binder, and cannot get the real enclave to do so either, because it never joined the relayed handshake. Because we maintain our own forks of the [Go](https://github.com/Privasys/go) and [Rust](https://github.com/Privasys/rustls/releases/tag/privasys-v0.7.0) TLS stacks, we could reach into the handshake state machine, re-mint the certificate at the exact moment the handshake secret becomes available, and derive the same value on the verifying side. Every challenge session is bound this way. The verifier recomputes the binder before sending a single byte, and fails closed on a mismatch: a quote that does not commit to the live session is rejected.

## Why we stopped at the handshake, deliberately

The researchers' hierarchy has a higher rung. Binding to the handshake traffic secret is Level 2, the ceiling for anything that lives inside the handshake, because the certificate is emitted before the session's application keys exist. Reaching Level 3 means moving attestation to *after* the handshake completes: a second, post-handshake exchange.

We chose not to. Native compatibility matters to us. A Privasys enclave should be reachable by an ordinary TLS client, `curl` included, without a bespoke second protocol bolted onto every caller.

It is worth being precise about what that costs. Level 2 binds the quote to the session's handshake secret, which is derived from the ephemeral Diffie-Hellman exchange. That is exactly what defeats the relay: any other connection has a different shared secret, and the enclave's hardware key will not vouch for it. What Level 2 does not do is bind to the fully completed, authenticated channel, because the certificate is emitted before the handshake finishes, before either Finished message is verified. Level 3 closes that by tying the quote to a value derived after the handshake completes, the TLS exporter, which names one finished connection and nothing else. The residual risk between the two is the difference between "bound to this key exchange" and "bound to this exact completed connection". It is a formal completeness property, not a new avenue of attack, and like the original finding it only becomes reachable once the enclave's keys have already been extracted. Paying for it with standard-client compatibility is, for our users, the wrong way round.

We took the intra-handshake fix, which defeats the relay, and kept the protocol something the whole world can already talk to. The IETF SEAT working group has now chartered these correlation properties, and if a clean, compatible Level 3 emerges from that work we will follow it.

Attested TLS is a powerful idea. The honest response to a formal result that finds a gap is to fix the gap, ship it, and keep perspective about what the gap was and was not. That is what this is.
