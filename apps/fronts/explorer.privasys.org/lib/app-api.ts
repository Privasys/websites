// Minimal fetch wrapper for the management-service app API used by the
// API Testing tab (schema discovery + RPC invocation). Ported from the legacy
// explorer.js apiFetch: the FIDO2 session token, when present, is sent as
// `X-App-Auth` (the public /call path); otherwise the request is unauthenticated
// (the JWT-gated /rpc path, exercised only when a management token is supplied).

export interface AppFetchOptions {
    method?: string;
    body?: string;
    sessionToken?: string;
    headers?: Record<string, string>;
    /** Called with the HTTP status and response headers before the body is
     *  parsed — lets the API Testing tab surface X-Billing-* and friends. */
    onResponse?: (_status: number, _headers: Headers) => void;
}

export async function appFetch<T = unknown>(baseUrl: string, path: string, opts: AppFetchOptions = {}): Promise<T | null> {
    const url = baseUrl.replace(/\/+$/, '') + path;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (opts.sessionToken) headers['X-App-Auth'] = opts.sessionToken;
    if (opts.headers) Object.assign(headers, opts.headers);
    const res = await fetch(url, { method: opts.method, body: opts.body, headers });
    opts.onResponse?.(res.status, res.headers);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string; message?: string };
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json() as Promise<T>;
}

export function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let u = -1;
    let v = n;
    do { v /= 1024; u++; } while (v >= 1024 && u < units.length - 1);
    return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[u]}`;
}
