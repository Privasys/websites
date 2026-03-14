import NextAuth from 'next-auth';
import Zitadel from 'next-auth/providers/zitadel';

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Zitadel({
            issuer: process.env.AUTH_ZITADEL_ISSUER,
            clientId: process.env.AUTH_ZITADEL_ID!,
            clientSecret: process.env.AUTH_ZITADEL_SECRET!,
            authorization: {
                params: {
                    scope: 'openid profile email offline_access'
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
        jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
                // Extract Zitadel project roles from access token
                if (account.access_token) {
                    try {
                        const payload = JSON.parse(
                            Buffer.from(account.access_token.split('.')[1], 'base64').toString()
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
                    } catch { /* ignore decode errors */ }
                }
            }
            return token;
        },
        session({ session, token }) {
            session.accessToken = token.accessToken as string;
            session.roles = token.roles ?? [];
            return session;
        }
    },
    trustHost: true
});
