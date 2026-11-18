// The platform monitor, as the portal's Status tab uses it.
//
// The monitor is an app on the platform like any other, so the portal
// talks to it over a sealed session opened to its host, with the
// signed-in person's platform token. The monitor reads the person's role
// on the app from that token (owner, admin, support tiers), so the portal
// decides nothing about who may see or change what.

import { getEnclaveSealedSession, dropEnclaveAuthFrame } from './enclave-session';

const PROD_PORTAL_HOST = 'developer.privasys.org';
const PROD_MONITOR_HOST = 'platform-monitoring.apps.privasys.org';
const TEST_MONITOR_HOST = 'platform-monitoring.apps.test.privasys.org';
const PROD_STATUS_HOST = 'status.privasys.org';

/** The monitor's host: NEXT_PUBLIC_MONITOR_HOST, else by the portal's own host. */
export function getMonitorHost(): string {
    const configured = process.env.NEXT_PUBLIC_MONITOR_HOST?.trim();
    if (configured) return configured;
    if (typeof window !== 'undefined' && window.location.hostname === PROD_PORTAL_HOST) {
        return PROD_MONITOR_HOST;
    }
    return TEST_MONITOR_HOST;
}

/** Where an app's public status page is, once its team makes it public. */
export function publicStatusPageUrl(appName: string): string {
    const host = getMonitorHost() === PROD_MONITOR_HOST ? PROD_STATUS_HOST : getMonitorHost();
    return `https://${host}/apps/${encodeURIComponent(appName)}/`;
}

export class MonitorError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

const decoder = new TextDecoder();

async function monitorCall<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
    const host = getMonitorHost();
    let session;
    try {
        session = await getEnclaveSealedSession({ appHost: host });
    } catch (e) {
        throw new MonitorError(0, e instanceof Error ? e.message : 'The monitor could not be reached.');
    }
    let res;
    try {
        res = await session.request(method, path, body, {
            headers: { 'Authorization': `Bearer ${token}`, 'X-App-Auth': token }
        });
    } catch (e) {
        // A broken or expired session is rebuilt on the next call.
        dropEnclaveAuthFrame(host);
        throw new MonitorError(0, e instanceof Error ? e.message : 'The monitor did not answer.');
    }
    const text = res.body && res.body.byteLength ? decoder.decode(res.body) : '';
    let parsed: unknown = null;
    if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = text; }
    }
    if (typeof res.status !== 'number' || res.status < 200 || res.status >= 300) {
        const err = (parsed as { error?: string; detail?: string } | null);
        const msg = err && typeof err === 'object' && err.error
            ? (err.detail ? `${err.error}: ${err.detail}` : err.error)
            : `HTTP ${res.status}`;
        throw new MonitorError(typeof res.status === 'number' ? res.status : 0, msg);
    }
    return parsed as T;
}

const appBase = (appId: string) => `/api/v1/apps/${encodeURIComponent(appId)}`;

export type Indicator = 'none' | 'minor' | 'major' | 'critical' | 'maintenance';

export interface MonitorServiceSummary {
    id: string;
    name: string;
    slug: string;
    indicator: Indicator;
    headline: string;
    components: number;
    open_incidents: number;
}

export interface MonitorStatus {
    state: string;
    services?: MonitorServiceSummary[];
    last_checkpoint?: { root?: string; version?: number; issued_at?: number };
}

export interface MonitorService {
    id: string;
    name: string;
    slug: string;
    description?: string;
    timezone: string;
    visibility: 'public' | 'private';
    [key: string]: unknown;
}

export interface MonitorIncident {
    id: string;
    service_id: string;
    title: string;
    impact: string;
    status: string;
    opened_at: number;
    resolved_at?: number;
    auto: boolean;
}

export interface MonitorMe {
    acting: string;
    roles: string[];
    permissions: string[];
}

/** Turn monitoring on for an app (its owners and admins). */
export function enableMonitoring(token: string, appId: string): Promise<{ app: string; created: boolean }> {
    return monitorCall(token, 'POST', `${appBase(appId)}/enable`);
}

export function getMonitorStatus(token: string, appId: string): Promise<MonitorStatus> {
    return monitorCall(token, 'GET', `${appBase(appId)}/status`);
}

export function getMonitorMe(token: string, appId: string): Promise<MonitorMe> {
    return monitorCall(token, 'GET', `${appBase(appId)}/me`);
}

export async function listMonitorServices(token: string, appId: string): Promise<MonitorService[]> {
    const r = await monitorCall<{ services: MonitorService[] }>(token, 'GET', `${appBase(appId)}/services`);
    return r.services ?? [];
}

export async function listMonitorIncidents(token: string, appId: string, limit = 20): Promise<MonitorIncident[]> {
    const r = await monitorCall<{ incidents: MonitorIncident[] }>(token, 'GET', `${appBase(appId)}/incidents?limit=${limit}`);
    return r.incidents ?? [];
}

/** Make a service's status page public or private. Recorded in the app's ledger. */
export function setServiceVisibility(token: string, appId: string, service: MonitorService, visibility: 'public' | 'private'): Promise<unknown> {
    const message = visibility === 'public' ? 'Publish the status page' : 'Make the status page private';
    return monitorCall(token, 'POST', `${appBase(appId)}/services`, { ...service, visibility, message });
}
