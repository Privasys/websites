// Attributes a "restricted" share link can require a visitor to present.
//
// Derived from the canonical referential the IdP serves, never listed here: a
// hardcoded copy drifts silently, and a key the wallet and auth SDK do not
// recognise is a share link nobody can open. The same document is what the
// developer portal builds its relying-party attribute picker from.
//
// `assurance` is a display concern only, folded from the canonical flags:
//   basic    self-asserted profile attribute
//   verified provider-verified (canonical `verifiable`, e.g. email_verified)
//   gov      government-ID verified via the identity-verifier enclave
//            (canonical `identityVerifiable`; the `identity` scope is
//            request-gated, so these are only pulled when explicitly asked)

const REFERENTIAL_URL = 'https://privasys.id/referential/canonical-attributes.json';

export type Assurance = 'basic' | 'verified' | 'gov';

export interface ShareAttribute {
    key: string;
    label: string;
    assurance: Assurance;
    /**
     * The `<namespace>:<name>` form the marketplace prices this attribute
     * under, when it sells one at all. Present means requiring it costs the
     * sharer credits; the service resolves the charge against the live
     * catalogue, so this is for labelling the choice, not for pricing it.
     */
    marketplaceKey?: string;
}

// The referential's own shape. Only the fields this app folds are named; the
// document carries more (scopes, profile field mappings, provider claim maps)
// that belong to the IdP and the wallet.
interface CanonicalAttribute {
    key: string;
    label: string;
    verifiable?: boolean;
    identityVerifiable?: boolean;
    marketplace?: { key: string; assurance: string; billable: boolean };
}

function toShareAttribute(a: CanonicalAttribute): ShareAttribute {
    // gov wins over verified: an attribute can be both (email is provider-
    // verifiable, a name is both self-asserted and ID-certifiable) and the
    // stronger claim is the one worth showing.
    const assurance: Assurance = a.identityVerifiable ? 'gov' : a.verifiable ? 'verified' : 'basic';
    return { key: a.key, label: a.label, assurance, marketplaceKey: a.marketplace?.key };
}

// One fetch per page load, shared by every caller. The endpoint is CORS-open
// and sends `Cache-Control: public, max-age=3600`, so the browser cache absorbs
// repeat visits; there is nothing to gain from a copy in local storage that
// would only reintroduce the staleness this module exists to avoid.
let pending: Promise<ShareAttribute[]> | null = null;

export function loadShareAttributes(): Promise<ShareAttribute[]> {
    if (!pending) {
        pending = fetch(REFERENTIAL_URL)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`referential ${r.status}`))))
            .then((d: { attributes?: CanonicalAttribute[] }) => (d.attributes ?? []).map(toShareAttribute))
            .catch((e: unknown) => {
                // Let the next caller retry rather than caching the failure for
                // the life of the tab.
                pending = null;
                throw e;
            });
    }
    return pending;
}

export function assuranceLabel(a: Assurance): string {
    return a === 'gov' ? 'Government ID' : a === 'verified' ? 'Verified' : 'Basic';
}

/**
 * Label for an attribute key as it appears on a stored link.
 *
 * The service rewrites a chosen attribute into the marketplace's namespaced
 * spelling before storing it, so a link created today names `privasys:birthdate`
 * while one created before billing names `birthdate`. Both must read back as
 * "Date of Birth"; an unknown key falls back to itself.
 */
export function attributeLabel(attrs: ShareAttribute[], key: string): string {
    const bare = key.includes(':') ? key.slice(key.indexOf(':') + 1) : key;
    return attrs.find((a) => a.key === key || a.marketplaceKey === key || a.key === bare)?.label ?? key;
}
