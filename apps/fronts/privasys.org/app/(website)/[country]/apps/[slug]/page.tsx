import { PageShell } from '~/app/components/page-shell';

const PLACEHOLDER_APPS: Record<string, {
    name: string;
    developer: string;
    category: string;
    target: 'wasm' | 'container';
    tee: string;
    description: string;
    longDescription: string;
    github?: string;
    endpoint?: string;
    verified: boolean;
}> = {
    'confidential-vault': {
        name: 'Confidential Vault',
        developer: 'Privasys',
        category: 'Cryptography',
        target: 'wasm',
        tee: 'SGX',
        description: 'Hardware-protected secrets management with Shamir secret sharing and sealed storage.',
        longDescription: 'Confidential Vault provides hardware-grade secrets management without dedicated security modules. Keys are split using Shamir secret sharing, sealed to the enclave measurements, and never exist in cleartext outside the trust boundary. Access is controlled through customisable policies, and every connection is verified through remote attestation.',
        github: 'https://github.com/Privasys/enclave-os-mini',
        verified: true
    },
    'private-inference': {
        name: 'Private Inference',
        developer: 'Privasys',
        category: 'AI/ML',
        target: 'container',
        tee: 'TDX',
        description: 'Run AI models on private data inside a Confidential VM. Full attestation, zero data exposure.',
        longDescription: 'Private Inference runs large language models and retrieval pipelines inside Confidential VMs with hardware-encrypted memory. Model weights and user data never leave the trust boundary. Clients verify the inference service through a standard RA-TLS connection.',
        github: 'https://github.com/Privasys',
        verified: true
    },
    'secure-analytics': {
        name: 'Secure Analytics',
        developer: 'Privasys',
        category: 'Data Processing',
        target: 'container',
        tee: 'TDX',
        description: 'Privacy-preserving analytics on sensitive datasets. Results leave the enclave, raw data never does.',
        longDescription: 'Secure Analytics processes sensitive datasets inside Confidential VMs. Multiple data holders can contribute their private data to a shared computation without exposing it to each other or to the infrastructure operator. Only the aggregated results leave the trust boundary.',
        github: 'https://github.com/Privasys',
        verified: true
    }
};

const ALL_SLUGS = Object.keys(PLACEHOLDER_APPS);
const SUPPORTED_COUNTRIES = ['uk', 'us', 'eu', 'fr', 'de', 'sg', 'jp', 'au'];

export function generateStaticParams() {
    return SUPPORTED_COUNTRIES.flatMap((country) =>
        ALL_SLUGS.map((slug) => ({ country, slug }))
    );
}

export default async function AppDetailPage({ params }: { params: Promise<{ country: string; slug: string }> }) {
    const { country, slug } = await params;
    const app = PLACEHOLDER_APPS[slug];

    if (!app) {
        return (
            <PageShell activePage='apps'>
                <section className='mt-24 lg:mt-40'>
                    <h1 className='text-4xl'>Application not found</h1>
                    <p className='mt-4'>
                        <a href={`/${country}/apps`} className='underline'>Back to the App Store</a>
                    </p>
                </section>
            </PageShell>
        );
    }

    return (
        <PageShell activePage='apps'>

            <section className='mt-24 lg:mt-40'>
                <a href={`/${country}/apps`} className='text-sm text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 hover:underline'>
                    &larr; Back to App Store
                </a>

                <div className='mt-6 flex items-start justify-between gap-6'>
                    <div>
                        <h1 className='text-4xl lg:text-5xl'>{app.name}</h1>
                        <p className='mt-2 text-lg text-[#1d1d1f]/60 dark:text-[#f5f5f7]/50'>
                            {app.developer} &middot; {app.category}
                        </p>
                    </div>
                    <div className='flex gap-2 shrink-0 mt-2'>
                        <span className='px-3 py-1 text-sm font-medium rounded-full border border-black/10 dark:border-white/10'>
                            {app.tee}
                        </span>
                        <span className='px-3 py-1 text-sm font-medium rounded-full border border-black/10 dark:border-white/10'>
                            {app.target === 'wasm' ? 'WASM' : 'Container'}
                        </span>
                    </div>
                </div>

                {app.verified && (
                    <div className='mt-4 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400'>
                        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                            <path d='M20 6L9 17l-5-5' />
                        </svg>
                        Attestation verified
                    </div>
                )}
            </section>

            <section className='mt-12 lg:mt-20'>
                <h2 className='text-2xl lg:text-3xl'>About</h2>
                <p className='mt-4 text-lg'>
                    {app.longDescription}
                </p>
            </section>

            <section className='mt-12 lg:mt-20'>
                <h2 className='text-2xl lg:text-3xl'>Verify this application</h2>
                <p className='mt-4'>
                    Connect to this application using any of our RA-TLS verification libraries. The attestation evidence
                    is embedded in the TLS certificate and verified during the standard handshake.
                </p>
                <div className='mt-6 p-4 rounded-xl bg-[#f5f5f7] dark:bg-[#2d2d2f] font-mono text-sm overflow-x-auto'>
                    <code># Python example<br />
                    from ratls_client import RaTlsClient<br />
                    client = RaTlsClient(&quot;{app.endpoint || 'service.example.com'}&quot;, 443)<br />
                    response = client.get(&quot;/&quot;)</code>
                </div>
            </section>

            {app.github && (
                <section className='mt-12 lg:mt-20'>
                    <h2 className='text-2xl lg:text-3xl'>Source code</h2>
                    <p className='mt-4'>
                        This application is open source. Inspect the code, audit the builds, and verify that what runs
                        inside the enclave matches what is published.
                    </p>
                    <div className='mt-4'>
                        <a
                            href={app.github}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='px-6 py-2.5 font-bold border rounded-full text-black dark:text-white hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black transition-colors'
                        >
                            View on GitHub
                        </a>
                    </div>
                </section>
            )}

            <div className='mb-30' />

        </PageShell>
    );
}
