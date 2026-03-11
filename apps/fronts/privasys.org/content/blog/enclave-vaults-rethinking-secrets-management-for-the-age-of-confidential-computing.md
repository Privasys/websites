---
title: "Enclave Vaults: Rethinking Secrets Management for the Age of Confidential Computing"
author: "B Foing"
date: "2026-03-11"
---

Every secrets management system, from a €100,000 HSM appliance to a HashiCorp Vault cluster, faces the same fundamental problem: somewhere, at some point, a master key must exist in a single place. The entire security of the system depends on that one location remaining uncompromised.

The question explored in this post is whether that assumption is still necessary. Shamir's Secret Sharing has been used for decades to protect master keys during ceremonies and unsealing. But what if the *operational* keys themselves were never assembled in one place at all?

## The Key Hierarchy

Before comparing approaches, it is worth recalling how key management actually works in practice. Most systems use a layered hierarchy:

- **Local Master Key (LMK)**: the root of trust. Everything else derives from it.
- **Key Encryption Keys (KEK)**: used to wrap and unwrap operational keys. Protected by the LMK.
- **Data Encryption Keys (DEK)**: the keys that actually encrypt data. Protected by KEKs.

The DEKs do the real work, but the security of the entire hierarchy collapses to one question: how is the LMK protected?

Every approach discussed below gives a different answer. But they all share a structural property: the LMK ultimately resides in one system, and the security model depends on that system being trustworthy.

## HSMs: Certified, Costly, Centralised

The Hardware Security Module (HSM) has been the industry's answer for decades. An HSM is a purpose-built device, typically a PCIe card or rack-mounted appliance, that stores the LMK in tamper-resistant silicon. Cryptographic operations are performed on-chip. The key never leaves the device.

HSMs are trusted because they are physically isolated and rigorously certified. The FIPS 140-2 and 140-3 programmes test them against probing, voltage glitching, and side-channel analysis. A Level 3 certified HSM will zeroize its keys if it detects physical tampering.

The LMK itself is typically protected with Shamir's Secret Sharing. During the initial key ceremony, the master key is split into $n$ shares distributed across smart cards held by different custodians. No single custodian holds the full key. Reconstructing it requires a quorum of $k$ custodians to convene physically, which is expensive and slow to organise.

The costs are significant:

- **Procurement.** A single HSM appliance from Thales or Entrust costs between €30,000 and €100,000.
- **Redundancy.** Production deployments require at least two HSMs for high availability, often more for geographic distribution.
- **Key ceremonies.** Multi-day events with custodians, smart cards, and PINs. Expensive to organise, difficult to audit.
- **Scaling.** Throughput is finite, typically a few thousand RSA-2048 operations per second. More capacity means more hardware.

For banks and certificate authorities, these costs are justified. The LMK lives in certified, tamper-resistant hardware, and the Shamir-split backup keys sit on smart cards in safes. It is a well-understood model.

But it is a centralised one. The operational LMK exists inside one HSM (or a small cluster of replicas). If that HSM is compromised, every key in the hierarchy is exposed.

## Cloud KMS: Convenient, Opaque, Still Centralised

AWS KMS, Google Cloud KMS, and Azure Key Vault offer the same key hierarchy as a managed service. Under the hood, they use HSMs, but the cloud provider owns and operates them. The provider manages the LMK, the key ceremonies, and the Shamir shares that protect the root of trust.

The convenience is real. A developer can create a KEK with a single API call and never think about firmware updates or custodian logistics. For many use cases, this is the right answer.

But for organisations with strict data sovereignty or regulatory requirements, cloud KMS introduces a structural tension: **the LMK is controlled by the provider, not the customer.** The cloud provider employs the administrators, holds the Shamir shares, and operates under the laws of their jurisdiction, including laws that may compel disclosure.

The trust model is the same as HSM, just with someone else holding the keys.

## HashiCorp Vault: SSS for the Master Key, Without Hardware

HashiCorp Vault is by far the most widely deployed general-purpose secrets manager. It stores secrets in an encrypted backend (Consul, a database, cloud storage), encrypted under a master key. Vault does not store that master key anywhere. Instead, it uses **Shamir's Secret Sharing** to split it into $n$ shares, of which any $k$ are required to reconstruct it.

When Vault starts (or restarts after a failure) it is in a **sealed** state. It cannot access any secrets. Operators must provide $k$ unseal keys to reconstruct the master key in memory, at which point Vault transitions to an unsealed state and can serve requests.

This is SSS applied to the master key, exactly as in HSM key ceremonies. No single operator holds the full key. Compromise of fewer than $k$ shares reveals nothing. The mathematics are the same.

But where HSMs protect the reconstructed master key in tamper-resistant silicon, Vault protects it with... the operating system. After unsealing, the master key lives in Vault's process memory for the duration of operation. Anyone with root access to the host, or the ability to dump process memory, can extract it.

In practice, many deployments opt for auto-unseal via cloud KMS, trading the Shamir ceremony for operational convenience and reintroducing the cloud provider into the trust boundary. Others use an HSM for auto-unseal, reintroducing the HSM cost.

Vault demonstrates that SSS is a powerful primitive, but also that without a hardware trust boundary, the reconstructed master key remains vulnerable.

## TEE-Based vHSMs: Hardware Isolation, Different Trade-offs

Trusted Execution Environments (TEEs) offer a different approach to hardware isolation. Intel SGX creates *enclaves*, isolated memory regions encrypted by the CPU's memory encryption engine. The host operating system, hypervisor, and firmware are all excluded from the trust boundary.

Products like Fortanix Data Security Manager and enclaive's offerings run key management logic inside SGX enclaves. The LMK is protected by the CPU silicon rather than by a dedicated cryptographic device. SGX also introduced **sealing** (encrypting data to the enclave's identity) and **remote attestation** (the CPU produces a signed report of the enclave's code measurement that a remote party can verify).

Intel TDX extends this model to entire virtual machines. AMD SEV-SNP provides equivalent guarantees on AMD processors.

TEE-based vHSMs are a different technology from certified HSMs, not a replacement for them. They are less rigorously certified, and the attack surface of a general-purpose CPU is larger than that of a purpose-built cryptographic device. SGX has been subject to side-channel attacks over the years (Foreshadow, Plundervolt, ÆPIC Leak), each mitigated through microcode and architectural revisions, but it would be wrong to claim equivalence with FIPS Level 3.

What TEEs do provide is **transparency through attestation**: any remote party can verify the exact code running inside the enclave, the configuration, and the hardware identity. This is something that certified HSMs, for all their physical robustness, do not offer. You trust an HSM because a certification body audited it. You trust a TEE because you can verify it yourself, in real time.

Still, the structural pattern is the same. The LMK, once reconstructed, lives inside one TEE (or a replicated cluster). The trust is centralised.

## The Common Pattern: Centralised Trust

All four approaches, HSMs, cloud KMS, HashiCorp Vault, and TEE-based vHSMs, share the same architecture:

1. An LMK is protected using Shamir's Secret Sharing (or an equivalent mechanism).
2. The shares are used to reconstruct the LMK in a single trusted location.
3. The LMK is then used operationally to wrap and unwrap KEKs and DEKs.
4. Security depends on that single location remaining uncompromised.

The differences are about *what* that trusted location is: tamper-resistant silicon, a cloud-managed HSM, a process running on Linux, or an SGX enclave. Each offers a different level of assurance. But the centralised trust model is the same.

This is a well-understood design with a well-understood weakness. If the single trusted location is compromised, whether by a hardware attack on the HSM, a rogue cloud administrator, a memory dump on the Vault host, or a side-channel attack on the enclave, the entire key hierarchy collapses.

The natural question is: can the trust be distributed instead?

## Shamir's Secret Sharing: The Mathematics

Shamir's Secret Sharing (SSS) appears in every approach above, but usually only to protect the master key at rest (during ceremonies, unsealing, and backup). It is worth looking at the mathematics, because they enable something more than just protecting an LMK.

In 1979, Adi Shamir published a scheme based on polynomial interpolation over finite fields. A secret (say, a 256-bit key) is split into $n$ shares such that any $k$ shares can reconstruct the secret, but $k-1$ shares reveal absolutely nothing about it.

The construction uses a random polynomial of degree $k-1$ over $\text{GF}(p)$, where $p$ is a large prime. The secret is the polynomial's constant term. Each share is an evaluation of the polynomial at a distinct non-zero point.

$$f(x) = a_0 + a_1 x + a_2 x^2 + \cdots + a_{k-1} x^{k-1} \pmod{p}$$

where $a_0$ is the secret and $a_1, \ldots, a_{k-1}$ are random. Share $i$ is the pair $(i, f(i))$.

The security of SSS is **information-theoretic**, not computational. Even an adversary with unbounded computing power cannot learn anything about the secret from fewer than $k$ shares. This is provable: any $k-1$ points are consistent with every possible value of $a_0$.

This is a strictly stronger guarantee than what any encryption algorithm provides. AES-256 is computationally secure: breaking it is believed to be infeasible, but not provably impossible. Shamir's scheme is unconditionally secure. No amount of computation helps.

In all the systems above, SSS protects the master key only during the ceremony or unsealing phase. Once the key is reconstructed, the information-theoretic guarantee disappears, because the full key now exists in one place. The mathematical security of SSS is discarded the moment it is most needed: during operation.

## Enclave Vaults: Distributed Trust

Enclave Vaults applies SSS differently. Instead of using Shamir shares to protect a master key that eventually gets reconstructed into a single HSM or Vault process, Enclave Vaults splits the *operational key itself* into shares and distributes them across independent TEEs on different physical machines.

### How It Works

Each vault instance runs inside its own SGX enclave, on a separate machine, with its own sealed storage. Each instance holds one Shamir share of the key.

The critical design property: **each vault instance knows nothing about the other shares.** A vault does not know which other vaults hold shares of the same secret, does not know the relationship between its share and shares held elsewhere, and cannot determine whether its share belongs to a 3-of-5 scheme or a 7-of-10 scheme. The shares are cryptographically unlinkable.

When a key operation is needed (signing, decryption, key derivation) the key owner independently fetches shares from $k$ vault instances over RA-TLS channels. The vault instances do not coordinate with each other; the client drives the entire process. That party could be a confidential VM, another enclave, an HSM, or any trusted environment the secret owner controls.

When the requesting party itself runs in a TEE, the channel becomes mutually attested: the vault verifies the client's enclave identity before releasing its share. This enables policy-driven secret release, where a vault will only hand over a share to a client whose code measurement, signer identity, and runtime configuration match an operator-defined policy. No human is in the loop; the release decision is made cryptographically, based on attestation evidence.

Each vault instance has its own sealed master key for protecting its local storage. But the operational secret, the DEK or signing key that the system exists to protect, never resides on any single machine.

### What Compromise Means

An attacker who compromises a single vault instance, even by breaking through the SGX isolation (which requires a hardware-level attack), obtains one Shamir share. One share reveals **zero information** about the secret. This is not a computational assumption; it is the information-theoretic guarantee of SSS.

To recover the secret, the attacker must independently compromise $k$ different enclave instances, on $k$ different physical machines, each with its own hardware trust anchor. And because the shares are unlinkable, the attacker cannot even tell which instances to target, because they do not know which shares belong to the same secret.

Compare this with compromising a single HSM, a single Vault process, or a single cloud KMS region. In those cases, one breach exposes the LMK and the entire key hierarchy falls.

### Centralised Trust vs Distributed Trust

The question Enclave Vaults poses is not "is a TEE better than an HSM?" It is: **should you trust a small number of highly certified machines, or a constellation of independently verified vaults?**

This is the same debate that the blockchain world has explored extensively. A traditional bank trusts a few heavily protected central servers. A distributed ledger trusts a network of independent nodes where no single compromise can alter the system's state. The security model is fundamentally different: not stronger hardware, but distributed trust.

Enclave Vaults brings this principle to key management. The security does not depend on any single vault being unbreakable. It depends on the attacker being unable to simultaneously compromise $k$ independent, geographically distributed, hardware-isolated vaults whose share-to-secret mapping is invisible.

### Transparency Through Attestation

Traditional HSMs are trusted because a certification body audited the hardware and firmware. The deployer trusts the audit. The end user trusts the deployer.

With Enclave OS, the trust model is different. Every vault instance issues RA-TLS certificates that attest its SGX enclave identity: the code measurement, configuration, and hardware. Any party can verify, in real time, that a vault is running the expected code in genuine TEE hardware. The attestation covers not just the code but the full runtime configuration, captured in a Merkle tree whose root is embedded in the RA-TLS certificate.

This transparency is what makes a distributed vault architecture practical. Without it, there would be no way for a client to trust that the constellation of vaults is configured correctly. With it, trust is no longer a matter of faith in a certification label; it is a matter of cryptographic verification.

### Scope and Use Case

Enclave Vaults is not designed for the long-term persistence of root secrets. An HSM in a vault, backed by Shamir-split smart cards in safes across multiple cities, remains the right architecture for LMKs that must survive for decades.

Enclave Vaults is designed for short-term recoverability and operational key protection at the DEK layer. If a machine is lost, compromised, or decommissioned, the key is not lost with it. It exists as shares across a constellation of vaults, recoverable by any quorum, with no single point of failure and no single point of compromise.

The motivating use case is Confidential Virtual Machines. Intel SGX enclaves have **sealing**: the CPU can encrypt data to the enclave's identity (MRENCLAVE), so that only the same enclave on the same machine can decrypt it later. Confidential VMs (Intel TDX, AMD SEV-SNP) have no equivalent primitive. A confidential VM that needs to persist a secret across reboots, such as a LUKS disk encryption key, has nowhere to seal it. Enclave Vaults provides that missing capability: the LUKS DEK is split into Shamir shares across remote SGX vaults, and the confidential VM reconstructs it at boot by fetching a quorum of shares over mutual RA-TLS. The result is a strong equivalent to MRENCLAVE sealing, but distributed and not bound to a single machine. [Enclave OS (Virtual)](https://github.com/Privasys/enclave-os-virtual) uses this mechanism to secure its LUKS volume keys.

Enclave Vaults runs on [Enclave OS (Mini)](https://github.com/Privasys/enclave-os-mini), an open-source operating system for SGX enclaves. Enclave OS (Mini) handles attestation, RA-TLS certificate issuance, sealed storage, and OIDC-based instance management. The vault logic runs as a Rust module inside the enclave.

### The Honest Boundaries

Enclave Vaults is **not a FIPS 140-3 certified HSM.** It does not have tamper-evident enclosures or zeroization mechanisms. Organisations that require specific FIPS certification levels need physical HSMs or certified vHSMs (some TEE-based products, like Fortanix, do carry FIPS certification). The TEE side-channel limitations discussed above apply equally here: the security model rests on SGX isolation, not on a purpose-built cryptographic device.

Architecturally, Enclave Vaults sits closer to the distributed key management designs emerging in the web3 world (threshold signatures, MPC wallets, distributed validator technology) than to the traditional HSM paradigm. The two approaches serve different points on the trust spectrum. Where FIPS certification is a hard legal requirement, or where the threat model includes nation-state physical attacks on silicon, dedicated HSMs remain the right choice. Enclave Vaults is for the many systems where distributing trust across independently verifiable machines is a better fit than concentrating it in a few heavily certified ones.

---

*Enclave Vaults is open source under the AGPL-3.0 licence: [github.com/Privasys/enclave-vaults](https://github.com/Privasys/enclave-vaults).*
