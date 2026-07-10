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

Start with the attack the fix has to defeat, because it is more subtle than it first looks. Our challenge mode already had the client send a fresh, random number, a nonce, that the enclave folds into its quote. That was meant to stop replay, and it does: a fresh challenge means nobody can hand you an old, recorded quote. But suppose an attacker has extracted an enclave's TLS private key (the precondition from earlier, and a tall order). A victim opens a connection, believing it is the enclave, and sends its fresh challenge. The attacker cannot reuse an old quote, but it can do something else: relay. It opens its own connection to the genuine enclave, forwards the victim's challenge, and the real enclave, which still holds the un-extractable hardware attestation key, dutifully produces a brand-new, valid quote for that exact challenge. The attacker passes that genuine quote back to the victim over a connection the enclave never touched. Everything the victim checks lines up: the quote is fresh, and it vouches for the public key the attacker is presenting, which is the stolen one. The victim believes it has an attested channel to the enclave, while the attacker sits in the middle holding the keys. The client choosing the challenge did not help, because the attacker simply borrowed the client's own challenge.

The nonce proved freshness. What it never proved was *which connection* the quote belongs to. That is the missing link, and it is what we added.

The fix is to make the quote commit to something only the true participant in *this* connection can produce: the session's key schedule. When two parties complete a TLS handshake they both derive the same secrets from the Diffie-Hellman exchange, and nobody on a different connection can reproduce those secrets. So we take a value derived from them, a 32-byte **binder**, and fold it into the quote alongside the nonce:

```
ReportData = SHA-512( SHA-256(SPKI_DER) || nonce || binder )
```

Now walk the relay through again. The victim-to-attacker connection and the attacker-to-enclave connection are two different handshakes with two different shared secrets, so two different binders. The genuine enclave binds its quote to the binder of *its* connection, the one with the attacker. The victim recomputes the binder from *its* connection and compares: the two do not match, and the quote is rejected. The attacker cannot get the enclave to bind to the victim's connection, because the enclave never took part in that handshake, and it cannot forge the quote itself, because the hardware attestation key never leaves the chip. The relay is dead.

Making this work took reaching into the TLS machinery, which is why it helps that we maintain our own forks of the [Go](https://github.com/Privasys/go) and [Rust](https://github.com/Privasys/rustls/releases/tag/privasys-v0.7.0) stacks. The certificate, and the quote inside it, is normally produced before the session's secret exists, so we re-mint it at the exact moment the handshake secret becomes available, and derive the identical binder on the verifying side. Every challenge session is bound this way. The verifier recomputes the binder and checks it before sending a single byte of its request, and fails closed on any mismatch.

## Why we stopped at the handshake, deliberately

The researchers' hierarchy has a higher rung. Binding to the handshake traffic secret is Level 2, the ceiling for anything that lives inside the handshake, because the certificate is emitted before the session's application keys exist. Reaching Level 3 means moving attestation to *after* the handshake completes: a second, post-handshake exchange.

We chose not to. Native compatibility matters to us. A Privasys enclave should be reachable by an ordinary TLS client, `curl` included, without a bespoke second protocol bolted onto every caller.

It is worth being precise about what that costs. Level 2 binds the quote to the session's handshake secret, which is derived from the ephemeral Diffie-Hellman exchange. That is exactly what defeats the relay: any other connection has a different shared secret, and the enclave's hardware key will not vouch for it. What Level 2 does not do is bind to the fully completed, authenticated channel, because the certificate is emitted before the handshake finishes, before either Finished message is verified. Level 3 closes that by tying the quote to a value derived after the handshake completes, the TLS exporter, which names one finished connection and nothing else. The residual risk between the two is the difference between "bound to this key exchange" and "bound to this exact completed connection". It is a formal completeness property, not a new avenue of attack, and like the original finding it only becomes reachable once the enclave's keys have already been extracted. Paying for it with standard-client compatibility is, for our users, the wrong way round.

We took the intra-handshake fix, which defeats the relay, and kept the protocol something the whole world can already talk to. The IETF SEAT working group has now chartered these correlation properties, and if a clean, compatible Level 3 emerges from that work we will follow it.

Attested TLS is a powerful idea. The honest response to a formal result that finds a gap is to fix the gap, ship it, and keep perspective about what the gap was and was not. That is what this is.
