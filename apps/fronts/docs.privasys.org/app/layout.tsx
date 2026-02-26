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
            </body>
        </html>
    );
}
