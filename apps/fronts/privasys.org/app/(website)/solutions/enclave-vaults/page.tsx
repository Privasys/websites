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
                    A distributed virtual HSM, rebuilt for the age of confidential computing.
                    Your keys live inside attested enclaves spread across independent machines.
                    Operations happen inside the hardware, governed by a policy that the silicon itself enforces.
                    No single party, not even us, can use a key without authorisation.
                    And your existing software can reach it through the interfaces it already speaks: PKCS#11, KMIP, and a REST API.
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
                                HSMs, cloud KMS, and software vaults all share the same weakness: one master key, one location, one operator.
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
                    <Balancer>A distributed vHSM, hardware-enforced.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Keys live inside the hardware</h3>
                        <p>
                            <Balancer>
                                Signing keys, encryption keys, MAC keys, and derivation seeds live inside the enclave as typed objects.
                                You ask the vault to sign, encrypt, or derive. By default the raw key material never crosses the enclave boundary,
                                not even to the host or to your own infrastructure team.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Distributed trust where it matters</h3>
                        <p>
                            <Balancer>
                                For the most sensitive shared secrets, every value can be split with Shamir&rsquo;s Secret Sharing across a constellation of vaults on independent machines.
                                No single vault ever holds enough to reconstruct your secret. Compromising one node reveals nothing.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Programmable policies, enforced by silicon</h3>
                        <p>
                            <Balancer>
                                Each key carries a policy: which identities can use it, which enclaves can call it, which operations are allowed,
                                and whether a fresh human approval from a Privasys Wallet is required.
                                The enclave refuses anything that does not match. There is no admin override.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Live human approvals via your phone</h3>
                        <p>
                            <Balancer>
                                Sensitive operations can require a fresh tap on a registered Privasys Wallet.
                                FIDO2 on your phone produces a signed approval token that the vault verifies inside the enclave.
                                The kind of ceremony that used to need bespoke key-management software is now a policy field.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Mutual attestation on every connection</h3>
                        <p>
                            <Balancer>
                                Every connection to a vault is a mutually attested RA-TLS channel.
                                The client verifies exactly which code is running inside the enclave and which configuration it was launched with.
                                The vault verifies the caller&rsquo;s attestation in return.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Owner-controlled enclave version changes</h3>
                        <p>
                            <Balancer>
                                When a new version of an application enclave is built, its new identity does not automatically gain access to existing keys.
                                The key owner reviews the change, collects the configured manager approvals, and only then promotes the new measurement into the policy.
                                Shipping new code is the developer&rsquo;s decision; granting it access to secrets stays the owner&rsquo;s decision.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Standard interfaces, novel core.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    The parts that make this vault different, policy principals bound to attested measurements, per-operation approvals from your phone, and Shamir custody across independent machines, live in no standard.
                    So we keep that core as it is and wrap the interfaces your tools already speak around it.
                    Your software talks a familiar protocol; the attested policy engine underneath does the work no HSM standard can express.
                </p>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>PKCS#11 for any crypto application</h3>
                        <p>
                            <Balancer>
                                A PKCS#11 provider module lets OpenSSL, Java, TLS servers, and code-signing tools use a vault-held key with no change to the application.
                                We ran a TLS server whose private key never left the enclave: every handshake signature happens inside the hardware, and the client still verifies the certificate as normal.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>KMIP for enterprise key management</h3>
                        <p>
                            <Balancer>
                                A KMIP 2.1 gateway lets existing enterprise key-management software point at the constellation and use it as a remote key manager, unchanged.
                                The gateway itself runs as an attested confidential workload, so there is no plaintext hop between the client and the enclave.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>A REST API and a CLI</h3>
                        <p>
                            <Balancer>
                                Create a vault, add keys, sign, wrap, and rotate through a REST API shaped like the cloud KMS surfaces developers already know, or from the command line with the Privasys CLI.
                                The API is a client-side proxy, so the data plane stays a direct, attested channel to the enclave.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Anyone can own keys</h3>
                        <p>
                            <Balancer>
                                Key custody is no longer reserved for platform enclaves.
                                A developer can create a vault, hold signing and wrapping keys in it, and author the policy that governs them, with the same attested guarantees the platform uses for its own secrets.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>What you can do with it.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Protect signing keys for critical artefacts</h3>
                        <p>
                            <Balancer>
                                Release signatures, container image signatures, firmware signatures: keep the signing key in the vault, sign inside the enclave, gate every signature on policy.
                                No more keys lying around in CI runners.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Disk encryption for confidential VMs</h3>
                        <p>
                            <Balancer>
                                Confidential VMs do not have a built-in way to seal data across reboots.
                                Enclave Vaults provides one: store the LUKS key as Shamir shares, recover it at boot through mutual attestation,
                                and never touch the disk on a machine that is not the one you provisioned.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Wrap and unwrap data keys</h3>
                        <p>
                            <Balancer>
                                Use vault-held AES keys to wrap your application&rsquo;s data encryption keys.
                                Unwrap them only inside enclaves that match the policy.
                                Your data ciphertexts can travel anywhere; they only become readable inside the right hardware, for the right caller.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Secrets for any attested workload</h3>
                        <p>
                            <Balancer>
                                API credentials, OAuth client secrets, database passwords: store them once, retrieve them only from the enclaves your policy allows, with a full audit trail.
                                Secrets stop being a static blob and become a controlled capability.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>The boundaries.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    Enclave Vaults is a virtual HSM, not a FIPS 140-3 certified appliance.
                    It has no tamper-evident enclosure and no environmental sensors.
                    Its security model rests on hardware isolation, on attested identity for every connection, and, for distributed secrets, on the unlinkability of Shamir shares across independent enclaves.
                    For most threat models we see in the wild this improves on a single appliance you have to take on faith.
                    Where a specific FIPS certification is a hard legal requirement, dedicated certified HSMs remain the right choice.
                </p>
                <p className='mt-6 text-lg'>
                    The standard interfaces come with a deliberate limit too.
                    PKCS#11 and KMIP clients cannot present a wallet approval or reason about attested measurements, so operations a key gates on those conditions are simply unavailable over those interfaces, by design.
                    A standard client gets the baseline operations; the richer policy is authored through the native API.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='/blog/enclave-vaults-speaks-pkcs11-and-kmip/'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Standard interfaces, explained
                    </a>
                    <a href='/blog/enclave-vaults-v0-19-typed-keys-and-policy-driven-operations/'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        The typed-key redesign
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
