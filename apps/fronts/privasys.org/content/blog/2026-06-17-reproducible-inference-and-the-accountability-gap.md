---
title: "Same Prompt, Same Answer: Reproducible Inference and the Accountability Gap"
author: "B Foing"
date: "2026-06-17"
---

A loan application is declined. A payment is flagged and frozen. A patient
record is summarised, and a clinician acts on the summary. More and more,
the actor in that loop is not a person but an agent: it read the inputs,
called a few tools, and produced a decision. When the decision turns out
to be wrong, an old and unforgiving question follows. Who is accountable,
and can they show what actually happened?

For most teams running agents in production today, the honest answer to
the second half is no. The operator pulls up the logs, finds the prompt,
re-runs it against the same model, and gets a different answer. Then a
third answer. The output that caused the damage cannot be reproduced, so
it cannot be examined, defended, or even properly understood. The person
who was nominally "in control" of the agent is left holding responsibility
for a process they cannot reconstruct. That is a roulette table, not an audit trail, and when the wheel lands badly there is no way to prove
which numbers were even in play.

## An audit you cannot replay is just a log

The instinct in regulated work is to log everything, and teams do. But a
log of "here is roughly what the model was asked and roughly what it
returned" is evidence of activity, not evidence of correctness. To defend
a decision, or to overturn it, you need a far stronger property: given
exactly this input, this model, and this configuration, the output was
exactly this, and anyone can run it again and get the same bytes.

That property has a name, and it is not "explainability" or "observability".
It is **reproducibility**. Without it, every other governance control sits
on sand. You cannot meaningfully review a decision you cannot recreate, you
cannot prove to a regulator how an automated outcome was reached, and you
cannot tell the difference between a model that made a defensible call on
the evidence and one that rolled the dice.

## First, pin the stack

Reproducing an inference means running the exact same computation twice. So
the first requirement is knowing, precisely and verifiably, what that
computation was: which weights, which inference engine, which GPU driver,
which kernel, which configuration.

This is ground we have already built. Our confidential VMs measure the
whole software stack and bind it into the attestation a client sees on
every connection. We
[publish the measurements each image will produce before any machine boots
it](/blog/know-your-rtmrs-before-you-boot-predicted-measurements-for-every-cvm-image-release),
so the question "what code is running" is answerable from source rather
than taken on trust, and we
[bring the H100 itself inside the trust boundary](/blog/confidential-ai-on-h100-the-tdx-gpu-ceremony)
so the GPU is a named, attested part of that stack and not an opaque
accelerator off to the side.

Pinning the stack is necessary. It tells you which dice are on the table.
It does not, on its own, tell you that the roll repeats.

## Where the randomness hides

Here is the uncomfortable part. Even with identical weights and identical
code, GPU inference is not deterministic by default, and the reasons run
deeper than the obvious one.

The obvious source is sampling: temperature and top-p with an unpinned
random seed will give you a different token stream every time. That one is
easy to fix by pinning the seed, and it is only the visible tip.

The deeper source is floating-point arithmetic. Matrix multiplications and
reductions on a GPU are not associative: the order in which thousands of
partial sums are combined changes the last bits of the result. A single
different bit in the logits can change which token is sampled, and once one
token differs the entire continuation diverges. So determinism is decided
not by your input but by the order of operations inside the engine.

And that order is exactly what modern inference engines optimise away for
speed:

- **Chunked prefill** splits a long prompt into variable-sized pieces. The
  chunk boundaries change the reduction order, so the same prompt processed
  in different chunk layouts produces different bits.
- **Continuous batching** means your request shares a kernel launch with
  whatever other requests happened to be in flight at that microsecond. The
  batch shape changes the reductions, so your output becomes a function of
  your neighbours' traffic.
- **JIT-compiled kernels** that warm up over the first requests, and
  workspace allocators that vary run to run, add their own variance.

Every one of these exists for a good reason: throughput and cost. And every
one of them quietly makes the output depend on things that have nothing to
do with your input. The faster and cheaper an inference service is, the
less reproducible it tends to be, unless someone has deliberately done the
work to claw determinism back. Most providers have not, because for a
consumer chatbot it does not matter. For an agent making decisions inside a
bank or a hospital, it is the whole game.

## How we make inference reproducible

Clawing determinism back is engineering, not a flag you flip. This is the
know-how we have built into Privasys Confidential AI.

**Every response carries its own replay recipe.** Attached to each answer
is a reproducibility block: the request id, the seed, the full sampling
parameters, the model name and the cryptographic digest of its weights, the
quantisation, the inference-engine and CUDA versions, the GPU model, the
container image digest, the TEE type, and a timestamp. Everything a verifier
needs to reconstruct the run is carried with the output itself, not buried
in a server log they have to trust.

**We pin the seed.** The proxy injects a deterministic seed when a client
does not supply one, and clients are encouraged to pass their own per
request, so a specific decision is tied to a specific seed on the record.

**We remove the optimisations that reorder arithmetic.** Chunked prefill is
turned off, and the batch token budget is sized so any prompt up to the
full context window is processed in a single prefill step. Chunk boundaries
can no longer reorder the reductions, because there are no chunks.

**We keep the optimisations that do not.** CUDA graph capture and replay run
a fixed kernel graph with fixed offsets, which is itself deterministic, so
we keep it on. Running fully eager instead cost us roughly thirty times the
throughput for no determinism gain in our locked environment. The numerics
environment is pinned too: a deterministic cuBLAS workspace and a fixed hash
seed.

**We make the result independent of other traffic.** Under naive continuous
batching, two identical requests can still differ because they land in
different batch shapes. We run batch-invariant kernels so the answer to your
request does not depend on who else is being served at the same instant.
Recent upstream work made this practical for the model architectures we
serve, and we run it in production.

**We warm up before we serve.** The first request after a cold start can
differ while JIT kernels compile, so an instance is warmed before it takes
traffic, and the recorded build lets a verifier compare like with like.

**And the build has to prove itself.** A continuous-integration gate fires a
batch of identical same-seed requests at a live enclave and asserts that the
content is bit-identical and the output hash is stable across all of them. A
build that cannot reproduce its own output does not ship.

We are deliberate about the boundaries of this claim, the same way we are
about [measurement prediction](/blog/know-your-rtmrs-before-you-boot-predicted-measurements-for-every-cvm-image-release).
Reproducibility holds for the same measured stack on the same class of
hardware. Change the GPU generation, the engine version, or the
quantisation and you are running a different function. The point is that the
metadata says exactly which function it was, and the attestation refuses to
pretend otherwise. The contract is honest and precise: identical input plus
identical attested stack gives identical output, every time, with a
cryptographic record of which stack that was.

## The record is signed by the hardware, not by us

A reproducibility block on its own is a claim, and a claim from the operator
is exactly what we are trying to get away from. What turns it into evidence
is that the same identifiers are bound into the hardware attestation. The
container image digest is measured into the quote, the model weights live on
a dm-verity-protected disk whose root hash is its own attested certificate
extension, and the whole stack chains into the TDX measurement registers
that a client can check on every RA-TLS handshake.

So the statement "this model, running this code, with this configuration,
produced this output for this input" is not something Privasys asserts. It
is something the silicon attests and any third party can recompute and
replay. Trust is removed from the equation, not requested.

## Why this changes enterprise automation

Reproducible, attested inference is the line between an agent you can deploy
in a regulated process and one you cannot.

- **Accountability becomes defensible.** When an agent's decision is
  challenged, the operator reproduces it exactly and shows that the inputs,
  the model, and the output were what the record says. The person in the
  loop defends themselves with evidence instead of a shrug.
- **Disputes and regulation become tractable.** A regulator, an auditor, or
  a counterparty can independently re-run the decision and get the same
  answer. Obligations to demonstrate how an automated decision was reached,
  the kind the EU AI Act is making routine, become something you can
  actually satisfy.
- **Incident response becomes engineering.** A bad output you can reproduce
  is a bug you can fix. A bad output you cannot reproduce is a ghost.
  Determinism turns post-incident work from archaeology into debugging.
- **Composed agents stay auditable.** When one agent's output feeds another
  agent's tools, every step being reproducible and attested means the entire
  chain can be reconstructed, not just the final hop.

The roulette wheel becomes a ledger. Same input, same answer, every time,
and a signed record of the exact machine that produced it. For a consumer
chatbot that is a curiosity. For an enterprise putting agents in charge of
decisions that have consequences, it is the difference between automation
you can stand behind and automation you are quietly gambling on.

As with everything we build, the stack is published. You do not have to take
our word that the answer is reproducible. You can verify the machine that
produced it, and then produce it again yourself.
