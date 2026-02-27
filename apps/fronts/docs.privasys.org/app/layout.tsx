import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
        default: 'Privasys Documentation',
        template: '%s | Privasys Docs'
    },
    description: 'Documentation for the Privasys confidential computing platform — Enclave OS, Caddy RA-TLS Module, and RA-TLS Clients.'
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
