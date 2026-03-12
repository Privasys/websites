import type { ReactNode } from 'react';

interface CountryLayoutProps {
    children: ReactNode;
    params: Promise<{ country: string }>;
}

const SUPPORTED_COUNTRIES = ['uk', 'us', 'eu', 'fr', 'de', 'sg', 'jp', 'au'] as const;

export function generateStaticParams() {
    return SUPPORTED_COUNTRIES.map((country) => ({ country }));
}

export default async function CountryLayout({ children, params }: CountryLayoutProps) {
    const { country } = await params;
    return <>{children}</>;
}
