'use client';

import { ReactNode } from 'react';
import { Navbar, Footer } from '@privasys/ui';

const NAV_ITEMS = [
    {
        label: 'Solutions',
        href: '#',
        children: [
            { label: 'Enclave OS', href: '/solutions/enclave-os' },
            { label: 'Enclave Vaults', href: '/solutions/enclave-vaults' },
            { label: 'Enclave Agent', href: '/solutions/enclave-agent' },
            { label: 'Privasys Platform', href: '/solutions/platform' },
            { label: 'Privasys Wallet', href: '/solutions/wallet' }
        ]
    },
    { label: 'App Store', href: '/uk/apps' },
    { label: 'Technology', href: 'https://docs.privasys.org', external: true },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact Us', href: 'mailto:contact@privasys.org?subject=Privasys%20website%20contact', external: true }
];

const FOOTER_LINKS = [
    { label: 'Legal', href: '/legal' },
    { label: 'Privacy', href: '/legal/privacy' },
    { label: 'Terms', href: '/legal/terms' },
    { label: 'Modern Slavery', href: '/legal/modern-slavery' },
    { label: 'GitHub', href: 'https://github.com/Privasys', external: true }
];

export function PageShell({ activePage, children }: { activePage: string; children: ReactNode }) {
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
