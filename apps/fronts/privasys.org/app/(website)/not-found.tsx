'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the homepage
        router.replace('/');
    }, [router]);

    return null;
}
