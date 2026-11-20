// The account the portal works in.
//
// A person can belong to several accounts: their personal one and any
// organisation accounts. The portal shows one at a time, chosen in the top
// bar, and names it to the control plane on every request
// (X-Privasys-Account), which checks the person belongs to it. The choice
// is remembered in this browser, and a link can carry it as ?account=.
// MANAGEMENT stands for the platform's administration, which is no account:
// its requests name none.

const STORAGE_KEY = 'privasys.account';
export const ACCOUNT_HEADER = 'X-Privasys-Account';
export const MANAGEMENT = 'management';

let current: string | null = null;
let loaded = false;

function load(): void {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    try {
        const fromLink = new URLSearchParams(window.location.search).get('account');
        if (fromLink) {
            current = fromLink;
            window.localStorage.setItem(STORAGE_KEY, fromLink);
            return;
        }
        current = window.localStorage.getItem(STORAGE_KEY);
    } catch {
        current = null;
    }
}

/** The account id the portal works in, MANAGEMENT, or null before it is known. */
export function getCurrentAccountId(): string | null {
    load();
    return current;
}

/** Remembers where the portal works. */
export function setCurrentAccountId(id: string | null): void {
    current = id;
    loaded = true;
    try {
        if (id) window.localStorage.setItem(STORAGE_KEY, id);
        else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Not remembered; the choice still holds for this page.
    }
}

/** The header that names the account, when the portal works in one. */
export function accountHeaders(): Record<string, string> {
    const id = getCurrentAccountId();
    return id && id !== MANAGEMENT ? { [ACCOUNT_HEADER]: id } : {};
}
