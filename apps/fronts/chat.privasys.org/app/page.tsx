import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer, Navbar } from '@privasys/ui';

// Landing page for chat.privasys.org.
//
// Previously the root redirected straight to /i/<default-instance>. New
// visitors landed in the chat with no explanation of what makes it
// different from every other AI chat, so this page now makes the case
// (private by hardware, verifiable, never trained on) and invites them
// to start chatting. The chat itself lives at /i/<instance> unchanged.
//
// Server component: fully static, no auth needed. Shares the Navbar /
// Footer from @privasys/ui (styles already imported by globals.css)
// and the brand tokens from styles/globals.css.

const DEFAULT_INSTANCE = process.env.NEXT_PUBLIC_DEFAULT_INSTANCE ?? 'demo';
const CHAT_HREF = `/i/${DEFAULT_INSTANCE}/`;

export const metadata: Metadata = {
    title: 'Privasys Chat — private AI you can verify',
    description:
        'Chat with an open model running inside confidential hardware. ' +
        'Encrypted end to end, invisible to everyone including us, and ' +
        'every reply is signed by the hardware that produced it.'
};

const NAV_ITEMS = [
    { label: 'Why it is different', href: '#different' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Docs', href: 'https://docs.privasys.org', external: true },
    { label: 'Privasys', href: 'https://privasys.org', external: true }
];

const FOOTER_LINKS = [
    { label: 'Privacy', href: 'https://privasys.org/legal/privacy/', external: true },
    { label: 'Terms', href: 'https://privasys.org/legal/terms/', external: true },
    { label: 'Documentation', href: 'https://docs.privasys.org', external: true },
    { label: 'Developer portal', href: 'https://developer.privasys.org', external: true }
];

export default function LandingPage() {
    return (
        <>
            <Navbar
                brandSuffix="Chat"
                items={NAV_ITEMS}
                cta={{ label: 'Start chatting', href: CHAT_HREF }}
            />

            <main className="mx-auto w-full max-w-5xl flex-1 px-6 pt-14">
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
                        Chat with an open model running inside secure hardware. Your
                        conversations are encrypted end to end, invisible to everyone
                        including us, and every reply is signed by the hardware that
                        produced it.
                    </p>
                    <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                        <Link
                            href={CHAT_HREF}
                            className="rounded-full px-7 py-3 text-sm font-semibold text-[var(--color-navy)] shadow-md transition-transform hover:scale-[1.03]"
                            style={{ background: 'var(--brand-gradient)' }}
                        >
                            Start chatting
                        </Link>
                        <a
                            href="#how-it-works"
                            className="rounded-full border border-[var(--color-border-dark)] px-7 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-primary-blue)]/60 hover:text-[var(--color-primary-blue)]"
                        >
                            How it works
                        </a>
                    </div>
                    <p className="mt-5 text-xs text-[var(--color-text-muted)]">
                        Free to try. No account needed to look around; sign in with the
                        Privasys wallet to chat.
                    </p>
                </section>

                {/* ── Why it is different ──────────────────────────── */}
                <section id="different" className="scroll-mt-20 pt-24 sm:pt-32">
                    <h2 className="text-center text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
                        Not another AI privacy promise.
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-[var(--color-text-secondary)]">
                        Every AI provider says your data is safe. Privasys Chat is built so
                        you do not have to take anyone&apos;s word for it, ours included.
                    </p>
                    <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                        <FeatureCard
                            title="No one can read your chats"
                            body="The model runs inside an Intel TDX confidential VM with the GPU in NVIDIA confidential-computing mode. CPU memory and GPU memory are encrypted, isolated from the cloud provider and from Privasys. Your prompts travel through a sealed, end-to-end encrypted channel from your browser to the enclave."
                            icon={<LockIcon />}
                        />
                        <FeatureCard
                            title="Proof, not promises"
                            body="Before your first prompt leaves the browser, the chat verifies a fresh hardware attestation: the exact code, model and configuration you are talking to, signed by the CPU. Every reply carries a receipt with the model digest and server image hash, so answers are auditable, not just trusted."
                            icon={<ShieldCheckIcon />}
                        />
                        <FeatureCard
                            title="Never used for training"
                            body="Your conversations are stored only on your device, never logged server-side and never used to improve the model. Inside the enclave there is nowhere for them to go: the same attestation that proves the code proves there is no training pipeline."
                            icon={<EyeOffIcon />}
                        />
                    </div>
                </section>

                {/* ── How it works ─────────────────────────────────── */}
                <section id="how-it-works" className="scroll-mt-20 pt-24 sm:pt-32">
                    <h2 className="text-center text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
                        How it works.
                    </h2>
                    <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                        <StepCard
                            step="1"
                            title="Verify the hardware"
                            body="The chat client requests a live attestation quote from the enclave and has it checked by an independent verifier. You can see the model, the code hash and the hardware it runs on in the Security panel, before and during every session."
                        />
                        <StepCard
                            step="2"
                            title="Chat over a sealed channel"
                            body="Messages are encrypted in your browser and decrypted only inside the attested enclave. Gateways and network operators in between relay ciphertext; they never see a prompt or a reply."
                        />
                        <StepCard
                            step="3"
                            title="Audit any answer"
                            body="Each reply ships with reproducibility metadata: model digest, server image hash, sampling seed. Anyone can rebuild the runtime from source and check what produced the answer."
                        />
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
                                        Prompts are readable by the provider and its cloud
                                    </CompareRow>
                                    <CompareRow ok={false}>
                                        Privacy rests on a policy document
                                    </CompareRow>
                                    <CompareRow ok={false}>
                                        Conversations may be retained and used for training
                                    </CompareRow>
                                    <CompareRow ok={false}>
                                        No way to check which model or code answered
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
                                        Prompts are encrypted end to end; even Privasys cannot
                                        read them
                                    </CompareRow>
                                    <CompareRow ok>
                                        Privacy rests on hardware attestation you can check
                                    </CompareRow>
                                    <CompareRow ok>
                                        Chats stay on your device and never train the model
                                    </CompareRow>
                                    <CompareRow ok>
                                        Every reply is signed by the hardware, with a
                                        reproducibility receipt
                                    </CompareRow>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-[var(--color-text-muted)]">
                        Built on the Privasys confidential-computing platform: open-weight
                        models served through an OpenAI-compatible API on attested Intel TDX
                        and NVIDIA H100 hardware.{' '}
                        <a
                            href="https://privasys.org/solutions/ai/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-primary-blue)] hover:underline"
                        >
                            Learn more about Privasys AI
                        </a>
                        .
                    </p>
                </section>

                {/* ── Final CTA ────────────────────────────────────── */}
                <section className="py-24 text-center sm:py-32">
                    <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
                        Ask it something you would not ask the others.
                    </h2>
                    <div className="mt-8">
                        <Link
                            href={CHAT_HREF}
                            className="inline-block rounded-full px-8 py-3 text-sm font-semibold text-[var(--color-navy)] shadow-md transition-transform hover:scale-[1.03]"
                            style={{ background: 'var(--brand-gradient)' }}
                        >
                            Start chatting
                        </Link>
                    </div>
                </section>
            </main>

            <Footer
                companyLine="Privasys Ltd. Registered Company UK-16866500."
                links={FOOTER_LINKS}
            />
        </>
    );
}

function FeatureCard({
    title,
    body,
    icon
}: {
    title: string;
    body: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)]/60 p-7">
            <div
                className="grid h-10 w-10 place-items-center rounded-xl text-[var(--color-navy)]"
                style={{ background: 'var(--brand-gradient)' }}
            >
                {icon}
            </div>
            <h3 className="mt-5 text-lg font-semibold text-[var(--color-text-primary)]">
                {title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                {body}
            </p>
        </div>
    );
}

function StepCard({
    step,
    title,
    body
}: {
    step: string;
    title: string;
    body: string;
}) {
    return (
        <div className="rounded-2xl border border-[var(--color-border-dark)] p-7">
            <span
                className="bg-clip-text text-3xl font-bold text-transparent"
                style={{ backgroundImage: 'var(--brand-gradient)' }}
            >
                {step}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">
                {title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                {body}
            </p>
        </div>
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
