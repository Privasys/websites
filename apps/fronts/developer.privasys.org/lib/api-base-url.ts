const PROD_PORTAL_HOST = 'developer.privasys.org';
const TEST_PORTAL_HOST = 'developer.test.privasys.org';
const PROD_API_URL = 'https://api.developer.privasys.org';
const TEST_API_URL = 'https://api.developer.test.privasys.org';
const LOCAL_API_URL = 'http://localhost:8080';

// The test environment has its own platform audience on the shared IdP, so
// its roles (privasys-platform-test:*) stay apart from production's.
export const TEST_PLATFORM_AUDIENCE = 'privasys-platform-test';

/** True on the test portal, where the test control plane is the API. */
export function isTestPortal(): boolean {
    const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (configured) return configured === TEST_API_URL;
    return typeof window !== 'undefined' && window.location.hostname === TEST_PORTAL_HOST;
}

/**
 * The sign-in client and token audience for this environment. The test
 * portal signs in with its own client, so its session stays apart from
 * production's on the same site (the frame keeps one per client), and asks
 * for the test audience. rpId stays privasys.id for both: the wallet keys
 * its sign-in credential by rpId, so another rpId would be another person.
 */
export function platformSignIn(): { clientId: string; audience?: string } {
    return isTestPortal()
        ? { clientId: 'privasys-platform-test', audience: TEST_PLATFORM_AUDIENCE }
        : { clientId: 'privasys-platform' };
}

/**
 * The sign-in client of the portal's sealed sessions to enclaves (deploys,
 * the monitor). rpId stays privasys.id, so the wallet uses the person's one
 * credential; its own client keeps its session apart from the front's (the
 * frame keeps one per rpId, client and platform).
 */
export function deploySignIn(): { clientId: string; audience?: string } {
    return isTestPortal()
        ? { clientId: 'privasys-platform-deploy-test', audience: TEST_PLATFORM_AUDIENCE }
        : { clientId: 'privasys-platform-deploy' };
}

export function getApiBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (configured) return configured;

    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === PROD_PORTAL_HOST) return PROD_API_URL;
        if (host === TEST_PORTAL_HOST) return TEST_API_URL;
    }

    return LOCAL_API_URL;
}
