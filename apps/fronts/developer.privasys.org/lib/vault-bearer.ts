// The bearer the control plane forwards to the vaults.
//
// On the test portal the session's token is for the test platform audience,
// but the vaults accept only privasys-platform, where the owner's approver
// roles live. The portal then sends a privasys-platform token for the same
// session in X-Privasys-Vault-Bearer, on the routes that reach the vaults;
// the control plane checks it names the same account. Production sends none.

export const VAULT_BEARER_HEADER = 'X-Privasys-Vault-Bearer';

// Routes whose handlers forward the caller's bearer to the vaults.
const VAULT_ROUTE = new RegExp(
    '^/api/v1/apps/[^/]+/(versions/|auto-migrate|key/rotate|migrate-constellation|registry-secret|' +
    'retire-measurement|measurements|tcb-policy|policy|restore)'
);

let source: (() => Promise<string>) | null = null;

/** Set (or clear) the function that mints the vault bearer. */
export function setVaultBearerSource(fn: (() => Promise<string>) | null): void {
    source = fn;
}

/** The vault bearer header for this request path, or none. */
export async function vaultBearerHeaders(path: string): Promise<Record<string, string>> {
    if (!source || !VAULT_ROUTE.test(path)) return {};
    try {
        const tok = await source();
        return tok ? { [VAULT_BEARER_HEADER]: tok } : {};
    } catch {
        return {};
    }
}

/** Caches one audience token until a minute before it expires. */
export function cachedToken(mint: () => Promise<string>): () => Promise<string> {
    let tok = '';
    let exp = 0;
    return async () => {
        if (tok && Date.now() / 1000 < exp - 60) return tok;
        tok = await mint();
        try {
            exp = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp ?? 0;
        } catch {
            exp = 0;
        }
        return tok;
    };
}
