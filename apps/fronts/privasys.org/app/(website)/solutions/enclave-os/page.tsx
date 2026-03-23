'use client';

import Balancer from 'react-wrap-balancer';
import { PageShell } from '~/app/components/page-shell';

export default function EnclaveOS() {
    return (
        <PageShell activePage='solutions'>

            <section className='mt-24 lg:mt-40 w-full lg:w-3/4'>
                <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Solution</p>
                <h1 className='text-5xl lg:text-[4rem]'>Enclave OS</h1>
                <p className='hero-intro mt-8'>
                    A secure operating system that keeps your data encrypted, even while it is being processed.
                    It runs inside hardware-protected environments provided by the latest processors, and every connection is attested so you can verify exactly what is running.
                </p>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Two editions. Same guarantees.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    Enclave OS comes in two editions, each designed for a different trade-off between isolation and flexibility.
                    Both provide attested connections, open-source transparency, and the same developer experience.
                </p>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Enclave OS Mini</h3>
                        <p>
                            <Balancer>
                                Maximum isolation with the smallest possible trust boundary.
                                Your application runs as a lightweight module inside a secure enclave, alongside only the minimal code required to operate.
                                Nothing else is present: no operating system kernel, no unnecessary libraries, no background services.
                                This is the strongest protection available for the most sensitive workloads.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Enclave OS Virtual</h3>
                        <p>
                            <Balancer>
                                Full virtual machine flexibility with hardware-encrypted memory.
                                Run containers, standard Linux services, or complex multi-process applications inside a confidential VM.
                                The trust boundary is larger, but you gain compatibility with the tools and workflows your team already uses.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Attested connections: trust what you can verify.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Every connection is attested</h3>
                        <p>
                            <Balancer>
                                When you connect to an Enclave OS service, the TLS certificate itself carries proof of what hardware is running, what code is loaded, and how the service is configured.
                                Verification happens during a standard TLS handshake: no special tools, no SDK, no custom protocol.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Configuration is measured</h3>
                        <p>
                            <Balancer>
                                It is not enough to attest the code. The full configuration, including trust anchors, network policies, and application modules, is captured in a single measurement embedded in the certificate.
                                If anything changes, the measurement changes, and verification fails.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Deploy on any major cloud.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    Enclave OS is hardware-agnostic. It supports confidential computing capabilities from Intel, AMD, and other processor vendors, and runs on the leading cloud platforms.
                </p>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-x-16'>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>Google Cloud</h3>
                        <p>Confidential VMs in europe-west regions. Hardware-encrypted memory with built-in attestation.</p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>Microsoft Azure</h3>
                        <p>Secure enclaves and confidential VMs across multiple regions. Integrated with Azure Attestation.</p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>OVHcloud</h3>
                        <p>Bare-metal servers with secure enclave support. Full hardware control for on-premises-grade isolation in the cloud.</p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Deploy on the Privasys Platform.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    The fastest way to run your application on Enclave OS is through the <a href='https://developer.privasys.org' className='underline'>Developer Platform</a>.
                    Sign in with GitHub, link your repository or upload a pre-compiled module, and your code is deployed to hardware-protected infrastructure in minutes.
                    Builds are reproducible, and every deployment is automatically attested.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='https://developer.privasys.org'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Open the Developer Platform
                    </a>
                    <a href='https://docs.privasys.org/solutions/platform/developer-platform/getting-started'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the getting started guide
                    </a>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Open source. Auditable. No lock-in.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    Enclave OS is fully open source under the AGPL-3.0 licence.
                    Every line of code that runs inside the enclave is available for audit.
                    We believe transparency is not optional: it is the foundation of trust.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='https://github.com/Privasys/enclave-os-mini' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Enclave OS Mini on GitHub
                    </a>
                    <a href='https://docs.privasys.org/solutions/enclave-os/presentation' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the documentation
                    </a>
                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
