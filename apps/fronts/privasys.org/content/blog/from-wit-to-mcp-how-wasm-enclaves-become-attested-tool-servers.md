---
title: "From WIT to MCP: How WASM Enclaves Become Attested Tool Servers"
author: "B Foing"
date: "2026-03-20"
---

One of the things we love about WebAssembly is that it finally gives us a proper type system at the component boundary. Not "here is a pointer and a length", not "parse this JSON blob and hope for the best", but a richly typed contract that describes exactly what a function accepts and returns, down to the field names and variant cases.

That contract language is [WIT](https://component-model.bytecodealliance.org/design/wit.html) (WebAssembly Interface Types), and it is the foundation of the Component Model. We wrote about the Component Model in our [earlier article on WASM inside enclaves](/blog/webassembly-inside-enclaves-a-new-model-for-confidential-applications). Today, we want to show how WIT types flow from the deployed binary, through the browser, to your clients, and in the next version of the platform, to AI agents. Every WASM application deployed on Privasys will be an attested [MCP](https://modelcontextprotocol.io/) tool server, with typed interfaces derived directly from the code.

## The Problem with Enclave APIs

Enclaves are, by design, opaque. The host cannot inspect memory, cannot attach a debugger, cannot intercept function calls. This is exactly the property that makes them trustworthy, but it also makes them frustrating to develop against. You deploy a WASM module into an SGX enclave, and then... you `curl` it and squint at JSON?

Traditional enclave development has no equivalent of Swagger, no Postman, no GraphQL playground. You write code, compile it, deploy it into a black box, and debug by reading logs, if logging is even available. The feedback loop is painfully slow.

We thought we could do better. And WIT already gives us everything we need.

## WIT: The Contract That Cannot Drift

Here is a typical WIT definition for a key-value store running inside an Enclave OS Mini enclave:

```wit
package privasys:example@0.1.0;

world example {
    export hello: func() -> string;
    export kv-store: func(key: string, value: string) -> string;
    export kv-read: func(key: string) -> string;
    export compute-hash: func(data: list<u8>) -> string;
}
```

This is not documentation. It is the actual contract that the WASM runtime enforces at the binary level. The enclave will reject a call with the wrong number of parameters, the wrong types, or a missing function name. The types are not advisory. They are the API.

For twenty years, API contracts have been a second-class citizen. OpenAPI specs drift from the code. Protobuf definitions live in a separate repo from the server. GraphQL schemas are maintained by hand. The contract is always a *description* of the real thing, never the real thing itself.

WIT is different. **The contract is the code.** The `.wasm` binary carries its own type information. There is no separate schema file to keep in sync, no code generation step that might be out of date, no "the server actually returns a different shape in production" surprises. When the enclave tells you a function takes `(key: string, value: string) -> string`, that is what the WASM runtime will enforce at the bytecode level.

And because WIT supports records, enums, variants, options, results, lists, tuples, and flags, it can express APIs that are far richer than what you typically see in REST endpoints. A function can accept a `result<list<record { name: string, score: f64 }>, error-code>` and the runtime knows exactly how to serialise and deserialise it.

The Component Model was designed for exactly this scenario: two pieces of code, written by different authors, in different languages, that need to exchange data safely. Each component declares its imports and exports in WIT, and the runtime validates the contracts at link time. No shared memory, no ABI guessing, no unsafe casts. In an enclave, this matters even more. The trust boundary is not just an interface. It is a hardware boundary. Data crossing that boundary must be correctly typed, correctly serialised, and correctly validated. WIT guarantees this at the binary level.

The question is: why should this type information stop at the enclave boundary?

## Typed RPC Over RA-TLS with the Connect Protocol

When you deploy a WASM application on the [Privasys Developer Platform](https://developer.privasys.org), the platform exposes your enclave functions through the [Connect protocol](https://connectrpc.com/docs/introduction), an open standard for browser- and gRPC-compatible HTTP APIs. Connect gives us typed RPC semantics over standard HTTP, and we layer it on top of RA-TLS so that every call is attested end-to-end.

```
Browser                 Management Service              Enclave (SGX)
  │                          │                              │
  │  GET /apps/{id}/schema   │                              │
  ├─────────────────────────►│  wasm_schema (RA-TLS)        │
  │                          ├─────────────────────────────►│
  │                          │◄─────────────────────────────┤
  │◄─────────────────────────┤  { functions, interfaces }   │
  │                          │                              │
  │  POST /apps/{id}/rpc/fn  │                              │
  ├─────────────────────────►│  connect_call (RA-TLS)       │
  │                          ├─────────────────────────────►│
  │                          │◄─────────────────────────────┤
  │◄─────────────────────────┤  { status, returns }         │
```

Two things happen here:

1. **Schema discovery.** The enclave introspects the compiled `.cwasm` module's type information and exposes the full WIT schema as structured JSON. Every exported function, every parameter name, every type, all derived from the component's own WIT definition.

2. **Typed invocation.** The management service forwards RPC calls to the enclave over RA-TLS, where the WASM runtime deserialises parameters using the WIT type metadata, calls the function, and serialises the results back.

If you have used gRPC, this should feel familiar. A `.proto` file defines services and messages. A code generator produces stubs and skeletons. Our use of the [Connect protocol](https://connectrpc.com/) achieves the same semantics, but with WIT as the schema language instead of Protobuf. The WIT definition lives inside the `.wasm` binary. The schema is discovered at runtime. There is no `.proto` file to check in, no `protoc` to run, no generated code to keep in sync.

The entire transport layer is RA-TLS: every call from the management service to the enclave happens over a TLS connection that carries an SGX attestation quote. The schema endpoint is authenticated with a service JWT; the RPC endpoint is authenticated with the user's JWT. All within the same attested channel we described in our [article on RA-TLS](/blog/a-practical-guide-for-an-attested-web).

## WIT-Driven Developer Tools

### API Testing in the Browser

The Developer Platform's **API Testing** tab reads the schema and generates a fully typed, interactive API explorer, directly in the browser.

When you select a function from the dropdown, the UI displays its full signature with syntax highlighting:

```
fn kv-store(key: string, value: string) → string
```

And it generates **type-aware input controls** for each parameter:

| WIT Type | Input Control |
|----------|--------------|
| `string`, `char` | Text input |
| `bool` | Toggle switch |
| `u8`..`u64`, `s8`..`s64`, `f32`, `f64` | Number input |
| `enum` | Dropdown select with variants |
| `list`, `record`, `variant`, `option` | JSON editor |

This is not a generic JSON form. It is generated from the WIT schema. If your function takes a `record { name: string, age: u32 }`, the UI knows about `name` and `age`. If it takes an `enum { red, green, blue }`, the UI renders a dropdown with exactly those three options.

Default values are inferred from types: strings default to `""`, numbers to `0`, booleans to `false`, lists to `[]`, options to `null`. You click **Send**, the call travels over RA-TLS to the enclave, and the response appears with status, timing, and formatted JSON.

This is the development loop we wanted: write a WIT interface, compile to WASM, deploy to the platform, and test your functions interactively with the enclave's actual WIT types driving the UI. No Postman collections to maintain, no curl scripts, no guessing at JSON shapes.

### Typed Clients for Every Platform

The schema endpoint is not just for the dashboard. It is a public, authenticated API that any tooling can consume.

Because the schema is a structured JSON representation of WIT types, it can drive code generation for any client that needs to talk to the enclave. A TypeScript developer building a browser frontend can generate typed fetch wrappers from the schema. A Swift developer building an iOS app can generate Codable structs that match the enclave's function signatures. A Go service that orchestrates calls across multiple enclaves can generate typed clients for each one.

The pattern is the same one that made OpenAPI and Protobuf successful: a machine-readable contract that tools can consume to produce typed bindings. The difference is that the contract comes from the deployed binary itself, not from a file that someone remembered to update.

This also applies to enclave-to-enclave communication. When one enclave needs to call another, the schema endpoint tells it exactly what the target exports. In a multi-enclave architecture where services are composed across trust boundaries, this kind of type safety is not a convenience. It is a requirement.

## The Full Type System

The WIT type system is richer than most RPC frameworks offer. Our Connect-based RPC layer supports the full set:

| WIT Kind | Example | Behaviour |
|----------|---------|-----------|
| Primitives | `string`, `bool`, `u32`, `f64`, `char` | Direct JSON mapping |
| `list<T>` | `list<string>` | JSON array |
| `option<T>` | `option<u32>` | `null` or value |
| `result<O, E>` | `result<string, string>` | `{ ok: ... }` or `{ err: ... }` |
| `record` | `record { x: f32, y: f32 }` | JSON object with named fields |
| `tuple<A, B>` | `tuple<u32, string>` | JSON array (positional) |
| `enum` | `enum { a, b, c }` | String variant |
| `variant` | Tagged union | `{ tag: "...", value: ... }` |
| `flags` | `flags { read, write, exec }` | Array of active flags |

This means you can model domain-specific APIs with the same expressiveness you are used to in Rust or TypeScript. A medical analysis function can return `result<list<diagnosis>, error-code>` where `diagnosis` is a record and `error-code` is an enum, and the API explorer will render appropriate controls for all of it.

## What's Next: Every Enclave as an Attested MCP Server

Everything we have described so far, schema discovery, typed RPC, API testing, client generation, serves human developers. But the schema endpoint is just structured data. Any tooling can consume it. Including AI agents.

The [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is rapidly becoming the standard way for AI agents to discover and invoke tools. An MCP server advertises typed functions with names, descriptions, and JSON Schema parameters. An agent reads the manifest, understands what tools are available, and calls them with structured arguments.

This should sound familiar. Our schema endpoint already exposes exactly this: a set of typed functions with names, parameters, and return types. The structural information is there. What is missing is the *semantic* layer: human-readable descriptions that help an AI agent decide *when* and *how* to call a function.

### WIT Already Supports Documentation

WIT's `///` doc comments are part of the language specification. You can annotate exports, parameters, and types today:

```wit
package privasys:medical@0.1.0;

world diagnostic {
    /// Analyse patient symptoms and return ranked diagnoses.
    export analyse: func(
        /// Free-text symptom description from the patient.
        symptoms: string,
        /// Patient age in years.
        age: u32,
        /// Known drug allergies, if any.
        allergies: list<string>,
    ) -> result<list<diagnosis>, error-code>;
}
```

These comments are not just for developers reading the `.wit` file. They can be embedded into the compiled `.wasm` binary as a `package-docs` custom section, preserved through compilation, and extracted at runtime alongside the structural types.

### From Schema to MCP Tool Manifest

The enclave's schema and MCP endpoints derive tool manifests directly from the deployed binary. The flow is:

1. **Write documented WIT.** Use `///` comments on your exports and parameters, the same way you would document a Rust function or a TypeScript interface.

2. **Compile and deploy.** The documentation is embedded into the component binary as a `package-docs` custom section, carried alongside the type information the enclave already introspects.

3. **Schema endpoint emits MCP tools.** The enclave's `mcp_tools` endpoint includes descriptions alongside types. Each exported function becomes an MCP tool with a name, a description from the `///` comment, and a JSON Schema input derived from the WIT parameter types.

4. **AI agents discover and call.** An agent connecting to the platform sees your enclave's functions as typed, documented tools. It calls them over the same attested RPC channel that human users and programmatic clients already use.

The result: deploy a documented WASM app to the platform, and it is instantly available as an MCP tool server. No glue code, no separate MCP server implementation, no tool manifest to maintain. The manifest is derived from the deployed binary.

### Why Attestation Changes the Game

MCP tool servers exist today. What does not exist is an MCP server where the AI agent can *verify* that the tool runs inside a hardware-attested enclave.

When an agent calls a Privasys enclave over MCP, the connection carries an SGX attestation quote. The agent, or the infrastructure on its behalf, can verify the enclave's identity, its code measurement, and its configuration before sending a single byte of data. This is the same RA-TLS guarantee that protects human users, extended to AI workflows.

Consider a clinical decision-support agent that calls a medical inference model. The patient data flowing into that model is sensitive. Today, the agent has to trust that the tool server handles the data correctly. With an attested enclave, the agent can cryptographically verify that the model runs in a secure environment with a known code measurement. The trust is not based on a promise. It is based on a hardware quote.

Or consider a compliance workflow that calls a financial risk engine across organisational boundaries. The enclave provides the confidentiality. WIT provides the type safety. MCP provides the discoverability. Attestation provides the proof.

We think the combination of WIT's type system, enclave attestation, and MCP's discovery model is genuinely new territory. Typed, attested, confidential tool servers for AI agents, derived directly from the deployed code.

## Security Model

Every interaction with the enclave, whether from a human developer, a generated client, or an AI agent, runs with the same security guarantees:

| Aspect | Detail |
|--------|--------|
| **Transport** | RA-TLS (TLS with embedded SGX attestation quote) |
| **Schema auth** | Service JWT with manager role (auto-generated) |
| **RPC auth** | User's JWT or agent's JWT from the platform session |
| **Isolation** | Each WASM function runs in a sandboxed instance inside the SGX enclave |
| **Type safety** | WIT types enforce parameter shapes at the WASM boundary |
| **Tool discovery** | MCP manifest derived from the binary, not a separate config file |

The API Testing tab is not a backdoor. Neither is the MCP endpoint. Both are frontends for the same attested, authenticated RPC channel. The difference is that the schema makes one interactive for humans, and the other discoverable for AI agents.

## What This Means for Developers

We built the Developer Platform because we believe confidential computing should not require a PhD in SGX programming. You should be able to write a WASM component in Rust or any other language with a WASM target, deploy it, and interact with it, all through a browser.

Today, the API Testing feature closes the feedback loop between deploying confidential code and verifying that it works. The schema endpoint opens the door to typed client generation across any language or platform.

In the next version, MCP support will close the loop between enclaves and AI agents. Write a documented WIT interface, compile to WASM, deploy to the platform, and your enclave becomes a typed, attested tool that AI agents can discover and call. No MCP server to implement. No tool manifest to write. No glue code.

All of it is built on WIT, a standard we did not invent but wholeheartedly endorse. The Bytecode Alliance and the wider WASM community are building something genuinely important with the Component Model, and we are excited to be bringing it into the world of Confidential Computing.

Deploy a WASM app on the platform, open the API Testing tab, and call your functions. The types flow from your WIT definition, through the enclave, to the browser, to your clients, and soon, to your AI agents. No drift, no guesswork.

---

*The Privasys Developer Platform is live at [developer.privasys.org](https://developer.privasys.org). Enclave OS Mini is open source under AGPL-3.0 at [github.com/Privasys/enclave-os-mini](https://github.com/Privasys/enclave-os-mini).*
