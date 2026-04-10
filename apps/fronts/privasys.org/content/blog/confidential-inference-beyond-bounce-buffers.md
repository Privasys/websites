---
title: "Confidential Inference: Beyond Bounce Buffers"
author: "B Foing"
date: "2026-04-03"
---

Last month [Intel published a deep dive on bounce buffers](https://community.intel.com/t5/Blogs/Tech-Innovation/Artificial-Intelligence-AI/Confidential-AI-with-GPU-Acceleration-Bounce-Buffers-Offer-a/post/1740417) for confidential GPU workloads, while [NVIDIA published their zero-trust reference architecture](https://developer.nvidia.com/blog/building-a-zero-trust-architecture-for-confidential-ai-factories/) for AI factories using Confidential Containers and Kata VMs. The two posts approach the problem from different angles, but the underlying DMA mechanism is the same: a bounce buffer - an intermediary memory region that stages encrypted data between the CPU TEE (Intel TDX) and the GPU TEE (NVIDIA H100/H200/Blackwell CC mode). Data is decrypted inside the CPU trust domain, copied through a shared staging area, and made available to the GPU. Neither the hypervisor nor the host OS ever sees plaintext.

It works. It is production-ready at Google, Oracle, Alibaba, and ByteDance. But it carries a performance cost worth understanding, and there is an alternative approach worth exploring.

## The Bounce Buffer Tax

The bounce buffer architecture routes all GPU DMA through the kernel's swiotlb (Software I/O Translation Lookaside Buffer). Every transfer between CPU and GPU memory passes through this shared staging area, adding a full memory copy and a software encryption cycle to every operation.

The performance impact is substantial. NVIDIA's own [Hopper Confidential Computing whitepaper](https://images.nvidia.com/aem-dam/en-zz/Solutions/data-center/HCC-Whitepaper-v1.0.pdf) (p.29) shows throughput collapsing to roughly 4 GB/sec on a PCIe Gen5 link capable of 64 GB/sec. That is a 94% reduction in I/O bandwidth. For inference workloads, where model weights must be loaded into VRAM and KV cache transfers happen on every token, this overhead is not a rounding error. It determines whether a model loads in two minutes or twenty, and whether token-to-token latency stays under the threshold users will tolerate.

There is also a structural limitation. The Linux swiotlb has a compile-time per-segment size limit of 256 KB (`IO_TLB_SEGSIZE=128` pages). The NVIDIA GSP firmware message queue requires approximately 516 KB of contiguous DMA. When the bounce buffer is the only DMA path, this mismatch causes `swiotlb buffer is full` errors and the driver fails to initialise. Increasing the total swiotlb pool size (via kernel parameters) does not help - the per-segment limit is a compile-time constant.

The reference architecture works around this by ensuring the NVIDIA driver uses its own internal bounce buffer management rather than the kernel's swiotlb. But this adds yet another layer of software indirection.

## What the GPU Already Knows How to Do

It is worth noting that the H100 GPU already has hardware-level encryption for PCIe traffic. When Confidential Computing mode is active, the GPU's CC firmware encrypts all data on the PCIe bus with AES-GCM. This shipped with Hopper in 2023.

The question is whether the CPU-side driver enables the code path that takes advantage of it.

In the standard NVIDIA open driver (version 580 and 590), there is a function called `nv_detect_conf_compute_platform()`. When it detects a confidential computing environment, the driver calls `set_memory_decrypted()` on DMA buffer pages. This is a handoff, not a removal of protection: the CPU's TDX memory encryption steps back, and the GPU's hardware AES-GCM engine takes over. Protection moves from software-managed CPU encryption to hardware-managed link encryption. The GPU then handles all PCIe confidentiality at wire speed.

This is the same mechanism that every TDX-aware driver uses. The virtio, NVMe, and network drivers all call `set_memory_decrypted()` on their DMA buffers. It is the standard way to do device I/O in a TDX guest, documented in Intel's TDX Module specification (Section 11.3, "Shared Memory").

As of driver versions 580 and 590, the CC detection function checks for AMD SEV/SME and a proprietary CC-BIOS marker, but does not yet include a TDX code path. On a TDX guest, the detection returns false, and the driver falls back to the bounce buffer path.

## An Alternative: Enabling the Native CC Path

We were curious whether enabling the driver's existing CC code path for TDX would work. It does. The change is small - five lines of C that add TDX detection using the kernel's `cpu_feature_enabled(X86_FEATURE_TDX_GUEST)` API:

```c
#if defined(X86_FEATURE_TDX_GUEST)
    if (cpu_feature_enabled(X86_FEATURE_TDX_GUEST))
    {
        os_cc_tdx_enabled = NV_TRUE;
        os_cc_enabled = NV_TRUE;
    }
#endif
```

With this patch, the driver follows its existing CC code path: DMA pages are handed from CPU encryption to GPU hardware encryption, and the swiotlb bounce buffer is bypassed entirely.

In our testing with a 62 GB Gemma 4 model in BF16 on GCP's a3-highgpu-1g (TDX + H100), weights transfer to VRAM at full PCIe bandwidth - the raw DMA path is not the bottleneck. There is no software encryption cycle, no extra memory copy, no 256 KB segment limit. The GPU's AES-GCM engine handles PCIe confidentiality in hardware, at the physical layer.

## What Gets Shared, What Stays Protected

The term "TDX-shared" can be misleading. Converting a page from TDX-private to TDX-shared does not mean it becomes unprotected. It means the responsibility for protecting that page's data in transit shifts from the CPU's memory encryption engine to the GPU's PCIe link encryption engine. The data is still encrypted - by a different piece of hardware, using AES-GCM on the PCIe bus.

The pages that undergo this transition are the GPU driver's DMA buffers: command queues, GSP message channels, and framebuffer mappings. These are the same buffers that the bounce buffer architecture also places in shared memory. In both approaches, these specific pages must be accessible to the GPU. The difference is whether an intermediary software copy sits between them.

The bulk of guest memory - application code, the inference engine, the operating system - remains TDX-private. Model weights, once transferred to VRAM, are protected by the GPU's own memory encryption. The security boundaries are the same in both architectures. What changes is whether the DMA path goes through a software intermediary or goes directly, with the GPU's hardware encryption covering the link.

This is the same code path the NVIDIA driver uses on officially supported CC platforms. We are enabling it for TDX.

## The Full Stack

The driver patch is one piece. Confidential inference requires a complete stack, and the choices compound.

**Read-only, measured guest image.** Our [tdx-image-base](https://github.com/Privasys/tdx-image-base) uses erofs with dm-verity. Every block of the root filesystem is covered by a hash tree whose root hash is embedded in the kernel command line and measured into TDX RTMR[2]. The image contains approximately 40 packages. There is no writable filesystem, no package manager, no unsigned kernel modules. A remote verifier who checks the attestation report can confirm the exact contents of every file on disk.

Compare this to the reference architectures from NVIDIA and Intel, which specify Ubuntu 24.04 as the guest OS - a general-purpose distribution with thousands of packages and a writable root filesystem. CoCo mitigates this with encrypted container images pulled inside the TEE, but the guest OS itself remains a large, mutable attack surface.

**RA-TLS for inline attestation.** Every connection to the inference endpoint is TLS-terminated by a certificate that embeds the TDX attestation quote in its X.509 extensions. The quote, the measurements, and the hardware evidence are all present in the certificate chain. A simple `curl` with the CA certificate establishes a TLS connection to the enclave; verifying the embedded quote against known-good measurements can be done by any client that parses the X.509 extensions, without a separate SDK or out-of-band flow.

The NVIDIA/Intel reference architecture uses a Key Broker Service (KBS), an Attestation Service (AS), a Reference Value Provider Service (RVPS), and integration with NVIDIA Remote Attestation Service (NRAS). This is well-suited for multi-tenant AI factories with centralized policy enforcement. RA-TLS is a lighter-weight alternative for deployments where attestation evidence can travel with the connection itself.

**Model-agnostic inference.** A single container image serves any HuggingFace model. The model is selected at deploy time via environment variable. There is no per-model image build, no model-specific pipeline, no conversion step. vLLM handles hundreds of architectures natively - LLMs, VLMs, audio models, embedding models. Reproducible inference is enforced by the V0 engine with deterministic CUDA and per-request seed injection.

## The Trade-Off

The native CC path requires building the NVIDIA open driver from source with a five-line patch. That is the trade-off. You give up the convenience of a stock binary driver in exchange for full PCIe bandwidth, no swiotlb dependency, and a smaller TCB.

Everything else - multi-GPU fleets, multi-tenant scheduling, attestation - works the same way or better. A fleet of TDX VMs each running the patched driver can serve multiple tenants on shared GPU infrastructure just as well as the bounce buffer architecture, with lower per-transfer overhead. The attestation model is lighter, the guest image is smaller and immutable, and the driver source is fully open for audit.

## The Road Ahead

Both Intel and NVIDIA acknowledge that the bounce buffer is a transitional architecture. Intel's TDX Connect and the broader TEE-IO standard will enable hardware-level PCIe link encryption managed by the CPU and device together, creating a single logical TEE across CPU and GPU. NVIDIA's Blackwell and Intel's Granite Rapids are architecturally prepared for this.

When TEE-IO arrives, it will obsolete both the bounce buffer and the driver-level CC mode. The PCIe controller itself will handle encryption, with zero software involvement and zero overhead.

Until then, both approaches provide genuine confidentiality for GPU-accelerated inference. The bounce buffer is the safer, vendor-supported choice with broader ecosystem backing. The native CC code path removes the I/O overhead in exchange for a driver patch that we hope will eventually become unnecessary.

For our use case - dedicated TDX VMs each serving a single model on an H100 - the native CC path was the right fit. For multi-tenant Kubernetes clusters or environments that require strict adherence to vendor reference architectures, the bounce buffer is the more appropriate choice. Both are meaningful steps forward for confidential AI.

---

*The driver patches described in this post are documented in detail in our [confidential-ai repository](https://github.com/Privasys/confidential-ai). The full deployment procedure, including the CC detection fix and the SG segment size limit patch, is available for review and reproduction. [Contact us](mailto:contact@privasys.org?subject=Privasys%20website%20contact) if you want to test confidential inference on your own infrastructure.*
