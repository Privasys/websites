import type { Metadata } from 'next';
import {
    Card,
    CHAT_HREF,
    ClosingCta,
    CONTACT_HREF,
    CtaButton,
    GhostButton,
    MarketingShell
} from '~/components/marketing';

// Landing page for chat.privasys.org.
//
// Written for a general audience: the point is WHY this chat is
// different (nobody can read your chats, and you can check that),
// not HOW the cryptography works. The how lives in the sub pages
// (/privacy/, /verify/, /features/), each of which steps the level
// up and links into the technical documentation.

export const metadata: Metadata = {
    title: 'Privasys Chat — private AI you can verify',
    description:
        'An AI chat where nobody can read your conversations, not even us. ' +
        'The model runs inside sealed hardware, your chats are never used ' +
        'for training, and you can verify all of it yourself.'
};

export default function LandingPage() {
    return (
        <MarketingShell>
            {/* ── Hero ─────────────────────────────────────────── */}
            <section className="pt-16 text-center sm:pt-24">
                <p className="text-xs font-medium tracking-widest text-[var(--color-text-muted)] uppercase">
                    Confidential AI
                </p>
                <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-6xl">
                    Private AI you can{' '}
                    <span
                        className="bg-clip-text text-transparent"
                        style={{ backgroundImage: 'var(--brand-gradient)' }}
                    >
                        actually verify
                    </span>
                    .
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg">
                    Most AI chats ask you to trust a privacy policy. Privasys Chat
                    runs the AI inside sealed hardware that nobody can look into,
                    not even us, and gives you the tools to check that for
                    yourself.
                </p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                    <CtaButton href={CHAT_HREF}>Start chatting</CtaButton>
                    <GhostButton href="/privacy/">How it stays private</GhostButton>
                </div>
                <p className="mt-5 text-xs text-[var(--color-text-muted)]">
                    Sign in with the Privasys Wallet for the full verified
                    experience.
                </p>
            </section>

            {/* ── The three promises ───────────────────────────── */}
            <section className="pt-24 sm:pt-32">
                <h2 className="text-center text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
                    Not another privacy promise.
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-[var(--color-text-secondary)]">
                    Every AI provider says your data is safe. This one is built so
                    you do not have to take anyone&apos;s word for it, ours
                    included.
                </p>
                <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Card
                        title="Nobody can read your chats"
                        icon={<LockIcon />}
                        href="/privacy/"
                        linkLabel="How it stays private"
                    >
                        Your messages are only ever readable inside a sealed piece
                        of hardware. The cloud provider cannot see them, the
                        network cannot see them, and neither can we.
                    </Card>
                    <Card
                        title="Check it yourself"
                        icon={<ShieldCheckIcon />}
                        href="/verify/"
                        linkLabel="How verification works"
                    >
                        Before your first message, the chat checks the hardware is
                        genuine and running exactly the software it claims. A green
                        shield means it checked out; you can inspect the evidence
                        any time.
                    </Card>
                    <Card
                        title="Never used for training"
                        icon={<EyeOffIcon />}
                        href="/privacy/"
                        linkLabel="Where your chats live"
                    >
                        Your conversations stay on your device. They are not stored
                        on our servers, not used to train or improve any model, and
                        not shown to anyone.
                    </Card>
                </div>
            </section>

            {/* ── Features ─────────────────────────────────────── */}
            <section className="pt-24 sm:pt-32">
                <h2 className="text-center text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
                    A serious AI chat, not just a private one.
                </h2>
                <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Card title="Fast or Thinking" icon={<BoltIcon />} href="/features/">
                        Choose quick answers for everyday questions, or let the
                        model reason step by step through hard problems. One
                        click in the message bar.
                    </Card>
                    <Card title="Choose your model" icon={<GridIcon />} href="/features/">
                        Built on open models you can inspect, not black boxes. We
                        can run any open-weight model; pick from the menu, or ask
                        us to host the one your team needs.
                    </Card>
                    <Card title="Your own private instance" icon={<ServerIcon />} href="/features/">
                        Teams with specific requirements get a dedicated
                        deployment: your own models, your own AI tools, your own
                        region, isolated from everyone else.
                    </Card>
                    <Card title="Answers with receipts" icon={<ReceiptIcon />} href="/verify/">
                        Every reply comes with a signed record of exactly which
                        model and software produced it, so important answers can
                        be audited later instead of just remembered.
                    </Card>
                </div>
            </section>

            {/* ── Comparison ───────────────────────────────────── */}
            <section className="pt-24 sm:pt-32">
                <div className="overflow-hidden rounded-2xl border border-[var(--color-border-dark)]">
                    <div className="grid grid-cols-1 divide-y divide-[var(--color-border-dark)] md:grid-cols-2 md:divide-x md:divide-y-0">
                        <div className="bg-[var(--color-surface-1)] p-8">
                            <h3 className="text-sm font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
                                A typical AI chat
                            </h3>
                            <ul className="mt-5 flex flex-col gap-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                                <CompareRow ok={false}>
                                    The provider can read your conversations
                                </CompareRow>
                                <CompareRow ok={false}>
                                    Privacy depends on a policy document
                                </CompareRow>
                                <CompareRow ok={false}>
                                    Chats may be kept and used for training
                                </CompareRow>
                                <CompareRow ok={false}>
                                    No way to check what actually answered you
                                </CompareRow>
                            </ul>
                        </div>
                        <div className="p-8">
                            <h3 className="text-sm font-semibold tracking-wide uppercase">
                                <span
                                    className="bg-clip-text text-transparent"
                                    style={{ backgroundImage: 'var(--brand-gradient)' }}
                                >
                                    Privasys Chat
                                </span>
                            </h3>
                            <ul className="mt-5 flex flex-col gap-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                                <CompareRow ok>
                                    Nobody can read them, including Privasys
                                </CompareRow>
                                <CompareRow ok>
                                    Privacy is enforced by the hardware itself
                                </CompareRow>
                                <CompareRow ok>
                                    Chats stay on your device and never train a model
                                </CompareRow>
                                <CompareRow ok>
                                    Every reply is signed and checkable
                                </CompareRow>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Contact band ─────────────────────────────────── */}
            <section className="pt-24 sm:pt-32">
                <div className="rounded-2xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)]/60 p-10 text-center">
                    <h2 className="text-xl font-semibold text-[var(--color-text-primary)] sm:text-2xl">
                        Specific requirements?
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
                        Your own instance, a particular model, private AI tools, a
                        chosen region, or compliance constraints: tell us what you
                        need and we will set it up with you.
                    </p>
                    <div className="mt-6">
                        <GhostButton href={CONTACT_HREF} external>
                            Contact us
                        </GhostButton>
                    </div>
                </div>
            </section>

            {/* ── Final CTA ────────────────────────────────────── */}
            <ClosingCta title="Ask it something you would not ask the others." />
        </MarketingShell>
    );
}

function CompareRow({ ok, children }: { ok: boolean; children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2.5">
            {ok ? (
                <svg
                    className="mt-1 h-4 w-4 shrink-0 text-[var(--color-primary-green)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            ) : (
                <svg
                    className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            )}
            <span>{children}</span>
        </li>
    );
}

function LockIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function ShieldCheckIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
            <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
            <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
            <path d="m2 2 20 20" />
        </svg>
    );
}

function BoltIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    );
}

function GridIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
    );
}

function ServerIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
            <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
            <line x1="6" x2="6.01" y1="6" y2="6" />
            <line x1="6" x2="6.01" y1="18" y2="18" />
        </svg>
    );
}

function ReceiptIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            <path d="M8 7h8" />
            <path d="M8 11h8" />
            <path d="M8 15h5" />
        </svg>
    );
}
