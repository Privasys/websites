import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

const FAVICON = '/favicon';

export const metadata: Metadata = {
    title: {
        default: 'Privasys Documentation',
        template: '%s | Privasys Docs'
    },
    description:
        'Documentation for the Privasys confidential computing platform — Enclave OS, Enclave Vaults, Enclave Agent, and the Privasys Platform.',
    metadataBase: new URL('https://docs.privasys.org'),
    openGraph: {
        type: 'website',
        url: 'https://docs.privasys.org/',
        siteName: 'Privasys Docs',
        title: 'Privasys Documentation',
        description:
            'Documentation for the Privasys confidential computing platform — hardware-enforced, cryptographically attested, and fully open source.',
        images: [
            {
                url: `${FAVICON}/privasys-logo-1200x630.png`,
                width: 1200,
                height: 630,
                alt: 'Privasys'
            }
        ]
    },
    icons: [
        {
            rel: 'apple-touch-icon',
            sizes: '180x180',
            url: `${FAVICON}/apple-touch-icon.png`
        },
        {
            rel: 'icon',
            type: 'image/png',
            sizes: '96x96',
            url: `${FAVICON}/favicon-96x96.png`
        },
        {
            rel: 'icon',
            type: 'image/svg+xml',
            url: `${FAVICON}/favicon.svg`
        },
        {
            rel: 'shortcut icon',
            url: `${FAVICON}/favicon.svg`
        }
    ],
    manifest: `${FAVICON}/site.webmanifest`
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script defer data-domain="docs.privasys.org" src="https://plausible.privasys.org/js/script.js" />
            </head>
            <body className="flex flex-col min-h-screen">
                <RootProvider
                    search={{
                        options: {
                            type: 'static'
                        }
                    }}
                >
                    {children}
                </RootProvider>
                <footer className="border-t py-6 text-center text-sm text-fd-muted-foreground">
                    <p>© {new Date().getFullYear()} Privasys Ltd. All rights reserved.</p>
                    <p className="mt-1">
                        v0.1.0 · Licensed under{' '}
                        <a
                            href="https://github.com/Privasys/websites/blob/main/LICENSE"
                            className="underline hover:text-fd-foreground"
                            target="_blank"
                            rel="noreferrer"
                        >
                            AGPL-3.0
                        </a>
                    </p>
                </footer>
            </body>
        </html>
    );
}
