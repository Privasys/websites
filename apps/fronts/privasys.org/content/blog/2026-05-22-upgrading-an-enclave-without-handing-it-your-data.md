---
title: "Upgrading an Enclave Without Handing It Your Data"
author: "B Foing"
date: "2026-05-22"
---

A confidential application is never finished. It needs the same things every other piece of software needs: security patches, dependency bumps, new features, a fix for the bug a customer just reported. The difference is that a confidential application carries a property ordinary software does not. Its identity is a cryptographic measurement, and that measurement is what guards the data.

This creates a tension that sits at the heart of confidential computing and is rarely discussed honestly. The whole point of running inside a Trusted Execution Environment is that the code is pinned: the hardware measures exactly what is loaded, and the data is bound to that measurement. But pinned code cannot be patched without changing the measurement, and changing the measurement breaks the binding to the data. You are asked to choose between two things you cannot give up: keeping the software current, and keeping the data reachable.

This post is about why that tension is real, why the obvious ways out are all wrong, and how we resolve it with Enclave Vaults.

## Why you cannot just freeze the code

The first instinct, when measurement and data are this tightly coupled, is to avoid the problem. Ship version one, attest it, bind the data to it, and never touch it again. Stability as a feature.

This does not survive contact with reality. The CVE that lands next quarter does not care that your measurement is convenient. The cryptographic library you depend on will issue a fix, and "we chose not to apply it because upgrades are hard" is not a sentence you want to read in an incident report. Beyond security, software that cannot evolve is software that slowly dies: no new capabilities, no performance work, no response to what users actually ask for.

So upgrades are not optional. The question is not whether a confidential app changes its measurement over its lifetime but what happens to the data the moment it does.

## What actually breaks on an upgrade

Inside an SGX enclave, persistence works through **sealing**: the CPU encrypts data to the enclave's identity, so only the same code on the same machine can read it back. Confidential VMs (Intel TDX, AMD SEV-SNP) have no equivalent primitive, so they reach for a key held elsewhere and use it to unlock an encrypted volume. Either way, the principle is the same. The data at rest is encrypted, and the right to decrypt it is gated on the running code's measurement.

Now ship version two. The build is different, so the measurement is different. For sealing, the CPU will simply refuse to unseal version one's data to version two. For a volume-based confidential VM, whatever holds the key must decide whether this new, unrecognised measurement is allowed to have it. In both cases the data has not gone anywhere. It is sitting on disk, encrypted, intact. It is just unreachable, because the thing that was authorised to reach it no longer exists, and a new thing has taken its place.

That is the upgrade problem stated precisely. **An upgrade does not corrupt data. It revokes access to it.** And the only question that matters is: who gets to restore that access, and on what authority?

## The three wrong answers

There are three tempting ways to answer that question, and all three are wrong.

**Wrong answer one: lose the data.** Treat every upgrade as a fresh start. The new version comes up with an empty volume, the old data is abandoned, the user re-enters everything. This is occasionally acceptable for a stateless cache and never acceptable for anything a user cares about. It also quietly punishes good behaviour: the more diligently you patch, the more often you wipe your users.

**Wrong answer two: let the platform decide.** Have the infrastructure that ships the upgrade also grant the new measurement access to the old data. This is by far the most common shortcut, and it is the most dangerous, because it destroys the very guarantee the enclave was supposed to provide. If the platform operator can hand a freshly built measurement the keys to existing data, then the platform operator can read the data. They write the build, they grant it access, they run it. The hardware isolation becomes theatre. A confidential app whose operator can silently authorise new code to read user data is not confidential against its operator, which is usually the whole reason it exists.

**Wrong answer three: never upgrade.** We have already dealt with this one. It is wrong answer one wearing a disguise, just deferred until the day an unpatched vulnerability makes the decision for you.

The honest conclusion is that the authority to let a new version reach old data cannot sit with the platform, and cannot be skipped, and cannot be automatic. It has to sit with whoever owns the data, and it has to be an explicit, deliberate act.

## Our answer: the owner approves the new measurement

Enclave Vaults already gives us the right foundation. Instead of sealing data to a single enclave on a single machine, the data-encryption key (DEK) for an app's volume is generated inside the enclave, split with Shamir's Secret Sharing across a constellation of independent SGX vaults, and never reassembled anywhere but inside the enclave that needs it. On every boot the enclave reconstructs the DEK by fetching a quorum of shares over mutually attested RA-TLS. The platform never holds the key. We wrote about this distributed-trust model when we [introduced Enclave Vaults](/blog/enclave-vaults-rethinking-secrets-management-for-the-age-of-confidential-computing), and about the typed-key and policy machinery in the [v0.19 release](/blog/enclave-vaults-v0-19-typed-keys-and-policy-driven-operations).

The piece that solves the upgrade problem is the **key policy**. Each vault releases its share only to a caller whose attestation matches the key's policy. For a container app, that match is the enclave measurement plus the container image digest. Version one is on the policy, so version one boots, reconstructs its DEK, and reads its data. Version two has a different digest, is not on the policy, and so the vaults refuse it their shares. The data stays encrypted on disk. This refusal is not a failure. **It is the gate working exactly as designed.**

To get through the gate, version two has to be added to the policy, and that is governed by a single invariant we will not bend:

> A platform-driven upgrade never automatically authorises the new measurement to read existing data. The new measurement waits in a *pending* slot until the app owner explicitly approves it. This is a protocol rule, not a user-interface preference.

When a new version is built, its measurement is recorded and staged as a pending profile on the key. Staging changes nothing about access. The owner, on their own schedule, reviews the new build (the commit range, the build inputs, the resulting measurement) and then promotes it. Promotion is authenticated as the **app owner**, over their own identity, with whatever extra approvals the policy demands, such as a fresh biometric tap on a Privasys Wallet. Only then does the vault add the new measurement to the policy, and only then can version two reconstruct the DEK and reattach the existing, intact volume. The data survives the upgrade because it was never tied to the code in the first place. It was tied to the key, and the key was tied to the owner's decision.

## Why the platform cannot cheat

The property worth dwelling on is what a compromised platform can and cannot do.

A fully compromised platform operator can build any version it likes, deploy it, and stage its measurement as a pending profile. None of that grants access to anything. The promotion step is authenticated as the app owner against the vault constellation, and the platform holds no owner authority. Our management service, when it drives this flow on a developer's behalf, is a **proxy and nothing more**: it relays the owner's authenticated request to the vaults and injects none of its own credentials. The vaults are the enforcement boundary, not the platform.

So the worst a compromised platform can do is deploy code that cannot read any data and stage a request that sits there unapproved. The data stays locked. This is the difference between a system that is confidential against its operator and one that merely claims to be. The operator is structurally unable to grant new code access to old data, because the only key that can authorise it is one the operator never holds.

## The data owner gets a vote too

There is a second, sharper version of this problem, and the same machinery answers it.

Imagine an app that holds data belonging to its individual users, not just to the developer who built it. Version one stores each user's data. Version two adds a feature that derives new insight from that data: a summary, an analysis, a model trained on it. That is a genuine change in what the code does with personal data, and a user might reasonably welcome it or refuse it.

Because the key model is per-owner, that decision can belong to the **data owner**, not only the app developer. An app can opt into per-data-owner keys, where each user's slice of data is encrypted under a key whose owner is that user. The developer ships version two on their own schedule, but version two only reaches a given user's data once *that user* has approved the new measurement against *their* key. A user who declines keeps using version one's behaviour over their data; the new capability simply never sees it. Consent to a new use of personal data stops being a checkbox in a settings page and becomes a cryptographic fact: without the user's approval, the new code cannot read the bytes, no matter who deployed it.

This is, to us, the most interesting consequence of getting the upgrade gate right. The mechanism we built to keep a patch from breaking a volume turns out to be the mechanism that lets a user govern what new versions of an app may do with their data.

## The honest boundaries

This does not make upgrades painless. It makes them deliberate. Someone has to review the new build and approve it, and if that someone is unavailable, the new version waits. We think that friction is correctly placed: the friction of approving access to data should sit exactly where the authority over that data sits. For adopters who genuinely want hands-off rollout on low-stakes workloads, there is an explicit opt-in that records intent and produces an audit entry without a human in the loop. It is off by default, and turning it on is itself a deliberate act.

The TEE caveats from our earlier writing still apply. This is SGX-isolated key custody, not a FIPS 140-3 certified appliance, and the security rests on the constellation's distributed trust rather than on any single piece of tamper-resistant silicon. What it buys you is a property certified HSMs do not offer: every vault, and every app reaching for a key, proves its identity by attestation that anyone can verify in real time.

And the data-protection guarantee is exactly as strong as the statement that the platform never holds the key. We have built the system so that this is true by construction, not by promise. The DEK is generated in the enclave, split across vaults the platform does not control, and reconstructed only inside an attested measurement the owner has approved. There is no admin override, because there is no key for an admin to override with.

Upgrading a confidential application should not force a choice between current code and reachable data. With the upgrade gate, it does not. The code moves forward when the platform ships it. The data moves forward when its owner says so. Those are two different decisions, made by two different parties, and keeping them separate is the whole point.

---

*Enclave Vaults is open source under the AGPL-3.0 licence: [github.com/Privasys/enclave-vaults](https://github.com/Privasys/enclave-vaults). The solution page has the [short version](/solutions/enclave-vaults); the [documentation](https://docs.privasys.org/solutions/enclave-vaults/overview) has the long one.*
