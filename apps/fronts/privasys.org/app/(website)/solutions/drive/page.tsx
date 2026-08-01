'use client';

import Balancer from 'react-wrap-balancer';
import { PageShell } from '~/app/components/page-shell';

export default function Drive() {
    return (
        <PageShell activePage='solutions'>

            <section className='mt-24 lg:mt-40 w-full lg:w-3/4'>
                <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Solution</p>
                <h1 className='text-5xl lg:text-[4rem]'>Privasys Drive</h1>
                <p className='hero-intro mt-8'>
                    End-to-end encrypted file storage where the operator holds no key, and you can
                    prove it. Your files are sealed inside an attested confidential enclave, unlockable
                    only by you. And when you connect Privasys Chat, that same sealed store becomes your
                    assistant&rsquo;s memory: a self-sovereign brain that answers only to you.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='https://docs.privasys.org/solutions/drive/overview' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full bg-black text-white border-black hover:bg-transparent hover:text-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-transparent dark:hover:text-white transition-colors'>
                        Read the documentation
                    </a>
                    <a href='/blog/a-drive-only-you-can-open/'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        How it stays sovereign
                    </a>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Your files, sealed to hardware you can verify.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>The operator holds no key</h3>
                        <p>
                            <Balancer>
                                Every file is encrypted with its own key, wrapped under a master key that
                                is generated inside the enclave and split across a vault constellation.
                                In sovereign mode only the attested Drive enclave, acting for you, can
                                reconstruct it. There is no operator key and no operator unlock path.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Sovereign or escrowed, and checkable</h3>
                        <p>
                            <Balancer>
                                Individuals get sovereign mode by default. Organisations can opt into an
                                escrowed mode with quorum-approved, audited, tenant-disclosed recovery.
                                The mode is part of the measured configuration, so you attest an instance
                                and read back which promise governs your keys.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>A brain you own</h3>
                        <p>
                            <Balancer>
                                Connect Privasys Chat and your Drive becomes the assistant&rsquo;s memory.
                                Conversations, notes, and knowledge are all sealed files. The assistant
                                reaches them only as an attested tool, over a mutually attested channel,
                                and only within a scope you set.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Memory that is complete, and cited</h3>
                        <p>
                            <Balancer>
                                Your memory is served as an enumerable tree, so the assistant sees
                                everything it knows before it answers, never a lucky sample. Documents are
                                chunked along a stable structure, so every passage it uses resolves to a
                                real span in a real file and can be cited.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Personal or per project</h3>
                        <p>
                            <Balancer>
                                Scope a brain to your whole Drive for a personal assistant that knows your
                                history, or to a single folder for an agent that sees exactly one project
                                and nothing of your private life. Share the folder and the brain is shared,
                                still sealed to the enclave.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Sharing without giving up identity</h3>
                        <p>
                            <Balancer>
                                Share a file with a link, and Privasys never learns who opened it. Opening
                                a shared file proves a wallet identity and nothing more, no name and no
                                email, unless a private link explicitly asks for an attribute.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40 w-full lg:w-3/4'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Read the details.</Balancer>
                </h2>
                <p className='mt-8'>
                    <Balancer>
                        The encryption, the key hierarchy, and the difference between sovereign and
                        escrowed mode are covered in depth in the documentation and in two companion
                        essays: one on the storage layer, one on turning the Drive into a self-sovereign
                        memory for agents.
                    </Balancer>
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='/blog/a-drive-only-you-can-open/'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        A drive only you can open
                    </a>
                    <a href='/blog/a-brain-you-own/'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        A brain you own
                    </a>
                    <a href='https://docs.privasys.org/solutions/drive/overview' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the documentation
                    </a>
                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
