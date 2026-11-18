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
    // The routes the app serves in the clear (its static shell and public
    // routes), declared in its measured manifest. Absent when everything the
    // app serves is sealed end to end.
    surfaces?: StoreSurfaces;
}

export interface StoreSurfaces {
    static?: string[];
    public?: { method: string; path: string; headers?: string[] }[];
    cors?: string;
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

// The platform monitor, where an app's team may publish a live status page.
// Its public data allows any origin, so the store reads it directly.
export const STATUS_BASE = (
    process.env.NEXT_PUBLIC_STATUS_BASE_URL ??
    (/\.test\.|api-test\./.test(API_BASE)
        ? 'https://platform-monitoring.apps.test.privasys.org'
        : 'https://status.privasys.org')
).replace(/\/$/, '');

export type StatusIndicator = 'none' | 'minor' | 'major' | 'critical' | 'maintenance';

export interface PublicStatus {
    indicator: StatusIndicator;
    headline: string;
    pageUrl: string;
}

// getPublicStatus returns the app's live status, or null when its team has
// not published a status page (the monitor answers 404, the same as for an
// app it does not watch).
export async function getPublicStatus(appId: string): Promise<PublicStatus | null> {
    const id = encodeURIComponent(appId);
    try {
        const res = await fetch(`${STATUS_BASE}/api/v1/public/apps/${id}/status`, { cache: 'no-store' });
        if (!res.ok) return null;
        const page = await res.json() as { indicator?: StatusIndicator; headline?: string };
        return {
            indicator: page.indicator ?? 'none',
            headline: page.headline ?? '',
            pageUrl: `${STATUS_BASE}/apps/${id}/`
        };
    } catch {
        return null;
    }
}
