'use client';

import Balancer from 'react-wrap-balancer';
import { PageShell } from '~/app/components/page-shell';

export default function AISolution() {
    return (
        <PageShell activePage='solutions'>

            <section className='mt-24 lg:mt-40 w-full lg:w-3/4'>
                <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Solution</p>
                <h1 className='text-5xl lg:text-[4rem]'>
                    <Balancer>AI and agents you can verify.</Balancer>
                </h1>
                <p className='hero-intro mt-8'>
                    Privasys AI runs open-weight models inside confidential VMs, runs your agents
                    inside an attested harness, and reaches your accounts through connectors that
                    keep no credential at rest. Every leg of the loop, the model, the harness and
                    each tool, proves what it is before it sees your data, and your Privasys Drive
                    is the memory it all works from.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='https://chat.privasys.org/i/demo' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold rounded-full bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 transition-colors'>
                        Try it now
                    </a>
                    <a href='https://docs.privasys.org/solutions/ai/overview/' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the documentation
                    </a>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Confidential inference is where it starts.</Balancer>
                </h2>
                <p className='mt-8 w-full lg:w-3/4'>
                    <Balancer>
                        An agent is a loop: the model proposes, tools act, the results come back. Protect
                        the model alone and you have protected one leg of it, while your context travels
                        to whatever operates the rest. Privasys AI attests all three.
                    </Balancer>
                </p>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-x-20 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>The model</h3>
                        <p>
                            <Balancer>
                                Open-weight models in Intel TDX with the NVIDIA H100 in confidential-compute
                                mode. Every reply carries a hardware-signed receipt of the code, weights and
                                configuration that produced it.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>The agent</h3>
                        <p>
                            <Balancer>
                                Privasys Harness runs the agent loop in its own enclave. Every call it makes
                                leaves through a gate that admits only the attested services you approved in
                                your wallet.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>Its reach</h3>
                        <p>
                            <Balancer>
                                Your Drive is its memory, and Privasys Connectors reach your mail, calendar,
                                files and meetings. Each is a separately attested enclave, and none keeps your
                                credential at rest.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>What every session gives you.</Balancer>
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
                    <Balancer>Agents you can verify.</Balancer>
                </h2>
                <p className='mt-8 w-full lg:w-3/4'>
                    <Balancer>
                        Privasys Harness is where the loop runs: an open-source agent harness pinned at an
                        exact commit and composed inside an attested enclave, so what executes is what was
                        measured, and the measurement is what your wallet approves.
                    </Balancer>
                </p>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Every call leaves through a gate</h3>
                        <p>
                            <Balancer>
                                Model calls and tool calls go through an egress proxy inside the same enclave.
                                It speaks mutual RA-TLS and admits only the services in the app&rsquo;s declared
                                dependency set, which your wallet shows you at consent. Anything else is refused.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Verification in the product</h3>
                        <p>
                            <Balancer>
                                The harness shows its live hardware quote against a challenge you can
                                regenerate, and every tool call in the trajectory carries its own attestation,
                                checked against the measurement pinned for that tool.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Replay a whole turn</h3>
                        <p>
                            <Balancer>
                                A turn is several model calls and the tool results between them. The harness
                                replays all of it and reports, step by step, whether the prompt, the clock and
                                the reply came back identical to the record.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>A folder of its own</h3>
                        <p>
                            <Balancer>
                                Approve the harness on your wallet and it gets a folder in your Drive for its
                                agents, skills and working files, under your quota and your Revoke, rather than
                                a database on our servers.
                            </Balancer>
                        </p>
                    </div>
                </div>
                <div className='mt-16 flex flex-wrap gap-4'>
                    <a href='/blog/an-agent-you-can-verify-introducing-privasys-harness/'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Introducing Privasys Harness
                    </a>
                    <a href='/blog/replay-the-turn-reproducible-agents-tool-calls-included/'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Replay the turn
                    </a>
                </div>
            </section>

            <section id='connectors' className='mt-20 lg:mt-40 scroll-mt-28'>
                <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Your accounts</p>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Privasys Connectors</Balancer>
                </h2>
                <p className='mt-8 w-full lg:w-3/4'>
                    <Balancer>
                        Every useful agent needs your accounts, and the usual way to give it them is to hand
                        a password or a long-lived token to a service you cannot inspect, on a machine you
                        cannot see, which keeps it for as long as it likes. The model gets all the scrutiny;
                        the connector, which actually holds the keys to your correspondence, gets almost
                        none. Privasys Connectors make that leg as verifiable as the rest.
                    </Balancer>
                </p>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Your credential is never at rest</h3>
                        <p>
                            <Balancer>
                                What opens your account lives in the memory of the attested connector and on
                                your own phone. It is never written to a disk we operate and never appears in a
                                log. If the connector restarts, it asks your phone again: one tap.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>One account, one purpose, one Revoke</h3>
                        <p>
                            <Balancer>
                                The access you approve names one account, one purpose and an expiry, and it is
                                bound to the exact build of the connector that asked. Your wallet lists what
                                holds access, and Revoke takes effect immediately.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Sign in, never hand over a password</h3>
                        <p>
                            <Balancer>
                                You type your address, the connector works out who hosts it, and you sign in at
                                Google or Microsoft in your own browser. A password is asked for only by
                                providers that offer nothing better.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Attested on both ends, and open</h3>
                        <p>
                            <Balancer>
                                The agent verifies the connector&rsquo;s code and the connector verifies the
                                agent&rsquo;s before a byte moves. The code is open source, and the measured
                                build is what your wallet approves, so you verify rather than trust.
                            </Balancer>
                        </p>
                    </div>
                </div>

                <h3 className='text-xl lg:text-3xl mt-20'>Four to start with</h3>
                <div className='mt-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-x-32'>
                    <p>
                        <Balancer>
                            <strong>Mail.</strong> Any IMAP mailbox, with a Google or Microsoft sign-in where the
                            provider offers one. Read, search years of correspondence, label, and draft replies
                            in your own voice.
                        </Balancer>
                    </p>
                    <p>
                        <Balancer>
                            <strong>Calendar.</strong> Google, Microsoft 365 and any CalDAV calendar. Read what is
                            planned and when you are free, and propose meetings for you to confirm.
                        </Balancer>
                    </p>
                    <p>
                        <Balancer>
                            <strong>Files.</strong> Google Drive, OneDrive and the SharePoint libraries you follow.
                            Find a document and read it as text, whatever its format.
                        </Balancer>
                    </p>
                    <p>
                        <Balancer>
                            <strong>Meetings.</strong> The transcripts Zoom and Microsoft Teams produce for your
                            meetings, kept in your own Drive rather than left with the recording service.
                        </Balancer>
                    </p>
                </div>
                <p className='mt-10 w-full lg:w-3/4'>
                    <Balancer>
                        Sending mail and invitations is on the way. Until then, what an agent leaves behind
                        is a draft or a proposal, for you to send or confirm.
                    </Balancer>
                </p>

                <h3 className='text-xl lg:text-3xl mt-20'>Write your own</h3>
                <p className='mt-6 w-full lg:w-3/4'>
                    <Balancer>
                        A connector is a driver, a schema, a probe and a list of tools. Everything that makes
                        it trustworthy, the capability routes, the sign-in the wallet drives, the change feed
                        an agent waits on, the redaction and the attestation, is a shared shell you copy in,
                        permissively licensed so that anyone can write the next one. Publish it, and it is
                        approved from a wallet like any other application.
                    </Balancer>
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='https://github.com/Privasys/connectors' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        The connectors repository
                    </a>
                    <a href='https://docs.privasys.org/solutions/ai/connectors/' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Connectors documentation
                    </a>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Built for the data that matters.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-x-20 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>AI that knows you</h3>
                        <p>
                            <Balancer>
                                The best outcomes come from real, private data, not sanitised summaries.
                                Privasys AI can work directly on your transactions, records, or contracts,
                                because the data stays encrypted in hardware throughout.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>Private knowledge retrieval</h3>
                        <p>
                            <Balancer>
                                Augment the model with your own documents through{' '}
                                <a href='/solutions/drive/' className='underline'>Privasys Drive</a>.
                                Ingestion, embedding, and retrieval all happen inside the enclave, so your
                                data is never exposed, even to the model provider.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-2xl'>Where it was impossible before</h3>
                        <p>
                            <Balancer>
                                Finance over transaction data, healthcare over patient records, legal over
                                confidential files, government over classified information. Using AI on this
                                data no longer means surrendering control of it.
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
                    what code ran; it does not prove that code is correct. The same holds for agents
                    and connectors: attestation tells you which code holds your credential and which
                    services an agent may call, and an agent acts within the access you granted, so
                    grant what the task needs. We publish the full source, the build recipe and the
                    patch set, and we make it easy to rebuild and diff. The trust chain is only as
                    strong as what you actually verify.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='/blog/'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the engineering posts
                    </a>
                    <a href='https://docs.privasys.org/technology/confidential-ai/architecture/' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the architecture doc
                    </a>
                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
