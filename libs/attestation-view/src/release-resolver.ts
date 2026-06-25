import type { ReleaseField, ReleaseMatch } from './types';

// makePrivasysReleaseResolver builds an async resolver that asks the
// management-service whether a measurement matches a published Enclave OS
// release. The component uses the result to render a "Verified · <tag>" link to
// the exact release (on match) or a muted "no matching release" hint (for a
// resolvable field that did not match — e.g. a dev enclave built outside CI).
//
// Only MRENCLAVE (SGX) and predicted RTMR[1]/RTMR[2] (TDX) are published
// per-release, so we short-circuit the other fields to avoid a pointless call.
//
// `apiBase` is the management-service origin (no trailing /api/v1), e.g.
// `https://api-test.developer.privasys.org`.
const RESOLVABLE: ReadonlySet<ReleaseField> = new Set(['mr_enclave', 'rtmr1', 'rtmr2']);

export function makePrivasysReleaseResolver(apiBase: string) {
    const base = apiBase.replace(/\/$/, '');
    return async function resolveRelease(field: ReleaseField, value: string): Promise<ReleaseMatch | null> {
        if (!RESOLVABLE.has(field) || !value) return null;
        try {
            const url = `${base}/api/v1/measurements/release?field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            return {
                matched: Boolean(data.matched),
                tag: data.tag || undefined,
                url: data.url || undefined,
                releasesUrl: data.releases_url || undefined
            };
        } catch {
            return null;
        }
    };
}
