import Link from 'next/link';
import type { ReactNode } from 'react';
import { Footer, Navbar } from '@privasys/ui';

// Shared shell + building blocks for the chat.privasys.org marketing
// pages (the landing page and the /privacy/, /verify/, /features/
// sub pages). Keeps the navbar/footer/CTA styling in one place so the
// pages stay consistent.

export const DEFAULT_INSTANCE = process.env.NEXT_PUBLIC_DEFAULT_INSTANCE ?? 'demo';
export const CHAT_HREF = `/i/${DEFAULT_INSTANCE}/`;
export const CONTACT_HREF =
    'mailto:contact@privasys.org?subject=Privasys%20Chat%20enquiry';
export const DOCS_AI = 'https://docs.privasys.org/solutions/ai/overview';

const NAV_ITEMS = [
    { label: 'Private by design', href: '/privacy/' },
    { label: 'Verify it', href: '/verify/' },
    { label: 'Features', href: '/features/' },
    { label: 'Docs', href: 'https://docs.privasys.org', external: true },
    { label: 'Contact us', href: CONTACT_HREF, external: true }
];

const FOOTER_LINKS = [
    { label: 'Contact us', href: CONTACT_HREF, external: true },
    { label: 'Privacy', href: 'https://privasys.org/legal/privacy/', external: true },
    { label: 'Terms', href: 'https://privasys.org/legal/terms/', external: true },
    { label: 'Documentation', href: 'https://docs.privasys.org', external: true },
    { label: 'Privasys', href: 'https://privasys.org', external: true }
];

export function MarketingShell({ children }: { children: ReactNode }) {
    return (
        <>
            <Navbar
                brandSuffix="Chat"
                items={NAV_ITEMS}
                cta={{ label: 'Start chatting', href: CHAT_HREF }}
            />
            <main className="mx-auto w-full max-w-5xl flex-1 px-6 pt-14">
                {children}
            </main>
            <Footer
                companyLine="Privasys Ltd. Registered Company UK-16866500."
                links={FOOTER_LINKS}
            />
        </>
    );
}

/** Primary gradient CTA pill. */
export function CtaButton({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Link
            href={href}
            className="inline-block rounded-full px-7 py-3 text-sm font-semibold text-[var(--color-navy)] shadow-md transition-transform hover:scale-[1.03]"
            style={{ background: 'var(--brand-gradient)' }}
        >
            {children}
        </Link>
    );
}

/** Secondary outline CTA pill. */
export function GhostButton({
    href,
    external,
    children
}: {
    href: string;
    external?: boolean;
    children: ReactNode;
}) {
    return (
        <Link
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="inline-block rounded-full border border-[var(--color-border-dark)] px-7 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-primary-blue)]/60 hover:text-[var(--color-primary-blue)]"
        >
            {children}
        </Link>
    );
}

/** Page hero for sub pages: eyebrow + title + intro. */
export function PageHero({
    eyebrow,
    title,
    intro
}: {
    eyebrow: string;
    title: ReactNode;
    intro: string;
}) {
    return (
        <section className="pt-16 sm:pt-24">
            <p className="text-xs font-medium tracking-widest text-[var(--color-text-muted)] uppercase">
                {eyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
                {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg">
                {intro}
            </p>
        </section>
    );
}

/** Section with a heading and optional lead paragraph. */
export function Section({
    title,
    lead,
    children
}: {
    title: string;
    lead?: string;
    children?: ReactNode;
}) {
    return (
        <section className="pt-16 sm:pt-24">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
                {title}
            </h2>
            {lead && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)] sm:text-base">
                    {lead}
                </p>
            )}
            {children}
        </section>
    );
}

/** Card with an optional gradient icon tile, used for feature grids. */
export function Card({
    title,
    icon,
    href,
    linkLabel,
    children
}: {
    title: string;
    icon?: ReactNode;
    href?: string;
    linkLabel?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col rounded-2xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)]/60 p-7">
            {icon && (
                <div
                    className="grid h-10 w-10 place-items-center rounded-xl text-[var(--color-navy)]"
                    style={{ background: 'var(--brand-gradient)' }}
                >
                    {icon}
                </div>
            )}
            <h3 className={`${icon ? 'mt-5' : ''} text-lg font-semibold text-[var(--color-text-primary)]`}>
                {title}
            </h3>
            <div className="mt-3 flex-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                {children}
            </div>
            {href && (
                <Link
                    href={href}
                    className="mt-4 text-sm font-medium text-[var(--color-primary-blue)] hover:underline"
                >
                    {linkLabel ?? 'Learn more'} →
                </Link>
            )}
        </div>
    );
}

/** Inline link to the documentation, opens in a new tab. */
export function DocLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary-blue)] hover:underline"
        >
            {children}
        </a>
    );
}

/** "Go deeper" band linking into the technical documentation. */
export function DocsBand({
    links
}: {
    links: { label: string; href: string }[];
}) {
    return (
        <div className="mt-12 rounded-2xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)]/60 p-7">
            <h3 className="text-sm font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
                Go deeper
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                The full technical detail, from architecture to APIs, lives in the
                documentation:
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                {links.map((l) => (
                    <li key={l.href}>
                        <DocLink href={l.href}>{l.label}</DocLink>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Closing band: start chatting + contact us. Shared by every page. */
export function ClosingCta({ title }: { title?: string }) {
    return (
        <section className="py-20 text-center sm:py-28">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
                {title ?? 'Try it for yourself.'}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Sign in with the Privasys Wallet for the full verified experience,
                or contact us if you have specific requirements.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <CtaButton href={CHAT_HREF}>Start chatting</CtaButton>
                <GhostButton href={CONTACT_HREF} external>
                    Contact us
                </GhostButton>
            </div>
        </section>
    );
}
