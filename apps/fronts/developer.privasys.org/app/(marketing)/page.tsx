'use client';

import Balancer from 'react-wrap-balancer';
import Link from 'next/link';

const FEATURES = [
    {
        title: 'WASM modules',
        description: 'Deploy lightweight WebAssembly modules inside Enclave OS Mini. Upload a pre-compiled .cwasm file, or link a GitHub repository and let our pipeline compile it for you. The smallest trust boundary available: just your code and the minimal runtime.',
    },
    {
        title: 'Containers',
        description: 'Run your existing containers inside Enclave OS Virtual. Standard Linux, standard tooling, with hardware-encrypted memory and full attestation. No rewrite needed. Bring your own image and deploy it on confidential infrastructure.',
    },
    {
        title: 'Attestation built in',
        description: 'Every deployment is automatically attested. RA-TLS certificates carry proof of what hardware, firmware, and application code is running. Your users verify the service during a standard TLS handshake, with no custom protocol or SDK.',
    },
    {
        title: 'Secrets management',
        description: 'Enclave Vaults provides hardware-protected key storage and secrets management. Keys are split using Shamir secret sharing, sealed to the enclave measurements, and never exist in cleartext outside the trust boundary.',
    },
];

const STEPS = [
    {
        step: '1',
        title: 'Sign in with your organisation',
        description: 'Authenticate with your identity provider via OIDC. No new credentials to manage.',
    },
    {
        step: '2',
        title: 'Create an application',
        description: 'Choose your deployment target: WASM module for Enclave OS Mini, or container image for Enclave OS Virtual.',
    },
    {
        step: '3',
        title: 'Upload or link your code',
        description: 'Upload a pre-compiled .cwasm file, push a container image, or link a GitHub repository for automated builds.',
    },
    {
        step: '4',
        title: 'Deploy and attest',
        description: 'Your application runs inside a hardware-protected enclave. Clients verify it with a single RA-TLS connection.',
    },
];

export default function MarketingPage() {
    return (
        <div className="max-w-5xl mx-auto px-6">
            {/* Hero */}
            <section className="mt-24 lg:mt-40 max-w-3xl">
                <h1 className="text-5xl lg:text-[4rem] leading-tight">
                    Deploy confidential applications in minutes.
                </h1>
                <p className="mt-8 text-lg text-black/60 dark:text-white/60 leading-relaxed">
                    <Balancer>
                        The Privasys Developer Platform gives you everything you need to build, deploy, and manage
                        applications running inside hardware-protected enclaves and confidential VMs.
                        Focus on your code. We handle attestation, encryption, and verification.
                    </Balancer>
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                    <Link
                        href="/login"
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

            {/* What you can deploy */}
            <section className="mt-28 lg:mt-48">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>Two deployment targets. One platform.</Balancer>
                </h2>
                <p className="mt-6 text-lg text-black/60 dark:text-white/60">
                    Whether you are building a lightweight cryptographic module or a full-stack application,
                    the platform matches you to the right confidential runtime.
                </p>
                <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-24 lg:gap-y-20">
                    {FEATURES.map((f) => (
                        <div key={f.title}>
                            <h3 className="text-xl lg:text-3xl">{f.title}</h3>
                            <p className="mt-3 text-black/60 dark:text-white/60">
                                <Balancer>{f.description}</Balancer>
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="mt-28 lg:mt-48">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>From code to attested deployment in four steps.</Balancer>
                </h2>
                <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-x-24 lg:gap-y-16">
                    {STEPS.map((s) => (
                        <div key={s.step} className="flex gap-5">
                            <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full border border-black/10 dark:border-white/10 text-sm font-semibold">
                                {s.step}
                            </span>
                            <div>
                                <h3 className="text-lg font-semibold">{s.title}</h3>
                                <p className="mt-1 text-black/60 dark:text-white/60">{s.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Open source */}
            <section className="mt-28 lg:mt-48">
                <h2 className="text-2xl lg:text-4xl">
                    <Balancer>Open source. Fully auditable.</Balancer>
                </h2>
                <p className="mt-6 text-lg text-black/60 dark:text-white/60">
                    <Balancer>
                        Every component of the Privasys stack is published under the AGPL-3.0 licence.
                        The code that runs inside the enclave, the attestation server, the RA-TLS libraries, and this platform itself
                        are all available for audit. Transparency is not optional. It is the foundation of trust.
                    </Balancer>
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                    <a
                        href="https://github.com/Privasys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                        View on GitHub
                    </a>
                    <a
                        href="mailto:contact@privasys.org?subject=Privasys%20developer%20platform"
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
