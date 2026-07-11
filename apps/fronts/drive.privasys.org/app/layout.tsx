import type { Metadata } from 'next';
import { AuthProvider } from '~/lib/auth-provider';
import { DriveProvider } from '~/lib/use-drive';
import '~/styles/globals.css';

export const metadata: Metadata = {
    title: 'Privasys Drive',
    description:
        'Your files, sealed. Privasys Drive stores every file end-to-end encrypted inside a hardware-protected enclave — the operator cannot read your data, and access is verifiable by remote attestation.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen">
                <AuthProvider>
                    <DriveProvider>{children}</DriveProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
