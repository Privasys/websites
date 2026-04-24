'use client';

import Balancer from 'react-wrap-balancer';
import { PageShell } from '~/app/components/page-shell';

export default function AISolution() {
    return (
        <PageShell activePage='solutions'>

            <section className='mt-24 lg:mt-40 w-full lg:w-3/4'>
                <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Solution</p>
                <h1 className='text-5xl lg:text-[4rem]'>
                    <Balancer>End-to-end attested LLM.</Balancer>
                </h1>
                <p className='hero-intro mt-8'>
                    Verify the answer came from the model you trust, on hardware you can prove.
                    Privasys AI runs open-weight models inside Intel TDX confidential VMs with
                    NVIDIA H100 in CC mode, so every chat session ships with a hardware-signed
                    receipt of the exact code, model and configuration that produced it.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='https://chat.privasys.org/i/demo' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold rounded-full bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 transition-colors'>
                        Try it now
                    </a>
                    <a href='https://docs.privasys.org/solutions/ai/overview' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the documentation
                    </a>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Three things every Privasys AI session gives you.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-x-20 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>Confidential VM</h3>
                        <p>
                            <Balancer>
                                Inference runs inside an Intel TDX trust domain with the GPU in NVIDIA
                                Confidential Computing mode. CPU memory and GPU VRAM are encrypted and
                                isolated from the cloud operator. Even Privasys cannot see your prompts.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>Reproducible inference</h3>
                        <p>
                            <Balancer>
                                Every response carries the model digest, server image hash and seed
                                metadata. Anyone can rebuild the exact runtime from source and replay
                                the same generation. The answer is auditable, not just trusted.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>Attested chat</h3>
                        <p>
                            <Balancer>
                                Before the first prompt leaves your browser, the chat client verifies a
                                fresh TDX quote bound to the connection&rsquo;s TLS key. You see the
                                exact model and code hash you are talking to, signed by the hardware.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>How it works.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Hardware-rooted trust chain</h3>
                        <p>
                            <Balancer>
                                The TDX module measures the boot kernel, the verified read-only root
                                filesystem, the inference server image and the model weights into the
                                TDX RTMRs. The H100 attests its CC-mode firmware over SPDM. Both
                                evidence trees are folded into the TLS certificate the chat client sees.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>OpenAI-compatible API, attested edges</h3>
                        <p>
                            <Balancer>
                                Each fleet exposes a vLLM-backed OpenAI-compatible endpoint behind a
                                gateway that performs RA-TLS. Existing tooling works unchanged; the
                                only difference is that you can prove who answered.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Distributed attestation verifier</h3>
                        <p>
                            <Balancer>
                                Quote signature verification runs against an independent
                                attestation-server, so the inference VM cannot lie about its own
                                attestation. The verifier&rsquo;s policy and code hashes are part of the
                                published trust chain.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Per-tenant isolation by design</h3>
                        <p>
                            <Balancer>
                                Dedicated fleets get their own VM, their own model menu and their own
                                private retrieval store. Public fleets share infrastructure but never
                                state. Quota and identity are enforced by Privasys ID, not by the
                                inference node.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>How it compares.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>vs. closed APIs</h3>
                        <p>
                            <Balancer>
                                OpenAI, Anthropic and the like give you a smart endpoint and a
                                policy promise. There is no cryptographic proof of which model
                                answered, what code ran, or where your data went after it left your
                                browser. Privasys AI gives you all three on every request.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>vs. self-hosted vLLM</h3>
                        <p>
                            <Balancer>
                                Self-hosted vLLM gives you control of the box. Privasys AI gives you
                                the same control plus a hardware-attested trust chain, a managed
                                attestation verifier, reproducibility metadata, and a chat front-end
                                your users can verify without reading PEM files.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Honest about the boundaries.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    Confidential computing protects against the cloud operator and the host OS, not
                    against bugs in the model itself or in the inference server. Attestation proves
                    what code ran; it does not prove that code is correct. We publish the full
                    source, the build recipe and the patch set, and we make it easy to rebuild and
                    diff. The trust chain is only as strong as what you actually verify.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='/blog'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the engineering posts
                    </a>
                    <a href='https://docs.privasys.org/solutions/ai/architecture' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the architecture doc
                    </a>
                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
