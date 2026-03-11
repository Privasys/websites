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
                    Confidential computing made simple.
                    Bring your application, whether it is a lightweight module or a full container.
                    Our platform handles attestation, encryption, and verification, so you can focus on building.
                </p>
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
                    <Balancer>Bring your app. We handle the rest.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Lightweight modules</h3>
                        <p>
                            <Balancer>
                                Deploy your application as a portable module inside Enclave OS Mini.
                                The smallest trust boundary available: just your code and the minimal runtime needed to execute it.
                                Ideal for cryptographic operations, secrets management, and high-assurance workloads.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Containers</h3>
                        <p>
                            <Balancer>
                                Run your existing containers inside Enclave OS Virtual.
                                Standard Linux workflows, standard tooling, with hardware-encrypted memory and full attestation.
                                No rewrite needed. Your container, our confidential infrastructure.
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
