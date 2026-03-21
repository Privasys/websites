import '~/styles/globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { APP_NAME, SITE_URL, DEFAULT_META_DESCRIPTION, DEFAULT_FAVICON_ROUTE } from '~/lib/constants';
import { AuthProvider } from '~/lib/auth-provider';

const FAVICON = DEFAULT_FAVICON_ROUTE;

export const metadata: Metadata = {
    title: {
        default: APP_NAME,
        template: `%s | ${APP_NAME}`
    },
    description: DEFAULT_META_DESCRIPTION,
    metadataBase: new URL(SITE_URL),
    openGraph: {
        type: 'website',
        url: SITE_URL,
        siteName: APP_NAME,
        title: APP_NAME,
        description: DEFAULT_META_DESCRIPTION,
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
        { rel: 'apple-touch-icon', sizes: '180x180', url: `${FAVICON}/apple-touch-icon.png` },
        { rel: 'icon', type: 'image/png', sizes: '96x96', url: `${FAVICON}/favicon-96x96.png` },
        { rel: 'icon', type: 'image/svg+xml', url: `${FAVICON}/favicon.svg` },
        { rel: 'shortcut icon', url: `${FAVICON}/favicon.svg` }
    ],
    manifest: `${FAVICON}/site.webmanifest`
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script defer data-domain="developer.privasys.org" src="https://plausible.privasys.org/js/script.js" />
            </head>
            <body className="antialiased text-foreground leading-relaxed flex flex-col min-h-screen">
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
