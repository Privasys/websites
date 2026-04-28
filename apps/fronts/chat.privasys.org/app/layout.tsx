import '~/styles/globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '~/lib/auth-provider';

const APP_NAME = 'Privasys Chat';
const SITE_URL = 'https://chat.privasys.org';
const DESCRIPTION =
    'End-to-end attested chat with verifiable confidential AI on TDX + H100. ' +
    'Verify the answer came from the model you trust, on hardware you can prove.';

export const metadata: Metadata = {
    title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
    description: DESCRIPTION,
    metadataBase: new URL(SITE_URL),
    openGraph: {
        type: 'website',
        url: SITE_URL,
        siteName: APP_NAME,
        title: APP_NAME,
        description: DESCRIPTION
    },
    icons: [
        { rel: 'icon', type: 'image/svg+xml', url: '/favicon/favicon.svg' },
        { rel: 'shortcut icon', url: '/favicon/favicon.svg' }
    ]
};

export default function RootLayout({ children }: { children: ReactNode }) {
    // Inline script applies the persisted theme before first paint to
    // avoid a flash of dark content on a light-default app.
    const themeBootstrap = '(()=>{try{var t=localStorage.getItem(\'privasys-chat-theme\');if(t===\'dark\')document.documentElement.setAttribute(\'data-theme\',\'dark\');}catch(e){}})();';
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
                <script defer data-domain="chat.privasys.org" src="https://plausible.privasys.org/js/script.js" />
            </head>
            <body className="antialiased text-foreground leading-relaxed flex flex-col min-h-screen">
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
