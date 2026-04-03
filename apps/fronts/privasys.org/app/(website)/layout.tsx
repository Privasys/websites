import '~/styles/globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from '~/utils/providers';
import {
    APP_NAME,
    SITE_URL,
    DEFAULT_META_DESCRIPTION,
    DEFAULT_FAVICON_ROUTE
} from '~/lib/constants';
import { ViewTransitions } from 'next-view-transitions';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <ViewTransitions>
            <html lang="en">
                <head>
                    <script defer data-domain="privasys.org" src="https://plausible.privasys.org/js/script.js" />
                </head>
                <body
                    className={'antialiased text-foreground leading-relaxed flex flex-col min-h-screen'}
                >
                    <Providers>
                        {/* <Navbar /> */}
                        <main className="flex-grow relative">
                            {children}
                        </main>
                        {/* <Footer /> */}
                    </Providers>
                </body>
            </html>
        </ViewTransitions>
    );
}


export const metadata: Metadata = {
    title: {
        default: `${APP_NAME} | Data protection and confidential computing`,
        template: `%s | ${APP_NAME}`
    },
    applicationName: APP_NAME,
    description: DEFAULT_META_DESCRIPTION,
    metadataBase: new URL(SITE_URL),
    openGraph: {
        type: 'website',
        url: 'https://privasys.org/',
        siteName: 'Privasys',
        title: 'Privasys | Data protection and confidential computing',
        description: 'We protect your data with confidential computing. Hardware-enforced, cryptographically attested, and fully open source.',
        images: [
            {
                url: `${DEFAULT_FAVICON_ROUTE}/privasys-logo-1200x630.png`,
                width: 1200,
                height: 630,
                alt: 'Privasys Image'
            }
        ]
    },
    icons: [
        {
            rel: 'apple-touch-icon',
            sizes: '180x180',
            url: `${DEFAULT_FAVICON_ROUTE}/apple-touch-icon.png`
        },
        {
            rel: 'icon',
            type: 'image/png',
            sizes: '96x96',
            url: `${DEFAULT_FAVICON_ROUTE}/favicon-96x96.png`
        },
        {
            rel: 'icon',
            type: 'image/svg+xml',
            url: `${DEFAULT_FAVICON_ROUTE}/favicon.svg`
        },
        {
            rel: 'shortcut icon',
            url: `${DEFAULT_FAVICON_ROUTE}/favicon.svg`
        }
    ],
    manifest: `${DEFAULT_FAVICON_ROUTE}/site.webmanifest`
};
