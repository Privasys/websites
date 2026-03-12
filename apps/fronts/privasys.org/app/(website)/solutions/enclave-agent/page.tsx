'use client';

import Balancer from 'react-wrap-balancer';
import { PageShell } from '~/app/components/page-shell';

export default function EnclaveAgent() {
    return (
        <PageShell activePage='solutions'>

            <section className='mt-24 lg:mt-40 w-full lg:w-3/4'>
                <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Solution</p>
                <h1 className='text-5xl lg:text-[4rem]'>Enclave Agent</h1>
                <p className='hero-intro mt-8'>
                    The best AI is the one that knows you.
                    Enclave Agent lets you use AI with your most sensitive data,
                    unlocking the most personalised outcomes without ever exposing what makes them possible.
                </p>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Your data is your competitive advantage. Use it.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Higher quality, because the data is real</h3>
                        <p>
                            <Balancer>
                                AI models produce better results when they see real data, not sanitised summaries or anonymised samples.
                                Enclave Agent gives your models direct access to private, structured, or sensitive data.
                                The outcomes are more accurate, more relevant, and more actionable.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Personalised without compromise</h3>
                        <p>
                            <Balancer>
                                Financial advice based on your actual transactions.
                                Medical insights drawn from your full patient history.
                                Legal analysis on your actual contracts.
                                The most personalised outcomes require the most private data.
                                Enclave Agent makes this safe.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Unlock intelligence that was previously impossible</h3>
                        <p>
                            <Balancer>
                                Organisations sit on vast amounts of data they cannot use with AI because of privacy obligations.
                                Enclave Agent removes that barrier.
                                The data stays encrypted and protected in hardware, but the intelligence flows freely.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Collective intelligence, individual privacy</h3>
                        <p>
                            <Balancer>
                                AI agents access multiple private data sources, transforming siloed information into usable intelligence.
                                Each data owner retains full control.
                                Collaboration becomes possible without anyone having to share their raw data.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>How it works, under the hood.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Hardware-protected AI</h3>
                        <p>
                            <Balancer>
                                Models run inside confidential virtual machines with GPU support.
                                Both the model weights and your data are encrypted in memory, protected from the host, the cloud provider, and other tenants.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Private knowledge retrieval</h3>
                        <p>
                            <Balancer>
                                Augment model knowledge with your private documents.
                                Ingestion, embedding, and retrieval all happen inside the hardware-protected environment.
                                Your data is never exposed, even to the AI provider.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Attested connections</h3>
                        <p>
                            <Balancer>
                                Every connection to the AI service carries proof of what hardware, code, and configuration is running.
                                You verify the environment before sending a single prompt.
                                No blind trust, no promises: cryptographic proof.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Secure agent interactions</h3>
                        <p>
                            <Balancer>
                                AI agents interact with external services and tools while remaining inside the protected environment.
                                Data stays within the trust boundary even when the model reaches out to external sources.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>For organisations that refuse to choose between AI and privacy.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    Financial institutions processing transaction data with LLMs.
                    Healthcare organisations running diagnostic models on patient records.
                    Legal teams analysing confidential case files.
                    Government agencies processing classified information.
                    Until now, using AI with this data meant surrendering control over it. That is no longer the case.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='mailto:contact@privasys.org?subject=Enclave%20Agent%20inquiry' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Get in touch
                    </a>
                    <a href='https://docs.privasys.org/solutions/enclave-agent/overview' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the documentation
                    </a>
                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
