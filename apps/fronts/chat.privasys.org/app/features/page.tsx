import type { Metadata } from 'next';
import {
    Card,
    ClosingCta,
    CONTACT_HREF,
    DocLink,
    DocsBand,
    DOCS_AI,
    GhostButton,
    MarketingShell,
    PageHero,
    Section
} from '~/components/marketing';

// /features/ — what the chat can do, beyond being private. Layman to
// intermediate; deep detail links into the documentation.

export const metadata: Metadata = {
    title: 'Features',
    description:
        'Fast and Thinking modes, open-weight model choice, dedicated private ' +
        'instances, attested AI tools and reproducible answers.'
};

export default function FeaturesPage() {
    return (
        <MarketingShell>
            <PageHero
                eyebrow="Features"
                title={
                    <>
                        A serious AI chat,{' '}
                        <span
                            className="bg-clip-text text-transparent"
                            style={{ backgroundImage: 'var(--brand-gradient)' }}
                        >
                            not just a private one
                        </span>
                        .
                    </>
                }
                intro="Privacy is the foundation, not the feature list. On top of
                    it you get a capable, modern chat: reasoning modes, model
                    choice, tools, receipts, and dedicated deployments for
                    teams."
            />

            <Section title="Choose how it answers.">
                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card title="Fast mode">
                        The default. The model answers directly, which is what you
                        want for everyday questions, drafting and quick look-ups.
                    </Card>
                    <Card title="Thinking mode">
                        One click in the message bar lets the model reason step by
                        step before answering: slower, but noticeably better on
                        maths, code and multi-step problems. Its reasoning is shown
                        in a collapsible panel, so you can check how it got there.
                    </Card>
                </div>
            </Section>

            <Section
                title="Choose your model."
                lead="Privasys Chat runs open-weight models: models whose
                    weights are public, so what you are running can actually be
                    verified. That verifiability is the point; a black-box API
                    could never carry a checkable fingerprint."
            >
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                    Each instance offers a menu of models in the message bar, and
                    the platform can serve any open-weight model, from compact
                    fast responders to large reasoning models. If the model your
                    team needs is not on the menu, we can host it for you. The
                    current line-up and hardware details are in{' '}
                    <DocLink href={`${DOCS_AI}/models`}>the models
                        documentation</DocLink>.
                </p>
            </Section>

            <Section
                title="Your own private instance."
                lead="The public instance is shared infrastructure with private
                    sessions. Teams with stronger requirements get a dedicated
                    deployment of their own."
            >
                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card title="Your models and tools">
                        Pick the models on your menu, add your own AI tools, and
                        set the governance policy for what users may add.
                    </Card>
                    <Card title="Your boundary">
                        A dedicated enclave fleet in the region you choose,
                        isolated from every other tenant, with your own access
                        control through Privasys ID.
                    </Card>
                </div>
                <div className="mt-8">
                    <GhostButton href={CONTACT_HREF} external>
                        Talk to us about a dedicated instance
                    </GhostButton>
                </div>
            </Section>

            <Section
                title="AI tools, without leaving the boundary."
                lead="The model can use tools, such as web search or a browser,
                    and those tools run inside attested enclaves too. Each tool
                    gets its own row in the Security panel, verified like the
                    model itself."
            >
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                    You choose which tools are active per conversation from the
                    message bar. Depending on the instance policy, you can add
                    your own tools; anything that would leave the protected
                    boundary is clearly marked as unverified and requires your
                    explicit acknowledgement.
                </p>
            </Section>

            <Section title="The details that add up.">
                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Card title="Answers with receipts">
                        Every reply carries metadata naming the exact model,
                        software and seed that produced it. Open Metadata under
                        any reply to inspect it.
                    </Card>
                    <Card title="Edit and branch">
                        Edit any of your messages to re-run the conversation from
                        that point, or branch a reply into a separate thread to
                        explore an idea without losing the original.
                    </Card>
                    <Card title="Yours, on your device">
                        History lives in your browser, per account, with light and
                        dark themes and full keyboard-friendly Markdown replies.
                    </Card>
                </div>
            </Section>

            <DocsBand
                links={[
                    { label: 'Models', href: `${DOCS_AI}/models` },
                    { label: 'API reference', href: `${DOCS_AI}/api` },
                    { label: 'Solution overview', href: `${DOCS_AI}/overview` }
                ]}
            />

            <ClosingCta />
        </MarketingShell>
    );
}
