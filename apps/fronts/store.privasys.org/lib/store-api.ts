// Client for the public App Store API (management-service). No auth: only apps
// the owner has published are returned.

export const API_BASE = (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.developer.privasys.org'
).replace(/\/$/, '');

export interface StoreAppSummary {
    slug: string;
    name: string;
    developer: string;
    category: string;
    tagline: string;
    target: 'wasm' | 'container';
    tee: string;
    icon_url: string;
    keywords: string;
    has_live: boolean;
}

export interface StoreReproducibility {
    target: string;
    tee: string;
    source_type: string;
    container_image?: string;
    cwasm_hash?: string;
    cwasm_url?: string;
    commit_url?: string;
    build_run_url?: string;
    enclave_os_release_url: string;
}

export interface StoreAppDetail extends StoreAppSummary {
    id: string;
    description: string;
    screenshots: string[];
    website_url?: string;
    privacy_url?: string;
    tos_url?: string;
    support_email?: string;
    hostname?: string;
    reproducibility: StoreReproducibility;
}

// Resolve a possibly-relative icon URL (e.g. /api/v1/identicon/<id>) against the
// API origin so identicons render on the store host.
export function resolveAsset(url: string): string {
    if (!url) return '';
    if (/^https?:\/\//.test(url)) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function listStoreApps(): Promise<StoreAppSummary[]> {
    const res = await fetch(`${API_BASE}/api/v1/store/apps`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`store list failed: ${res.status}`);
    const data = await res.json();
    return (data.apps ?? []) as StoreAppSummary[];
}

export async function getStoreApp(slug: string): Promise<StoreAppDetail> {
    const res = await fetch(`${API_BASE}/api/v1/store/apps/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (res.status === 404) throw new Error('not found');
    if (!res.ok) throw new Error(`store detail failed: ${res.status}`);
    return res.json() as Promise<StoreAppDetail>;
}

export function attestUrlFor(appId: string): string {
    return `${API_BASE}/api/v1/apps/${encodeURIComponent(appId)}/attest`;
}
