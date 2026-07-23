---
title: "AI Tools That Charge by the Call: Attested Pricing for MCP Servers"
author: "B Foing"
date: "2026-07-20"
---

Most AI SaaS is converging on the same shape. The product is a set of tools: look up a company, verify a document, summarise a filing, score a transaction. The distribution surface is an MCP server, because that is what agents call. And every one of these vendors faces the same commercial question: how do you charge for a tool call? The answer, almost universally, is a subscription or a metered API key, and both settle on the vendor's own logs. The buyer receives an invoice that says "you made 14,203 calls last month" and has no way to check the count, the price applied, or whether the tool that answered was the tool that was advertised. That was workable when a human clicked a button and could check the bill. It works less well when an autonomous agent makes ten thousand calls on your behalf.

## What metered billing actually gets you

The incumbent model works, and the tooling around it is excellent. Stripe will meter usage, aggregate it, pro-rate it, and produce a clean invoice with less than a day of integration work. For a trusted vendor with human customers, that is the right answer, and we use it ourselves for platform credits.

But look at where each guarantee comes from. The count comes from the vendor's telemetry. The price comes from a pricing page that can change between the call and the invoice. Consent was given once, at signup, to terms that cover everything the API might ever do. If the caller is an agent, its operator has effectively signed a blank cheque bounded only by a rate limit. All of it is unverifiable from the outside: every party has to trust the seller's infrastructure, and the seller has no way to prove they deserve it. MCP itself is silent on payment: the protocol describes tools and their schemas, and stops there.

## Pricing as part of the measured application

Our platform runs applications inside hardware enclaves, and every application carries a measurement: a hash chain that covers its code and its declared configuration, checkable by any caller through remote attestation. We put the price in that measured configuration. The price a caller reads off the schema is then the price the runtime will charge, and the equivalence can be checked through attestation rather than taken on trust.

A developer declares the fee directly on the tool, in the same interface definition that declares its authentication policy. In a WebAssembly app's WIT file:

```wit
/// Verify an identity document and return the extracted fields.
/// @auth authenticated
/// @price {"credits":5000,"payer":"caller"}
export verify-document: func(image: string) -> result<fields, string>;
```

Five thousand credits is half a penny; one pound is a million credits. The build embeds the rule in the application's measured configuration, and the enclave stamps it onto the schema it serves. When a client, whether our developer portal, the [App Explorer](https://explorer.privasys.org), the CLI, or an agent reading the MCP manifest, fetches the tool schema, the price rides along, attested by the same mechanism that attests the code.

Charging requires explicit consent. A priced call must carry a request header stating the price the caller agrees to pay:

```
POST /rpc/my-app/verify-document
X-Billing-Approved: 5000 credits
```

The enclave compares that literal string against the measured price before dispatching. No header, or the wrong amount, and the call is refused with `402 Payment Required` and a response header, `X-Billing-Price: 5000 credits`, stating the current attested price so the client can prompt its user and retry. The comparison is deliberately an exact match rather than a ceiling: approving 10,000 credits for a 5,000 credit call fails, because the point is proof that the caller knew this price, and a mismatch usually means the client's schema is stale. On success the response carries `X-Billing-Charged: 5000 credits`, and the fee is recorded only then; a failed call charges nothing. The developer receives 85 per cent of every fee and the platform keeps 15.

The refusal happens inside the measured runtime, before any application code runs. Because of that ordering, **a successful priced call is attestable evidence that the caller pre-approved exactly the price they were charged.** The evidence rests on the enclave measurement, which binds the price, the enforcement code, and the tool itself into one verifiable identity; our logs and the vendor's word play no part in it. The headers cannot be tampered with in transit either: the TLS session terminates inside the enclave (RA-TLS), so no gateway or proxy on the path can inject an approval, alter a price, or strip a charge. A billing header behind ordinary TLS ends where the operator's edge begins; here it ends inside the measurement.

## The limits

In the order a vendor would hit them. Pricing today is a flat fee per successful call; metered quantities (per token, per megabyte) are not yet expressible, so a tool with highly variable cost either prices at the average or splits into differently priced tools. Fees settle in platform credits: they accrue to the developer's account, offset their own compute bill, and cash out by invoice, since self-serve payouts are deliberately switched off until there is enough volume to justify the payout infrastructure. The enforcement described here runs in our WebAssembly runtime; container-based tools surface their prices already, and gain the same in-enclave enforcement next. And the response tells you what you were charged, not yet what you have left: a remaining-balance header is planned, but the enclave itself does not know balances by design, so that figure will come from the control plane and carry weaker guarantees than the charge itself.

## Why this matters for AI tools in particular

An agent cannot read a pricing page, and it should not click through terms of service. What it can do is fetch a schema, check a measurement, compare a number, and attach a header. Attested per-call pricing turns monetisation into exactly the kind of mechanical, verifiable protocol step that agents are good at, and it gives the humans on both sides something neither subscriptions nor metered keys ever provided: the seller can prove every charge was consented to at the advertised price, and the buyer can verify the tool, the price, and the charge with the same attestation check. Payment becomes part of the trust boundary rather than an act of faith in someone else's telemetry.

*Per-call pricing is live on the [Privasys developer platform](https://developer.privasys.org). Declare a price with one annotation, and try a priced call, consent flow included, against any app in the [App Explorer](https://explorer.privasys.org).*
