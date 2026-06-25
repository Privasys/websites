import { PageShell } from '~/app/components/page-shell';
import { StoreRedirect } from '~/app/components/store-redirect';

// The App Store now lives at store.privasys.org. This legacy route redirects
// there so old links and search results keep working.
export default function AppStoreRedirectPage() {
    return (
        <PageShell activePage='apps'>
            <StoreRedirect to='https://store.privasys.org' />
        </PageShell>
    );
}
