import { PageShell } from '~/app/components/page-shell';
import { StoreRedirect } from '~/app/components/store-redirect';

// The App Store moved to store.privasys.org. These legacy per-app routes
// redirect to the matching listing there. We keep generateStaticParams over the
// previously-listed slugs so existing links and search results still resolve.
const LEGACY_SLUGS = ['confidential-vault', 'private-inference', 'secure-analytics'];
const SUPPORTED_COUNTRIES = ['uk', 'us', 'eu', 'fr', 'de', 'sg', 'jp', 'au'];

export function generateStaticParams() {
    return SUPPORTED_COUNTRIES.flatMap((country) =>
        LEGACY_SLUGS.map((slug) => ({ country, slug }))
    );
}

export default async function AppDetailRedirectPage({ params }: { params: Promise<{ country: string; slug: string }> }) {
    const { slug } = await params;
    return (
        <PageShell activePage='apps'>
            <StoreRedirect to={`https://store.privasys.org/app/?slug=${encodeURIComponent(slug)}`} />
        </PageShell>
    );
}
