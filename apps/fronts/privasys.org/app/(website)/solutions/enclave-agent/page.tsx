'use client';

// Enclave Agent has merged into Privasys AI. This route stays as a redirect so
// existing links land on the combined solution instead of a 404.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EnclaveAgentRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/solutions/ai/');
    }, [router]);

    return (
        <main className='flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center'>
            <p className='text-lg'>
                Enclave Agent is now part of{' '}
                <a href='/solutions/ai/' className='underline'>Privasys AI</a>. Taking you there.
            </p>
        </main>
    );
}
