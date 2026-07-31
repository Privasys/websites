---
title: "AI Tools That Charge by the Call: Attested Pricing for MCP Servers"
author: "B Foing"
date: "2026-07-20"
---

Most AI SaaS is converging on the same shape. The product is a set of tools: look up a company, verify a document, summarise a filing, score a transaction. The distribution surface is an MCP server, because that is what agents call. And every one of these vendors faces the same commercial question: how do you charge for a tool call? The answer, almost universally, is a subscription or a metered API key, and both settle on the vendor's own logs. The buyer receives an invoice that says "you made 14,203 calls last month" and has no way to check the count, the price applied, or whether the tool that answered was the tool that was advertised. That was workable when a human clicked a button and could check the bill. It works less well when an autonomous agent makes ten thousand calls on your behalf.

## What metered billing actually gets you

The incumbent model works, and the tooling around it is excellent. Stripe will meter usage, aggregate it, pro-rate it, and produce a clean invoice with less than a day of integration work. For a trusted vendor with human customers, that is the right answer.

But look at where each guarantee comes from. The count comes from the vendor's telemetry. The price comes from a pricing page that can change between the call and the invoice. Consent was given once, at signup, to terms that cover everything the API might ever do. If the caller is an agent, its operator has effectively signed a blank cheque bounded only by a rate limit. All of it is unverifiable from the outside: every party has to trust the seller's infrastructure, and the seller has no way to prove they deserve it. MCP itself is silent on payment: the protocol describes tools and their schemas, and stops there.

## Pricing as part of the measured application

Confidential computing offers a different place to put the price. An application running inside a hardware enclave carries a measurement: a hash chain covering its code and its declared configuration, checkable by any caller through remote attestation. Put the price in that measured configuration, next to the tool's authentication policy, and the price a caller reads off the schema is the price the runtime will charge. The equivalence can be checked through attestation rather than taken on trust.

Charging then requires explicit consent. A priced call must carry the caller's approval of the exact price, stated literally on the request itself. Before any application code runs, the runtime compares that approval against the measured price. No approval, or the wrong amount, and the call is refused with a payment-required error carrying the current attested price, so the client can prompt its user, or its operator's policy, and retry. The comparison is deliberately an exact match rather than a ceiling: approving double the price of a call fails, because the point is proof that the caller knew this price, and a mismatch usually means the client's schema is stale. The fee is recorded only when the call succeeds; a failed call charges nothing.

The refusal happens inside the measured runtime, before the tool's own code is reached. Because of that ordering, **a successful priced call is attestable evidence that the caller pre-approved exactly the price they were charged.** The evidence rests on the enclave measurement, which binds the price, the enforcement code, and the tool itself into one verifiable identity; the vendor's logs and the vendor's word play no part in it. The consent cannot be tampered with in transit either, provided the TLS session terminates inside the enclave: no gateway or proxy on the path can inject an approval, alter a price, or strip a charge. A billing header behind ordinary TLS ends where the operator's edge begins; here it ends inside the measurement.

## The limits

The model has boundaries worth stating. A flat fee per successful call is its natural first shape: metered quantities (per token, per megabyte) require the runtime to attest the quantity as well as the price, so a tool with highly variable cost either prices at the average or splits into differently priced tools. A price change races every client's cached schema; the exact-match rule turns that race into a visible refusal and a retry rather than a silent surprise on the invoice, which is the right failure but still a failure the client has to handle. And the evidence covers the price and the consent, never the quality of the answer: attestation proves you got the tool you paid for at the price you approved, and says nothing about whether its output was any good.

## Why this matters for AI tools in particular

An agent cannot read a pricing page, and it should not click through terms of service. What it can do is fetch a schema, check a measurement, compare a number, and attach a header. Attested per-call pricing turns monetisation into exactly the kind of mechanical, verifiable protocol step that agents are good at, and it gives the humans on both sides something neither subscriptions nor metered keys ever provided: the seller can prove every charge was consented to at the advertised price, and the buyer can verify the tool, the price, and the charge with the same attestation check. Payment becomes part of the trust boundary rather than an act of faith in someone else's telemetry.

*We have built this model into our platform, for WebAssembly and container runtimes alike: [Charging by the Call on Privasys](/blog/charging-by-the-call-on-privasys-attested-pricing-in-two-runtimes) describes the implementation.*
