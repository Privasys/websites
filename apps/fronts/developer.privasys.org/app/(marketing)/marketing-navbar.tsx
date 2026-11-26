'use client';

// The marketing pages' navbar, aware of the sign-in: a signed-in visitor sees
// the way to their dashboard and can sign out, rather than a "Sign in" that
// contradicts the page (the invitation page says "You are signed in").

import { Navbar, type NavItem } from '@privasys/ui';
import { useAuth } from '~/lib/privasys-auth';

export function MarketingNavbar({ items }: { items: NavItem[] }) {
    const { session, signOut } = useAuth();
    return (
        <Navbar
            brandSuffix="Developer"
            items={items}
            cta={session ? { label: 'Dashboard', href: '/dashboard' } : { label: 'Sign in', href: '/dashboard' }}
            trailing={session ? (
                <button type="button" onClick={() => { void signOut(); }} className="pui-navbar-link">
                    Sign out
                </button>
            ) : undefined}
        />
    );
}
