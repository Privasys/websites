'use client';

import Balancer from 'react-wrap-balancer';
import { PageShell } from '~/app/components/page-shell';

export default function EnclaveVaults() {
    return (
        <PageShell activePage='solutions'>

            <section className='mt-24 lg:mt-40 w-full lg:w-3/4'>
                <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Solution</p>
                <h1 className='text-5xl lg:text-[4rem]'>Enclave Vaults</h1>
                <p className='hero-intro mt-8'>
                    Secrets management rethought from the ground up.
                    Enclave Vaults distributes trust across multiple hardware-protected nodes,
                    so no single party, not even us, can access your secrets.
                </p>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>The problem with traditional secrets management.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Centralised trust is a single point of failure</h3>
                        <p>
                            <Balancer>
                                HSMs, cloud KMS, and secret vaults all share the same weakness: one key, one location, one operator.
                                If that operator is compromised, coerced, or simply makes a mistake, every secret protected by that key is exposed.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>You have to trust the provider</h3>
                        <p>
                            <Balancer>
                                Cloud KMS encrypts your data with keys you cannot inspect, on infrastructure you cannot verify.
                                You are told your secrets are safe. But you have no way to prove it.
                                Compliance says yes. Cryptography says nothing.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Distributed trust, hardware-enforced.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Secrets split across independent nodes</h3>
                        <p>
                            <Balancer>
                                Your master secret is split into shares using Shamir&rsquo;s Secret Sharing.
                                Each share is held by a separate hardware-protected node, operated independently.
                                No single node ever holds enough information to reconstruct the secret.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Client-driven reconstruction</h3>
                        <p>
                            <Balancer>
                                The client fetches shares independently from each node, verifying the hardware attestation of every connection.
                                Reconstruction happens on the client side, inside its own secure environment.
                                The nodes never coordinate with each other and never see the full secret.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Attested access control</h3>
                        <p>
                            <Balancer>
                                Each node attests its identity, code, and configuration through its TLS certificate.
                                Clients verify exactly what is running before sending any request.
                                Access policies are enforced by identity tokens, and the identity provider itself is part of the attested configuration.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Perfect for enclave secrets</h3>
                        <p>
                            <Balancer>
                                Enclave Vaults is designed to protect the secrets that enclaves and confidential VMs need at boot: disk encryption keys, TLS private keys, API credentials.
                                The very secrets that make confidential computing work are themselves protected by distributed, attested hardware.
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
                    Enclave Vaults is not a FIPS 140-3 certified HSM.
                    It does not have tamper-evident physical enclosures or environmental sensors.
                    What it offers is a fundamentally different security model: distributed trust enforced by hardware, with mathematical transparency instead of physical tamper resistance.
                    For many threat models, this is sufficient. For some, it is not.
                    We believe in being precise about the trade-offs.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='/blog/enclave-vaults-rethinking-secrets-management-for-the-age-of-confidential-computing'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the deep-dive
                    </a>
                    <a href='https://docs.privasys.org/solutions/enclave-vaults/overview' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the documentation
                    </a>
                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
