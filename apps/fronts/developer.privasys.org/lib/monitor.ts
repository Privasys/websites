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
export function publicStatusPageUrl(appName: string, accountSlug?: string): string {
    const host = getMonitorHost() === PROD_MONITOR_HOST ? PROD_STATUS_HOST : getMonitorHost();
    const path = accountSlug ? `@/${accountSlug}/${encodeURIComponent(appName)}` : `apps/${encodeURIComponent(appName)}`;
    return `https://${host}/${path}/`;
}

/** An account's status and support home pages, under its short name. */
export function accountPagesUrls(accountSlug: string): { status: string; support: string } {
    const prod = getMonitorHost() === PROD_MONITOR_HOST;
    const host = prod ? PROD_STATUS_HOST : getMonitorHost();
    return {
        status: `https://${host}/@/${accountSlug}/`,
        support: prod ? `https://support.privasys.org/@/${accountSlug}/` : `https://${host}/support/@${accountSlug}/`
    };
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

// --- On-call ---

export interface WeeklyWindow { days: number[]; from: string; to: string }
export interface AwayRange { from: string; to: string }

export interface AlertPreference {
    sub?: string;
    wallet: boolean;
    email?: string;
    when: 'always' | 'on_call' | 'schedule';
    weekly?: WeeklyWindow[];
    timezone?: string;
    away?: AwayRange[];
    updated_at?: number;
}

export interface OnCallPlan {
    rotation?: string[];
    period_days?: number;
    start_at?: number;
    overrides?: { sub: string; from: number; to: number }[];
    ack_minutes?: number;
}

export interface OnCallPage {
    id: string;
    component: string;
    state: 'open' | 'taken' | 'resolved' | 'exhausted';
    opened_at: number;
    taken_by?: string;
    history?: { at: number; what: string; sub?: string; level: number; detail?: string }[];
}

export interface OnCallOverview {
    plan: OnCallPlan;
    on_call: string;
    me: AlertPreference;
    sub: string;
    can_manage: boolean;
    pages?: OnCallPage[];
    team?: { sub: string; name?: string; role: string }[];
    team_error?: string;
    /** The plan the app runs on: its account's when it has no rota of its own. */
    effective_plan?: OnCallPlan;
    /** The app has no rota of its own and runs on its account's. */
    inherits_account?: boolean;
}

// --- The account's rota, for every app of the account without its own ---

const accountOnCall = (accountId: string) => `/api/v1/accounts/${encodeURIComponent(accountId)}/oncall`;

export function getAccountOnCall(token: string, accountId: string): Promise<OnCallOverview> {
    return monitorCall(token, 'GET', accountOnCall(accountId));
}

export function saveMyAccountAlerts(token: string, accountId: string, pref: AlertPreference): Promise<unknown> {
    return monitorCall(token, 'POST', `${accountOnCall(accountId)}/me`, pref);
}

export function forgetMyAccountAlerts(token: string, accountId: string): Promise<unknown> {
    return monitorCall(token, 'DELETE', `${accountOnCall(accountId)}/me`);
}

export function saveAccountOnCallPlan(token: string, accountId: string, plan: OnCallPlan): Promise<unknown> {
    return monitorCall(token, 'POST', `${accountOnCall(accountId)}/plan`, plan);
}

export function getOnCall(token: string, appId: string): Promise<OnCallOverview> {
    return monitorCall(token, 'GET', `${appBase(appId)}/oncall`);
}

export function saveMyAlerts(token: string, appId: string, pref: AlertPreference): Promise<unknown> {
    return monitorCall(token, 'POST', `${appBase(appId)}/oncall/me`, pref);
}

export function forgetMyAlerts(token: string, appId: string): Promise<unknown> {
    return monitorCall(token, 'DELETE', `${appBase(appId)}/oncall/me`);
}

export function saveOnCallPlan(token: string, appId: string, plan: OnCallPlan): Promise<unknown> {
    return monitorCall(token, 'POST', `${appBase(appId)}/oncall/plan`, plan);
}

export async function sendTestAlert(token: string, appId: string): Promise<Record<string, string>> {
    const r = await monitorCall<{ results: Record<string, string> }>(token, 'POST', `${appBase(appId)}/oncall/test`, {});
    return r.results ?? {};
}

export function takePage(token: string, appId: string, pageId: string): Promise<unknown> {
    return monitorCall(token, 'POST', `${appBase(appId)}/oncall/pages/${encodeURIComponent(pageId)}/take`, {});
}

// --- Support desk ---

export interface TicketComment {
    id: number;
    author: string;
    author_name?: string;
    team: boolean;
    internal?: boolean;
    body: string;
    at: number;
}

export interface SupportTicket {
    number: number;
    subject: string;
    body: string;
    status: string;
    priority: string;
    category?: string;
    requester: string;
    requester_name?: string;
    assignee?: string;
    comments?: TicketComment[];
    events?: { at: number; actor?: string; what: string; detail?: string }[];
    created_at: number;
    updated_at: number;
    first_response_at?: number;
}

export interface TicketDue {
    first_response_by: number;
    resolution_by: number;
    first_response_breached: boolean;
    resolution_breached: boolean;
}

export interface TicketRow { ticket: SupportTicket; comments: number; due?: TicketDue }
export interface TicketDetail { ticket: SupportTicket; due?: TicketDue }

export interface SupportSettings {
    intake: 'off' | 'team' | 'public';
    categories?: string[];
    tickets_per_hour: number;
    tickets_per_day: number;
    comments_per_hour: number;
    targets: Record<string, { first_response_minutes: number; resolution_minutes: number }>;
}

export interface TicketChange {
    status?: string;
    priority?: string;
    category?: string;
    assignee?: string;
}

export async function listTickets(token: string, appId: string): Promise<TicketRow[]> {
    const r = await monitorCall<{ tickets: TicketRow[] }>(token, 'GET', `${appBase(appId)}/tickets`);
    return r.tickets ?? [];
}

export function getTicket(token: string, appId: string, n: number): Promise<TicketDetail> {
    return monitorCall(token, 'GET', `${appBase(appId)}/tickets/${n}`);
}

export function commentTicket(token: string, appId: string, n: number, body: string, internal: boolean): Promise<TicketDetail> {
    return monitorCall(token, 'POST', `${appBase(appId)}/tickets/${n}/comments`, { body, internal });
}

export function updateTicket(token: string, appId: string, n: number, change: TicketChange): Promise<TicketDetail> {
    return monitorCall(token, 'POST', `${appBase(appId)}/tickets/${n}/update`, change);
}

export async function deleteTicket(token: string, appId: string, n: number): Promise<void> {
    await monitorCall(token, 'DELETE', `${appBase(appId)}/tickets/${n}`);
}

export interface AppSupportSettings {
    /** What the desk runs on: the app's own settings, else its account's. */
    settings: SupportSettings;
    /** The app's team set settings of its own. */
    own?: boolean;
    /** The desk runs on its account's settings. */
    inherits_account?: boolean;
    can_manage: boolean;
    can_respond: boolean;
}

export function getSupportSettings(token: string, appId: string): Promise<AppSupportSettings> {
    return monitorCall(token, 'GET', `${appBase(appId)}/support/settings`);
}

export function saveSupportSettings(token: string, appId: string, settings: SupportSettings): Promise<unknown> {
    return monitorCall(token, 'POST', `${appBase(appId)}/support/settings`, settings);
}

/** Forgets the app's own support settings: it runs on its account's again. */
export function clearOwnSupportSettings(token: string, appId: string): Promise<unknown> {
    return monitorCall(token, 'DELETE', `${appBase(appId)}/support/settings`);
}

// --- The account's support settings, for every app without its own ---

const accountSupport = (accountId: string) => `/api/v1/accounts/${encodeURIComponent(accountId)}/support/settings`;

export function getAccountSupportSettings(token: string, accountId: string): Promise<{ settings: SupportSettings; set: boolean; can_manage: boolean }> {
    return monitorCall(token, 'GET', accountSupport(accountId));
}

export function saveAccountSupportSettings(token: string, accountId: string, settings: SupportSettings): Promise<unknown> {
    return monitorCall(token, 'POST', accountSupport(accountId), settings);
}

/**
 * Asks the monitor to read the platform's app list again now, so a change
 * to an app's listing, publication or its account's short name shows on
 * the public pages within seconds. Best effort: the monitor reads the list
 * every five minutes anyway.
 */
export async function refreshListing(token: string, appId: string): Promise<void> {
    try {
        await monitorCall(token, 'POST', `${appBase(appId)}/refresh-listing`);
    } catch {
        // The next scheduled read catches up.
    }
}
