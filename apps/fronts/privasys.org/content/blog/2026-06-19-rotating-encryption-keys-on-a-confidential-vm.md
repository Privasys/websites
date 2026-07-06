---
title: "Rotating Encryption Keys on a Confidential VM"
author: "B Foing"
date: "2026-06-19"
---

Key rotation is one of those security expectations everyone agrees on and few enjoy implementing. Auditors ask for it. Compliance frameworks mandate it. And on the day you suspect a key has been exposed, you want rotation to be a routine you have already rehearsed, not a project you have to invent under pressure. The principle behind it is simple: a key that never changes is a key with an ever-growing blast radius, so you change it on a schedule, and again the moment you have reason to worry.

Then you try to apply that principle to a confidential VM, where the data lives on a whole-disk encrypted volume and the key is held off-box by an attesting key manager, and the simple principle runs into an awkward question. If the key encrypts the disk, does rotating it mean re-encrypting the disk?

This post is the companion to our earlier one on [upgrading an enclave without handing it your data](/blog/upgrading-an-enclave-without-handing-it-your-data). That one was about changing the code while keeping the data reachable. This one is about changing the key while keeping the data exactly where it is.

## The question that traps people

The trap is a reasonable-sounding model of how the encryption works: the key the enclave fetches is *the* disk-encryption key, so rotating it must mean rewriting every sector under a new one.

If that were true, rotation would be miserable. Re-encrypting a confidential database of any real size is hours of I/O. Historically it has often meant taking the volume offline, and any interruption partway through risks leaving it in a half-converted state that is its own incident. Faced with that cost, the usual outcome is that rotation quietly never happens. The control exists on the audit spreadsheet and nowhere else. A rotation procedure too expensive to run protects nothing; it only decorates a compliance report.

So this leads us to the interesting question: how to make rotation not require re-encryption at all?

## Do not encrypt data with the key you rotate

The way out is old and well understood: **envelope encryption**. Two keys, not one. A data-encryption key, the DEK, does the actual work of encrypting bytes at rest. A key-encryption key, the KEK, does nothing but wrap the DEK. The data is encrypted once, under the DEK, and the DEK never changes for the life of the volume. What you rotate is the KEK, and rotating it means decrypting one small wrapped blob and re-encrypting that blob under the new KEK. Microseconds, not hours. The terabytes on disk are never touched. This is exactly what a KMS-backed managed database does when it rotates a customer master key: the data key underneath is re-wrapped, the data itself is left alone.

Good news, a confidential VM that encrypts its volume with LUKS already has this structure, whether its operators realise it or not. LUKS2 does not encrypt your data directly with the passphrase you hand it. At format time it generates a master key, encrypts the volume with that, and stores the master key in the volume header, wrapped by a keyslot derived from your passphrase. The passphrase is a KEK. The LUKS master key is the DEK. In our case the passphrase is the key the enclave reconstructs from the vault constellation on every boot, which is precisely why we name that key a **storage-kek** and not a storage-key.

So the answer to "does rotating the key mean re-encrypting the disk" is no. The key you rotate was never the key encrypting the disk. It was always one wrap removed, and rotating it is a re-wrap, not a re-encrypt.

## Two kinds of rotation, kept distinct

It pays to be precise about what "rotate the key" means, because there are two different operations and conflating them is how people end up frightened of the cheap one.

The first is **KEK rotation**: change the vault-held key, re-wrap the LUKS master key, leave the data alone. To `cryptsetup` this is adding a new keyslot and removing the old one. The master key never leaves the header, the volume stays mounted, the application keeps serving. This is the routine case, and it covers almost everything people actually want from rotation: a suspected exposure of a vault share, a departing engineer, a ninety-day policy, plain hygiene.

The second is **re-encrypting the data** under a brand new master key. This is the expensive operation the trap imagined, and it is genuinely only needed in one situation: when the at-rest cipher key itself, the LUKS master key, is suspected compromised. That is a far rarer and graver event than a wrapping key you simply want to retire on schedule. LUKS2 can even perform it online and resumably, but it remains a break-glass procedure, and we deliberately do not wire it to the rotate button. Most rotation that people need is the first kind. The second kind is the fire extinguisher behind glass, and pretending the two are the same is what makes routine rotation feel impossible.

## Rotation is not the upgrade gate

It is worth separating rotation from the upgrade flow, because they look alike and answer different threats.

The upgrade gate rotates **who may unwrap** the key. The code's measurement changes, and the new measurement has to be approved by the owner before the vaults will release their shares to it. Key rotation, by contrast, rotates **the wrapping key itself**, while who may unwrap stays exactly the same. The gate answers the question "new code wants in". Rotation answers the question "this key may have leaked, give me a fresh one". They reuse the same constellation machinery, but they are responses to different events, and a serious system wants both.

## Doing it without a window where the data is unreachable

The hard part of rotation is not the cryptography. It is the sequencing, because at no instant may a crash leave the data locked. Rotation touches two pieces of state, the lock on the disk and the record of which key opens it, and the order in which you change them is the whole game.

The rule we hold to is that **the volume must be openable with both the old key and the new key throughout the switch**. Concretely: provision a fresh key generation in the constellation; have the enclave reconstruct both the old and the new key and add the new one to a second LUKS keyslot, so that both now open the volume; only then advance the pointer that records which key is live; and only after that retire the old keyslot and delete the old generation. Walk through any point at which the process could die and the volume still opens. Before the pointer moves, the old key works. After it moves, the new key works. In the overlap between adding the new slot and killing the old, either key works.

> A rotation must never have a moment where a single failure leaves the data unreachable. The new key is added before the old one is retired, and the record of which key is live only moves while both keys still open the volume.

The one ordering we refuse is the tempting shortcut of advancing the pointer first, to a key that has not yet been written into a keyslot. That is precisely the sequence that can leave a volume no live key will open. Getting this order right is unglamorous, and it is most of what makes rotation safe.

## Who holds the authority

The answer here is the same as for upgrades, for the same structural reason. The re-key happens inside the enclave, using keys it reconstructs itself over mutually attested RA-TLS. No key material crosses a platform API at any point in a rotation. The platform service that orchestrates the flow is, once again, a proxy: it asks the enclave to add and remove keyslots and it advances a pointer in its own database, but it never sees a key, and it cannot author a new generation or retire an old one on its own authority. Retiring the superseded generation is gated on the **owner**, exactly as promotion is.

So a compromised platform cannot quietly rotate your key to one it controls, for the same reason it cannot grant a freshly built measurement access to your data: the authority lives with the owner, the key material lives in the enclave, and the platform holds neither. Rotation, like upgrade, is something the platform can request and never something it can grant itself.

## The boundaries

Routine rotation re-wraps the key. It does not re-encrypt the data, and it is not a substitute for doing so. If you have reason to believe the at-rest cipher key itself is compromised, you want the expensive procedure, and we keep it available and kept deliberately separate from the everyday path.

Rotation is online but it is not invisible. The application keeps serving while the keyslots change underneath it, but a rotation is still an owner action that leaves an audit trail. It does not happen behind your back, and the friction of approving it sits where the authority over the data sits.

And the TEE caveats from our earlier writing still hold. This is SGX-isolated key custody resting on the distributed trust of the vault constellation, not a certified appliance, and its worth is that every vault and every enclave reaching for a key proves its identity by attestation anyone can verify in real time.

The upgrade gate let the code move forward without breaking the data. Key rotation lets the keys move forward without breaking it either. Both fall out of the same small discipline: never tie data directly to something you will one day want to change. Tie it to a key, and keep that key wrapped, so the wrapping can change as often as your security posture demands while the data sits still underneath it, encrypted the whole time, never copied, never rewritten, never exposed.

---

*Enclave Vaults is open source under the AGPL-3.0 licence: [github.com/Privasys/enclave-vaults](https://github.com/Privasys/enclave-vaults). The solution page has the [short version](/solutions/enclave-vaults); the [documentation](https://docs.privasys.org/solutions/enclave-vaults/overview) has the long one.*
