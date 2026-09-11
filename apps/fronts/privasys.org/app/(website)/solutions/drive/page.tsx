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
                    only by you. Connect Privasys Chat and the same sealed store becomes your
                    assistant&rsquo;s memory. Approve an app on your wallet and it becomes that
                    app&rsquo;s disk: a folder of its own, under your quota, with your Revoke.
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

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>The disk of every confidential app, on your terms.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Apps ask, you approve, on your wallet</h3>
                        <p>
                            <Balancer>
                                An app that needs storage asks for a folder by name. Your wallet fetches the
                                request from the attested app itself, shows you exactly what is asked, and
                                only your approval hands the app a grant bound to its own key. Refuse once
                                and the app stops asking.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>A folder of its own, never yours</h3>
                        <p>
                            <Balancer>
                                Every approved app writes under AppData in your personal Drive, in a folder
                                bound to that app and no other. It is an ordinary folder: browse it, share
                                it, delete it. Deleting it is how you wipe an app&rsquo;s data, and the app
                                has to ask again.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>A filesystem, not a bucket</h3>
                        <p>
                            <Balancer>
                                Apps and agents get what a disk gives them: paths, revisions with
                                conditional writes so two enclaves never clobber each other, appends that
                                cost what is appended, byte ranges, a change feed, and grep and glob that
                                run inside the enclave over decrypted streams.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Working trees as one item</h3>
                        <p>
                            <Balancer>
                                A repository or a build is thousands of small files. An app keeps them on
                                its own volume and saves snapshots to your Drive as one item: a manifest
                                beside content-addressed blobs, browsable read-only, exportable as a ZIP,
                                deletable in one gesture.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>One gauge, one list, one Revoke</h3>
                        <p>
                            <Balancer>
                                Everything an app stores counts against your quota, and the gauge breaks it
                                down by folder and by app. The apps with access are listed with their
                                folder, permissions and expiry. Revoke keeps your files and closes the
                                app&rsquo;s door.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Attested on both ends</h3>
                        <p>
                            <Balancer>
                                A grant is worthless without the key it is bound to, and an app calling
                                over an attested channel must also be the app the grant names. The runtime
                                brokers consent for apps that declare their needs, so an app never holds
                                the protocol, only the folder.
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
                        The encryption, the key hierarchy, the difference between sovereign and
                        escrowed mode, and how apps obtain and use a folder are covered in depth in the
                        documentation and in three companion essays: one on the storage layer, one on
                        turning the Drive into a self-sovereign memory for agents, and one on the Drive
                        as the disk of confidential apps.
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
                    <a href='/blog/the-disk-of-a-confidential-app-consent-from-the-wallet-a-filesystem-for-agents/'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        The disk of a confidential app
                    </a>
                    <a href='https://docs.privasys.org/solutions/drive/apps-and-wallet' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Apps and the wallet
                    </a>
                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
