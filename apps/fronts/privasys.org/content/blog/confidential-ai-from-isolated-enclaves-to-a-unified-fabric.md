---
title: "Confidential AI: From Isolated Enclaves to a Unified Fabric "
author: "B Foing"
date: "2026-02-12"
---

It has been ten years since the introduction of Confidential Computing with Intel SGX. As someone who has been involved since those early days, from my time at Socgen Research Lab and Secretarium to my current work at Privasys, I am thrilled to see the industry’s intense efforts to make trust and privacy a tangible reality.

The need for Confidential AI is high and will only continue to grow. Until now, the encryption overhead between the CPU and GPU has impacted I/O performance by roughly 90 per cent, which has been a massive pain for the industry. However, the release of [Linux 6.19](https://lwn.net/Articles/1057667/) earlier this week changes the game, setting the foundations for proper Confidential AI.

## The Bottleneck: Beyond Raw Throughput
The 90 per cent performance drop mentioned is not an exaggeration: it is the physical reality of how we have had to handle I/O. Because encryption is managed by the GPU driver running inside the Confidential VM, the CPU spends significant cycles encrypting every byte before it even hits the PCIe bus.

NVIDIA’s own [documentation](https://images.nvidia.com/aem-dam/en-zz/Solutions/data-center/HCC-Whitepaper-v1.0.pdf) (see page 29) admits this limits throughput to roughly 4 GB/sec. On a PCIe Gen5 slot capable of 64 GB/sec, you are losing the vast majority of your potential bandwidth. It is like owning a supercar but being forced to drive it in first gear. While modern CPUs like the 5th Gen Intel Xeon already have hardware capable of encrypting data at nearly 50 GB/sec, our current software architecture causes that performance to collapse.

## Unlocking Customisability: The "Confidential Hugging Face"

GPUs are expensive, and Confidential AI can only be commercially sustainable if hardware can be mutualised. In production, we need to swap different 40GB to 80GB models in and out of memory to serve multiple customers.

In a standard setup, this is fast. In Confidential mode, the encrypted transfer bottleneck previously turned a quick swap into a major latency event. This forced providers into a corner: they either restricted users to a tiny shortlist of models or oversize their cloud infrastructure to meet acceptable response times which is commercially unsustainable.

The breakthrough in Linux 6.19 moves the security logic from the software driver into the hardware of the PCIe controller itself. Hardware now handles encryption at wire-speed, making the overhead almost negligible.

This is the moment Confidential AI companies can finally offer true model customisability. Because swapping LLMs no longer takes an eternity, a "Confidential Hugging Face" model is now possible. Users are no longer stuck with a single "one-size-fits-all" model: they can deploy and swap specialised models as needed without a performance penalty.

## The Reality Check: Passthrough and Multi-tenancy

It is important to note that this revolution is currently a "Passthrough-only" victory. For these Linux 6.19 features to work, the GPU must be dedicated exclusively to a single VM. While this is a massive win for bare-metal performance and HPC clusters, it does not yet solve the multi-tenancy problem where a single machine hosts 50 or 100 VMs.

Securely delegating a "slice" of a GPU to different customers remains a challenge. However, much like Fintechs offer banking services while safeguarding customer money within a few regulated accounts, this is an opportunity for Confidential AI SaaS vendors to operate tenants within transparently verifiable Confidential VMs.

## Towards Hypervisor Independence

Beyond performance, this update is a foundational step toward what we expect in Linux 7: complete hypervisor independence. This is the ultimate goal because Confidential Computing remains vulnerable to certain hypervisor-level attacks.

By integrating TDISP (TEE Device Interface Security Protocol) and SPDM (Security Protocol and Data Model), the Guest VM will be able to directly authenticate the GPU. The hypervisor will be relegated to its true role: moving data packets it can neither read nor modify. This moves us toward a model rooted in verifiable, mathematical guarantees provided by the silicon rather than trusting a cloud provider's software stack.

## Final Thoughts

A ten-year cycle for a shift this fundamental is to be expected, but seeing these concepts reach the mainline Linux kernel is a landmark moment. Trustworthy infrastructure is the enabling technology for precise, privacy-first outcomes in fields like medical diagnostics. We are finally moving from isolated enclaves to a truly confidential fabric.

---

*Want to learn more? [Contact us](mailto:contact@privasys.org?subject=Privasys%20website%20contact) to discuss how confidential computing can protect your AI workloads.*
