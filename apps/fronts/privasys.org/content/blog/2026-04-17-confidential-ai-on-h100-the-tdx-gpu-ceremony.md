---
title: "Confidential AI on H100: The CPU/GPU Ceremony, and the Patches Nobody Talks About"
author: "B Foing"
date: "2026-04-17"
---

The previous post in this series described the
[base images](/blog/cvm-base-images-what-we-build-and-why) we
build for confidential VMs: minimal Ubuntu, read-only erofs, dm-verity,
Secure Boot, kernel lockdown, our patch against the
[BadAML](https://dl.acm.org/doi/10.1145/3719027.3765123)
ACPI bypass.

That covers the CPU. For confidential AI we also need the GPU to be
inside the trust boundary, and that is a noticeably more complicated
story. NVIDIA's H100 has its own attestation, its own key hierarchy,
its own bus-level encryption protocol, and its own long list of
preconditions before a CUDA program can launch on a TDX guest. This
post is the field guide we wish we'd had when we first wired the two
together.

## What "Confidential AI" actually has to protect

A confidential AI deployment has three secrets in flight at once:

1. **The model weights.** Those are ours, or our customer's. They sit
   on encrypted storage, get streamed through the CPU on first load,
   and end up in GPU video memory.
2. **The user's prompt and the model's reply.** End-to-end encrypted
   from the browser to the enclave. Inside the enclave they live in
   CPU memory until the inference batch reaches the GPU.
3. **The KV-cache and intermediate activations.** Generated entirely
   inside the GPU, but materially derived from the prompt — leaking
   them is roughly equivalent to leaking the prompt itself.

TDX takes care of (1) and (2) while they're in CPU RAM and across the
hypervisor boundary. The minute they cross PCIe to the GPU, TDX has
nothing more to say. From there it's NVIDIA's Confidential Compute
mode, the H100's hardware root of trust, and the SPDM/TDISP/CCSL
machinery on top, that have to take over.

## The CPU/GPU ceremony

H100 in CC-on mode does not start in a usable state. There is a
multi-step ceremony that has to complete before the kernel is willing
to admit that the GPU is "ready for work" and CUDA is willing to
launch a kernel. Walk through what actually happens on a fresh boot:

**1. The kernel detects the TEE.** Our patched 6.17 reads
`X86_FEATURE_TDX_GUEST` and sets `cc_platform_has(CC_ATTR_MEM_ENCRYPT)`
to true. The NVIDIA kernel module reads that and turns on its CC
codepath.

**2. The driver and GSP firmware shake hands.** The H100's GSP
(GPU System Processor) is a small RISC core that runs signed firmware
NVIDIA ships in `gsp_gh100.bin`. The host driver and GSP-RM perform
mutual authentication: GSP-RM proves it is genuine NVIDIA firmware
running on a genuine H100, and the driver presents its CC capabilities.

**3. SPDM session, then TDISP lock.** The driver and GPU run
[SPDM](https://www.dmtf.org/standards/SPDM) (Security Protocol and
Data Model) over PCIe to negotiate an authenticated, integrity-
protected channel. SPDM proves the GPU's identity using a hardware
device certificate rooted in NVIDIA's CA. Once SPDM is up, the GPU is
moved to its [TDISP](https://pcisig.com/specifications) "LOCKED" state:
the configuration of the device is frozen, the device's PCIe
configuration is measured, and the host can no longer reconfigure or
reset the GPU without breaking the lock and triggering a re-attestation.

**4. The CCSL key is established.** SPDM gives us a session key. From
it the driver and GPU derive a CCSL (Confidential Compute Session Layer)
key used to AES-GCM-encrypt every byte of host↔GPU data traffic. Reads
and writes to GPU video memory from the host go through bounce buffers
that the driver encrypts with this key before DMA, and the GPU
decrypts in hardware on the other side.

**5. The host attests the whole stack.** The driver pulls a
fingerprint of the GSP firmware, the SPDM session transcript, and the
GPU's TDISP measurements. We bundle those into the same RA-TLS quote
the TDX side produces, so a verifier sees one consolidated identity:
"this CPU TEE, running this kernel, is talking to this specific H100
in this specific CC-on configuration, with this specific GSP firmware
version".

**6. The driver flips `gpus-ready`.** `nvidia-smi conf-compute -srs 1`.
Until that runs, every CUDA call returns
`CUDA_ERROR_SYSTEM_NOT_READY` (802). The PKCS#11 libraries
(`libnvidia-pkcs11-openssl3.so`) that gate the CC handshake also have
to be on the loader path; without them the call is
`CUDA_ERROR_NOT_SUPPORTED` (801).

Only at this point will vLLM start. Cold boot to "first token" on our
infrastructure is roughly two minutes, almost all of it spent in steps
2–5 plus loading model weights through the CCSL channel.

## The page-flip trick: TDX-private → TDX-shared

The single most important patch against the open-source NVIDIA driver
is the one nobody talks about. By default, in a TDX guest, all of guest
RAM is *private* — encrypted with a per-VM key the host never sees.
That is exactly what you want for ordinary memory, but it is exactly
what you do NOT want for memory you're about to hand to a PCIe device.
The H100, even in CC mode, cannot see TDX-private pages directly. The
bytes it would DMA are ciphertext under a key the GPU doesn't have.

There are two ways out. The default kernel path is to bounce: copy
private bytes into a `swiotlb` buffer that lives in shared memory, let
the device DMA from there, copy the result back. That works but it
caps you at the swiotlb's per-segment limit (256 KB), it doubles the
memory bandwidth on every transfer, and it adds a lot of CPU time to
the hot path.

The faster way, which the patched driver takes, is to ask the kernel to
*flip* the pages: take a range of pages that were allocated for DMA
buffers (weight staging, copy-engine buffers, GSP message queues),
call `set_memory_decrypted()` on them, and the TDX-module-mediated
machinery converts those pages from private to shared. The page now
lives in untrusted memory — but everything written to it from the
host driver is already AES-GCM-wrapped under the CCSL key before
DMA, and everything written into it by the GPU is encrypted with the
same key. The plaintext only exists inside the H100. The TDX module
correctly accounts the page as "shared" so it is not protected by
TDX's own memory encryption; the protection has been *transferred*
from TDX (CPU side) to CCSL (GPU side), not removed.

Our patches that make this work live at
[`patches/nvidia/`](https://github.com/Privasys/cvm-images/tree/main/patches/nvidia):

- **0002-sg-segment-size-limit.** The upstream driver builds DMA
  scatter-gather tables with `sg_alloc_table_from_pages()`, which
  merges contiguous physical pages into single SG segments. On TDX
  those segments routinely exceed `swiotlb`'s 256 KB ceiling and
  fail to map. We swap to `sg_alloc_table_from_pages_segment(...,
  PAGE_SIZE, ...)` so segments are capped at one page each. NVIDIA
  already does the same dance for Xen Dom0 (where `xen_swiotlb` has
  the same limit). The fix is a defence-in-depth even on the
  page-flipped hot path, where most buffers don't go through swiotlb
  at all.
- **0003-pmc-boot-42-synthesis.** On GCP A3 confidential VMs,
  reading the H100's `PMC_BOOT_42` register through PCIe BAR0 returns
  zero — the hypervisor's PCI config emulation doesn't pass it
  through. Without that register, GSP-RM cannot identify itself as
  a GH100 and refuses to initialise. We synthesise BOOT_42 from the
  still-readable BOOT_0 register in the three RM functions that read
  it. This is the patch that, more than any other, separates
  "boots and runs" from "boots and refuses to load the firmware".

## Why we use the open-source NVIDIA driver

NVIDIA ships two flavours of Linux driver: the proprietary one
(`nvidia.ko` as a binary blob compiled against a stable interface),
and the open-source kernel modules
([github.com/NVIDIA/open-gpu-kernel-modules](https://github.com/NVIDIA/open-gpu-kernel-modules)).
Both produce the same `nvidia.ko` from the user's point of view.

For a confidential workload the open driver is the only viable choice.
We can read what the kernel module does. We can patch what it does.
We can build it ourselves and verify the binary that ends up in the
image. The proprietary blob is opaque, signed by NVIDIA with no way
for an outside party to attest its provenance, and not patchable by
us when (as in the GPU/SPDM ceremony above) the upstream behaviour is
incompatible with TDX. Locking the driver into the dm-verity-protected
rootfs is meaningful only if we know what is in the binary; with the
open driver we do.

The catch — which cost us a week of debugging the first time we hit
it — is that the Ubuntu-shipped open kernel modules
(`nvidia-driver-590-server-open`) do not include the GH100 GSP
firmware. Only `gsp_ga10x.bin` and `gsp_tu10x.bin` are bundled. On
H100 the driver loads, then immediately refuses with "Disabling GSP
offload — GPU not supported", silently ignores
`NVreg_ConfidentialComputing=1`, and you get a non-CC GPU that CUDA
won't talk to anyway. We carry the GH100 GSP firmware ourselves
alongside our patched build of the open driver.

## What we cut from the TCB

We treat the GPU stack the same way we treat the OS image: the more
we strip out, the smaller the verifier's job and the smaller the
attack surface. Concretely:

- **No CUDA toolkit, no `nvcc`, no developer libraries** in the
  runtime image. The image runs *one* binary that uses CUDA — vLLM —
  and ships only the runtime libraries it actually links against.
- **No `nvidia-fabricmanager`, no nvlink-related tooling.** Single-GPU
  inference, no cross-GPU paths to attack.
- **No `nvidia-persistenced` running unattended.** The platform brings
  the GPU up, the platform tears it down, and `persistence mode` is
  set explicitly so the GPU doesn't decay back to a non-CC state
  between container restarts (which would force the whole SPDM
  ceremony to run again).
- **No DCGM, no telemetry daemons.** Anything that opens a UNIX
  socket is a potential channel out of the enclave. Metrics we
  actually need are scraped from `/proc/driver/nvidia/` and pushed
  through the same RA-TLS-fronted attestation channel as everything
  else.
- **Userspace MIG and vGPU paths disabled at module load.** A
  confidential workload owns the whole H100; there is no benefit to
  carrying the slicing machinery in the TCB.

## The bandwidth cost we still pay

Even with page-flipping and CCSL, host↔GPU bandwidth in CC-on mode is 
dramatically lower than the same hardware would deliver in passthrough
mode without confidentiality.
Every byte we move through the CCSL channel is AES-GCM-wrapped on the
CPU before it goes over PCIe. There is no host-side hardware acceleration
of that wrapping in either direction, and it scales with the data
rate, not with the message rate.

We measured roughly 4–8 GB/s of useful CCSL bandwidth on H100 SXM5,
versus the ~20–25 GB/s a non-confidential PCIe Gen5 link would give
you. That is a real cost, paid once on cold load (loading 70 GB of
weights through CCSL takes well over a minute), and it shows up again
each time KV-cache is moved between the CPU and the GPU.

## What you can verify

The point of all of this — the read-only image, the BadAML patch, the
CC ceremony, the page-flip, the TDISP lock — is that a verifier
asking the chat front-end for an RA-TLS handshake gets back a single
quote that says: this exact firmware, this exact kernel with these
exact patches, this exact rootfs hash, this exact NVIDIA driver build,
talking to this specific H100 with this specific GSP firmware in
TDISP-LOCKED CC-on mode. If any one of those identities doesn't match
what was published, the handshake fails closed and the browser never
sends the prompt.

That is the whole point. Confidential AI is not a feature of the
hardware; it is the negotiated outcome of every piece of software
between the user's keystroke and the model's first token, all of them
named, hashed, measured, and (in our case) published in
[the same repository](https://github.com/Privasys/cvm-images) you can
audit before you decide to trust the box.
