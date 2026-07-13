import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import { Navbar, Footer } from '@privasys/ui';
import '~/styles/globals.css';

const FAVICON = '/favicon';

export const metadata: Metadata = {
    title: 'Privasys App Explorer',
    description: 'Connect to a confidential app running inside a hardware-protected enclave: inspect its remote attestation, authenticate with a passkey or the Privasys wallet, and call its API, all verified independently.',
    icons: [
        { rel: 'apple-touch-icon', sizes: '180x180', url: `${FAVICON}/apple-touch-icon.png` },
        { rel: 'icon', type: 'image/png', sizes: '96x96', url: `${FAVICON}/favicon-96x96.png` },
        { rel: 'icon', type: 'image/svg+xml', url: `${FAVICON}/favicon.svg` },
        { rel: 'shortcut icon', url: `${FAVICON}/favicon.ico` }
    ],
    manifest: `${FAVICON}/site.webmanifest`
};

const NAV_ITEMS = [
    { label: 'Utils', href: '/utils' }
];

const FOOTER_LINKS = [
    { label: 'Developer Portal', href: 'https://developer.privasys.org', external: true },
    { label: 'Legal', href: 'https://privasys.org/legal/', external: true }
];

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang='en'>
            <head>
                {/* Privacy-friendly, self-hosted Plausible analytics (matches the other fronts). */}
                <script defer data-domain='explorer.privasys.org' src='https://plausible.privasys.org/js/script.js' />
            </head>
            <body className='min-h-screen flex flex-col overflow-x-hidden bg-white text-[#1d1d1f] dark:bg-[#0a0a0a] dark:text-[#f5f5f7]'>
                {/* Hosted Privasys auth SDK: powers the Authenticate tab and the
                    connect screen's "Get Token" button (window.Privasys). */}
                <Script src='https://privasys.id/auth/privasys-auth-client.iife.js' strategy='afterInteractive' />
                <Navbar brandSuffix='Explorer' faviconPath={`${FAVICON}/favicon.svg`} items={NAV_ITEMS} />
                {/* pt-20 clears the fixed 3.5rem Navbar. */}
                <main className='mx-auto max-w-6xl w-full px-6 pt-20 pb-10 flex-1'>{children}</main>
                <Footer companyLine='Every app runs inside a hardware-protected enclave. Attestation is verified independently. No trust required.' links={FOOTER_LINKS} />
            </body>
        </html>
    );
}
