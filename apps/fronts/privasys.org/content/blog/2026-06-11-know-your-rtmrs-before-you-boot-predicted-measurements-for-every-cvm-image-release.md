---
title: "Know Your RTMRs Before You Boot: Predicted Measurements for Every CVM Image Release"
author: "B Foing"
date: "2026-06-11"
---

When we [wrote about our CVM base images](/blog/cvm-base-images-what-we-build-and-why)
in April, the punchline was that a hardened, immutable image makes the
verifier's job *answerable*: one rootfs hash, one kernel command line,
one expected measurement per release. What we glossed over was an
awkward question. Where does the verifier get that expected
measurement from in the first place?

Until this week, the honest answer across most of the confidential
computing industry, ours included, was: *you boot a reference VM,
read the measurement registers back, and declare those values the
expected ones.* That works, but it is circular. The values you verify
against were produced by the very kind of machine you are trying to
verify. If the build pipeline, the reference VM, or the operator
publishing the values were compromised, the attestation would verify
perfectly, against the wrong baseline.

Starting with this week's releases of
[cvm-images](https://github.com/Privasys/cvm-images), we close that
loop. Every release now ships the measurements a TDX machine *will*
produce when it boots that image, **computed from the disk artifact
alone, before any VM exists**. No reference boot, no trusted first
machine, no circularity.

## What a release now contains

Each `tdx-base` and `tdx-gpu` release publishes, alongside the image
itself:

- **`*.roothash`**: the dm-verity root hash of the rootfs, recomputed
  independently in CI from the built filesystem (not just read back
  from the build).
- **`*.measurements.json`**: the predicted values of `RTMR[1]` and
  `RTMR[2]`, plus the inputs that produced them: per-event digests for
  every boot component the firmware will measure.
- A human-readable measurements table in the release notes, so an
  auditor can eyeball the values without parsing JSON.

The prediction is exact, not approximate. We validated it
byte-for-byte against the CC event log (CCEL) and live RTMR values of
freshly booted VMs on GCP TDX hardware: the JSON computed by CI before
the image ever touched a hypervisor matches what the silicon reports
after boot, bit for bit.

## How you predict a measurement register

TDX runtime measurement registers are hash chains:
`RTMR ← SHA384(RTMR ∥ digest)`, starting from zero, extended once per
boot event. So predicting an RTMR means knowing *exactly* which events
the firmware and bootloader will log, in order, and what digest each
one contributes. On GCP's TDVF firmware, everything extended into
`RTMR[1]` (the EFI boot path) and `RTMR[2]` (OS boot) is a pure
function of the disk image:

- **EFI boot applications** (shim, GRUB) are measured by their PE/COFF
  *Authenticode* hash: SHA-384 over the binary with the checksum
  field, the certificate-table directory entry, and any embedded
  signature excluded, sections processed in file-offset order. This is
  the same hash a Secure Boot signature would cover, which is exactly
  the point: it identifies the code, not the file's incidental bytes.
- **The GPT partition table** is measured as a digest of the partition
  entries. This is why our tooling also proves a useful negative
  result: resizing a disk on GCE does *not* alter the measured GPT, so
  growing a boot disk does not change `RTMR[1]`.
- **Every GRUB command** in `grub.cfg` is measured individually as
  `grub_cmd: …` events, after GRUB's own normalisation (variables like
  `${grub_platform}` expanded, quoting stripped). Our predictor parses
  the config with a strict state machine that *refuses* any construct
  it does not recognise; an unparseable grub.cfg fails the build
  rather than producing a silently wrong prediction.
- **The kernel, the initrd, and the kernel command line** are measured
  as file and string digests. The command line includes the dm-verity
  root hash, which is how the entire read-only rootfs, every userland
  binary on the machine, chains into `RTMR[2]` through a single
  measured value.

The predictor replays this event sequence from the raw image: it reads
the ESP, Authenticode-hashes the bootloaders, parses the GRUB
configuration, hashes the kernel and initrd, and folds everything into
the two hash chains. Around 200 lines of careful digest rules, and the
end of "boot it and see" as a verification methodology.

`MRTD` and `RTMR[0]` (the firmware itself and its configuration) are
the hypervisor's contribution, not the image's, so they are observed
per platform rather than predicted from the artifact. The split is the
honest one: we publish what the image determines; the platform
attests what the cloud determines.

## Pinned inputs: the build is now a fixed point

Predicting measurements from the artifact is only half of
transparency. The other half is being able to say what went *into* the
artifact. As of these releases, every image build pulls its packages
from [snapshot.ubuntu.com](https://snapshot.ubuntu.com) at a timestamp
pinned in the repository, not from the moving `archive.ubuntu.com`.
Two builds of the same tag see the same package universe, down to the
exact `.deb` files.

We are deliberate about what this does and does not claim. It is not
yet full bit-for-bit reproducibility: the build toolchain itself is
not yet content-addressed (that is on the roadmap, and the design
keeps a Nix-based toolchain as the natural next step). What pinning
buys today is that the inputs to any given release are *enumerable
and frozen*. An auditor who checks out the tag knows precisely which
upstream packages, at which versions, from which snapshot, are inside
the rootfs whose hash is measured into `RTMR[2]`.

## A measured line between production and development

The same releases introduce one more measured fact: an **image
profile** marker baked into the rootfs, distinguishing `production`
images from `dev` ones (dev images carry an SSH server and a baked
operator key; production images have no interactive access at all).
Because the marker lives in the dm-verity-protected rootfs, it is
covered by `RTMR[2]`. A dev image cannot claim to be production any
more than it could swap out its kernel.

Enclave OS surfaces the profile in its RA-TLS certificates under our
OID arc (`1.3.6.1.4.1.65230.2.8`), and all our client libraries (Go,
Python, TypeScript, Rust, .NET) now **fail closed** on it: a client
refuses to talk to a dev-profile enclave unless the application
explicitly opts in. The trust decision moved from "we deployed the
right image, surely" to a cryptographically measured property checked
on every handshake.

## And SEV-SNP joined the family on real hardware

A quieter milestone from the same release train: `sev-snp-base` had
its first boot on production AMD hardware, running SEV-SNP at VMPL0
with the same hardened kernel, lockdown, and dm-verity rootfs as the
TDX images. Measurement prediction for SNP (launch digests and vTPM
PCRs work differently from RTMRs) is on the roadmap; the image
architecture is already shared.

## What this unlocks

The practical payoff is that *admission* to our platform can now be
grounded in published, independently recomputable values. When a new
confidential VM enrolls, it presents a TDX quote; the platform
extracts its `MRTD` and RTMRs and an operator compares them against
the `measurements.json` of the release the machine is supposed to be
running. Those values existed before that machine ever booted, anyone
can recompute them from the public repository, and no reference VM
had to be trusted to produce them.

Attestation tells you what booted. As of this release, you can know
what *should* boot, from source, ahead of time, byte for byte. That
is the difference between checking a measurement and actually
verifying one, and it is what this level of transparency has always
been about for us: the expected value is not something we hand you,
it is something you can compute yourself.
