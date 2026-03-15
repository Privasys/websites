import NextAuth from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Zitadel from 'next-auth/providers/zitadel';

const issuer = process.env.AUTH_ZITADEL_ISSUER!;

function extractRolesAndClaims(accessToken: string, token: JWT) {
    try {
        const payload = JSON.parse(
            Buffer.from(accessToken.split('.')[1], 'base64').toString()
        );
        const roles: string[] = [];
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

async function fetchUserInfo(accessToken: string): Promise<{ name?: string; email?: string }> {
    try {
        const res = await fetch(`${issuer}/oidc/v1/userinfo`, {
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

async function refreshAccessToken(token: JWT): Promise<JWT> {
    try {
        const response = await fetch(`${issuer}/oauth/v2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: token.refreshToken as string,
                client_id: process.env.AUTH_ZITADEL_ID!,
                client_secret: process.env.AUTH_ZITADEL_SECRET!
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
            const info = await fetchUserInfo(data.access_token);
            if (info.name && !refreshed.name) refreshed.name = info.name;
            if (info.email && !refreshed.email) refreshed.email = info.email;
        }

        return refreshed;
    } catch {
        return { ...token, error: 'RefreshTokenError' };
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Zitadel({
            issuer,
            clientId: process.env.AUTH_ZITADEL_ID!,
            clientSecret: process.env.AUTH_ZITADEL_SECRET!,
            authorization: {
                params: {
                    scope: 'openid profile email offline_access urn:zitadel:iam:org:project:roles',
                    prompt: 'login'
                }
            }
        })
    ],
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
                // Zitadel access tokens often omit profile claims — fetch from userinfo
                if ((!token.name || !token.email) && account.access_token) {
                    const info = await fetchUserInfo(account.access_token);
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
                return refreshAccessToken(token);
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
