'use client';

import Balancer from 'react-wrap-balancer';
import { PageShell } from '~/app/components/page-shell';

export default function Platform() {
    return (
        <PageShell activePage='solutions'>

            <section className='mt-24 lg:mt-40 w-full lg:w-3/4'>
                <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Solution</p>
                <h1 className='text-5xl lg:text-[4rem]'>Privasys Platform</h1>
                <p className='hero-intro mt-8'>
                    Deploy confidential applications in minutes.
                    Bring your code as a lightweight WASM module or a full container.
                    Our platform handles attestation, encryption, reproducible builds, and verification, so you can focus on building.
                </p>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Get started in four steps.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-x-16'>
                    <div>
                        <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-2'>Step 1</p>
                        <h3 className='text-xl lg:text-2xl'>Sign in with GitHub</h3>
                        <p className='mt-2'>Authenticate via OIDC. No account to create, no forms to fill.</p>
                    </div>
                    <div>
                        <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-2'>Step 2</p>
                        <h3 className='text-xl lg:text-2xl'>Create an application</h3>
                        <p className='mt-2'>Choose WASM or Container, name your app, and pick your deployment target.</p>
                    </div>
                    <div>
                        <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-2'>Step 3</p>
                        <h3 className='text-xl lg:text-2xl'>Upload or link your code</h3>
                        <p className='mt-2'>Link a GitHub commit for reproducible builds, or upload a pre-compiled WASM module directly.</p>
                    </div>
                    <div>
                        <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-2'>Step 4</p>
                        <h3 className='text-xl lg:text-2xl'>Deploy and verify</h3>
                        <p className='mt-2'>Your app runs in hardware-protected infrastructure. Every connection is attested and verifiable.</p>
                    </div>
                </div>
                <div className='mt-10'>
                    <a href='https://developer.privasys.org'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Open the Developer Platform
                    </a>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Two deployment targets. Same guarantees.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>WASM modules</h3>
                        <p>
                            <Balancer>
                                Link a GitHub repository and the platform compiles your code via reproducible GitHub Actions builds, then deploys it inside Enclave OS Mini (Intel SGX).
                                The smallest trust boundary available: just your code and the minimal runtime needed to execute it.
                                Ideal for cryptographic operations, secrets management, and high-assurance workloads.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Containers</h3>
                        <p>
                            <Balancer>
                                Provide a container image and the platform deploys it inside Enclave OS Virtual with hardware-encrypted memory and full attestation.
                                Standard Linux workflows, standard tooling, no code changes required.
                                Ideal for existing applications, AI/ML inference, and data processing pipelines.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>The gap between &ldquo;confidential computing&rdquo; and actual data protection.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    Most cloud providers now offer &ldquo;confidential VMs&rdquo; with encrypted memory.
                    But memory encryption alone does not make a system confidential.
                    Without verified disk integrity, a measured boot chain, and attested connections, your data is still exposed to the infrastructure operator.
                    The Privasys Platform closes that gap.
                </p>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Not just encrypted. Verified.</h3>
                        <p>
                            <Balancer>
                                Our hardened images include verified filesystems, authenticated disk encryption, and minimal attack surface.
                                Every component is measured at boot and included in the attestation evidence.
                                You do not just trust that the VM is confidential. You prove it.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Attested from silicon to application</h3>
                        <p>
                            <Balancer>
                                Every connection to your service carries proof of what hardware, operating system, and application code is running.
                                Verification happens during a standard TLS handshake.
                                No custom protocol, no SDK, no blind trust.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>What the platform provides.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Reproducible builds</h3>
                        <p>
                            <Balancer>
                                Link a GitHub commit and the platform builds your code via automated GitHub Actions pipelines.
                                Every build is reproducible: anyone can rebuild from the same commit and verify the output matches bit-for-bit.
                                No hidden steps, no opaque toolchains.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Built-in attestation</h3>
                        <p>
                            <Balancer>
                                Every deployment automatically receives RA-TLS certificates that carry hardware attestation evidence.
                                Clients verify the attestation during a standard TLS handshake.
                                The platform also provides an interactive attestation panel for inspecting certificates, quotes, and measurements.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Identity and access</h3>
                        <p>
                            <Balancer>
                                Enclaves receive identity tokens automatically at boot, after proving their hardware and code to our attestation server.
                                No pre-shared secrets, no manual provisioning.
                                Standard identity protocols that integrate with your existing systems.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Verification libraries</h3>
                        <p>
                            <Balancer>
                                Client libraries in six languages (Python, Go, Rust, TypeScript, C#, and .NET) let anyone verify the attestation of your service with a single function call.
                                Your users can confirm exactly what is running, without trusting anyone.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Built for developers and entrepreneurs.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    Confidential computing should not require a PhD in cryptography.
                    The Privasys Platform packages years of expertise in attestation, secure boot, disk encryption with integrity, and hardware-agnostic deployment into a turnkey solution.
                    You write your application. We make it provably secure.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='https://developer.privasys.org'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Open the Developer Platform
                    </a>
                    <a href='https://github.com/Privasys' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        View on GitHub
                    </a>
                    <a href='https://docs.privasys.org' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the documentation
                    </a>
                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
