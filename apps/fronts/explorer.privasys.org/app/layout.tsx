import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import { Navbar, Footer } from '@privasys/ui';
import '~/styles/globals.css';

export const metadata: Metadata = {
    title: 'WASM App Explorer — Privasys',
    description: 'Connect to a confidential app running inside a hardware-protected enclave: inspect its remote attestation, authenticate with a passkey or the Privasys wallet, and call its API — all verified independently.'
};

const NAV_ITEMS = [
    { label: 'Developers', href: 'https://developer.privasys.org', external: true },
    { label: 'Docs', href: 'https://docs.privasys.org', external: true },
    { label: 'App Store', href: 'https://store.privasys.org', external: true }
];

const FOOTER_LINKS = [
    { label: 'Developer portal', href: 'https://developer.privasys.org', external: true },
    { label: 'Docs', href: 'https://docs.privasys.org', external: true },
    { label: 'Website', href: 'https://privasys.org', external: true },
    { label: 'Legal', href: 'https://privasys.org/legal/', external: true },
    { label: 'Privacy', href: 'https://privasys.org/legal/privacy/', external: true },
    { label: 'Terms', href: 'https://privasys.org/legal/terms/', external: true }
];

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang='en'>
            <body className='min-h-screen flex flex-col bg-white text-[#1d1d1f] dark:bg-[#0a0a0a] dark:text-[#f5f5f7]'>
                {/* Hosted Privasys auth SDK — powers the Authenticate tab and the
                    connect screen's "Get Token" button (window.Privasys). */}
                <Script src='https://privasys.id/auth/privasys-auth-client.iife.js' strategy='afterInteractive' />
                <Navbar brandSuffix='Explorer' faviconPath='/favicon.svg' items={NAV_ITEMS} />
                <main className='mx-auto max-w-6xl w-full px-6 py-10 flex-1'>{children}</main>
                <Footer companyLine='Every app runs inside a hardware-protected enclave. Attestation is verified independently — no trust required.' links={FOOTER_LINKS} />
            </body>
        </html>
    );
}
