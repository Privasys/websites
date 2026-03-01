---
title: "WebAssembly Inside Enclaves: A New Model for Confidential Applications"
author: "Privasys Engineering Team"
date: "2026-02-23"
---

For the past decade, Confidential Computing has focused on one core promise: protect data while it is being processed. Intel SGX, AMD SEV-SNP, and Intel TDX all deliver hardware-enforced isolation — encrypted memory, attested code, a trust boundary that excludes even the cloud provider.

But isolation is only half the story. The other half is **what runs inside** that trust boundary.

Today, most confidential workloads are monolithic binaries compiled for a specific enclave SDK. They are powerful, but rigid. Deploying a new application means rebuilding the entire enclave image, re-signing it, and redeploying. Adding a third-party module means trusting all of its native code with full access to enclave memory.

There is a better model. One that the web browser solved years ago.

## WebAssembly: A Quick Primer

WebAssembly (WASM) was born in the browser. In 2017, all major browser vendors shipped support for a new binary instruction format designed to run code at near-native speed — safely. The key insight was that untrusted code (a game, a video editor, a spreadsheet engine) could execute inside a sandbox with **no access** to the host system unless explicitly granted.

A few properties make WASM unique:

| Property | What it means |
|----------|---------------|
| **Sandboxed by default** | A WASM module cannot access memory, files, or the network unless the host explicitly provides those capabilities |
| **Language-agnostic** | Rust, C, C++, Go, Python, JavaScript, and dozens of other languages compile to WASM |
| **Portable** | The same `.wasm` binary runs on any platform with a WASM runtime — no recompilation |
| **Deterministic** | Given the same inputs and the same host functions, execution produces the same outputs |
| **Small** | A typical WASM binary is tens to hundreds of kilobytes |

WASM quickly outgrew the browser. Server-side runtimes like Wasmtime, WasmEdge, and Wasmer now run WASM modules as lightweight, sandboxed compute units — a kind of ultra-lightweight container without the overhead of a full OS image.

### WASI: Giving WASM a System Interface

Pure WASM is computation-only. It can add numbers and manipulate memory, but it cannot read a file, get the current time, or open a network connection. For that, it needs a **system interface**.

WASI (WebAssembly System Interface) is the standardised answer. Maintained by the [Bytecode Alliance](https://bytecodealliance.org/), WASI defines a set of host-provided capabilities — random number generation, clocks, filesystem access, network sockets, environment variables — that a WASM module can import. The host runtime decides which capabilities to grant, creating a fine-grained permission model.

Think of it like Android app permissions. A calculator app does not need camera access. A WASM module that computes a hash does not need filesystem access. WASI makes capabilities explicit and selective.

### The Component Model: Strongly-Typed Composition

The latest evolution is the **Component Model**, which replaces the old "linear memory + integer functions" interface with richly typed contracts defined in WIT (WebAssembly Interface Types). A component declares exactly which interfaces it imports and exports — with types, records, enums, and results — and the runtime validates these contracts at load time.

This is the layer that makes WASM composable. Two components from different authors, written in different languages, can be linked together with type-checked boundaries. No shared memory, no ABI guessing, no unsafe casts.

## The Convergence: WASM Meets Confidential Computing

Now consider what happens when you put a WASM runtime inside an SGX enclave.

```
┌─────────────────────────────────────────────────────────────┐
│                      SGX Enclave                            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │             WASM Component (guest app)                │  │
│  │                                                       │  │
│  │  • Cannot access enclave memory directly              │  │
│  │  • Can only call host-provided interfaces             │  │
│  │  • Fuel-metered execution (bounded CPU)               │  │
│  │  • Fresh instance per call (stateless)                │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │ WIT interfaces                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │             Enclave OS Runtime (host)                 │  │
│  │                                                       │  │
│  │  WASI (random, clocks, filesystem, io, cli, sockets)  │  │
│  │  Platform APIs (crypto, keystore, https)              │  │
│  │                                                       │  │
│  │  • Crypto: ring + RDRAND (hardware RNG)               │  │
│  │  • Keys: MRENCLAVE-sealed, never leave enclave        │  │
│  │  • HTTPS: TLS terminated inside enclave (rustls)      │  │
│  │  • Filesystem: AES-256-GCM encrypted KV store         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                  Untrusted Host OS                          │
│   Only sees: encrypted blobs, TLS ciphertext, timestamps    │ 
└─────────────────────────────────────────────────────────────┘
```

You get **two layers of sandboxing**:

1. **Hardware isolation** (SGX) protects the enclave from the host OS, the hypervisor, and other software on the machine.
2. **Software isolation** (WASM) protects the enclave runtime from the guest application.

The guest app cannot corrupt the enclave's memory, bypass the crypto layer, or exfiltrate key material — not because we trust the app's author, but because the WASM sandbox makes it structurally impossible.

## Why This Matters

### 1. Run Any Language, Any Framework

Because dozens of languages compile to WASM, developers are not locked into a specific enclave SDK or programming language. A data scientist can write a privacy-preserving analytics function in Python (compiled to WASM via tools like [ComponentizeJS](https://github.com/nicovideo/nicovideo.github.io) or [componentize-py](https://github.com/bytecodealliance/componentize-py)), while a systems engineer writes a cryptographic module in Rust. Both run inside the same enclave with identical security guarantees.

### 2. Standard WASI Components Run As-Is

This is a critical design choice: the enclave runtime implements standard WASI Preview 2 interfaces. A pre-compiled WASM component that only imports `wasi:random`, `wasi:clocks`, `wasi:filesystem`, or `wasi:io` will run inside the enclave **without modification**. No special SDK, no recompilation. The Component Model matches imports by package name and version. From the component's perspective, it is just running on a WASI-compliant host — it happens to be one where random bytes come from Intel RDRAND and the filesystem is AES-256-GCM encrypted.

The only time a developer needs our SDK is when they want to use **enclave-exclusive capabilities** that have no WASI equivalent: hardware-backed cryptography with sealed keys, HTTPS with in-enclave TLS termination, or MRENCLAVE-bound key persistence. These are defined in a single WIT package (`privasys:enclave-os@0.1.0`) that extends the standard WASI surface with three additional interfaces.

### 3. Isolation Between Applications

Each WASM application runs in its own namespace. Application `A` cannot read application `B`'s keys, files, or environment variables — the enclave runtime enforces namespace isolation at the storage layer (`app:<name>/*`). This enables **multi-tenant confidential workloads** on a single enclave, where each tenant's code is sandboxed from both the host and from each other.

### 4. Auditable and Attestable Code

Because WASM binaries are compact and deterministic, their SHA-256 hash can be embedded directly into the enclave's RA-TLS certificate (as described in our [previous article on RA-TLS](/blog/a-practical-guide-for-an-attested-web)). A remote verifier does not just know that *an enclave* is running — they know the **exact code** running inside it, down to the byte. This transforms attestation from "trust this enclave image" to "trust this specific application".

### 5. Safe Hot-Loading

Deploying a new WASM module does not require rebuilding the enclave. The enclave OS can load a new `.wasm` binary, validate its Component Model interfaces at load time, and begin serving calls — all without restarting. This is a fundamental shift from the traditional enclave model, where any code change means a new MRENCLAVE measurement and a full redeployment cycle.

### 6. Fuel-Metered Execution

Every WASM call is metered. The runtime allocates a fixed fuel budget (10 million instructions) per invocation. If a guest app enters an infinite loop or consumes excessive resources, it is terminated cleanly. This is not a soft limit — it is enforced by the WASM runtime itself, making denial-of-service from a misbehaving guest structurally impossible.

## A Concrete Example

Consider a healthcare scenario. A hospital wants to run a diagnostic algorithm on patient data, but regulations prohibit sending that data outside a controlled environment.

With WASM inside an enclave:

1. The hospital deploys a standard WASI component (compiled from Python or Rust) that implements the diagnostic logic.
2. The component imports `wasi:random` for sampling, `privasys:enclave-os/crypto` for signing results, and `privasys:enclave-os/https` for fetching reference data from a medical API — with TLS terminated inside the enclave.
3. Patient data enters through an RA-TLS connection. The hospital's client verifies the enclave's attestation certificate, confirming the exact WASM bytecode running inside.
4. The algorithm processes the data. It cannot exfiltrate it — it has no network access except through the `https` interface, which only supports `https://` URLs and is logged.
5. Signed results are returned. The diagnostic output carries an ECDSA signature from a key that provably never left the enclave.

The hospital did not need to learn an enclave SDK. The algorithm author did not need to know about SGX. The WASM sandbox and the hardware enclave together provide the guarantees that neither could offer alone.

## The SDK: Minimal by Design

Our WASM SDK is intentionally small. It consists of a single WIT file defining three interfaces:

| Interface | Purpose |
|-----------|---------|
| `crypto` | Digest, AES-256-GCM encrypt/decrypt, ECDSA sign/verify, HMAC — all powered by `ring` inside SGX |
| `keystore` | Generate, import, export, persist, and load cryptographic keys sealed to the enclave identity |
| `https` | HTTPS-only egress with TLS termination inside the enclave — plain HTTP is rejected |

Everything else is standard WASI. We deliberately chose not to invent custom interfaces where WASI already provides one. Random numbers, clocks, filesystem, I/O streams, CLI environment, TCP sockets — these all use the standard `wasi:*@0.2.0` interfaces, re-implemented by the enclave runtime with SGX-backed security properties.

This means the ecosystem of existing WASI tooling, libraries, and documentation applies directly. There is no proprietary abstraction layer to learn.

## What's Next

- **WASM-to-WASM composition.** Link multiple components together inside the enclave, each with its own namespace and capabilities.
- **GPU integration.** With the [recent Linux 6.19 advances in Confidential GPU support](/blog/confidential-ai-from-isolated-enclaves-to-a-unified-fabric), WASM components will be able to dispatch inference workloads to attested GPUs.
- **Package registry.** A curated registry of WASM components verified for enclave compatibility — with reproducible builds and published code hashes.

## Conclusion

WebAssembly inside enclaves is not just a technical curiosity. It is a new programming model for confidential computing — one where security is structural rather than aspirational. The WASM sandbox prevents the guest from misbehaving. The hardware enclave prevents the host from snooping. Standard WASI interfaces mean existing code runs without modification. And the Component Model's typed contracts make composition safe across trust boundaries.

The result is a platform where deploying a confidential application is as simple as compiling to `.wasm` and uploading — no enclave SDK to learn, no binary to re-sign, no image to rebuild.

Privacy should be invisible. With WASM inside enclaves, it can be.

---

*Enclave OS (Mini) and its WASM SDK are open source under the AGPL-3.0 licence. Explore the code at [github.com/Privasys/enclave-os-mini](https://github.com/Privasys/enclave-os-mini).*
