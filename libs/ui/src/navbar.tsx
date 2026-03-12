'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface NavItem {
    label: string;
    href: string;
    external?: boolean;
    children?: { label: string; href: string }[];
}

export interface NavbarProps {
    brandSuffix?: string;
    items: NavItem[];
    cta?: { label: string; href: string };
    faviconPath?: string;
}

export function Navbar({ brandSuffix, items, cta, faviconPath = '/favicon/favicon.svg' }: NavbarProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
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
        <>
            <nav className="pui-navbar">
                <div className="pui-navbar-inner">
                    <Link href="/" className="pui-navbar-brand">
                        <Image src={faviconPath} alt="" width={20} height={20} aria-hidden />
                        <span>Privasys</span>
                        {brandSuffix && (
                            <span className="pui-navbar-brand-suffix">{brandSuffix}</span>
                        )}
                    </Link>

                    {/* Desktop links */}
                    <div className="pui-navbar-desktop" ref={dropdownRef}>
                        {items.map((item) =>
                            item.children ? (
                                <div key={item.label} className="pui-navbar-dropdown-wrapper">
                                    <button
                                        onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                                        className="pui-navbar-link pui-navbar-dropdown-trigger"
                                    >
                                        {item.label}
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={openDropdown === item.label ? 'pui-rotate' : ''}>
                                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    {openDropdown === item.label && (
                                        <div className="pui-navbar-dropdown">
                                            {item.children.map((child) => (
                                                <Link key={child.href} href={child.href} className="pui-navbar-dropdown-item">
                                                    {child.label}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="pui-navbar-link"
                                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                >
                                    {item.label}
                                </Link>
                            )
                        )}
                        {cta && (
                            <Link href={cta.href} className="pui-navbar-cta">
                                {cta.label}
                            </Link>
                        )}
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="pui-navbar-mobile-toggle"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                    >
                        {mobileOpen ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        )}
                    </button>
                </div>
            </nav>

            {/* Mobile menu overlay */}
            {mobileOpen && (
                <div className="pui-mobile-menu">
                    <div className="pui-mobile-menu-inner">
                        {items.map((item) =>
                            item.children ? (
                                <MobileDropdown key={item.label} item={item} />
                            ) : (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="pui-mobile-menu-link"
                                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                >
                                    {item.label}
                                </Link>
                            )
                        )}
                        {cta && (
                            <Link href={cta.href} className="pui-mobile-cta">
                                {cta.label}
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

function MobileDropdown({ item }: { item: NavItem }) {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className="pui-mobile-menu-link pui-mobile-dropdown-trigger"
            >
                {item.label}
                <svg width="16" height="16" viewBox="0 0 12 12" fill="none" className={open ? 'pui-rotate' : ''}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && item.children && (
                <div className="pui-mobile-dropdown-children">
                    {item.children.map((child) => (
                        <Link key={child.href} href={child.href} className="pui-mobile-dropdown-child">
                            {child.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
