// Attributes a "restricted" share link can require a visitor to present.
//
// Keys and labels mirror the canonical attribute list
// (auth/shared/canonical-attributes.json) exactly, so the wallet and auth
// SDK understand precisely what is being requested. `assurance` reflects
// how strongly the value can be trusted:
//   basic    self-asserted profile attribute
//   verified provider-verified (canonical `verifiable`, e.g. email_verified)
//   gov      government-ID verified via the identity-verifier enclave
//            (canonical `identityVerifiable`; the `identity` scope is
//            request-gated, so these are only pulled when explicitly asked)

export type Assurance = 'basic' | 'verified' | 'gov';

export interface ShareAttribute {
    key: string;
    label: string;
    assurance: Assurance;
}

export const SHARE_ATTRIBUTES: ShareAttribute[] = [
    { key: 'name', label: 'Display Name', assurance: 'basic' },
    { key: 'given_name', label: 'First Name', assurance: 'basic' },
    { key: 'family_name', label: 'Last Name', assurance: 'basic' },
    { key: 'email', label: 'Email', assurance: 'verified' },
    { key: 'phone_number', label: 'Phone Number', assurance: 'verified' },
    { key: 'nationality', label: 'Nationality', assurance: 'gov' },
    { key: 'birthdate', label: 'Date of Birth', assurance: 'gov' },
    { key: 'age_over_18', label: '18 or older', assurance: 'gov' },
    { key: 'given_name_id', label: 'Given Names (ID)', assurance: 'gov' },
    { key: 'family_name_id', label: 'Surname (ID)', assurance: 'gov' }
];

export function assuranceLabel(a: Assurance): string {
    return a === 'gov' ? 'Government ID' : a === 'verified' ? 'Verified' : 'Basic';
}
