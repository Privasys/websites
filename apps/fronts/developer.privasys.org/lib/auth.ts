import NextAuth from 'next-auth';
import type { JWT } from 'next-auth/jwt';

// OIDC discovery cache.
let discoveryCache: Record<string, { tokenEndpoint: string; userinfoEndpoint: string; fetchedAt: number }> = {};

async function getDiscovery(issuer: string) {
    const cached = discoveryCache[issuer];
    if (cached && Date.now() - cached.fetchedAt < 3600_000) return cached;

    const res = await fetch(`${issuer}/.well-known/openid-configuration`);
    if (!res.ok) throw new Error(`OIDC discovery failed for ${issuer}: ${res.status}`);
    const doc = await res.json();
    const entry = {
        tokenEndpoint: doc.token_endpoint as string,
        userinfoEndpoint: doc.userinfo_endpoint as string,
        fetchedAt: Date.now()
    };
    discoveryCache[issuer] = entry;
    return entry;
}

function extractRolesAndClaims(accessToken: string, token: JWT) {
    try {
        const payload = JSON.parse(
            Buffer.from(accessToken.split('.')[1], 'base64').toString()
        );
        const roles: string[] = [];

        // Standard OIDC "roles" claim (flat string array, RFC 9068).
        if (Array.isArray(payload.roles)) {
            for (const role of payload.roles) {
                if (typeof role === 'string' && !roles.includes(role)) roles.push(role);
            }
        }

        // Zitadel project roles: "urn:zitadel:iam:org:project:*:roles"
        for (const [key, val] of Object.entries(payload)) {
            if (key.includes(':roles') && key.startsWith('urn:zitadel:')) {
                for (const role of Object.keys(val as Record<string, unknown>)) {
                    if (!roles.includes(role)) roles.push(role);
                }
            }
        }

        token.roles = roles;
        if (!token.email && payload.email) token.email = payload.email;
        if (!token.name && payload.name) token.name = payload.name;
        if (!token.name && payload.preferred_username) token.name = payload.preferred_username;
    } catch { /* ignore decode errors */ }
}

async function fetchUserInfo(issuer: string, accessToken: string): Promise<{ name?: string; email?: string }> {
    try {
        const disc = await getDiscovery(issuer);
        const res = await fetch(disc.userinfoEndpoint, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) return {};
        const info = await res.json();
        return {
            name: info.name || info.preferred_username || info.nickname || undefined,
            email: info.email || undefined
        };
    } catch {
        return {};
    }
}

async function refreshAccessToken(token: JWT, issuer: string, clientId: string, clientSecret: string): Promise<JWT> {
    try {
        const disc = await getDiscovery(issuer);
        const response = await fetch(disc.tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: token.refreshToken as string,
                client_id: clientId,
                client_secret: clientSecret
            })
        });
        const data = await response.json();
        if (!response.ok) throw data;

        const refreshed: JWT = {
            ...token,
            accessToken: data.access_token,
            refreshToken: data.refresh_token ?? token.refreshToken,
            expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
            error: undefined
        };
        extractRolesAndClaims(data.access_token, refreshed);

        // Self-heal: if name/email are still missing, fetch from userinfo
        if (!refreshed.name || !refreshed.email) {
            const info = await fetchUserInfo(issuer, data.access_token);
            if (info.name && !refreshed.name) refreshed.name = info.name;
            if (info.email && !refreshed.email) refreshed.email = info.email;
        }

        return refreshed;
    } catch {
        return { ...token, error: 'RefreshTokenError' };
    }
}

// Determine which issuer/credentials to use for token refresh based on the token's issuer.
function getProviderConfig(token: JWT): { issuer: string; clientId: string; clientSecret: string } {
    const privasysIssuer = process.env.AUTH_PRIVASYS_ISSUER;
    if (privasysIssuer && token.issuer === privasysIssuer) {
        return {
            issuer: privasysIssuer,
            clientId: process.env.AUTH_PRIVASYS_ID!,
            clientSecret: process.env.AUTH_PRIVASYS_SECRET!
        };
    }
    // Default to Zitadel (legacy) credentials.
    return {
        issuer: process.env.AUTH_ZITADEL_ISSUER!,
        clientId: process.env.AUTH_ZITADEL_ID!,
        clientSecret: process.env.AUTH_ZITADEL_SECRET!
    };
}

// Build providers list dynamically based on which env vars are set.
function buildProviders(): any[] {
    const providers: any[] = [];

    // Privasys Wallet (primary, if configured).
    if (process.env.AUTH_PRIVASYS_ISSUER && process.env.AUTH_PRIVASYS_ID) {
        providers.push({
            id: 'privasys',
            name: 'Privasys Wallet',
            type: 'oidc' as const,
            issuer: process.env.AUTH_PRIVASYS_ISSUER,
            clientId: process.env.AUTH_PRIVASYS_ID!,
            clientSecret: process.env.AUTH_PRIVASYS_SECRET!,
            authorization: {
                params: {
                    scope: 'openid profile email offline_access'
                }
            }
        });
    }

    // Zitadel (legacy / fallback for GitHub & Google social login).
    if (process.env.AUTH_ZITADEL_ISSUER && process.env.AUTH_ZITADEL_ID) {
        providers.push({
            id: 'zitadel',
            name: 'GitHub / Google',
            type: 'oidc' as const,
            issuer: process.env.AUTH_ZITADEL_ISSUER,
            clientId: process.env.AUTH_ZITADEL_ID!,
            clientSecret: process.env.AUTH_ZITADEL_SECRET!,
            authorization: {
                params: {
                    scope: 'openid profile email offline_access urn:zitadel:iam:org:project:roles',
                    prompt: 'select_account'
                }
            }
        });
    }

    return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: buildProviders(),
    pages: {
        signIn: '/login'
    },
    session: {
        strategy: 'jwt'
    },
    callbacks: {
        async jwt({ token, account, profile }) {
            // Initial sign-in
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
                token.issuer = account.provider === 'privasys'
                    ? process.env.AUTH_PRIVASYS_ISSUER
                    : process.env.AUTH_ZITADEL_ISSUER;
                if (account.access_token) {
                    extractRolesAndClaims(account.access_token, token);
                }
                // OIDC profile takes priority over access-token claims
                if (profile) {
                    if (profile.email) token.email = profile.email as string;
                    const profileName = (profile.name as string)
                        || (profile.preferred_username as string)
                        || (profile.nickname as string);
                    if (profileName) token.name = profileName;
                }
                // Access tokens often omit profile claims — fetch from userinfo
                if ((!token.name || !token.email) && account.access_token && token.issuer) {
                    const info = await fetchUserInfo(token.issuer as string, account.access_token);
                    if (info.name && !token.name) token.name = info.name;
                    if (info.email && !token.email) token.email = info.email;
                }
                if (!token.name && token.email) {
                    token.name = (token.email as string).split('@')[0];
                }
                return token;
            }

            // Token still valid (60s buffer)
            if (token.expiresAt && Date.now() < token.expiresAt * 1000 - 60_000) {
                return token;
            }

            // Token expired or about to expire — refresh
            if (token.refreshToken) {
                const cfg = getProviderConfig(token);
                return refreshAccessToken(token, cfg.issuer, cfg.clientId, cfg.clientSecret);
            }

            return token;
        },
        session({ session, token }) {
            session.accessToken = token.accessToken as string;
            session.roles = token.roles ?? [];
            if (token.error) session.error = token.error as string;
            if (token.name) session.user.name = token.name as string;
            if (token.email) session.user.email = token.email as string;
            if (token.picture) session.user.image = token.picture as string;
            if (!session.user.name && session.user.email) {
                session.user.name = session.user.email.split('@')[0];
            }
            return session;
        }
    },
    trustHost: true
});
