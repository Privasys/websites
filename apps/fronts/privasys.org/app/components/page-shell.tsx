'use client';

import { useEffect, useState, ReactNode } from 'react';

interface NavItem {
    label: string;
    href?: string;
    selected?: boolean;
}

const CONTACT_HREF = 'mailto:contact@privasys.org?subject=Privasys%20website%20contact';

const NAV_ITEMS: Record<string, NavItem[]> = {
    home: [
        { label: 'Overview', selected: true },
        { label: 'Blog', href: '/blog' },
        { label: 'Contact Us', href: CONTACT_HREF },
    ],
    blog: [
        { label: 'Overview', href: '/' },
        { label: 'Blog', selected: true },
        { label: 'Contact Us', href: CONTACT_HREF },
    ],
};

export function PageShell({ activePage, children }: { activePage: keyof typeof NAV_ITEMS; children: ReactNode }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 0);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const items = NAV_ITEMS[activePage] ?? NAV_ITEMS.home;

    return (
        <div className={scrolled ? 'scrolled' : ''}>
            <header>
                <nav className='mx-auto w-full lg:w-[60rem] px-6 lg:px-0 flex items-center justify-between py-5'>
                    <a href='/' className='title text-xl -m-1.5 py-1.5'>
                        <span>Privasys</span>
                    </a>
                    <div className='hidden text-sm lg:flex lg:gap-8'>
                        {items.map((item) =>
                            item.selected ? (
                                <span key={item.label} className='menu-item selected'>{item.label}</span>
                            ) : (
                                <a key={item.label} href={item.href} className='menu-item'>{item.label}</a>
                            )
                        )}
                    </div>
                </nav>
                <div className='border-t border-gray-300' />
            </header>

            <main className='m-auto w-full lg:w-[60rem] px-6 lg:px-0'>
                {children}
            </main>

            <footer className='m-auto w-full lg:w-[60rem] px-6 lg:px-0'>
                <div className='mt-30 border-t border-gray-300' />
                <div className='my-3 text-[#767e88] text-sm'>
                    Privasys Ltd. Registered Company UK-16866500.<br />
                    <span className='text-[#abaeb3] text-xs'>© {new Date().getFullYear()} Privasys Ltd. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}
