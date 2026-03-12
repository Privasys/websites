'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
            <Link href="/" className="flex items-center gap-2.5 mb-10">
                <Image src="/favicon/favicon.svg" alt="" width={24} height={24} aria-hidden />
                <span className="text-xl font-semibold">Privasys Developer</span>
            </Link>

            <div className="w-full max-w-sm p-8 rounded-2xl border border-black/10 dark:border-white/10">
                <h1 className="text-xl font-semibold text-center">Sign in</h1>
                <p className="mt-2 text-sm text-center text-black/50 dark:text-white/50">
                    Authenticate with your identity provider to access the platform.
                </p>

                <button
                    type="button"
                    className="mt-8 w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                >
                    Continue with OIDC
                </button>

                <p className="mt-6 text-xs text-center text-black/40 dark:text-white/40">
                    By signing in, you agree to the{' '}
                    <a href="https://privasys.org/legal/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="https://privasys.org/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>.
                </p>
            </div>
        </div>
    );
}
