const PROD_PORTAL_HOST = 'developer.privasys.org';
const TEST_PORTAL_HOST = 'developer-test.privasys.org';
const PROD_API_URL = 'https://api.developer.privasys.org';
const TEST_API_URL = 'https://api-test.developer.privasys.org';
const LOCAL_API_URL = 'http://localhost:8080';

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
