'use client';

import Balancer from 'react-wrap-balancer';
import { PageShell } from '~/app/components/page-shell';

export default function Wallet() {
    return (
        <PageShell activePage='solutions'>

            <section className='mt-24 lg:mt-40 w-full lg:w-3/4'>
                <p className='text-sm font-medium tracking-wide uppercase text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Solution</p>
                <h1 className='text-5xl lg:text-[4rem]'>Privasys Wallet</h1>
                <p className='hero-intro mt-8'>
                    Your identity, verified by hardware on both sides.
                    Privasys Wallet turns your phone into a FIDO2 authenticator that verifies the server
                    is running inside a genuine hardware enclave before you sign anything.
                    Two-way trust, no blind faith.
                </p>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>Trust should flow in both directions.</Balancer>
                </h2>
                <div className='mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Verify before you authenticate</h3>
                        <p>
                            <Balancer>
                                Today, when you sign in to a cloud service, you prove who you are.
                                But who proves what is running on the other side?
                                Privasys Wallet checks the server&rsquo;s hardware attestation before your private key is ever used.
                                You authenticate only after you know the service is genuine.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>FIDO2, hardware to hardware</h3>
                        <p>
                            <Balancer>
                                Authentication is based on FIDO2/WebAuthn, the same standard used by passkeys across the industry.
                                Your private key is generated and stored in your phone&rsquo;s secure hardware.
                                It never leaves the device, not to us, not to the cloud, not to anyone.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>No passwords. No shared secrets.</h3>
                        <p>
                            <Balancer>
                                There is no password to leak, phish, or brute-force.
                                Authentication is a cryptographic challenge-response between your device&rsquo;s secure hardware and a hardware-protected enclave.
                                Both sides prove their identity. Neither side reveals a secret.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Your keys, your sovereignty</h3>
                        <p>
                            <Balancer>
                                Privasys Wallet puts you in control.
                                Your cryptographic keys are bound to your device's secure hardware.
                                You choose which services to connect to, and you can see the attestation evidence
                                for every connection before approving it.
                                Data sovereignty starts with identity sovereignty.
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
                        <h3 className='text-xl lg:text-3xl'>RA-TLS verification</h3>
                        <p>
                            <Balancer>
                                When you connect to an enclave-backed service, the wallet inspects the
                                server&rsquo;s TLS certificate for embedded attestation evidence.
                                It verifies the hardware quote, confirms the code measurement,
                                and checks the configuration root, all before your FIDO2 credential is used.
                                Standard RA-TLS, no custom protocol.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Secure Enclave keys</h3>
                        <p>
                            <Balancer>
                                On iOS, keys are generated and stored inside the Secure Enclave.
                                On Android, keys are stored in StrongBox or the platform TEE.
                                Signing operations happen inside the hardware.
                                The private key is never exported, never serialised, never available in application memory.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Encrypted notifications</h3>
                        <p>
                            <Balancer>
                                Push notifications from cloud enclaves are encrypted end-to-end with AES-256-GCM.
                                The decryption key is shared between the app and a dedicated Notification
                                Service Extension through the device keychain, so notification content is
                                never visible to Apple, Google, or any intermediary.
                            </Balancer>
                        </p>
                    </div>
                    <div>
                        <h3 className='text-xl lg:text-3xl'>Trusted app registry</h3>
                        <p>
                            <Balancer>
                                The wallet maintains a local registry of verified enclave applications.
                                Each entry records the measurements from the last successful attestation.
                                If an enclave&rsquo;s code changes unexpectedly, the wallet flags it immediately.
                                You see what changed before deciding whether to proceed.
                            </Balancer>
                        </p>
                    </div>
                </div>
            </section>

            <section className='mt-20 lg:mt-40'>
                <h2 className='text-2xl lg:text-4xl'>
                    <Balancer>For everyone who believes identity should be private and verifiable.</Balancer>
                </h2>
                <p className='mt-8 text-lg'>
                    Privasys Wallet is currently in beta with early testers and will be available
                    on the App Store and Google Play soon.
                    It is open source under the AGPL-3.0 licence, like all Privasys software.
                </p>
                <div className='mt-10 flex flex-wrap gap-4'>
                    <a href='mailto:contact@privasys.org?subject=Privasys%20Wallet%20beta' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Join the beta
                    </a>
                    <a href='https://docs.privasys.org/solutions/wallet/overview' target='_blank' rel='noopener noreferrer'
                        className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'>
                        Read the documentation
                    </a>
                </div>
            </section>

            <div className='mb-30' />

        </PageShell>
    );
}
