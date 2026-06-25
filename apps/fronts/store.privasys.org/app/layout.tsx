import type { Metadata } from 'next';
import Link from 'next/link';
import '~/styles/globals.css';

export const metadata: Metadata = {
    title: 'Privasys App Store',
    description: 'Browse confidential applications that run inside hardware-protected enclaves. Every listing is independently verifiable by remote attestation.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en'>
            <body className='min-h-screen bg-white text-[#1d1d1f] dark:bg-[#0a0a0a] dark:text-[#f5f5f7]'>
                <header className='sticky top-0 z-10 border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur'>
                    <div className='mx-auto max-w-6xl px-6 h-14 flex items-center justify-between'>
                        <Link href='/' className='font-semibold tracking-tight'>
                            Privasys <span className='text-black/40 dark:text-white/40'>App Store</span>
                        </Link>
                        <nav className='flex items-center gap-5 text-sm'>
                            <a href='https://developer.privasys.org' className='hover:underline'>Developers</a>
                            <a href='https://docs.privasys.org' className='hover:underline'>Docs</a>
                        </nav>
                    </div>
                </header>
                <main className='mx-auto max-w-6xl px-6 py-10'>{children}</main>
                <footer className='mx-auto max-w-6xl px-6 py-10 text-xs text-black/40 dark:text-white/40 border-t border-black/5 dark:border-white/10 mt-10'>
                    Every app runs inside a hardware-protected enclave. Attestation is verified independently — no trust required.
                </footer>
            </body>
        </html>
    );
}
