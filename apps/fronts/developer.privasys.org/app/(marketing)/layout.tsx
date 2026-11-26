import type { ReactNode } from 'react';
import { Footer } from '@privasys/ui';
import { MarketingNavbar } from './marketing-navbar';

const NAV_ITEMS = [
    { label: 'Pricing', href: '/pricing' },
    { label: 'Docs', href: 'https://docs.privasys.org', external: true },
    { label: 'App Store', href: 'https://store.privasys.org', external: true }
];

const FOOTER_LINKS = [
    { label: 'Legal', href: 'https://privasys.org/legal', external: true },
    { label: 'Privacy', href: 'https://privasys.org/legal/privacy', external: true },
    { label: 'Terms', href: 'https://privasys.org/legal/terms', external: true },
    { label: 'Modern Slavery', href: 'https://privasys.org/legal/modern-slavery', external: true },
    { label: 'App Store', href: 'https://store.privasys.org', external: true }
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <MarketingNavbar items={NAV_ITEMS} />
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
