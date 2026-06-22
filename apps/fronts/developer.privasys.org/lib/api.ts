import type { App, CreateAppRequest, ReviewRequest, DeploymentLog, BuildJob, Enclave, CreateEnclaveRequest, AppVersion, AppDeployment, AttestationResult, TeeType, CachedImage } from './types';
import { getApiBaseUrl } from './api-base-url';

const API_URL = getApiBaseUrl();

class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export function isApiStatus(error: unknown, status: number): boolean {
    return error instanceof ApiError && error.status === status;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...init?.headers
        }
    });
    if (!res.ok) {
        if (res.status === 401) {
            window.dispatchEvent(new Event('auth:expired'));
        }
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError(body.error || `API error ${res.status}`, res.status);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

export function listApps(token: string): Promise<App[]> {
    return request<App[]>('/api/v1/apps', token);
}

export function listEnclaves(token: string): Promise<Enclave[]> {
    return request<Enclave[]>('/api/v1/enclaves', token);
}

export function listCachedImages(token: string): Promise<CachedImage[]> {
    return request<CachedImage[]>('/api/v1/cached-images', token);
}

export function listCompatibleEnclaves(token: string, appId: string): Promise<Enclave[]> {
    return request<Enclave[]>(`/api/v1/apps/${encodeURIComponent(appId)}/compatible-enclaves`, token);
}

export function getApp(token: string, id: string): Promise<App> {
    return request<App>(`/api/v1/apps/${encodeURIComponent(id)}`, token);
}

export function createApp(token: string, body: CreateAppRequest): Promise<App> {
    return request<App>('/api/v1/apps', token, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

export function checkAppName(token: string, name: string): Promise<{ available: boolean; reason?: string }> {
    return request<{ available: boolean; reason?: string }>(`/api/v1/apps/check-name?name=${encodeURIComponent(name)}`, token);
}

export function detectAppType(token: string, commitUrl: string): Promise<{ app_type: string; owner_repo: string; commit_sha: string }> {
    return request<{ app_type: string; owner_repo: string; commit_sha: string }>(`/api/v1/detect-app-type?commit_url=${encodeURIComponent(commitUrl)}`, token);
}

export function deleteApp(token: string, id: string): Promise<void> {
    return request<void>(`/api/v1/apps/${encodeURIComponent(id)}`, token, {
        method: 'DELETE'
    });
}

export async function uploadCwasm(token: string, appId: string, file: File): Promise<App> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/api/v1/apps/${encodeURIComponent(appId)}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError(body.error || `Upload error ${res.status}`, res.status);
    }
    return res.json();
}

// ---------------------------------------------------------------------------
// Admin API (manager role required)
// ---------------------------------------------------------------------------

export function adminListApps(token: string, status?: string): Promise<App[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<App[]>(`/api/v1/admin/apps${qs}`, token);
}

export function adminGetApp(token: string, id: string): Promise<App> {
    return request<App>(`/api/v1/admin/apps/${encodeURIComponent(id)}`, token);
}

export function adminReviewApp(token: string, id: string, body: ReviewRequest): Promise<App> {
    return request<App>(`/api/v1/admin/apps/${encodeURIComponent(id)}/review`, token, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

export function adminDeployApp(token: string, id: string): Promise<App> {
    return request<App>(`/api/v1/admin/apps/${encodeURIComponent(id)}/deploy`, token, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export function adminUndeployApp(token: string, id: string): Promise<App> {
    return request<App>(`/api/v1/admin/apps/${encodeURIComponent(id)}/undeploy`, token, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export function adminGetDeploymentLogs(token: string, id: string): Promise<DeploymentLog[]> {
    return request<DeploymentLog[]>(`/api/v1/admin/apps/${encodeURIComponent(id)}/logs`, token);
}

export function adminEnclaveHealth(token: string, host: string, port: number, teeType: TeeType): Promise<{ status: string; error?: string }> {
    const qs = `host=${encodeURIComponent(host)}&port=${port}&tee_type=${teeType}`;
    return request<{ status: string; error?: string }>(`/api/v1/admin/enclave/health?${qs}`, token);
}

export function adminListEnclaveApps(token: string, host: string, port: number, teeType: TeeType): Promise<unknown> {
    const qs = `host=${encodeURIComponent(host)}&port=${port}&tee_type=${teeType}`;
    return request<unknown>(`/api/v1/admin/enclave/apps?${qs}`, token);
}

export function adminInspectEnclave(token: string, host: string, port: number, teeType: TeeType): Promise<{ mr_enclave?: string; mr_signer?: string; quote_type?: string }> {
    const qs = `host=${encodeURIComponent(host)}&port=${port}&tee_type=${teeType}`;
    return request<{ mr_enclave?: string; mr_signer?: string; quote_type?: string }>(`/api/v1/admin/enclave/inspect?${qs}`, token);
}

export function adminTriggerBuild(token: string, id: string): Promise<BuildJob> {
    return request<BuildJob>(`/api/v1/admin/apps/${encodeURIComponent(id)}/build`, token, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export function adminListBuilds(token: string, id: string): Promise<BuildJob[]> {
    return request<BuildJob[]>(`/api/v1/admin/apps/${encodeURIComponent(id)}/builds`, token);
}

export function listBuilds(token: string, id: string): Promise<BuildJob[]> {
    return request<BuildJob[]>(`/api/v1/apps/${encodeURIComponent(id)}/builds`, token);
}

export function retryBuild(token: string, id: string): Promise<BuildJob> {
    return request<BuildJob>(`/api/v1/apps/${encodeURIComponent(id)}/builds/retry`, token, {
        method: 'POST'
    });
}

// ---------------------------------------------------------------------------
// Attestation & Enclave API (app must be deployed)
// ---------------------------------------------------------------------------

export function attestApp(token: string, appId: string, challenge?: string): Promise<AttestationResult> {
    const qs = challenge ? `?challenge=${encodeURIComponent(challenge)}` : '';
    return request<AttestationResult>(`/api/v1/apps/${encodeURIComponent(appId)}/attest${qs}`, token);
}

export interface QuoteVerifyResult {
    success: boolean;
    status: string;
    teeType?: string;
    mrenclave?: string;
    mrsigner?: string;
    mrtd?: string;
    isvProdId?: number;
    isvSvn?: number;
    tcbDate?: string;
    advisoryIds?: string[];
    message?: string;
    error?: string;
}

export function verifyQuote(token: string, quoteBase64: string): Promise<QuoteVerifyResult> {
    return request<QuoteVerifyResult>('/api/v1/verify-quote', token, {
        method: 'POST',
        body: JSON.stringify({ quote: quoteBase64 })
    });
}

export async function sendToApp(token: string, appId: string, payload: unknown): Promise<unknown> {
    return request<unknown>(`/api/v1/apps/${encodeURIComponent(appId)}/send`, token, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export interface WitType {
    kind: string;
    element?: WitType;
    inner?: WitType;
    ok?: WitType;
    err?: WitType;
    fields?: { name: string; type: WitType }[];
    cases?: { name: string; type?: WitType }[];
    elements?: WitType[];
    names?: string[];
    default?: unknown;
}

export interface ParamSchema {
    name: string;
    type: WitType;
}

export interface FunctionSchema {
    name: string;
    params: ParamSchema[];
    results: ParamSchema[];
}

export interface InterfaceSchema {
    name: string;
    functions: FunctionSchema[];
}

export interface AppSchema {
    name: string;
    hostname: string;
    functions: FunctionSchema[];
    interfaces: InterfaceSchema[];
}

export async function getAppSchema(token: string, appId: string): Promise<AppSchema> {
    const resp = await request<{ status: string; schema: AppSchema }>(`/api/v1/apps/${encodeURIComponent(appId)}/schema`, token);
    if (resp.status !== 'schema') {
        throw new ApiError((resp as unknown as { message?: string }).message || 'Failed to fetch schema', 500);
    }
    return resp.schema;
}

export async function rpcCall(token: string, appId: string, func: string, params: unknown): Promise<unknown> {
    return request<unknown>(`/api/v1/apps/${encodeURIComponent(appId)}/rpc/${encodeURIComponent(func)}`, token, {
        method: 'POST',
        body: JSON.stringify(params)
    });
}

// ---------------------------------------------------------------------------
// MCP tools
// ---------------------------------------------------------------------------

export interface McpTool {
    name: string;
    description?: string;
    inputSchema?: {
        type?: string;
        properties?: Record<string, { type?: string; description?: string }>;
        required?: string[];
    };
}

export interface McpManifest {
    status: string;
    manifest: {
        name: string;
        tools: McpTool[];
    };
}

export function getAppMcp(token: string, appId: string): Promise<McpManifest> {
    return request<McpManifest>(`/api/v1/apps/${encodeURIComponent(appId)}/mcp`, token);
}

// ---------------------------------------------------------------------------
// User info
// ---------------------------------------------------------------------------

export interface UserInfo {
    sub: string;
    email: string;
    name: string;
    display_name: string;
    display_email: string;
    company_name: string;
    company_domain: string;
    is_individual: boolean;
    roles: string[];
    is_admin: boolean;
    account_id?: string;
    account_kind?: 'individual' | 'org';
    account_name?: string;
}

export function getUserInfo(token: string): Promise<UserInfo> {
    return request<UserInfo>('/api/v1/me', token);
}

export function updateProfile(token: string, profile: {
    company_name: string;
    company_domain: string;
    is_individual: boolean;
}): Promise<UserInfo> {
    return request<UserInfo>('/api/v1/me', token, {
        method: 'PUT',
        body: JSON.stringify(profile)
    });
}

// ---------------------------------------------------------------------------
// Platform admin settings (privasys-platform:admin role required)
// ---------------------------------------------------------------------------

export interface SettingEntry {
    key: string;
    value: string;
    masked: boolean;
    updated_by: string;
    updated_at: string;
}

export function adminGetSettings(token: string, group: string): Promise<SettingEntry[]> {
    return request<SettingEntry[]>(`/api/v1/admin/settings/${encodeURIComponent(group)}`, token);
}

export function adminUpdateSettings(token: string, group: string, settings: Record<string, string>): Promise<{ status: string }> {
    return request<{ status: string }>(`/api/v1/admin/settings/${encodeURIComponent(group)}`, token, {
        method: 'PUT',
        body: JSON.stringify({ settings })
    });
}

// ---------------------------------------------------------------------------
// Enclave management (manager role required)
// ---------------------------------------------------------------------------

export function adminListEnclaves(token: string): Promise<Enclave[]> {
    return request<Enclave[]>('/api/v1/admin/enclaves/', token);
}

export function adminGetEnclave(token: string, id: string): Promise<Enclave> {
    return request<Enclave>(`/api/v1/admin/enclaves/${encodeURIComponent(id)}`, token);
}

export function adminCreateEnclave(token: string, body: CreateEnclaveRequest): Promise<Enclave> {
    return request<Enclave>('/api/v1/admin/enclaves/', token, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

export function adminUpdateEnclave(token: string, id: string, body: CreateEnclaveRequest): Promise<Enclave> {
    return request<Enclave>(`/api/v1/admin/enclaves/${encodeURIComponent(id)}`, token, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
}

export function adminDeleteEnclave(token: string, id: string): Promise<void> {
    return request<void>(`/api/v1/admin/enclaves/${encodeURIComponent(id)}`, token, {
        method: 'DELETE'
    });
}

// ---------------------------------------------------------------------------
// Gateway admin (manager role required) — view of the L4 gateway route map
// ---------------------------------------------------------------------------

export interface GatewayRoute {
    sni: string;
    upstream: string;
    attestation_policy?: unknown;
}

export interface GatewayPoller {
    remote_addr: string;
    user_agent: string;
    last_seen_at: string;
    last_version: string;
    last_modified: boolean;
    poll_count: number;
}

export interface GatewayRoutesResponse {
    routes: GatewayRoute[];
    pollers: GatewayPoller[];
}

export function adminGatewayRoutes(token: string): Promise<GatewayRoutesResponse> {
    return request<GatewayRoutesResponse>('/api/v1/admin/gateways/routes', token);
}

// ---------------------------------------------------------------------------
// Versions API
// ---------------------------------------------------------------------------

export function listVersions(token: string, appId: string): Promise<AppVersion[]> {
    return request<AppVersion[]>(`/api/v1/apps/${encodeURIComponent(appId)}/versions`, token);
}

export function getVersion(token: string, appId: string, versionId: string): Promise<AppVersion> {
    return request<AppVersion>(`/api/v1/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}`, token);
}

export function createVersion(token: string, appId: string, commitUrl: string): Promise<AppVersion> {
    return request<AppVersion>(`/api/v1/apps/${encodeURIComponent(appId)}/versions`, token, {
        method: 'POST',
        body: JSON.stringify({ commit_url: commitUrl })
    });
}

export function adminReviewVersion(token: string, appId: string, versionId: string, decision: 'approve' | 'reject'): Promise<AppVersion> {
    return request<AppVersion>(`/api/v1/admin/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}/review`, token, {
        method: 'POST',
        body: JSON.stringify({ decision })
    });
}

export function adminBuildVersion(token: string, appId: string, versionId: string): Promise<BuildJob> {
    return request<BuildJob>(`/api/v1/admin/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}/build`, token, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

// Developer-platform seen user (from management-service seen_users table).
// NOTE: PII (email/name) lives here, NOT in the IdP.
export interface AdminUser {
    sub: string;
    email: string;
    name: string;
    display_name?: string;
    display_email?: string;
    company_name?: string;
    company_domain?: string;
    is_individual: boolean;
    first_seen_at: string;
    app_count: number;
}

export function adminListUsers(token: string): Promise<AdminUser[]> {
    return request<AdminUser[]>('/api/v1/admin/users', token);
}

export function adminDeleteUser(token: string, sub: string): Promise<void> {
    return request<void>(`/api/v1/admin/users/${encodeURIComponent(sub)}`, token, {
        method: 'DELETE'
    });
}

// ---------------------------------------------------------------------------
// Deployments API
// ---------------------------------------------------------------------------

export function listDeployments(token: string, appId: string): Promise<AppDeployment[]> {
    return request<AppDeployment[]>(`/api/v1/apps/${encodeURIComponent(appId)}/deployments`, token);
}

// ---------------------------------------------------------------------------
// Per-app team API (owners)
// ---------------------------------------------------------------------------

export interface AppOwner {
    sub: string;
    email: string;
    name: string;
    added_at: string;
    added_by: string;
}

export interface AppTeam {
    owners: AppOwner[];
    creator_sub: string;
}

export function listAppOwners(token: string, appId: string): Promise<AppTeam> {
    return request<AppTeam>(`/api/v1/apps/${encodeURIComponent(appId)}/owners`, token);
}

export function addAppOwner(token: string, appId: string, owner: { sub: string; email?: string; name?: string }): Promise<AppTeam> {
    return request<AppTeam>(`/api/v1/apps/${encodeURIComponent(appId)}/owners`, token, {
        method: 'POST',
        body: JSON.stringify(owner)
    });
}

export function removeAppOwner(token: string, appId: string, sub: string): Promise<AppTeam> {
    return request<AppTeam>(
        `/api/v1/apps/${encodeURIComponent(appId)}/owners/${encodeURIComponent(sub)}`,
        token,
        { method: 'DELETE' }
    );
}

// ---------------------------------------------------------------------------
// Account & team API (the billing/ownership boundary above apps)
// ---------------------------------------------------------------------------

export type AccountRole = 'admin' | 'billing' | 'member';

export interface Account {
    id: string;
    kind: 'individual' | 'org';
    name: string;
    domain: string;
    owner_sub: string;
    created_at: string;
    updated_at: string;
}

export interface AccountMember {
    sub: string;
    email: string;
    name: string;
    role: AccountRole;
    added_by: string;
    added_at: string;
}

export interface AccountView {
    account: Account;
    role: AccountRole | '';
    members: AccountMember[];
}

export function getAccount(token: string): Promise<AccountView> {
    return request<AccountView>('/api/v1/account', token);
}

export function updateAccount(
    token: string,
    patch: { kind?: 'individual' | 'org'; name?: string; domain?: string }
): Promise<{ account: Account }> {
    return request<{ account: Account }>('/api/v1/account', token, {
        method: 'PATCH',
        body: JSON.stringify(patch)
    });
}

export function listAccountMembers(token: string): Promise<{ members: AccountMember[]; owner_sub: string }> {
    return request<{ members: AccountMember[]; owner_sub: string }>('/api/v1/account/members', token);
}

export function addAccountMember(
    token: string,
    member: { sub: string; email?: string; name?: string; role?: AccountRole }
): Promise<{ members: AccountMember[] }> {
    return request<{ members: AccountMember[] }>('/api/v1/account/members', token, {
        method: 'POST',
        body: JSON.stringify(member)
    });
}

export function updateAccountMember(
    token: string,
    sub: string,
    role: AccountRole
): Promise<{ members: AccountMember[] }> {
    return request<{ members: AccountMember[] }>(
        `/api/v1/account/members/${encodeURIComponent(sub)}`,
        token,
        { method: 'PATCH', body: JSON.stringify({ role }) }
    );
}

export function removeAccountMember(token: string, sub: string): Promise<{ members: AccountMember[] }> {
    return request<{ members: AccountMember[] }>(
        `/api/v1/account/members/${encodeURIComponent(sub)}`,
        token,
        { method: 'DELETE' }
    );
}

// --- Billing (read-only views proxied from the credit-ledger service) ---

export interface BillingBalance {
    account_id: string;
    balance: number;
    frozen: boolean;
    updated_at: string;
}

export interface BillingUsageResource {
    resource: string;
    quantity: number;
    calls: number;
    credits: number;
}

export interface BillingUsage {
    by_resource: BillingUsageResource[];
    total_credits: number;
    since: string;
}

export interface BillingLedgerEntry {
    id: number;
    account_id: string;
    ts: string;
    kind: 'grant' | 'usage' | 'topup' | 'adjustment';
    credits: number;
    reason: string;
    ref: string;
}

export interface BillingLedger {
    entries: BillingLedgerEntry[];
}

// The management-service wraps ledger payloads as {enabled, data?}. When the
// ledger is not configured, enabled is false and data is absent.
interface BillingEnvelope<T> {
    enabled: boolean;
    data?: T;
}

export interface BillingResult<T> {
    enabled: boolean;
    data: T | null;
}

async function billingRequest<T>(path: string, token: string): Promise<BillingResult<T>> {
    const env = await request<BillingEnvelope<T>>(path, token);
    return { enabled: env.enabled, data: env.data ?? null };
}

export function getBillingBalance(token: string): Promise<BillingResult<BillingBalance>> {
    return billingRequest<BillingBalance>('/api/v1/billing/balance', token);
}

export function getBillingUsage(token: string, since?: string): Promise<BillingResult<BillingUsage>> {
    const q = since ? `?since=${encodeURIComponent(since)}` : '';
    return billingRequest<BillingUsage>(`/api/v1/billing/usage${q}`, token);
}

export function getBillingLedger(token: string, limit?: number): Promise<BillingResult<BillingLedger>> {
    const q = limit ? `?limit=${limit}` : '';
    return billingRequest<BillingLedger>(`/api/v1/billing/ledger${q}`, token);
}

// --- Billing (Stripe membership + pre-paid credit deposits) ---

export interface BillingSubscription {
    enabled: boolean;
    subscription_status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    active: boolean;
}

// getBillingSubscription returns the account's membership state. When Stripe is
// not configured the management-service returns {enabled:false} only.
export async function getBillingSubscription(token: string): Promise<BillingSubscription> {
    const res = await request<Partial<BillingSubscription> & { enabled: boolean }>(
        '/api/v1/billing/subscription',
        token
    );
    return {
        enabled: res.enabled,
        subscription_status: res.subscription_status ?? '',
        current_period_end: res.current_period_end ?? null,
        cancel_at_period_end: res.cancel_at_period_end ?? false,
        active: res.active ?? false
    };
}

interface CheckoutResponse {
    enabled: boolean;
    url?: string;
}

// startMembershipCheckout returns a Stripe Checkout URL for the annual
// membership subscription, or null when billing is disabled.
export async function startMembershipCheckout(token: string): Promise<string | null> {
    const res = await request<CheckoutResponse>('/api/v1/billing/checkout/membership', token, {
        method: 'POST'
    });
    return res.url ?? null;
}

// startCreditsCheckout returns a Stripe Checkout URL for a customer-chosen
// pre-paid credit deposit, or null when billing is disabled.
export async function startCreditsCheckout(token: string): Promise<string | null> {
    const res = await request<CheckoutResponse>('/api/v1/billing/checkout/credits', token, {
        method: 'POST'
    });
    return res.url ?? null;
}

// openBillingPortal returns a Stripe Customer Portal URL for managing the
// subscription, payment methods and invoices, or null when billing is disabled.
export async function openBillingPortal(token: string): Promise<string | null> {
    const res = await request<CheckoutResponse>('/api/v1/billing/portal', token, {
        method: 'POST'
    });
    return res.url ?? null;
}

export interface RedeemResponse {
    enabled: boolean;
    code: string;
    credits: number;
    already_redeemed: boolean;
    balance: BillingBalance;
}

/** Redeem a promo code (e.g. WELCOME-JUNE-2026) for free platform credits. */
export async function redeemPromoCode(token: string, code: string): Promise<RedeemResponse> {
    return request<RedeemResponse>('/api/v1/billing/redeem', token, {
        method: 'POST',
        body: JSON.stringify({ code })
    });
}

/**
 * Deploy a built version onto an enclave. The browser POSTs a tiny
 * `{enclave_id}` payload; the management-service service account performs
 * the actual `wasm_load` / `container_load` against the enclave over
 * RA-TLS. The wallet sealed-relay is reserved for runtime API calls
 * (e.g. `@config-api`) that carry user identity / secrets — deploys
 * themselves never touch it.
 */
export function deployDirect(
    token: string,
    appId: string,
    versionId: string,
    enclaveId: string
): Promise<AppDeployment> {
    return request<AppDeployment>(
        `/api/v1/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}/deploy`,
        token,
        { method: 'POST', body: JSON.stringify({ enclave_id: enclaveId }) }
    );
}

export function stopDeployment(token: string, appId: string, deploymentId: string, force = false): Promise<AppDeployment> {
    const qs = force ? '?force=true' : '';
    return request<AppDeployment>(`/api/v1/apps/${encodeURIComponent(appId)}/deployments/${encodeURIComponent(deploymentId)}/stop${qs}`, token, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export interface StoreListingUpdate {
    store_tagline: string;
    store_description: string;
    store_category: string;
    store_icon_url: string;
    store_screenshots: string[];
    store_privacy_url: string;
    store_tos_url: string;
    store_website_url: string;
    store_support_email: string;
    store_keywords: string;
}

export function updateStoreListing(token: string, appId: string, listing: StoreListingUpdate): Promise<App> {
    return request<App>(`/api/v1/apps/${encodeURIComponent(appId)}/store`, token, {
        method: 'PUT',
        body: JSON.stringify(listing)
    });
}

export function updateContainerMcp(token: string, appId: string, mcp: Record<string, unknown>): Promise<App> {
    return request<App>(`/api/v1/apps/${encodeURIComponent(appId)}/mcp`, token, {
        method: 'PATCH',
        body: JSON.stringify(mcp)
    });
}

// Re-run MCP-manifest detection against the app's current source (privasys.json
// in the GitHub commit, or the org.privasys.manifest OCI label on a package
// image) and store the result. Use this to surface AI Tools for a container app
// whose manifest was added (or missed) after it was created.
export function detectContainerMcp(token: string, appId: string): Promise<{ detected: boolean; app: App }> {
    return request<{ detected: boolean; app: App }>(`/api/v1/apps/${encodeURIComponent(appId)}/mcp/detect`, token, {
        method: 'POST'
    });
}

export function adminStopDeployment(token: string, appId: string, deploymentId: string, force = false): Promise<AppDeployment> {
    const qs = force ? '?force=true' : '';
    return request<AppDeployment>(`/api/v1/admin/apps/${encodeURIComponent(appId)}/deployments/${encodeURIComponent(deploymentId)}/stop${qs}`, token, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export function adminDeleteApp(token: string, id: string): Promise<void> {
    return request<void>(`/api/v1/admin/apps/${encodeURIComponent(id)}`, token, {
        method: 'DELETE'
    });
}

// ---------------------------------------------------------------------------
// Fleets and AI Tools (manager role required)
// ---------------------------------------------------------------------------

export function listFleets(token: string): Promise<{ fleets: import('./types').Fleet[] }> {
    return request<{ fleets: import('./types').Fleet[] }>('/api/v1/fleets', token);
}

export function adminCreateFleet(
    token: string, body: import('./types').CreateFleetBody
): Promise<import('./types').Fleet> {
    return request<import('./types').Fleet>('/api/v1/admin/fleets/', token, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

export function adminUpdateFleet(
    token: string, fleetId: string, body: import('./types').UpdateFleetBody
): Promise<import('./types').Fleet> {
    return request<import('./types').Fleet>(
        `/api/v1/admin/fleets/${encodeURIComponent(fleetId)}`,
        token, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
}

export function adminDeleteFleet(token: string, fleetId: string): Promise<void> {
    return request<void>(
        `/api/v1/admin/fleets/${encodeURIComponent(fleetId)}`,
        token, { method: 'DELETE' });
}

export function adminListFleetTools(token: string, fleetId: string): Promise<{ tools: import('./types').AITool[] }> {
    return request<{ tools: import('./types').AITool[] }>(
        `/api/v1/admin/fleets/${encodeURIComponent(fleetId)}/tools`, token);
}

export function adminCreateFleetTool(
    token: string, fleetId: string, body: import('./types').CreateAIToolBody
): Promise<import('./types').AITool> {
    return request<import('./types').AITool>(
        `/api/v1/admin/fleets/${encodeURIComponent(fleetId)}/tools`, token, {
            method: 'POST',
            body: JSON.stringify(body)
        });
}

export function adminUpdateFleetTool(
    token: string, fleetId: string, toolId: string,
    body: import('./types').UpdateAIToolBody
): Promise<import('./types').AITool> {
    return request<import('./types').AITool>(
        `/api/v1/admin/fleets/${encodeURIComponent(fleetId)}/tools/${encodeURIComponent(toolId)}`,
        token, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
}

export function adminDeleteFleetTool(
    token: string, fleetId: string, toolId: string
): Promise<void> {
    return request<void>(
        `/api/v1/admin/fleets/${encodeURIComponent(fleetId)}/tools/${encodeURIComponent(toolId)}`,
        token, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Vault directory (constellations + member vaults) — manager role required
// ---------------------------------------------------------------------------

type VC = import('./types').VaultConstellation;
type VaultRow = import('./types').Vault;

export function listVaultConstellations(token: string): Promise<{ constellations: VC[] }> {
    return request<{ constellations: VC[] }>('/api/v1/admin/vault-constellations', token);
}

export function getVaultConstellation(token: string, id: string): Promise<VC> {
    return request<VC>(`/api/v1/admin/vault-constellations/${encodeURIComponent(id)}`, token);
}

export function adminCreateConstellation(
    token: string, body: import('./types').CreateConstellationBody
): Promise<VC> {
    return request<VC>('/api/v1/admin/vault-constellations', token, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

export function adminUpdateConstellation(
    token: string, id: string, body: import('./types').UpdateConstellationBody
): Promise<VC> {
    return request<VC>(`/api/v1/admin/vault-constellations/${encodeURIComponent(id)}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body)
    });
}

export function adminDeleteConstellation(token: string, id: string): Promise<void> {
    return request<void>(`/api/v1/admin/vault-constellations/${encodeURIComponent(id)}`, token, {
        method: 'DELETE'
    });
}

export function adminActivateConstellation(token: string, id: string): Promise<VC> {
    return request<VC>(`/api/v1/admin/vault-constellations/${encodeURIComponent(id)}/activate`, token, {
        method: 'POST'
    });
}

export function adminCheckConstellation(token: string, id: string): Promise<{ vaults: VaultRow[] }> {
    return request<{ vaults: VaultRow[] }>(
        `/api/v1/admin/vault-constellations/${encodeURIComponent(id)}/check`, token, { method: 'POST' });
}

export function listVaults(token: string, constellationId: string): Promise<{ vaults: VaultRow[] }> {
    return request<{ vaults: VaultRow[] }>(
        `/api/v1/admin/vault-constellations/${encodeURIComponent(constellationId)}/vaults`, token);
}

export function adminCreateVault(
    token: string, constellationId: string, body: import('./types').CreateVaultBody
): Promise<VaultRow> {
    return request<VaultRow>(
        `/api/v1/admin/vault-constellations/${encodeURIComponent(constellationId)}/vaults`, token, {
            method: 'POST',
            body: JSON.stringify(body)
        });
}

export function adminUpdateVault(
    token: string, constellationId: string, vaultId: string, body: import('./types').UpdateVaultBody
): Promise<VaultRow> {
    return request<VaultRow>(
        `/api/v1/admin/vault-constellations/${encodeURIComponent(constellationId)}/vaults/${encodeURIComponent(vaultId)}`,
        token, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
}

export function adminDeleteVault(token: string, constellationId: string, vaultId: string): Promise<void> {
    return request<void>(
        `/api/v1/admin/vault-constellations/${encodeURIComponent(constellationId)}/vaults/${encodeURIComponent(vaultId)}`,
        token, { method: 'DELETE' });
}

export function adminCheckVault(token: string, constellationId: string, vaultId: string): Promise<VaultRow> {
    return request<VaultRow>(
        `/api/v1/admin/vault-constellations/${encodeURIComponent(constellationId)}/vaults/${encodeURIComponent(vaultId)}/check`,
        token, { method: 'POST' });
}
