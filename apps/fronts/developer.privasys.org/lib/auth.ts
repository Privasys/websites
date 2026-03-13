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
            }
            return token;
        },
        session({ session, token }) {
            session.accessToken = token.accessToken as string;
            return session;
        }
    },
    trustHost: true
});
