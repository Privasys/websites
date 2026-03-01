'use client';

import { Header } from 'fumadocs-ui/layouts/home';
import { Navbar, SidebarTrigger } from 'fumadocs-ui/layouts/docs';
import { SearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { Sidebar } from 'fumadocs-ui/internal/icons';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from 'fumadocs-ui/utils/cn';
import type { LinkItemType } from 'fumadocs-ui/layouts/shared';
import Link from 'fumadocs-core/link';

const links: LinkItemType[] = [
    {
        text: 'Documentation',
        url: '/introduction/overview',
        active: 'nested-url'
    },
    {
        text: 'GitHub',
        url: 'https://github.com/Privasys',
        external: true
    },
    {
        text: 'Website',
        url: 'https://privasys.org',
        external: true
    },
    {
        text: 'Blog',
        url: 'https://privasys.org/blog',
        external: true
    }
];

export function DocsNavbar() {
    return (
        <>
            {/* Desktop: HomeLayout-style navbar with top navigation links */}
            <div className="max-md:hidden">
                <Header
                    nav={{ title: 'Privasys', url: '/' }}
                    links={links}
                    githubUrl="https://github.com/Privasys"
                />
            </div>

            {/* Mobile: default DocsLayout navbar with sidebar trigger */}
            <Navbar className="h-14 md:hidden">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2.5 font-semibold"
                >
                    Privasys
                </Link>
                <div className="flex-1" />
                <SearchToggle className="p-2" hideIfDisabled />
                <SidebarTrigger
                    className={cn(
                        buttonVariants({
                            color: 'ghost',
                            size: 'icon-sm',
                            className: 'p-2',
                        })
                    )}
                >
                    <Sidebar />
                </SidebarTrigger>
            </Navbar>
        </>
    );
}
