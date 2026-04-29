---
title: "Enclave Vaults v0.19: Typed Keys and Policy-Driven Operations"
author: "B Foing"
date: "2026-04-29"
---

A few weeks ago we wrote about [rethinking secrets management for the age of confidential computing](/blog/enclave-vaults-rethinking-secrets-management-for-the-age-of-confidential-computing). The argument was simple: the security of an HSM, a cloud KMS, or a HashiCorp Vault eventually collapses to one place where the master key has to be reconstructed. Enclave Vaults proposed a different model. Split the operational secret across independent SGX enclaves with Shamir's Secret Sharing, never reassemble it in any one vault, and have the owner reconstruct it inside its own trusted environment when needed. That release was already a meaningful step. It is still the foundation of everything that follows.

Today we are shipping **Enclave Vaults v0.19**, and the model gains a second, complementary capability. The vault is now a small **virtual HSM** (vHSM): each enclave can also hold *typed key objects* and run cryptographic operations on them inside the enclave, governed by a per-key policy that the silicon itself enforces. Distribution of trust through Shamir is still here for the secrets that need it. The new in-enclave-operations path makes the vault a much better fit for everything in between.

This post explains what is new, why we built it that way, and how it stays aligned with our mission to make strong data privacy and security available to everyone, not just to organisations that can buy a rack of certified appliances.

## What v0.19 adds

### 1. Typed key objects

Up to v0.18, a vault stored opaque secrets (typically Shamir shares of a customer's master key). The owner stored a share, fetched a share, and reconstructed the secret on the client side. That model is exactly the right shape for things like LUKS volume keys for confidential VMs, master KEKs that are reconstructed on a controlled schedule, or any secret whose value the owner ultimately needs in cleartext somewhere.

In v0.19, that path is still there as the `RawShare` key type. Alongside it, the vault now manages **typed key objects** that never need to leave the enclave at all:

- `Aes256GcmKey` for symmetric `Wrap` and `Unwrap`.
- `Ed25519SigningKey` and `P256SigningKey` for `Sign` and `Verify`.
- `HmacKey` for `Mac` and `MacVerify`.
- `Bip32MasterSeed` for hierarchical key `Derive`.
- `WrappedBlob` for caller ciphertexts under a vault KEK.

`Export` is a usage flag that is off by default for everything except `RawShare`. A signing key whose policy never grants `Export` cannot be exfiltrated, even by its owner. Every signature happens inside the enclave; only the result crosses the boundary. This is the same move classical HSMs made decades ago: stop letting the key out of the device, expose only the operations you actually need.

The two patterns share the same `KeyPolicy` schema and the same lifecycle, so the developer experience is uniform. Owners pick the right pattern per key.

### 2. A richer KeyPolicy

Every key object carries a `KeyPolicy` organised into three independent surfaces:

- **`principals`** lists who is recognised at all for this key: the owner, optional managers, optional auditors, plus optional TEE, FIDO2, and mTLS principals.
- **`operations`** holds per-operation rules of the form "operation X is allowed for principal P when condition C holds". Conditions are composable: `AttestationMatches`, `ManagerApproval { fresh_for }`, `TimeWindow`, `CallerHoldsRole`, plus boolean combinators.
- **`mutability`** describes which fields the owner can edit unilaterally, which need a quorum of manager approvals, and which are immutable for the life of the key.

The policy is part of the sealed state of the vault. Any change to it is itself an operation, subject to the same rules, and is recorded in the audit log. There is no admin override.

This is what we mean when we say a vault is now "small but real" vHSM functionality. A signing key can be created with a policy that says *sign only when the request comes from this CI enclave AND a manager approves on the wallet AND the policy can only be relaxed after a quorum of two managers also approves*. The rule is enforced by hardware, not by a wrapper script.

### 3. Owner-controlled lifecycle when caller-enclave versions change

This is the property we are most proud of, and the one that needs the most care to describe accurately.

The **caller** of a vault is typically a customer application running in its own enclave (a WASM enclave, a confidential VM, another module on the Privasys platform). Its key policy refers to a specific MRENCLAVE through one or more attestation profiles. When the developer ships a new version of that application, the new build has a new MRENCLAVE. By default, that new MRENCLAVE has **no permission** to use the keys the previous version was using.

This is by design. The platform team chooses when to ship a new build of the customer's application. The platform team must therefore not be in a position to silently grant a freshly-built measurement access to the customer's key material. Adding a new MRENCLAVE to a key's policy is an act that belongs to the **key owner** (the customer), not to the platform.

The new `pending-profile` lifecycle implements that invariant. When v(N+1) of the customer app is built, the platform records its MRENCLAVE. The owner, on their own schedule, calls `StagePendingProfile(handle, profile_v_n_plus_1)` through the SDK. Each vault stores the candidate profile in its `pending-profile` slot. The key's `attestation_profiles` is unchanged; v(N+1) cannot yet read the key. The owner reviews the build, collects the manager approvals required by the policy (each one a fresh FIDO2 ceremony on a Privasys Wallet), and then calls `PromotePendingProfile(handle, profile_id, approvals)`. Only then is v(N+1) authorised. v(N) and v(N+1) can coexist on the policy until the owner removes v(N).

The fan-out is driven by the **client SDK** on the owner's side. The vaults do not coordinate behind the operator's back; the registry never sees policies, profiles, or approvals. Even during a roll-out, no single party can promote a profile alone.

For adopters who explicitly want hands-off rollout (sandbox tenants, low-stakes workloads), there is a `Lifecycle.auto_migrate_to_next_attestation_profile` opt-in. It is off by default, and the SDK forces a one-time confirmation when a key is first created with it set.

## What stays the same

Everything that made the original design defensible is still there.

- **Information-theoretic distribution for `RawShare` secrets.** The full secret never exists in any single vault. Compromising one enclave gives an attacker one share, which by the maths of Shamir's scheme reveals nothing about the secret.
- **Per-vault hardware isolation.** Each vault still runs inside its own SGX enclave on its own machine, with its own sealed storage and its own RA-TLS identity.
- **Verifiable, not promised.** Every connection to a vault is a mutually attested RA-TLS channel. The client checks the vault's MRENCLAVE and configuration before sending anything; the vault checks the caller's attestation before doing anything.
- **An untrusted registry.** The Attested Registry is a phonebook. It returns `(endpoint, measurement)` tuples and nothing else. It never sees keys, shares, policies, pending profiles, approval tokens, or audit data.
- **Open source, AGPL-3.0.** All of it: the vault enclave, the registry, the Rust and Go SDKs, and the underlying [Enclave OS Mini](https://github.com/Privasys/enclave-os-mini).

## How we roll the vault enclave itself forward

A natural question once you understand the pending-profile flow is: "what about the vault's own MRENCLAVE? Surely that changes too?". It does, and it is handled separately, by the deployment model.

Every vault registration in the Attested Registry has a **30-day TTL**. Clients refresh their constellation view at least that often, which gives every vault instance an explicit expiry. To roll a new vault enclave version forward we run the new MRENCLAVE in parallel with the old one, register both, let owners stage the new vault profile on the keys that need it at their own pace, and let the old vault expire out of the registry once nothing dials it. The key owner is in control of when their secret material reaches the new vault enclave, in exactly the same way as for caller-enclave version changes. Nothing here is automatic, and nothing here is irreversible.

## Why this matters beyond cryptographers

For us, v0.19 is a direct expression of the company mission. Strong data privacy and security should not be a luxury reserved for organisations that can afford to staff a dedicated key-management team. It should be a sane default that a small team, or a single developer, can adopt without compromise.

Three properties matter especially:

- **Real key custody.** A signing or wrapping key that cannot be exfiltrated, even by your own infrastructure team. Until now, this required either a six-figure HSM or accepting "trust the cloud provider".
- **Programmable, auditable approvals.** Tying a sensitive operation to a fresh tap on a personal wallet is something only large enterprises with bespoke key-ceremony software have had. Now it is a `KeyPolicy` field.
- **Deployment changes that respect the data owner.** A new build of the application code does not, on its own, grant the new code access to existing secrets. The owner is always the last word.

## What is running today

Enclave Vaults runs across four vault instances in total, hosted in Paris and London. They share the same MRENCLAVE and form a single 2-of-4 quorum for `RawShare` keys. The Privasys Wallet is the default approval surface; FIDO2 ceremonies on the wallet produce the signed approval tokens that the vaults verify.

On the developer side, the Rust and Go client libraries expose three layers:

- A `RegistryClient` that discovers the constellation through the Attested Registry.
- A `Client` that talks to a single vault.
- A `Constellation` helper that fans out an operation across the constellation, handles approvals, and drives the pending-profile lifecycle on the owner's behalf.

Any of these can be used directly. CI systems that already drive their own attestation flow can use the `Client` and skip the higher layers entirely.

## Where we are going next

There is more on the way. The Shamir distribution layer is solid; the next round of work is about giving operators richer, more recognisable surfaces on top of it: a PKCS#11-like front, a JWT-signed approval-token format that other systems can consume, transparent audit log streaming, and per-policy quotas. None of these change the core trust model; they make it easier to plug into the systems people already have.

If you want the deeper engineering picture, the [solution page](/solutions/enclave-vaults) has the short version, the [documentation](https://docs.privasys.org/solutions/enclave-vaults/overview) has the long version, and the [original distributed-trust deep-dive](/blog/enclave-vaults-rethinking-secrets-management-for-the-age-of-confidential-computing) still holds. It is the foundation everything in v0.19 is built on.

---

*Enclave Vaults is open source under the AGPL-3.0 licence: [github.com/Privasys/enclave-vaults](https://github.com/Privasys/enclave-vaults). The client SDKs are at [github.com/Privasys/enclave-vaults-client](https://github.com/Privasys/enclave-vaults-client).*
