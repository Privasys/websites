---
title: "One Slow Server Should Not Stop an Enclave: Non-Blocking Egress for WASM Apps"
author: "B Foing"
date: "2026-09-18"
---

A confidential application rarely lives alone. It calls a payment API, fetches a public key set, checks a price feed, asks another enclave for a verdict. On Enclave OS (Mini), the [WebAssembly runtime inside SGX](/blog/webassembly-inside-enclaves-a-new-model-for-confidential-applications), an app does this with one call, `https.fetch`, and TLS terminates inside the enclave so the host only ever carries ciphertext. Until now that call had a cost that had nothing to do with the app making it: while one app waited on the network, every other app on the enclave waited too.

This post explains why, what we changed, and what it measures on SGX hardware.

## Why one app could stall the others

An SGX enclave cannot open a socket. The host owns the network, and the enclave asks it to connect, send and receive. Enclave OS (Mini) keeps its trusted code small by running one event loop on one enclave thread: it reads the encrypted bytes of every connection, completes their TLS handshakes, and runs each request's WASM call in turn.

`https.fetch` was a blocking call on that loop. The enclave asked the host to connect, then waited for the answer; asked it to send, then waited; asked it to receive, then waited again. While it waited, nothing else in the enclave moved: no other app's request, no new visitor's handshake, no health check.

In normal use that is a latency tax. If an app calls an API that takes 800 ms, every other app on the enclave pauses for 800 ms, and the tax grows with every tenant. Under attack it is worse. An app that fetches a URL its users supply can be pointed at a server that accepts the connection and sends one byte just before each read times out. Each read succeeds, the fetch never ends, and the enclave is frozen until someone restarts it. No data leaks, but one tenant can take down every other tenant on the same machine.

## The obvious answers

Two fixes come to mind first, and both have merit.

**Timeouts on the host.** Bound the connect and give every socket a total deadline. This is cheap, lives entirely in untrusted code, and caps how long a single call can freeze the enclave. But a guest can repeat the call as often as it likes, and the latency tax of legitimate slow APIs stays exactly as it was.

**More threads.** Give the enclave several threads and the host a worker pool. SGX fixes the number of enclave threads when the enclave is signed, each needs its own protected stack, and most of the enclave's work goes through shared state that one lock would serialise anyway. The gain would be partial for a large increase in trusted code.

## Requests that step aside

We kept the single thread and let requests step aside instead. Each incoming request now runs as a task: a coroutine with a stack of its own. When the request has to wait, the task suspends and the event loop moves on to other connections. When the bytes it was waiting for arrive, the loop resumes it exactly where it stopped.

The difficult part is the guest. A WASM app compiled to native code sits on the stack in the middle of `https.fetch`, and an ordinary Rust `async` function cannot suspend through frames that are not its own. So every guest call now runs on a [wasmtime](https://wasmtime.dev/) fiber, and the fetch is an asynchronous host function: the runtime parks the guest's fiber mid-call and brings it back when the response is ready. To the guest nothing changes. The call still looks blocking, and the app's code, its WIT interface and its compiled artefact are the same as before.

The network side uses the host's TCP proxy, which already drives every inbound connection without blocking. An outbound connection is now one more connection it owns: the enclave hands it encrypted bytes and receives encrypted bytes back, and a read with nothing to read suspends the request instead of the enclave. The proxy also closes an outbound connection 60 seconds after it opened, so a server that trickles bytes fails its own request and nothing else.

Long computations get the same treatment. Every guest call yields every million units of fuel, a few milliseconds of compute, so a second-long calculation interleaves with other requests instead of holding the loop.

Getting coroutines to run inside SGX took two changes to the stack underneath. We moved our [wasmtime fork](https://github.com/Privasys/wasmtime) to upstream v48 and routed its fibers to a heap-backed backend, since the enclave has no `mmap`. And the SGX runtime refused any processor exception raised off the thread's own stack, which the enclave triggers routinely (it emulates `CPUID`, an instruction SGX forbids). Our [Teaclave SGX SDK fork](https://github.com/Privasys/teaclave-sgx-sdk) now lets trusted code register its fiber stacks, so an exception on one is handled like any other.

## What it measures

On SGX hardware we called a small `hello` function every 20 ms while other work ran on the same enclave:

| Running at the same time | `hello` latency |
|--------------------------|-----------------|
| Nothing | about 15 ms |
| Fetches of a 1.3 MB web page, back to back | 15 ms median, 56 ms worst; about 245 ms before |
| A fetch to a server that accepts and never answers | 15 ms median over 1,472 calls; the fetch fails after 60 s |
| Guest calls computing for 0.35 s each | 15 ms median |

The slow server no longer stops anyone but the app that called it.

## Limits

Coroutines share one thread, so the work itself is still done one piece at a time: a request that computes for a second takes a second, it just no longer makes everyone else wait for it. At most eight requests are suspended at once, because each holds its stacks and guest memory in the enclave's protected heap; beyond that a request runs to completion before the next starts, as it always did. Requests on the same connection are still answered in order, as HTTP/1.1 requires. And a few internal operations cannot suspend safely, such as a read of the enclave's trusted clock, which may happen while shared state is locked; those still wait in place.

## The principle

A multi-tenant enclave is only as good as its worst neighbour. Confidential computing protects each tenant's data from the machine, and the runtime has to protect each tenant's time from the others. With non-blocking egress, an app that waits on the network waits alone.

*Enclave OS (Mini) is open source under the AGPL-3.0 licence: [github.com/Privasys/enclave-os-mini](https://github.com/Privasys/enclave-os-mini). The design is documented at [docs.privasys.org](https://docs.privasys.org/solutions/enclave-os/enclave-os-mini/coroutines/).*
