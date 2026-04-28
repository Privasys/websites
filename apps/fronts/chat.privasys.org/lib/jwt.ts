// Tiny JWT helper. We never validate signatures client-side - the
// server (attestation-server / management-service / private-rag) is
// the source of truth for that. We only peek at the unverified
// payload to read claims like `sub` for storage partitioning.

interface JwtClaims {
    sub?: string;
    email?: string;
    name?: string;
    [k: string]: unknown;
}

export function decodeJwtClaims(token: string | undefined | null): JwtClaims | null {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(padded);
        return JSON.parse(json) as JwtClaims;
    } catch {
        return null;
    }
}

export function jwtSub(token: string | undefined | null): string | null {
    const claims = decodeJwtClaims(token);
    return claims?.sub ?? null;
}
