'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';

const CONTACT_HREF = 'mailto:contact@privasys.org?subject=Privasys%20website%20contact';

const SOLUTIONS = [
    { label: 'Enclave OS', href: '/solutions/enclave-os' },
    { label: 'Enclave Vaults', href: '/solutions/enclave-vaults' },
    { label: 'Enclave Agent', href: '/solutions/enclave-agent' },
    { label: 'Privasys Platform', href: '/solutions/platform' }
];

export function PageShell({ activePage, children }: { activePage: string; children: ReactNode }) {
    const [scrolled, setScrolled] = useState(false);
    const [solutionsOpen, setSolutionsOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 0);
        onScroll();
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setSolutionsOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    return (
        <div className={scrolled ? 'scrolled' : ''}>
            <header className={`z-50${mobileOpen ? ' mobile-menu-open' : ''}`}>
                <nav className='mx-auto w-full lg:w-[60rem] px-6 lg:px-0 flex items-center justify-between py-5'>
                    <a href='/' className='flex items-center gap-2.5 -m-1.5 py-1.5'>
                        <span className='title text-xl'>Privasys</span>
                    </a>

                    {/* Desktop navigation */}
                    <div className='hidden text-sm lg:flex lg:items-center lg:gap-8'>
                        <div className='relative' ref={dropdownRef}>
                            <button
                                onClick={() => setSolutionsOpen(!solutionsOpen)}
                                className={`menu-item flex items-center gap-1 cursor-pointer ${activePage === 'solutions' ? 'selected' : ''}`}
                            >
                                Solutions
                                <svg width='12' height='12' viewBox='0 0 12 12' fill='none' className={`transition-transform ${solutionsOpen ? 'rotate-180' : ''}`}>
                                    <path d='M3 4.5L6 7.5L9 4.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                                </svg>
                            </button>
                            {solutionsOpen && (
                                <div className='absolute top-full left-1/2 -translate-x-1/2 mt-3 w-52 bg-white dark:bg-[#2d2d2f] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50'>
                                    {SOLUTIONS.map(s => (
                                        <a key={s.href} href={s.href} className='block px-4 py-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
                                            {s.label}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        <a href='https://docs.privasys.org' className={`menu-item ${activePage === 'technology' ? 'selected' : ''}`}>Technology</a>
                        <a href='/blog' className={`menu-item ${activePage === 'blog' ? 'selected' : ''}`}>Blog</a>
                        <a href={CONTACT_HREF} className='menu-item'>Contact Us</a>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className='lg:hidden p-2 -mr-2 text-[#1d1d1f] dark:text-[#f5f5f7]'
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                    >
                        {mobileOpen ? (
                            <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <line x1='18' y1='6' x2='6' y2='18' />
                                <line x1='6' y1='6' x2='18' y2='18' />
                            </svg>
                        ) : (
                            <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <line x1='3' y1='6' x2='21' y2='6' />
                                <line x1='3' y1='12' x2='21' y2='12' />
                                <line x1='3' y1='18' x2='21' y2='18' />
                            </svg>
                        )}
                    </button>
                </nav>
                <div className='border-t border-gray-300 dark:border-gray-700' />
            </header>

            {/* Mobile menu overlay — outside header so backdrop-filter doesn't trap it */}
            {mobileOpen && (
                <div className='lg:hidden fixed inset-0 top-[calc(var(--navigation-height)+1px)] bg-white dark:bg-[#1d1d1f] z-40 overflow-y-auto'>
                    <div className='px-6 py-6 space-y-1'>
                        <button
                            onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)}
                            className='w-full flex items-center justify-between py-3 text-lg font-medium text-[#1d1d1f] dark:text-[#f5f5f7]'
                        >
                            Solutions
                            <svg width='16' height='16' viewBox='0 0 12 12' fill='none' className={`transition-transform ${mobileSolutionsOpen ? 'rotate-180' : ''}`}>
                                <path d='M3 4.5L6 7.5L9 4.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                            </svg>
                        </button>
                        {mobileSolutionsOpen && (
                            <div className='pl-4 space-y-1'>
                                {SOLUTIONS.map(s => (
                                    <a key={s.href} href={s.href} className='block py-2 text-base text-[#1d1d1f]/70 dark:text-[#f5f5f7]/70 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'>
                                        {s.label}
                                    </a>
                                ))}
                            </div>
                        )}
                        <a href='https://docs.privasys.org' className='block py-3 text-lg font-medium text-[#1d1d1f] dark:text-[#f5f5f7]'>Technology</a>
                        <a href='/blog' className='block py-3 text-lg font-medium text-[#1d1d1f] dark:text-[#f5f5f7]'>Blog</a>
                        <a href={CONTACT_HREF} className='block py-3 text-lg font-medium text-[#1d1d1f] dark:text-[#f5f5f7]'>Contact Us</a>
                    </div>
                </div>
            )}

            <main className='m-auto w-full lg:w-[60rem] px-6 lg:px-0'>
                {children}
            </main>

            <footer className='m-auto w-full lg:w-[60rem] px-6 lg:px-0'>
                <div className='mt-30 border-t border-gray-300 dark:border-gray-700' />
                <div className='my-3 text-[#767e88] text-sm'>
                    Privasys Ltd. Registered Company UK-16866500.<br />
                    <span className='text-[#abaeb3] text-xs'>© {new Date().getFullYear()} Privasys Ltd. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}
