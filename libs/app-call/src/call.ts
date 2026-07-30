// One sealed call to an app function, for either runtime.
//
// Container apps speak their own HTTP: the manifest maps a tool to a path and
// the body is the tool's JSON. WASM apps are Connect-style RPC, and the mini
// runtime's HTTP shim maps `POST /rpc/<app>/<fn>` onto a `connect_call`
// envelope, lifting `app_auth` out of the body (enclave-os-mini
// enclave/src/ratls/server.rs). Both arrive through the sealed relay already
// unwrapped, so the enclave's own gates see the real method, path, headers and
// body — which is exactly why the mgmt proxy adds nothing but a middleman.

import type { SealedResponse, SealedSession } from '@privasys/auth';
import { applyDefaults, endpointFor, schemaFor, type AppManifest } from './manifest';

const decoder = new TextDecoder();

/** An app call that failed, carrying the enclave's own status and message. */
export class AppCallError extends Error {
    status: number;
    /** Set when the enclave refused for want of price consent (402). */
    priceCredits?: number;
    constructor(status: number, message: string, priceCredits?: number) {
        super(message);
        this.name = 'AppCallError';
        this.status = status;
        this.priceCredits = priceCredits;
    }
}

export interface AppCallOptions {
    session: SealedSession;
    /** 'container' | 'wasm' — decides the inner request shape. */
    appType: string;
    /** App name, needed for the wasm /rpc/<app>/<fn> path. */
    appName: string;
    tool: string;
    params?: unknown;
    manifest?: AppManifest | null;
    /**
     * The caller's platform access token. Sent as the INNER Authorization
     * header (and X-App-Auth, which apps written against the old proxy read),
     * so the enclave's configure gate can check the caller's own
     * `privasys-platform:app:<id>:owner|admin` role. The relay's
     * X-Privasys-Sub asserts a subject but carries no roles, so the inner
     * bearer is the authority. Omit for an anonymous call to a public tool.
     */
    bearer?: string;
    /**
     * Literal price consent, e.g. "5000 credits". The attested runtime refuses
     * a priced call unless this matches the measured price exactly, which is
     * what makes the charge provably informed.
     */
    billingApproved?: string;
    timeoutMs?: number;
    /** Observe the enclave's status and billing headers. */
    onResponse?: (_status: number, _headers: Record<string, string>) => void;
}

/** A sealed request can otherwise hang forever: the iframe RPC has no deadline. */
export const DEFAULT_TIMEOUT_MS = 60_000;

/** Sealed request with a hard deadline. */
async function timed(
    session: SealedSession,
    method: string,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    ms: number
): Promise<SealedResponse> {
    return new Promise<SealedResponse>((resolve, reject) => {
        const t = setTimeout(
            () => reject(new AppCallError(0, 'The enclave is not responding. It may be restarting or unreachable.')),
            ms
        );
        session.request(method, path, body, { headers }).then(
            r => { clearTimeout(t); resolve(r); },
            (e: unknown) => { clearTimeout(t); reject(e instanceof Error ? e : new Error(String(e))); }
        );
    });
}

/** "…charges 5000 credits…" — anchored so a caller's wrong figure is not read back. */
const PRICE_RE = /charges (\d+) credits/;

function textOf(res: SealedResponse): string {
    return res.body && res.body.byteLength ? decoder.decode(res.body) : '';
}

/**
 * Call one app function over the sealed session and return its parsed JSON.
 *
 * Throws {@link AppCallError} on a non-2xx or on a runtime-level error
 * envelope, so a WASM error surfaces like an HTTP one instead of resolving as
 * a successful call with an error inside.
 */
export async function callApp(opts: AppCallOptions): Promise<unknown> {
    const {
        session, appType, appName, tool, manifest, bearer, billingApproved,
        timeoutMs = DEFAULT_TIMEOUT_MS, onResponse
    } = opts;

    // Manifest defaults are applied here, client-side, because the enclave
    // takes the body verbatim: an omitted field with a declared default must
    // still arrive set (confidential-ai shipped a silently-wrong context
    // window when nothing did this).
    const body = applyDefaults(opts.params ?? {}, schemaFor(manifest, tool));

    const headers: Record<string, string> = {};
    if (bearer) {
        headers['Authorization'] = `Bearer ${bearer}`;
        headers['X-App-Auth'] = bearer;
    }
    if (billingApproved) headers['X-Billing-Approved'] = billingApproved;

    let path: string;
    let payload: unknown;
    if (appType === 'wasm') {
        path = `/rpc/${encodeURIComponent(appName)}/${encodeURIComponent(tool)}`;
        // The shim lifts `app_auth` out of the body; params are whatever
        // remains. Consent also rides the body, since the shim builds the
        // envelope from it (see the header too — belt and braces while
        // runtimes catch up).
        payload = {
            ...(body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : { value: body }),
            ...(bearer ? { app_auth: bearer } : {}),
            ...(billingApproved ? { billing_approved: billingApproved } : {})
        };
    } else {
        path = endpointFor(manifest, tool);
        payload = body;
    }

    let res = await timed(session, 'POST', path, payload, headers, timeoutMs);
    // Some container endpoints only answer GET (e.g. a status probe). The proxy
    // fell back the same way; keep the behaviour so migrated callers see no
    // change.
    if (res.status === 405) {
        res = await timed(session, 'GET', path, undefined, headers, timeoutMs);
    }

    const hdrs: Record<string, string> = {};
    const raw = (res as unknown as { headers?: Record<string, string> }).headers;
    if (raw) Object.assign(hdrs, raw);
    onResponse?.(typeof res.status === 'number' ? res.status : 0, hdrs);

    const text = textOf(res);
    if (typeof res.status !== 'number') {
        throw new AppCallError(0, 'The sealed channel is not ready yet. Retrying usually fixes this.');
    }
    let parsed: unknown = null;
    if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = text; }
    }

    if (res.status < 200 || res.status >= 300) {
        const msg = errorMessage(parsed) ?? `HTTP ${res.status}`;
        throw new AppCallError(res.status, msg, priceFrom(msg));
    }

    // WASM replies carry their own status inside the envelope: an error there
    // is a failed call, not a 200.
    const env = parsed as { status?: string; message?: string } | null;
    if (env && typeof env === 'object' && env.status === 'error') {
        const msg = env.message ?? 'call failed';
        const credits = priceFrom(msg);
        throw new AppCallError(credits !== undefined ? 402 : 400, msg, credits);
    }
    return parsed;
}

function errorMessage(parsed: unknown): string | undefined {
    if (!parsed) return undefined;
    if (typeof parsed === 'string') return parsed;
    const o = parsed as Record<string, unknown>;
    for (const k of ['error', 'message', 'detail']) {
        if (typeof o[k] === 'string' && o[k]) return o[k] as string;
    }
    return undefined;
}

function priceFrom(msg: string): number | undefined {
    const m = PRICE_RE.exec(msg);
    return m ? Number(m[1]) : undefined;
}
