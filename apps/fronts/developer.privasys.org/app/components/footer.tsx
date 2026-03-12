import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t border-black/5 dark:border-white/10 py-10 text-sm text-black/50 dark:text-white/40">
            <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p>&copy; {new Date().getFullYear()} Privasys. All rights reserved.</p>
                <div className="flex items-center gap-6">
                    <Link href="https://privasys.org/legal/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy</Link>
                    <Link href="https://privasys.org/legal/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">Terms</Link>
                    <Link href="https://github.com/Privasys" target="_blank" rel="noopener noreferrer" className="hover:underline">GitHub</Link>
                </div>
            </div>
        </footer>
    );
}
