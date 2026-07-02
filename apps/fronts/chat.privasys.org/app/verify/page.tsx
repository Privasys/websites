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

// /verify/ — attestation, signed replies and reproducibility, explained
// from layman to intermediate, with links into the documentation.

export const metadata: Metadata = {
    title: 'Verify it yourself',
    description:
        'How Privasys Chat proves what it runs: hardware attestation before ' +
        'your first message, hardware-signed replies, and reproducibility ' +
        'receipts you can audit.'
};

export default function VerifyPage() {
    return (
        <MarketingShell>
            <PageHero
                eyebrow="Verify it"
                title={
                    <>
                        Don&apos;t trust.{' '}
                        <span
                            className="bg-clip-text text-transparent"
                            style={{ backgroundImage: 'var(--brand-gradient)' }}
                        >
                            Verify
                        </span>
                        .
                    </>
                }
                intro="A privacy claim you cannot check is just marketing. Every
                    part of Privasys Chat is built to produce evidence: proof of
                    what hardware you are talking to, proof of what software it
                    runs, and a signed record of every answer."
            />

            <Section
                title="The hardware shows its passport."
                lead="Confidential processors can produce a signed statement of
                    exactly what they are running, called an attestation. Think
                    of it as a passport, issued and signed by the chip
                    manufacturer, that lists the machine, the software it
                    booted, and the model it loaded."
            >
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                    Before your first message, the chat requests a fresh
                    attestation from the enclave and has it checked by an
                    independent verification service. If anything does not match,
                    from the processor&apos;s signature to the fingerprint of the
                    AI model, you are warned before a single word leaves your
                    browser. The checks run again throughout your session, not
                    just at the start. The full mechanics are described in{' '}
                    <DocLink href={`${DOCS_AI}/attestation`}>the attestation
                        documentation</DocLink>.
                </p>
            </Section>

            <Section
                title="The green shield, decoded."
                lead="In the chat sidebar, 'Secure enclaves attestations' opens
                    the Security panel: the live, human-readable view of that
                    evidence."
            >
                <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <EvidenceCard title="The hardware">
                        Proof the enclave is genuine confidential-computing
                        hardware, with its protections switched on, vouched for by
                        the chip manufacturer.
                    </EvidenceCard>
                    <EvidenceCard title="The software">
                        Fingerprints of the exact code running inside: the
                        inference server and every AI tool. Change one byte and
                        the fingerprint no longer matches.
                    </EvidenceCard>
                    <EvidenceCard title="The model">
                        The digest of the model weights actually loaded, so
                        &ldquo;you are talking to X&rdquo; is a checkable fact,
                        not a label.
                    </EvidenceCard>
                </ul>
                <p className="mt-6 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                    The panel is green only when every component verifies. Anyone
                    can perform the same verification independently with the
                    published tooling; you do not need to trust our green tick.
                </p>
            </Section>

            <Section
                title="Answers with receipts."
                lead="Every reply carries reproducibility metadata: the model
                    digest, the server image fingerprint, the software versions
                    and the sampling seed that produced it."
            >
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                    Open <em>Metadata</em> under any reply to see its receipt.
                    Because the server is built reproducibly from public source
                    code, a third party can rebuild the exact runtime and replay
                    the same generation. That turns an important answer from
                    &ldquo;the AI said so&rdquo; into something you can audit
                    months later. Replies are signed by the attested hardware, so
                    the receipt also proves <em>where</em> the answer came from.
                </p>
            </Section>

            <Section
                title="Checked by an independent referee."
                lead="The attestation is not verified by the same machine that
                    produced it. A separate attestation service, whose own code
                    and policies are published, checks the signatures against
                    the chip manufacturers' certificates."
            >
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                    This separation matters: the inference machine cannot vouch for
                    itself, and Privasys cannot quietly change what
                    &ldquo;verified&rdquo; means. Developers can call the same
                    verification API directly; see{' '}
                    <DocLink href={`${DOCS_AI}/api`}>the API documentation</DocLink>.
                </p>
            </Section>

            <DocsBand
                links={[
                    { label: 'Attestation', href: `${DOCS_AI}/attestation` },
                    { label: 'Architecture', href: `${DOCS_AI}/architecture` },
                    { label: 'API reference', href: `${DOCS_AI}/api` }
                ]}
            />

            <ClosingCta title="See the evidence for yourself." />
        </MarketingShell>
    );
}

function EvidenceCard({
    title,
    children
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <li className="rounded-2xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)]/60 p-7">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                {children}
            </p>
        </li>
    );
}
