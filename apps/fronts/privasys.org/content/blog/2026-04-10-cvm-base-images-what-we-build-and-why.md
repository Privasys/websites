---
title: "CVM Base Images: What We Build, and Why We Don't Use the Cloud Provider's"
author: "B Foing"
date: "2026-04-10"
---

Every confidential workload we run starts from the same boring artefact:
a few hundred megabytes of Ubuntu, packed into a read-only erofs
filesystem, signed end-to-end, and measured into the TEE before
`/sbin/init` ever sees a syscall. We publish the recipe at
[Privasys/cvm-images](https://github.com/Privasys/cvm-images). It is
unglamorous code, and also the single piece of software whose
correctness everything else in our stack assumes.

This post explains what is actually in those images, why we ship our
own instead of using the ones GCP or Azure hand out for confidential
VMs, and what we have had to patch in the upstream kernel to make
those guarantees stick on real hardware.

## What a cloud confidential image gets you

Every major cloud now offers "confidential" images for TDX or SEV-SNP.
On the surface these look like exactly what you want: a turnkey
Ubuntu, kernel that knows about the TEE, NVIDIA driver pre-installed,
guest agent already wired up. Boot it, attest it, you're done.

In practice the image you get is the same general-purpose Ubuntu the
provider ships everywhere else, minus a few tweaks. To pick on Google
specifically, their "Confidential Ubuntu 24.04 LTS NVIDIA 580" image
is roughly 6 GB, 2,000+ packages, ext4 root mounted read-write, no
dm-verity, no kernel lockdown, no Secure Boot enforcement on every
stage. Anyone with root on the running guest can install a kernel
module, edit `/usr/bin/sshd`, drop a file in `/etc`, and survive a
reboot. The TDX measurement registers will still attest the *initial*
state of memory, but the runtime state has nothing to do with it.

This is the gap we set out to close.

## Our four images, one architecture

We ship four images, all built with [mkosi](https://github.com/systemd/mkosi):

| Image          | TEE                | Use                                  |
|----------------|--------------------|--------------------------------------|
| `tdx-base`     | Intel TDX          | CPU-only confidential workloads      |
| `tdx-gpu`      | Intel TDX + H100   | Confidential AI inference            |
| `sev-snp-base` | AMD SEV-SNP        | CPU-only on AMD                      |
| `sev-snp-gpu`  | AMD SEV-SNP + H100 | Confidential AI inference on AMD     |

They share a single security architecture. The TEE attests the
firmware. UEFI Secure Boot, *enforced* rather than merely "available",
verifies the bootloader. GRUB measures the kernel, the initrd, and
the kernel command line into the TEE's runtime measurement registers.
The kernel command line includes the dm-verity root hash for the
rootfs. Once the kernel is up, every block read from the rootfs is
hashed and compared against the in-memory Merkle tree whose root was
just measured. A single flipped bit anywhere on disk produces an I/O
error and a kernel panic. There is nowhere a tampered byte can hide.

Compared to the cloud provider's image, the trust chain is a closed
loop with no editable surface. The rootfs is read-only erofs, not
read-write ext4. Writable directories that legitimate software needs
(`/tmp`, `/var/log`, `/var/tmp`) are tmpfs, so they survive *until
shutdown*, not across a reboot. Persistent state lives on a separate
LUKS-encrypted partition whose key is derived inside the enclave from
the TEE's hardware identity, not from any secret the operator could
hand over.

## What we deliberately leave out

The other half of the story is what isn't in the image. Our `tdx-base`
ships ~250 packages, not 2,000. There is no Snap, no cloud-init, no
Python toolchain, no compiler, no `apt`. There is no GPG keyring for
package updates because there are no package updates: the image is
immutable, and "patching" means rebuilding the image and re-attesting
the new measurement.

Removing things is not free. Each missing package is a missing CVE
surface, but it's also a missing convenience that someone, somewhere,
inevitably wanted. Our rule of thumb: a package gets to stay if (a) it
is on the path between firmware and a working RA-TLS handshake, or
(b) it implements one of the userland services the platform actually
ships (sshd, systemd-networkd, cryptsetup, the container runtime).
Everything else gets cut.

Kernel lockdown is set to `integrity` mode. That blocks the textbook
escape hatches against an in-guest attacker: no loading unsigned
modules, no writing to `/dev/mem` or `/dev/kmem`, no kexec to an
unsigned kernel, no kernel debugging interfaces that would let an
attacker peek at memory the TEE just spent transistors hiding.

## The patch we carry that others don't: BadAML

Here is the most consequential change we make to the upstream kernel,
and the one that motivates the bulk of our reproducibility work.

ACPI is part of the boundary that the hypervisor defines. The host
hands the guest a set of ACPI tables, including SSDTs, and the kernel's
ACPICA interpreter executes the AML bytecode in those tables in
ring 0. AML can declare `SystemMemory` operation regions that name
arbitrary guest physical addresses. On a non-confidential VM that's
fine, because there is nothing in guest memory the host doesn't already see.
On a confidential VM it is a complete bypass: the hypervisor writes
malicious AML, the AML reads or writes private (encrypted) guest
pages, the TDX/SEV memory encryption is irrelevant because the
ACPICA interpreter has full kernel-mode access to private memory. The
attack was published in 2024 as
[BadAML](https://dl.acm.org/doi/10.1145/3719027.3765123)
(Takekoshi et al., USENIX Security 2025; BlackHat EU 2024 / ACM CCS
2025).

Our patch lives at
[`patches/0001-acpi-deny-aml-access-to-cvm-private-memory.patch`](https://github.com/Privasys/cvm-images/blob/main/patches/0001-acpi-deny-aml-access-to-cvm-private-memory.patch).
It hooks `acpi_ex_system_memory_space_handler()` (the function that
serves AML's SystemMemory reads and writes) and, when running on a
platform with `CC_ATTR_MEM_ENCRYPT` set, walks the page tables of the
target virtual address. If the resolved physical page is marked
encrypted (i.e. private to the VM), the access is denied and AML
gets back `AE_AML_ILLEGAL_ADDRESS`. On non-CVM systems the guard
compiles out to nothing.

We submitted the patch upstream in
[`patches/upstream/`](https://github.com/Privasys/cvm-images/tree/main/patches/upstream).
Until it lands, every confidential VM running a stock kernel is a
single malicious SSDT away from having its private memory read by the
host. A surprising number of production deployments still are.

## Why the cloud's image is not enough, even if you trust the cloud

The objection we hear most often is: "Doesn't the cloud provider also
attest the guest kernel? Why does the *image* need to be hardened?".
The answer is that attestation is a description, not an enforcement.
The TDX quote you get back says *what* you booted. If what you booted
is a writable, fully-featured Ubuntu, the quote will faithfully record
that fact and you, the verifier, then have to decide what it means.
There is no policy that turns a measurement of an unhardened image
into a meaningful security guarantee; that part is your job.

By restricting the image to one rootfs hash and one kernel command
line, with everything mutable accounted for, we make the verifier's
job answerable. The expected measurement is a single value per
release. If the quote matches, you know exactly the binaries that
serviced your request. If it doesn't, you stop talking to the box.

## What's next

The base images are deliberately a thin foundation. The bulk of the
useful behaviour (RA-TLS, the sealed session relay, container
orchestration, persistent encrypted volumes keyed to the enclave)
is in
[Enclave OS Virtual](https://docs.privasys.org/solutions/enclave-os/presentation/),
which builds on top of these images. The next post in this series
covers the GPU half of the stack: how we extend `tdx-gpu` to make
NVIDIA's H100 cooperate with TDX, what NVIDIA's SPDM/TDISP ceremony
actually does, and the two patches we've had to carry against the
open-source NVIDIA driver to make it boot at all on a real CVM.
