// What a paid attribute costs, per visitor who presents it.
//
// The price lives in the marketplace catalogue on the control plane, keyed by
// the `<namespace>:<name>` spelling the referential calls `marketplaceKey`. The
// platform keeps prices in credits, a million to the pound, which is the rate
// every Privasys surface converts at (the developer portal's billing and
// attribute pages among them).
//
// A sharer choosing "18 or older" should see what it costs before choosing it.
// A bare "Paid" told them there was a price and left them to guess it.

import { API_BASE_URL } from './me-api';
import type { ShareAttribute } from './share-attributes';

export const CREDITS_PER_GBP = 1_000_000;

/** Marketplace key to price in credits, for every attribute the catalogue sells. */
export async function fetchAttributePrices(token: string, signal?: AbortSignal): Promise<Map<string, number>> {
    const res = await fetch(`${API_BASE_URL}/api/v1/attributes`, {
        signal,
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`attribute catalogue: ${res.status}`);
    const doc = (await res.json()) as { attributes?: { key?: string; price_credits?: number }[] };
    const out = new Map<string, number>();
    for (const a of doc.attributes ?? []) {
        if (a.key && typeof a.price_credits === 'number') out.set(a.key, a.price_credits);
    }
    return out;
}

/**
 * Credits as the pounds they are: "£0.05". Two decimals at least and up to
 * four, so a price under a penny still reads as a price rather than "£0.00".
 */
export function formatCredits(credits: number): string {
    return `£${(credits / CREDITS_PER_GBP).toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    })}`;
}

/** The price of one attribute, or undefined while the catalogue has not said. */
export function priceOf(prices: Map<string, number> | null, a: ShareAttribute): number | undefined {
    if (!prices || !a.marketplaceKey) return undefined;
    return prices.get(a.marketplaceKey);
}

/**
 * What one visitor presenting everything in `chosen` costs. Undefined when a
 * chosen paid attribute has no known price: a partial sum would state a lower
 * bill than the real one, which is the one direction this must never be wrong.
 */
export function perVisitorCost(
    prices: Map<string, number> | null,
    attrs: ShareAttribute[],
    chosen: string[]
): number | undefined {
    let total = 0;
    for (const key of chosen) {
        const a = attrs.find((x) => x.key === key);
        if (!a?.billable) continue;
        const p = priceOf(prices, a);
        if (p === undefined) return undefined;
        total += p;
    }
    return total;
}
