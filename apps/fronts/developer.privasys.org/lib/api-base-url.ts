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
 * The extra scope that asks the IdP for this environment's platform
 * audience: none in production (the IdP's default), the test audience on
 * the test portal.
 */
export function platformAudienceScope(): string[] {
    return isTestPortal() ? [`audience:${TEST_PLATFORM_AUDIENCE}`] : [];
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
