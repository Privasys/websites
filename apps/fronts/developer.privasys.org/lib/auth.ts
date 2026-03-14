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
                    scope: 'openid profile email offline_access',
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
        jwt({ token, account, profile }) {
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
            // Derive display name from profile or email if missing
            if (!token.name && profile) {
                token.name = (profile.name as string)
                    || (profile.preferred_username as string)
                    || (profile.nickname as string)
                    || '';
            }
            if (!token.name && token.email) {
                token.name = (token.email as string).split('@')[0];
            }
            return token;
        },
        session({ session, token }) {
            session.accessToken = token.accessToken as string;
            session.roles = token.roles ?? [];
            // Ensure user name is populated
            if (!session.user.name && token.name) {
                session.user.name = token.name as string;
            }
            if (!session.user.name && session.user.email) {
                session.user.name = session.user.email.split('@')[0];
            }
            return session;
        }
    },
    trustHost: true
});
