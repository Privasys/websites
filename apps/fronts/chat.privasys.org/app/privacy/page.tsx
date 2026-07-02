import type { Metadata } from 'next';
import {
    ClosingCta,
    DocLink,
    DocsBand,
    DOCS_AI,
    MarketingShell,
    PageHero,
    Section
} from '~/components/marketing';

// /privacy/ — how the chat stays private, from layman to intermediate.
// The deep technical detail lives in the documentation; this page is
// the bridge.

export const metadata: Metadata = {
    title: 'Private by design',
    description:
        'How Privasys Chat keeps your conversations private: confidential ' +
        'computing, a sealed channel from your browser to the hardware, and ' +
        'chats that never leave your device.'
};

export default function PrivacyPage() {
    return (
        <MarketingShell>
            <PageHero
                eyebrow="Private by design"
                title={
                    <>
                        Your chats run inside a{' '}
                        <span
                            className="bg-clip-text text-transparent"
                            style={{ backgroundImage: 'var(--brand-gradient)' }}
                        >
                            locked room
                        </span>
                        .
                    </>
                }
                intro="When you use a normal AI chat, your messages arrive at a
                    server where the provider can read them. Privasys Chat is
                    different: the AI runs inside a sealed area of the
                    processor that nothing outside can look into. Not the
                    cloud company that owns the machine, not the network in
                    between, and not Privasys."
            />

            <Section
                title="The locked room, briefly."
                lead="The technology is called confidential computing. Modern
                    processors can set aside a protected area, often called an
                    enclave, whose memory is encrypted by the chip itself.
                    Software inside the enclave can work on your data; anyone
                    outside, including the machine's own administrators, sees
                    only scrambled bytes."
            >
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                    Privasys Chat runs the entire AI model inside such an enclave,
                    on processors and graphics cards built for it (Intel TDX and
                    NVIDIA H100 confidential computing, for the technically
                    curious). The result is simple to state: the only places your
                    conversation ever exists in readable form are your own screen
                    and the inside of that sealed hardware.
                </p>
            </Section>

            <Section title="Who can see what.">
                <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-border-dark)]">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border-dark)] bg-[var(--color-surface-1)] text-[var(--color-text-muted)]">
                                <th className="px-5 py-3 font-medium">Party</th>
                                <th className="px-5 py-3 font-medium">What they see</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-dark)] text-[var(--color-text-secondary)]">
                            <WhoRow who="You" what="Your conversation, on your device." ok />
                            <WhoRow
                                who="The network"
                                what="Encrypted traffic only. Messages are sealed in your browser and opened only inside the enclave."
                            />
                            <WhoRow
                                who="The cloud provider"
                                what="An encrypted virtual machine it cannot look inside, even with physical access to the hardware."
                            />
                            <WhoRow
                                who="Privasys"
                                what="Operational signals only (is the service up, how loaded is it). Never your prompts, never the replies."
                            />
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section
                title="The journey of a message."
                lead="From the moment you press send, your message is encrypted
                    for one specific, verified enclave, and nothing else can
                    open it."
            >
                <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <JourneyStep n="1" title="Sealed in your browser">
                        Your message is encrypted on your device, addressed to the
                        exact enclave your wallet verified. Gateways and networks
                        in between relay ciphertext they cannot open.
                    </JourneyStep>
                    <JourneyStep n="2" title="Opened only inside">
                        The enclave decrypts your message in protected memory, runs
                        the model, and encrypts the reply the same way. Nothing
                        readable ever touches a disk or leaves the sealed area.
                    </JourneyStep>
                    <JourneyStep n="3" title="Back to you, signed">
                        The reply arrives with a signature from the hardware that
                        produced it, so you can later prove what answered you and
                        with which model.
                    </JourneyStep>
                </ol>
            </Section>

            <Section
                title="Where your conversations live."
                lead="Your chat history is stored on your device, in your
                    browser. It is not kept on Privasys servers, it is not
                    read by anyone, and it is never used to train or improve
                    any model. Delete a conversation and it is gone."
            >
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                    There is no advertising and no profiling anywhere in the
                    product: the business model is providing private AI, not
                    monetising conversations.
                </p>
            </Section>

            <Section
                title="Why you sign in with the Privasys Wallet."
                lead="The wallet is not a login box. It is the piece that checks
                    the hardware on your behalf."
            >
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                    Before you authenticate, the Privasys Wallet on your phone
                    independently verifies the enclave&apos;s credentials: that it
                    is genuine confidential hardware, running exactly the software
                    it claims. Only then does it approve the sign-in and set up the
                    sealed channel. If the hardware or software ever changes, the
                    wallet notices and asks you to verify again. You can sign in
                    with an ordinary identity provider instead, but then this
                    verification step is not performed for you, so the wallet is
                    the recommended way to get the experience the product is built
                    around. See{' '}
                    <DocLink href={`${DOCS_AI}/privacy`}>the privacy model</DocLink>{' '}
                    in the documentation for the details.
                </p>
            </Section>

            <DocsBand
                links={[
                    { label: 'Privacy model', href: `${DOCS_AI}/privacy` },
                    { label: 'Architecture', href: `${DOCS_AI}/architecture` },
                    { label: 'Solution overview', href: `${DOCS_AI}/overview` }
                ]}
            />

            <ClosingCta title="Private by hardware, not by promise." />
        </MarketingShell>
    );
}

function WhoRow({ who, what, ok }: { who: string; what: string; ok?: boolean }) {
    return (
        <tr>
            <td className="px-5 py-3.5 font-medium whitespace-nowrap text-[var(--color-text-primary)]">
                <span className="inline-flex items-center gap-2">
                    <span
                        className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-[var(--color-primary-green)]' : 'bg-[var(--color-text-muted)]/50'}`}
                        aria-hidden
                    />
                    {who}
                </span>
            </td>
            <td className="px-5 py-3.5">{what}</td>
        </tr>
    );
}

function JourneyStep({
    n,
    title,
    children
}: {
    n: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <li className="rounded-2xl border border-[var(--color-border-dark)] p-7">
            <span
                className="bg-clip-text text-3xl font-bold text-transparent"
                style={{ backgroundImage: 'var(--brand-gradient)' }}
            >
                {n}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">
                {title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                {children}
            </p>
        </li>
    );
}
