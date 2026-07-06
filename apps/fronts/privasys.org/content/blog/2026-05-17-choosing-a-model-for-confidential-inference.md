---
title: "Choosing a Model for Confidential Inference: Qwen 3.6, a 256k Context, and One Very Busy H100"
author: "B Foing"
date: "2026-05-17"
---

We have written before about the plumbing of confidential AI: the
[GPU ceremony](/blog/confidential-ai-on-h100-the-tdx-gpu-ceremony)
that brings an H100 into Confidential Compute mode inside a TDX guest,
and [why any of this matters](/blog/why-confidential-computing-matters-for-ai)
in the first place. This post is about a different kind of decision:
which model to serve, and how to serve it, when the hardware budget is
one GPU inside a trust boundary.

It is a shorter post than usual, because the reasoning is simple once
the constraints are on the table. But the constraints are unusual, and
they led us somewhere we did not expect a year ago: a 35B-parameter
model serving a quarter-million-token context to hundreds of
concurrent users, on a single card, with hardware-enforced privacy for
every one of them.

## The constraints come first

Confidential inference does not let you pick a model the way a
benchmark leaderboard does. Three constraints shape everything:

1. **One GPU.** Outside confidential computing, the largest open
   models (think trillion-parameter peers) are
   served tensor-parallel across racks of NVLinked GPUs. Inside a
   trust boundary that escape hatch does not exist yet: confidential
   VMs with GPU attach come in exactly one practical shape today, a
   single H100 inside a TDX guest, with no NVLink mesh between
   enclaves. Whatever we serve has to fit, with its working memory,
   in the roughly 78 GiB the card offers once Confidential Compute
   mode takes its share.
2. **Attestable weights.** Our users verify what model answered them.
   Every response is tied to a measured disk image of the weights, so
   we strongly prefer precisions the vendor publishes and signs
   themselves. An official FP8 checkpoint is easy to attest; a
   third-party 4-bit repack is a provenance question we would rather
   not make our users ask.
3. **Memory is the product.** Inside the envelope, every byte the
   model does not need is a byte of context or concurrency we can
   give to users. Model architecture decides this more than model
   size does.

## Why Qwen 3.6

Against those constraints, [Qwen 3.6 35B-A3B](https://huggingface.co/Qwen/Qwen3.6-35B-A3B-FP8)
is currently the best fit we have measured, for three reasons.

**It is built for agentic work.** Our chat is not a toy: it drives
attested tool servers (web search, a headless browser, more coming)
through a server-side tool-call loop, and the model has to decide
when to call them, produce well-formed calls, and reason over the
results. The Qwen 3.6 series currently leads the pack on exactly this:
tool calling and coding benchmarks where it competes with models many
times its active size.

**It is fast where it counts.** The model is a mixture-of-experts:
35B parameters on disk, but only about 3B active for any given token.
Decode speed tracks active parameters, so it generates like a small
model while reasoning like a large one. Just as important, three out
of every four layers use linear attention (Gated DeltaNet) instead of
classic attention. Linear attention keeps a small fixed-size state per
conversation instead of a cache that grows with every token, which
brings us to the headline number below.

**The vendor ships FP8.** The official fine-grained FP8 checkpoint
runs natively on the H100's hardware FP8 path and is the artefact we
measure, publish, and attest. No repacking, no provenance gap. FP8 is
also our floor, for reasons that stack neatly: the H100's tensor cores
compute natively in FP8 but have no 4-bit path (hardware FP4 arrives
with the next GPU generation), so sub-8-bit formats on this card are
storage tricks that dequantise on the fly; the artefacts are
third-party repacks rather than vendor-signed checkpoints; and the
model fits comfortably at FP8 anyway, so there is nothing to buy by
going lower.

To be clear about our position: this is not a Qwen endorsement. Our
serving stack is deliberately model-agnostic; weights are read-only,
integrity-protected disks that we can swap with an API call, and
Gemma 4 31B remains loadable on the same fleet today. When a better
model for our users appears, we will change. For now, this is the best
one we can stand behind.

## A Goblet of Fire of context

We serve Qwen 3.6 at its full native context: 262,144 tokens. For
intuition, that is roughly the entire text of *Harry Potter and the
Goblet of Fire*, the longest-but-one book of the series, in a single
conversation. Paste a contract, a codebase, a year of correspondence,
and the model holds all of it at once, inside the enclave, end to end
encrypted from your browser to the GPU's own encrypted memory.

That number is unusual for confidential AI, and the architecture is
what makes it affordable. In a classic dense transformer, the KV cache
for a 256k-token conversation would consume tens of gigabytes on its
own; you could host one or two such users per card. In this hybrid
design, only ten of forty layers keep a per-token cache at all, and
they do so frugally. A fully loaded 256k conversation costs us about
2.5 GiB of GPU memory. The other thirty layers carry a fixed state of
around 31 MiB per conversation no matter how long it gets.

## Sharing one H100 without sharing anything else

Those numbers are what turn a security project into a service. After
weights and working buffers, our serving profile leaves a pool of
roughly 32 GiB, about 3.3 million resident tokens, that all live
conversations share. We admit up to **256 concurrent sessions** per
GPU. If everyone shows up with a Goblet-of-Fire-sized context at the
same moment, about a dozen fit fully resident and the scheduler queues
the rest; in the real mix, where most conversations are a few thousand
tokens and a few are enormous, the card stays comfortably busy serving
all of them.

Mutualising hardware is how every cloud works. The difference here is
what the sharing does *not* include:

- Each session reaches the enclave over its own end-to-end encrypted
  channel, bound to the user's identity.
- Inside the engine, each conversation's cache pages and recurrent
  state are private to that conversation. We deliberately disable
  cross-request cache reuse (prefix caching), trading a little
  throughput so that no byte derived from one user's prompt is ever
  read while serving another's.
- The CPU side is sealed by TDX, the GPU side by the H100's
  Confidential Compute mode, and the whole stack, model digest
  included, is remotely attestable before you send a single token.

A confidential deployment that hosts one tenant per GPU is a
demonstration. One that hosts 256 sessions per GPU, with those
guarantees intact, is a business: the economics finally resemble
ordinary inference, and scaling is a matter of adding identical,
identically-attested cards to the fleet.

## What is next

Two threads we are actively pulling: per-fleet scaling, so sustained
demand provisions new attested GPUs automatically, and
retrieval over private documents so the 256k window is filled with
*your* material on demand. Both will get their own posts.

In the meantime, the setup described here is live: open
[chat.privasys.org](https://chat.privasys.org), check the attestation
panel, and bring a long book!
