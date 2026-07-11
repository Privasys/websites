import { getApiBaseUrl } from './api-base-url';

// Confidential-* container instance sizes (the platform price book's container
// instance catalogue). A container app gets a fixed size chosen at creation;
// there is no resize. 1 credit = £0.000001 → £1 = 1,000,000 credits.

export interface InstanceSize {
    slug: string;
    size: string;
    vcpu: number;
    ram_gb: number;
    storage_gb: number;
    credits_per_hour: number;
    credits_per_min: number;
}

// Static fallback mirroring the management-service catalog, used when the
// catalog endpoint is unreachable and by static (marketing) pages.
export const FALLBACK_INSTANCE_SIZES: InstanceSize[] = [
    { slug: 'micro', size: 'Confidential-Micro', vcpu: 1, ram_gb: 4, storage_gb: 80, credits_per_hour: 60000, credits_per_min: 1000 },
    { slug: 'small', size: 'Confidential-Small', vcpu: 2, ram_gb: 8, storage_gb: 160, credits_per_hour: 120000, credits_per_min: 2000 },
    { slug: 'medium', size: 'Confidential-Medium', vcpu: 4, ram_gb: 16, storage_gb: 320, credits_per_hour: 240000, credits_per_min: 4000 },
    { slug: 'large', size: 'Confidential-Large', vcpu: 8, ram_gb: 32, storage_gb: 640, credits_per_hour: 480000, credits_per_min: 8000 },
    { slug: 'xlarge', size: 'Confidential-XLarge', vcpu: 16, ram_gb: 64, storage_gb: 1280, credits_per_hour: 960000, credits_per_min: 16000 }
];

// fetchInstanceSizes returns the live catalog (sorted ascending by price).
// Best-effort: any error or non-200 falls back to the static catalogue so the
// wizard never blocks on it.
export async function fetchInstanceSizes(token: string): Promise<InstanceSize[]> {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/catalog/instance-sizes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return FALLBACK_INSTANCE_SIZES;
        const body = await res.json();
        const sizes = body?.sizes;
        return Array.isArray(sizes) && sizes.length > 0 ? (sizes as InstanceSize[]) : FALLBACK_INSTANCE_SIZES;
    } catch {
        return FALLBACK_INSTANCE_SIZES;
    }
}

// hourlyGBP is the running cost in £ per hour (£1 = 1,000,000 credits).
export function hourlyGBP(s: InstanceSize): number {
    return s.credits_per_hour / 1_000_000;
}

// monthlyGBP is the approximate always-on cost in £ per month. 720 hours is
// the price book's published month (pricing plan §5.3: Micro = £43.20/mo) —
// keep it so the marketing table matches the catalogue exactly.
export function monthlyGBP(s: InstanceSize): number {
    return (s.credits_per_hour * 720) / 1_000_000;
}
