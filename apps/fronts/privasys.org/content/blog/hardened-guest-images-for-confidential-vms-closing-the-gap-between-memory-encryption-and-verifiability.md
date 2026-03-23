---
title: "Hardened Guest Images for Confidential VMs: Closing the Gap Between Memory Encryption and Verifiability"
author: "B Foing"
date: "2026-03-04"
---

Intel TDX and AMD SEV-SNP encrypt a virtual machine's memory so that even the hypervisor and cloud provider cannot read it. This is a genuine breakthrough. But memory encryption alone does not make a workload trustworthy. A confidential VM running a general-purpose Ubuntu image with two thousand packages, a writable filesystem, and unsigned kernel modules is still a soft target. The hardware protects the RAM, but nobody can verify what code is actually using that RAM.

This gap, between infrastructure-level memory encryption and guest-level verifiability, is the central unsolved problem in confidential VM deployment today. At OC3 2026, Red Hat's Vitaly Kuznetsov put it plainly: protecting data at rest inside a confidential VM "is not something you get by default." The task is left as an exercise to the reader.

This post describes how we approached that exercise when building [tdx-image-base](https://github.com/Privasys/tdx-image-base), a minimal, read-only, fully measured VM image for Intel TDX. The design principles are not TDX-specific. They apply equally to AMD SEV-SNP, Arm CCA, and any future hardware that provides VM-level isolation.

## What the Cloud Provider Gives You

Every major cloud provider now offers confidential VMs. Google Cloud has C3 instances with TDX. Azure has DCasv5/ECasv5 with SEV-SNP. AWS has Nitro Enclaves and memory encryption. The infrastructure story is mature: the silicon encrypts guest memory with a per-VM key, the hypervisor is excluded from the trust boundary, and the hardware can produce attestation reports proving the VM launched with a specific firmware and initial memory state.

The providers also offer pre-built guest images. Google, for example, ships a "Confidential image (Ubuntu 24.04 LTS NVIDIA version: 580)" that boots on TDX out of the box, complete with GPU drivers and cloud tooling.

These images are convenient. They are also fundamentally at odds with verifiability.

## The Problem with General-Purpose Images

A confidential VM image from a cloud provider is designed to run *any* workload. That generality requires a large package set, a writable filesystem, and permissive kernel configuration. These are reasonable choices for a general-purpose operating system, but they undermine the security guarantees that TDX and SEV-SNP are supposed to provide.

The specific problems:

**The rootfs is writable.** The image uses ext4 with full read-write access. Software can be installed, patched, or replaced after boot. The TDX measurement (MRTD and RTMRs) covers the initial state, but the running state can drift arbitrarily. An attacker who gains a foothold can modify binaries on disk, and those modifications survive reboot.

**There is no integrity verification.** Without dm-verity, nothing prevents a compromised process from tampering with the filesystem. A rootkit that replaces `/usr/bin/sshd` persists silently.

**The package set is enormous.** Two thousand or more packages means two thousand potential CVE surfaces. Even if today's image is secure, the attack surface is orders of magnitude larger than necessary for any single workload.

**Unsigned kernel modules can be loaded.** NVIDIA's proprietary `.ko` modules, for instance, are unsigned. Any code running in ring 0 has full access to the guest's memory, which is exactly what TDX is supposed to protect from the host. If unsigned code can run inside the guest, the isolation guarantee is weakened from within.

**Kernel lockdown is not enforced.** Without `lockdown=integrity`, there are multiple paths to inject code into the kernel at runtime (loading arbitrary modules, writing to `/dev/mem`, attaching debuggers).

The result: TDX measures the initial state of a VM whose running state is mutable, whose binaries are unprotected, and whose kernel is permissive. The attestation report says "this image booted," but it cannot say "this image is still running the code it booted with."

## What TDX Actually Measures

To understand why a hardened image matters, it helps to look at what TDX records and what a remote verifier can check.

TDX uses a set of registers to capture the boot chain:

- **MRTD** measures the TD firmware (OVMF/TDVF) loaded by the hypervisor. This is set at VM creation and cannot be changed.
- **RTMR[0]** measures the firmware configuration (CC MR 1).
- **RTMR[1]** measures the EFI boot path: shim and GRUB binaries (CC MR 2).
- **RTMR[2]** measures OS boot: kernel, initrd, and kernel command line including the dm-verity root hash (CC MR 3).

A remote verifier who receives a TDX attestation report can check these registers against known-good values. If the bootloader binaries, kernel, and command line match, the verifier knows that the VM booted with the expected software stack.

But this is where the chain typically ends. Once the kernel is running, the contents of the root filesystem are not measured or verified by the hardware. If the filesystem is writable, anything can change after boot. The RTMR values remain the same regardless of what happens to the userland.

The goal of a hardened image is to **extend the measurement chain from the hardware through the entire filesystem**, so that a remote verifier can confirm not just that the VM booted correctly, but that every binary on disk is exactly what was expected.

## The Design: dm-verity, erofs, and a Minimal Trust Surface

The solution is built on three Linux kernel features that, when combined with TDX measurements, create an unbroken chain from silicon to application.

### dm-verity: Integrity for Every Block

dm-verity is a device-mapper target that provides transparent integrity checking of block devices. A hash tree is computed over every block of the filesystem at build time. At runtime, the kernel verifies each block against the hash tree on every read. Any tampering produces an I/O error, which triggers a kernel panic.

The critical property: the **root hash** of the dm-verity hash tree is a single 256-bit value that summarises the entire filesystem. If you know the root hash, you can verify the exact contents of every file. If any byte changes, the root hash changes.

By embedding the dm-verity root hash in the kernel command line, and because GRUB measures the kernel command line into RTMR[2] (via CC MR 3), the root hash becomes part of the TDX attestation report. A remote verifier who checks RTMR[2] is implicitly verifying the integrity of every file on the root filesystem.

### erofs: Read-Only by Design

The root filesystem uses erofs (Enhanced Read-Only File System) rather than ext4 or squashfs. erofs is designed for read-only use: it is compact, fast, and structurally incapable of being written to. There is no accidental mutation, no journal, no write path.

This is a defence-in-depth choice. dm-verity would catch any write to a writable filesystem, but erofs eliminates the write path entirely. There is no code in the kernel for writing to erofs, which removes an entire class of potential vulnerabilities.

### Minimal Packages: Reducing the Attack Surface

The image includes approximately 40 packages: the kernel, systemd, openssh, attestation tools (tpm2-tools, clevis, cryptsetup), and basic networking. Nothing else. No package manager at runtime, no snap daemon, no cloud agent update services.

The reasoning is straightforward: every package is code, every line of code is a potential vulnerability, and every vulnerability inside the TDX boundary is an opportunity for an attacker who has already breached the perimeter to escalate. A confidential VM should contain exactly the code needed for its specific workload and nothing more.

### Signed Modules and Kernel Lockdown

The kernel is built with `module.sig_enforce=1`, which rejects any unsigned kernel module. Combined with `lockdown=integrity`, this ensures that only modules signed by a trusted key (Canonical, in this case) can execute in ring 0.

This is particularly important for confidential VMs. TDX protects the guest's memory from the host, but if the guest itself loads unsigned code into the kernel, that code has unrestricted access to the very memory TDX is protecting. Enforcing module signatures closes this gap.

## The Trust Chain

When all of these components are assembled, the trust chain is:

```
Silicon (TDX hardware)
  > MRTD measures the TD firmware (OVMF/TDVF)
    > RTMR[0] measures the firmware configuration
      > Secure Boot verifies shim > GRUB > kernel
        > RTMR[1] measures the EFI boot path (shim + GRUB binaries)
          > RTMR[2] measures kernel, initrd, and cmdline
            (including dm-verity root hash)
            > dm-verity verifies every block of the rootfs
            > All userland binaries are verified
```

Every byte of code that executes on the machine is either measured by TDX hardware or verified by dm-verity. A remote verifier who checks the TDX attestation report against the expected RTMR values can confirm, cryptographically, that the VM is running exactly the code in the repository. Not a modified version, not a version with extra packages, not a version where someone ran `apt install` after boot.

## Beyond the Rootfs: The Data Partition Problem

A fully read-only rootfs solves the integrity problem but creates a practical one: applications need to write data somewhere. Databases, logs, certificates, and user data all require persistent, writable storage.

The solution is a separate data partition, formatted with LUKS2 using AEAD integrity (`aes-xts-plain64` with `--integrity aead`), mounted at a dedicated path. LUKS2 with AEAD provides both confidentiality and authenticated integrity: every sector is encrypted and authenticated, so tampering with ciphertext is detected at read time rather than silently corrupting data. This partition is not part of the dm-verity chain (its contents change at runtime, by design), but AEAD ensures that an attacker who can write to the raw block device cannot modify data without detection. The LUKS key is protected through a mechanism external to the VM itself.

This is where the design intersects with the [Enclave Vaults architecture](/blog/enclave-vaults-rethinking-secrets-management-for-the-age-of-confidential-computing). Confidential VMs lack the equivalent of SGX's MRENCLAVE sealing: there is no hardware primitive that lets a TDX VM encrypt data to its own identity such that only the same VM can decrypt it later. The LUKS DEK must come from somewhere at boot time, and storing it on the VM's own disk would defeat the purpose.

Enclave Vaults provides the missing capability: the LUKS DEK is split into Shamir shares across remote SGX enclaves, and the confidential VM reconstructs it at boot by fetching a quorum of shares over mutual RA-TLS. The full mechanism is described in the Enclave Vaults post.

## Why This Is Not TDX-Specific

The design described here uses TDX as the reference platform, but the principles are hardware-agnostic:

- **AMD SEV-SNP** provides equivalent VM-level isolation with its own measurement registers (MEASUREMENT, HOST_DATA). The same image design (erofs, dm-verity, minimal packages, signed modules) applies. The dm-verity root hash can be bound to the SEV-SNP measurement through the same kernel command line mechanism.

- **Arm CCA** (Confidential Compute Architecture) is emerging as a third option. The trust model differs in implementation details, but the guest-side requirements are identical: a read-only, fully measured filesystem with an unbroken chain from hardware attestation to application code.

- **Bare-metal QEMU/KVM** with the [canonical/tdx](https://github.com/canonical/tdx) host stack can run the same image outside of any cloud provider, eliminating the provider from the trust model entirely.

The image is cloud-agnostic at its core: a standard GPT disk with a GRUB-booted kernel, erofs root, and dm-verity hash tree. Cloud-specific integration (GCP's guest agent, Azure's attestation endpoint) is added as a thin, removable layer.

## How Updates Work

An immutable rootfs means `apt install` on a running VM is impossible. Updates follow an image-based workflow:

1. Modify the build configuration (add packages, bump versions, update configs).
2. Rebuild the image with `mkosi build`.
3. Test locally with QEMU.
4. Upload the new image to the cloud platform.
5. Create a new VM from the new image, attach the existing LUKS-encrypted data disk, delete the old VM.

The data partition survives image updates because it lives on a separate persistent disk. The VM is treated as disposable infrastructure; the data is what persists.

This is a fundamentally different operational model from traditional VMs, where packages are updated in place. It is closer to how container images work: the image is built once, tested, and deployed immutably. The dm-verity root hash of each release is a fixed, auditable value. There is no configuration drift.

## The Industry Is Converging on This

The gap described in this post is not a niche concern. At OC3 2026, multiple talks will address the same problem from different angles:

- Red Hat will present work on full disk encryption for confidential computing guests, describing the challenge of making LUKS, dm-verity, and remote attestation work together seamlessly across SEV-SNP and TDX.
- Lennart Poettering (systemd) will present on remote attestation of immutable operating systems, describing upstream systemd features for verified boot and TPM-based attestation.
- Edgeless Systems and Intel will present on ownership-aware attestation, addressing the question of whether attestation should cover not just what software is running but who physically controls the platform.

The common thread: **memory encryption is table stakes; integrity and verifiability are the real problems.** Cloud providers will continue to offer general-purpose confidential VM images because that is what most customers want. But for workloads where a remote party must cryptographically verify what code is running, where the cloud provider is treated as an adversary (which is, after all, the entire point of confidential computing), a custom, minimal, fully measured image is not optional. It is the only design that delivers on the promise.

tdx-image-base is open source under the AGPL-3.0 licence: [github.com/Privasys/tdx-image-base](https://github.com/Privasys/tdx-image-base).
