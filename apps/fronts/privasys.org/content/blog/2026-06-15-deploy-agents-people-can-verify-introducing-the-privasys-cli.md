---
title: "Deploy Agents People Can Verify: Introducing the Privasys CLI"
author: "B Foing"
date: "2026-06-15"
---

Agents are being built at an extraordinary pace. Frontier models have
made it cheap to assemble services that read your mail, plan your
travel, reconcile your accounts, and act on your behalf. To be useful,
these agents need access to increasingly personal and sensitive data.
That is exactly why most of them will struggle to earn trust.

Businesses and individuals will not hand their most sensitive data to
an agentic service because a provider says the system is private. They
will trust it only if privacy can be demonstrated, compared, and
verified. "Trust the operator" is not enough. "Hide everything with
cryptography" is not enough either: a black box you cannot inspect is
not the same as a system you can audit.

Agentic AI needs confidentiality, but also auditability. It needs
privacy, but also policy enforcement. It needs to process sensitive
information without exposing it, while proving which model, which
tools, which permissions, and which configuration were actually used.
Those requirements pull in different directions, and you cannot wish
the tension away. You have to engineer for it.

This is the case we have been making since we started, in
[why confidential computing matters for AI](/blog/why-confidential-computing-matters-for-ai)
and in [a practical guide for an attested web](/blog/a-practical-guide-for-an-attested-web).
A hardware enclave keeps the data encrypted even while it is being
processed, so the operator never sees it. Remote attestation turns the
enclave's promises into evidence: a hardware-signed statement of the
exact code, configuration, and permissions running inside, delivered
during an ordinary TLS handshake. Confidentiality and auditability, in
the same connection. That is the trust boundary an agent should run
in.

## The gap was the workflow

The technology has been ready for a while. What was still too hard was
the day-to-day work of getting an agent into an enclave and keeping it
there: building reproducibly, deploying, rolling out a new version,
and, crucially, checking that the thing now running is the thing you
intended. Most teams will not adopt a trust model they have to
assemble by hand.

So today we are shipping the **Privasys CLI**. One binary,
`privasys`, that takes a confidential application from your terminal to
a verified, attested deployment, and lets any agent drive the same
workflow.

```sh
curl -fsSL https://raw.githubusercontent.com/Privasys/cli/main/install.sh | sh

privasys auth login                  # sign in with your wallet or a passkey
privasys apps deploy my-agent --watch
privasys attest my-agent             # challenge the enclave, verify its quote
```

Bring your code as a lightweight WASM module or a full container. The
platform handles the reproducible build, hardware allocation,
attestation, and routing. Every deployment gets its own attested
endpoint, and, as we described in
[from WIT to MCP](/blog/from-wit-to-mcp-how-wasm-enclaves-become-attested-tool-servers),
becomes a Model Context Protocol tool server automatically, so other
agents can discover and call it with attestation on every connection.

## Verify, don't trust

The most important command is `privasys attest`. It does the
verification **client-side**: it connects to the enclave directly over
RA-TLS, challenges it with a fresh nonce, and checks the hardware quote
and the per-workload code hash itself. There is no intermediary you
have to believe. You are not trusting Privasys that the deployment is
genuine; you are reading the hardware's own signed evidence. The same
check is available as a single function call in our verification
libraries, so your users can run it too.

This is the part that matters for agents. Before an agent sends a
prompt or a private document to a tool, it can confirm which model and
which code will handle it, that the configuration matches what was
audited, and that the permissions are the ones it expects. Policy
enforcement and privacy stop being claims on a marketing page and
become properties you can test on every call.

## Built for agents, by design

The CLI is agent-first, not human-only with an API bolted on. It is
also an MCP server: run `privasys mcp serve` and an agent can deploy,
attest, and manage confidential apps as native tools. A single
`privasys agents init` wires it into Claude Code, Cursor, VS Code, or
Gemini. Every command speaks JSON and returns stable exit codes, so it
scripts cleanly in CI and reads cleanly to a model. The whole platform,
from a terminal or from an agent.

## A tangible alternative

Personalised digital services need access to ever more sensitive data.
Now that new services can be built and improved at lightspeed, privacy
is no longer just a compliance line item. It is a product advantage:
the way to offer a tangible alternative to how data is owned and
controlled on the web today. The Privasys platform was built for
exactly that, helping organisations drive adoption by making data
protection demonstrable rather than asserted.

The CLI makes that path shorter. Deploy an agent into a trust boundary,
prove what is running inside it, and let the people who rely on it
verify the same thing for themselves.

Read the [CLI documentation](https://docs.privasys.org/solutions/platform/cli/),
browse the source on [GitHub](https://github.com/Privasys/cli), and
deploy your first attested agent today.

---

*Building an agentic service that needs to handle sensitive data?
[Contact us](mailto:contact@privasys.org?subject=Privasys%20CLI)
to talk it through.*
