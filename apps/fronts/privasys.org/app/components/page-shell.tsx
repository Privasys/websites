'use client';

import { ReactNode } from 'react';
import { Navbar, Footer } from '@privasys/ui';

const NAV_ITEMS = [
    {
        label: 'Solutions',
        href: '#',
        description: 'Build, run, and verify applications where data stays protected by hardware.',
        children: [
            {
                label: 'Enclave OS',
                href: '/solutions/enclave-os/',
                eyebrow: 'Runtime',
                description: 'Run applications inside attested confidential environments with encrypted memory and verifiable runtime state.'
            },
            {
                label: 'Enclave Vaults',
                href: '/solutions/enclave-vaults/',
                eyebrow: 'Keys',
                description: 'A distributed virtual HSM for keys, policies, approvals, and cryptographic operations inside secure enclaves.'
            },
            {
                label: 'Enclave Agent',
                href: '/solutions/enclave-agent/',
                eyebrow: 'Agents',
                description: 'Deploy AI agents and retrieval workflows where prompts, tools, and private data stay inside the trust boundary.'
            },
            {
                label: 'Privasys AI',
                href: '/solutions/ai/',
                eyebrow: 'Inference',
                description: 'Confidential inference for sensitive workloads, with hardware attestation from the client to the model endpoint.'
            },
            {
                label: 'Privasys Platform',
                href: '/solutions/platform/',
                eyebrow: 'Deploy',
                description: 'Developer tools to build, deploy, route, and attest WASM or container apps on confidential infrastructure.'
            },
            {
                label: 'Privasys Wallet',
                href: '/solutions/wallet/',
                eyebrow: 'Identity',
                description: 'Passwordless identity and approvals from your phone, with server verification before users authenticate.'
            }
        ],
        dropdownLinks: [
            { label: 'Developer portal', href: 'https://developer.privasys.org', external: true },
            { label: 'Documentation', href: 'https://docs.privasys.org', external: true }
        ]
    },
    { label: 'App Store', href: '/uk/apps/' },
    { label: 'Docs', href: 'https://docs.privasys.org', external: true },
    { label: 'Blog', href: '/blog/' },
    { label: 'Contact Us', href: 'mailto:contact@privasys.org?subject=Privasys%20website%20contact', external: true }
];

const FOOTER_LINKS = [
    { label: 'Legal', href: '/legal/' },
    { label: 'Privacy', href: '/legal/privacy/' },
    { label: 'Terms', href: '/legal/terms/' },
    { label: 'Modern Slavery', href: '/legal/modern-slavery/' },
    { label: 'GitHub', href: 'https://github.com/Privasys', external: true }
];

export function PageShell({ children }: { activePage?: string; children: ReactNode }) {
    return (
        <>
            <Navbar items={NAV_ITEMS} />

            <main className='m-auto w-full lg:w-[60rem] px-6 lg:px-0 pt-14'>
                {children}
            </main>

            <Footer
                companyLine="Privasys Ltd. Registered Company UK-16866500."
                links={FOOTER_LINKS}
            />
        </>
    );
}
