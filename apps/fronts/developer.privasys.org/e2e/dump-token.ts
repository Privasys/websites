#!/usr/bin/env ts-node
/**
 * dump-token.ts — mint a fresh IdP JWT for the E2E test user and print a
 * ready-to-paste DevTools snippet that stores it in localStorage so the
 * developer portal picks it up as an authenticated session.
 *
 * Usage:
 *   npx ts-node apps/fronts/developer.privasys.org/e2e/dump-token.ts
 *   # or, inside the websites workspace:
 *   npx ts-node e2e/dump-token.ts
 *
 * Optional env vars:
 *   E2E_AUTH_ORIGIN   IdP URL (default https://privasys.id)
 *   E2E_BASE_URL      Portal URL (default https://developer-test.privasys.org)
 *   E2E_IDENTITY_FILE Override persistent FIDO2 identity path
 *
 * Output:
 *   - Access token JSON (header/claims/raw)
 *   - DevTools one-liner to paste in the portal's Console tab
 *   - curl snippet to hit an app's RPC directly on its enclave host
 */
import { getToken } from './e2e-auth';

const PORTAL = process.env.E2E_BASE_URL || 'https://developer-test.privasys.org';

function decodeJwtPart(part: string): unknown {
    const pad = part + '='.repeat((4 - (part.length % 4)) % 4);
    const b64 = pad.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
}

async function main(): Promise<void> {
    const token = await getToken();
    const [header, payload] = token.split('.');
    const claims = decodeJwtPart(payload) as Record<string, unknown>;

    console.log('━━━ JWT claims ━━━');
    console.log(JSON.stringify({ header: decodeJwtPart(header), claims }, null, 2));

    const exp = (claims.exp as number | undefined) ?? 0;
    const ttl = exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : 0;
    console.log(`\nExpires in ${ttl}s (${new Date(exp * 1000).toISOString()})`);

    console.log('\n━━━ Raw token ━━━');
    console.log(token);

    console.log('\n━━━ DevTools snippet (paste in portal Console) ━━━');
    // The portal stores its session under "privasys.auth" — mirror the
    // minimal shape the wallet/idp-client uses so the portal treats the
    // user as signed-in on next page load.
    const snippet = [
        `// Pasted from dump-token.ts — expires ${new Date(exp * 1000).toISOString()}`,
        'localStorage.setItem(\'privasys.auth\', JSON.stringify({',
        `  access_token: ${JSON.stringify(token)},`,
        '  token_type: \'Bearer\',',
        `  expires_at: ${exp * 1000},`,
        '}));',
        'location.reload();'
    ].join('\n');
    console.log(snippet);

    console.log('\n━━━ curl smoke test (public hello, direct to the enclave) ━━━');
    console.log(
        'curl -sk -H \'Content-Type: application/json\' \\\n' +
        '  -X POST \'https://<APP_HOST>/rpc/<APP_NAME>/hello\' -d \'{}\''
    );

    console.log(`\nPortal: ${PORTAL}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
