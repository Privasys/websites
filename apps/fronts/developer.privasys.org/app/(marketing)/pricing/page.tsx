'use client';

import Balancer from 'react-wrap-balancer';
import Link from 'next/link';
import { FALLBACK_INSTANCE_SIZES, monthlyGBP } from '~/lib/instance-sizes';

// 1 credit = £0.000001  →  £1 = 1,000,000 credits.
// All figures below come straight from the platform price book (pricing-plan
// §4.2 WASM credits, §5.3 container instance catalogue).

const WASM_PRICES: { resource: string; price: string; basis: string }[] = [
    {
        resource: 'WASM compute (gas / fuel)',
        price: '10 credits / 1,000,000,000 instructions',
        basis: '≈ 100 credits per CPU-second (≈ £0.0001/s).'
    },
    {
        resource: 'App deployment',
        price: '100,000 credits + 500 / KB',
        basis: 'Includes the reproducible build. Per compiled artifact size.'
    },
    {
        resource: 'Ledger read',
        price: '100 credits + 10 / KB',
        basis: 'Per sealed key-value read.'
    },
    {
        resource: 'Ledger write',
        price: '200 credits + 100 / KB',
        basis: 'Per sealed key-value write.'
    },
    {
        resource: 'Crypto — digest',
        price: '1 credit / KB',
        basis: 'SHA-256 / 384 / 512 over the input bytes.'
    },
    {
        resource: 'Crypto — encrypt / decrypt',
        price: '10 credits / KB',
        basis: 'AES-GCM over the plaintext / ciphertext bytes.'
    },
    {
        resource: 'Crypto — sign',
        price: '50 credits / call',
        basis: 'ECDSA signature with an enclave-held key.'
    },
    {
        resource: 'Crypto — verify',
        price: '5 credits / call',
        basis: 'Signature verification.'
    },
    {
        resource: 'Crypto — random',
        price: '1 credit / byte',
        basis: 'Hardware RNG (RDRAND) inside the enclave.'
    },
    {
        resource: 'HTTPS fetch',
        price: '1,000 credits + 10 / KB',
        basis: 'Standard outbound HTTPS. Per request + response body.'
    },
    {
        resource: 'HTTPS fetch (RA-TLS policy)',
        price: '50,000 credits + 10 / KB',
        basis: 'Attested, enclave-to-enclave verified fetch.'
    },
    {
        resource: 'Auth & keystore SDK',
        price: 'Free',
        basis: 'Not metered in v1.'
    }
];

// Derived from the shared Confidential-* instance catalogue (the same one the
// dashboard's deploy picker uses), so the two never drift. Prices are shown
// as the meter tick (credits per started hour) plus the always-on GBP
// monthly equivalent.
// Sizes price COMPUTE only (vCPU + RAM). Storage is a separate, user-sized
// encrypted volume billed per GB-hour at the host region's rate.
const CONTAINER_SIZES: { size: string; cpu: string; ram: string; perHour: string; perMonth: string }[] =
    FALLBACK_INSTANCE_SIZES.map((s) => ({
        size: s.size,
        cpu: String(s.vcpu),
        ram: `${s.ram_gb} GB`,
        perHour: s.credits_per_hour.toLocaleString('en-GB'),
        perMonth: `£${monthlyGBP(s).toFixed(2)}`
    }));

// Dedicated confidential VMs: whole machines owned by one account, billed per
// started machine-hour. Medium and Large price the same as their shared size
// (the whole machine replaces the per-app meter); the GPU shape is
// dedicated-only. Rates mirror the platform price book's instance_hour_*
// resources.
const DEDICATED_MACHINES: { name: string; machine: string; cpu: string; ram: string; gpu: string; perHour: string; perMonth: string }[] = [
    { name: 'Confidential-Medium', machine: 'c3-standard-4', cpu: '4', ram: '16 GB', gpu: '–', perHour: '240,000', perMonth: '£172.80' },
    { name: 'Confidential-Large', machine: 'c3-standard-8', cpu: '8', ram: '32 GB', gpu: '–', perHour: '480,000', perMonth: '£345.60' },
    { name: 'Confidential-GPU-H100', machine: 'a3-highgpu-1g', cpu: '26', ram: '234 GB', gpu: '1× NVIDIA H100 80GB', perHour: '7,000,000', perMonth: '£5,040' }
];

const EXAMPLES: { label: string; detail: string }[] = [
    {
        label: 'A typical function call',
        detail: 'A 10,000,000-instruction call costs 1 credit — about £0.000001.'
    },
    {
        label: 'One CPU-second of compute',
        detail: '100 credits ≈ £0.0001.'
    },
    {
        label: 'Deploy a 1 MiB module',
        detail: '100,000 + 1024 × 500 = 612,000 credits ≈ £0.61, build included.'
    },
    {
        label: 'Write 8 KB to the ledger',
        detail: '200 + 8 × 100 = 1,000 credits.'
    },
    {
        label: '200,000 signatures',
        detail: '10,000,000 credits = £10 — exactly one month of the included allowance.'
    },
    {
        label: 'An attested RA-TLS fetch (4 KB up, 64 KB down)',
        detail: '50,000 + 68 × 10 = 50,680 credits ≈ £0.05.'
    }
];

// The attribute marketplace: any confidential app can provide priced, attested
// attributes; relying parties pay per disclosure. Prices below are Privasys's
// own gov-verified identity attributes; third-party providers set their own.
const MARKETPLACE_ROWS: { attribute: string; assurance: string; price: string }[] = [
    { attribute: 'Age over a threshold (18, 21, …)', assurance: 'Gov-verified', price: '10,000 credits ≈ £0.01' },
    { attribute: 'Nationality', assurance: 'Gov-verified', price: '10,000 credits ≈ £0.01' },
    { attribute: 'Given / family name', assurance: 'Gov-verified', price: '10,000 credits ≈ £0.01' },
    { attribute: 'Document valid (a genuine ID was verified)', assurance: 'Gov-verified', price: '10,000 credits ≈ £0.01' }
];

export default function PricingPage() {
    return (
        <div className="max-w-5xl mx-auto px-6">
            {/* Hero */}
            <section className="mt-24 lg:mt-40 max-w-3xl">
                <h1 className="text-5xl lg:text-[4rem] leading-tight">Simple, usage-based pricing.</h1>
                <p className="mt-8 text-lg text-black/60 dark:text-white/60 leading-relaxed">
                    <Balancer>
                        You pay for what you actually run inside the enclave — measured by the enclave itself,
                        priced in <strong>credits</strong>. One membership covers a generous monthly allowance,
                        and you only top up if you go beyond it. No surprise bills, no per-seat lock-in.
                    </Balancer>
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                    <Link
                        href="/dashboard"
                        className="px-6 py-2.5 font-bold rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                    >
                        Get started
                    </Link>
                    <Link
                        href="https://docs.privasys.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                        Read the documentation
                    </Link>
                </div>
            </section>

            {/* How credits work */}
            <section className="mt-28 lg:mt-40">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>How credits work</Balancer>
                </h2>
                <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
                        <div className="text-3xl font-bold">£1 = 1,000,000</div>
                        <div className="mt-1 text-sm text-black/60 dark:text-white/60">credits</div>
                        <p className="mt-4 text-black/60 dark:text-white/60">
                            One credit is £0.000001. Every metered operation has a fixed credit price,
                            so the same workload always costs the same.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
                        <div className="text-3xl font-bold">Enclave-measured</div>
                        <p className="mt-4 text-black/60 dark:text-white/60">
                            Usage is counted inside the hardware-protected enclave — the only place that
                            knows what really ran — and reported over an attested channel. You are billed
                            for real work, not estimates.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
                        <div className="text-3xl font-bold">Pre-paid</div>
                        <p className="mt-4 text-black/60 dark:text-white/60">
                            Credits are drawn from your balance as you go. Top up any amount in advance;
                            when the balance reaches zero an app pauses, while staying fully attestable.
                        </p>
                    </div>
                </div>
            </section>

            {/* Membership */}
            <section className="mt-28 lg:mt-40">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>Membership</Balancer>
                </h2>
                <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="rounded-2xl border-2 border-black dark:border-white p-8">
                        <h3 className="text-xl font-semibold">Developer membership</h3>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-4xl font-bold">£100</span>
                            <span className="text-black/60 dark:text-white/60">/ year</span>
                        </div>
                        <p className="mt-4 text-black/60 dark:text-white/60">
                            Includes <strong>10,000,000 credits every month</strong> (a £10/month allowance) —
                            enough for around 200,000 signatures, 27 hours of full-core compute, or any mix of
                            the operations below. Overage is drawn from your pre-paid balance.
                        </p>
                        <Link
                            href="/dashboard/billing"
                            className="mt-8 inline-block px-6 py-2.5 font-bold rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                        >
                            Manage billing
                        </Link>
                    </div>
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-8">
                        <h3 className="text-xl font-semibold">Reserved WASM capacity</h3>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-4xl font-bold">£200</span>
                            <span className="text-black/60 dark:text-white/60">/ month</span>
                        </div>
                        <p className="mt-4 text-black/60 dark:text-white/60">
                            Reserve <strong>400 MB of dedicated enclave (EPC) memory</strong> for your WASM
                            modules with <strong>unlimited, unmetered</strong> usage. Ideal for heavy, steady
                            workloads that would otherwise run past the credit model. (Dedicated
                            machines for container apps are priced below.)
                        </p>
                        <a
                            href="mailto:contact@privasys.org?subject=Privasys%20dedicated%20package"
                            className="mt-8 inline-block px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors"
                        >
                            Contact us
                        </a>
                    </div>
                </div>
            </section>

            {/* WASM price book */}
            <section className="mt-28 lg:mt-40">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>WASM modules — price book</Balancer>
                </h2>
                <p className="mt-6 text-lg text-black/60 dark:text-white/60">
                    Lightweight WebAssembly modules running in Enclave OS Mini. Per-KB charges round up to the
                    next KB (1 KB = 1024 bytes).
                </p>
                <div className="mt-10 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-black/10 dark:border-white/10 text-black/50 dark:text-white/50">
                                <th className="py-3 pr-4 font-medium">Operation</th>
                                <th className="py-3 pr-4 font-medium">Price</th>
                                <th className="py-3 font-medium">Basis</th>
                            </tr>
                        </thead>
                        <tbody>
                            {WASM_PRICES.map((p) => (
                                <tr key={p.resource} className="border-b border-black/5 dark:border-white/5">
                                    <td className="py-3 pr-4 font-medium">{p.resource}</td>
                                    <td className="py-3 pr-4 whitespace-nowrap">{p.price}</td>
                                    <td className="py-3 text-black/60 dark:text-white/60">{p.basis}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Container apps: the two hosting models, clearly separated */}
            <section className="mt-28 lg:mt-40">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>Container apps — two ways to host</Balancer>
                </h2>
                <p className="mt-6 text-lg text-black/60 dark:text-white/60">
                    Full applications running inside a confidential VM (Enclave OS Virtual). You choose the
                    hosting model when you deploy: a size on a <strong>shared</strong> confidential host, or a
                    whole <strong>dedicated</strong> machine of your own. Both bill per started hour from the
                    same credit balance, and both give your app its own encrypted volume and attested identity.
                </p>

                {/* Shared (mutualised) */}
                <div className="mt-12">
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-xl font-semibold">Shared confidential hosts</h3>
                        <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/50 dark:text-white/50">pay per size</span>
                    </div>
                    <p className="mt-3 text-black/60 dark:text-white/60">
                        The default. Your app runs at a fixed Confidential-* size on a shared confidential VM,
                        isolated in its own encrypted container volume with enforced CPU and memory limits.
                        You pay only for your size, only while deployed; when a location fills up the platform
                        provisions new shared capacity automatically.
                    </p>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-black/10 dark:border-white/10 text-black/50 dark:text-white/50">
                                    <th className="py-3 pr-4 font-medium">Size</th>
                                    <th className="py-3 pr-4 font-medium">vCPU</th>
                                    <th className="py-3 pr-4 font-medium">RAM</th>
                                    <th className="py-3 pr-4 font-medium">Credits / hour</th>
                                    <th className="py-3 font-medium">≈ £ / month</th>
                                </tr>
                            </thead>
                            <tbody>
                                {CONTAINER_SIZES.map((s) => (
                                    <tr key={s.size} className="border-b border-black/5 dark:border-white/5">
                                        <td className="py-3 pr-4 font-medium">{s.size}</td>
                                        <td className="py-3 pr-4">{s.cpu}</td>
                                        <td className="py-3 pr-4">{s.ram}</td>
                                        <td className="py-3 pr-4 whitespace-nowrap">{s.perHour}</td>
                                        <td className="py-3 whitespace-nowrap">{s.perMonth}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-4 text-sm text-black/50 dark:text-white/50">
                        Charged per started hour while deployed. The size is chosen at deploy time and a
                        redeploy with a new size is the resize. Sizes price compute; your app&apos;s
                        <strong> encrypted storage volume</strong> is sized by you (10 GB by default,
                        growable online) and billed separately at 278 credits per GB-hour
                        (≈ £0.20/GB per month), whether the app is running or not, until you delete the
                        volume. At zero balance the app is paused with reason “credits exhausted”,
                        staying fully attestable.
                    </p>
                </div>

                {/* Dedicated */}
                <div className="mt-16">
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-xl font-semibold">Dedicated confidential machines</h3>
                        <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/50 dark:text-white/50">pay per machine</span>
                    </div>
                    <p className="mt-3 text-black/60 dark:text-white/60">
                        A whole confidential VM provisioned on demand in minutes, owned by your account and
                        operated by us. You pay for the machine, not per app: run as many of your own apps on
                        it as you like, with resource caps entirely your call. Stop it when idle and pay only
                        for retained storage; start it again and your encrypted volumes are exactly where you
                        left them.
                    </p>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-black/10 dark:border-white/10 text-black/50 dark:text-white/50">
                                    <th className="py-3 pr-4 font-medium">Machine</th>
                                    <th className="py-3 pr-4 font-medium">Shape</th>
                                    <th className="py-3 pr-4 font-medium">vCPU</th>
                                    <th className="py-3 pr-4 font-medium">RAM</th>
                                    <th className="py-3 pr-4 font-medium">GPU</th>
                                    <th className="py-3 pr-4 font-medium">Credits / hour</th>
                                    <th className="py-3 font-medium">≈ £ / month</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DEDICATED_MACHINES.map((m) => (
                                    <tr key={m.machine} className="border-b border-black/5 dark:border-white/5">
                                        <td className="py-3 pr-4 font-medium">{m.name}</td>
                                        <td className="py-3 pr-4 font-mono text-xs">{m.machine}</td>
                                        <td className="py-3 pr-4">{m.cpu}</td>
                                        <td className="py-3 pr-4">{m.ram}</td>
                                        <td className="py-3 pr-4">{m.gpu}</td>
                                        <td className="py-3 pr-4 whitespace-nowrap">{m.perHour}</td>
                                        <td className="py-3 whitespace-nowrap">{m.perMonth}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-4 text-sm text-black/50 dark:text-white/50">
                        Charged per started machine-hour while the VM runs; the apps on it accrue no per-app
                        compute charges. A stopped machine keeps its encrypted volumes and vault keys for
                        200,000 credits (£0.20) per GB per month after a free grace window. The GPU machine
                        serves confidential AI: you pay for the machine, and your users pay per inference
                        token. Paris (France) at launch; the H100 runs in the Netherlands.
                    </p>
                </div>
            </section>

            {/* Bring your own hardware */}
            <section className="mt-28 lg:mt-40">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>On your own hardware</Balancer>
                </h2>
                <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-8">
                        <h3 className="text-xl font-semibold">Confidential AI software licence</h3>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-4xl font-bold">£7,500</span>
                            <span className="text-black/60 dark:text-white/60">/ month</span>
                        </div>
                        <p className="mt-4 text-black/60 dark:text-white/60">
                            Run the Privasys Confidential AI stack on your own H100 hardware, on
                            premises or in your cloud: attested inference serving, sealed transport
                            and per-token billing, with updates and support from us. Unlimited use.
                        </p>
                        <a
                            href="mailto:contact@privasys.org?subject=Privasys%20Confidential%20AI%20licence"
                            className="mt-8 inline-block px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors"
                        >
                            Contact us
                        </a>
                    </div>
                </div>
            </section>

            {/* Attribute marketplace */}
            <section className="mt-28 lg:mt-40">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>Attribute marketplace</Balancer>
                </h2>
                <p className="mt-6 text-lg text-black/60 dark:text-white/60">
                    Any confidential app can provide attested attributes — a verified insight such
                    as “over 18” or “genuine document” — and any relying party can consume them,
                    paying per disclosure. The provider earns 85% of each fee, the platform takes
                    15%, and the user&apos;s identity is never revealed to the platform. Prices below
                    are Privasys&apos;s own gov-verified identity attributes; third-party providers set
                    their own in their attested manifest.
                </p>
                <div className="mt-10 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-black/10 dark:border-white/10 text-black/50 dark:text-white/50">
                                <th className="py-3 pr-4 font-medium">Attribute</th>
                                <th className="py-3 pr-4 font-medium">Assurance</th>
                                <th className="py-3 font-medium">Price / disclosure</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MARKETPLACE_ROWS.map((m) => (
                                <tr key={m.attribute} className="border-b border-black/5 dark:border-white/5">
                                    <td className="py-3 pr-4 font-medium">{m.attribute}</td>
                                    <td className="py-3 pr-4">{m.assurance}</td>
                                    <td className="py-3 whitespace-nowrap">{m.price}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-4 text-sm text-black/50 dark:text-white/50">
                    Consuming an attribute is additive to the compute your own app uses; the fee is
                    charged to the relying party at the point of disclosure. A user proving their own
                    attributes to themselves pays nothing.
                </p>
            </section>

            {/* Worked examples */}
            <section className="mt-28 lg:mt-40">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>What that looks like in practice</Balancer>
                </h2>
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-x-24">
                    {EXAMPLES.map((e) => (
                        <div key={e.label}>
                            <h3 className="text-lg font-semibold">{e.label}</h3>
                            <p className="mt-1 text-black/60 dark:text-white/60">{e.detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="mt-28 lg:mt-40">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>Questions about pricing?</Balancer>
                </h2>
                <p className="mt-6 text-lg text-black/60 dark:text-white/60">
                    <Balancer>
                        Talk to us about volume discounts, dedicated machines, larger GPU fleets, or
                        anything else. We are happy to help you model your costs before you commit.
                    </Balancer>
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                    <Link
                        href="/dashboard"
                        className="px-6 py-2.5 font-bold rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                    >
                        Get started
                    </Link>
                    <a
                        href="mailto:contact@privasys.org?subject=Privasys%20pricing"
                        className="px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                        Contact us
                    </a>
                </div>
            </section>

            <div className="mb-28 lg:mb-40" />
        </div>
    );
}
