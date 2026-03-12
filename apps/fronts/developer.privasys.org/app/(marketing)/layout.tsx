import type { ReactNode } from 'react';
import { Navbar, Footer } from '@privasys/ui';

const NAV_ITEMS = [
    { label: 'Docs', href: 'https://docs.privasys.org', external: true },
    { label: 'Website', href: 'https://privasys.org', external: true },
    { label: 'GitHub', href: 'https://github.com/Privasys', external: true },
];

const FOOTER_LINKS = [
    { label: 'Legal', href: 'https://privasys.org/legal', external: true },
    { label: 'Privacy', href: 'https://privasys.org/legal/privacy', external: true },
    { label: 'Terms', href: 'https://privasys.org/legal/terms', external: true },
    { label: 'Modern Slavery', href: 'https://privasys.org/legal/modern-slavery', external: true },
    { label: 'GitHub', href: 'https://github.com/Privasys', external: true },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Navbar
                brandSuffix="Developer"
                items={NAV_ITEMS}
                cta={{ label: 'Sign in', href: '/login' }}
            />
            <main className="flex-grow pt-14">
                {children}
            </main>
            <Footer
                companyLine="Privasys Ltd. Registered Company UK-16866500."
                links={FOOTER_LINKS}
            />
        </>
    );
}
