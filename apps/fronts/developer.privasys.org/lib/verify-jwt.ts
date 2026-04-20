import { NextRequest } from 'next/server';

const IDP_ISSUER = process.env.AUTH_PRIVASYS_ISSUER || 'https://privasys.id';

// JWKS cache (refreshed every hour).
let jwksCache: { keys: JsonWebKey[]; fetchedAt: number } | null = null;

interface JwtClaims {
    sub: string;
    iss: string;
    aud: string;
    exp: number;
    roles?: string[];
    email?: string;
    name?: string;
}

async function getJwks(): Promise<JsonWebKey[]> {
    if (jwksCache && Date.now() - jwksCache.fetchedAt < 3600_000) {
        return jwksCache.keys;
    }
    const res = await fetch(`${IDP_ISSUER}/jwks`);
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
    const data = await res.json();
    jwksCache = { keys: data.keys, fetchedAt: Date.now() };
    return data.keys;
}

async function importKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
    );
}

function base64urlDecode(str: string): Uint8Array {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/**
 * Verify a JWT from the Authorization header against the IdP's JWKS.
 * Returns the decoded claims on success, or null on failure.
 */
export async function verifyJwt(req: NextRequest): Promise<JwtClaims | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    try {
        // Decode header to find kid.
        const header = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[0])));
        const keys = await getJwks();
        const jwk = header.kid
            ? keys.find((k: any) => k.kid === header.kid)
            : keys[0];
        if (!jwk) return null;

        // Verify ES256 signature.
        const key = await importKey(jwk);
        const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
        const signature = base64urlDecode(parts[2]);

        // ES256 signature is r||s (64 bytes) — Web Crypto expects this format.
        const valid = await crypto.subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            key,
            signature.buffer as ArrayBuffer,
            data.buffer as ArrayBuffer
        );
        if (!valid) return null;

        // Decode and validate claims.
        const claims: JwtClaims = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1])));
        if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) return null;

        return claims;
    } catch {
        return null;
    }
}
