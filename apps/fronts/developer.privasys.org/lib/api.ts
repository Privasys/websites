import type { App, CreateAppRequest, ReviewRequest, DeploymentLog, BuildJob, Enclave, CreateEnclaveRequest, AppVersion, AppDeployment, AttestationResult, TeeType } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
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
        if (res.status === 401 && typeof window !== 'undefined') {
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

export function adminDeployVersion(token: string, appId: string, versionId: string, enclaveId?: string, enclaveHost?: string, enclavePort?: number): Promise<AppDeployment> {
    return request<AppDeployment>(`/api/v1/admin/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}/deploy`, token, {
        method: 'POST',
        body: JSON.stringify({ enclave_id: enclaveId, enclave_host: enclaveHost, enclave_port: enclavePort })
    });
}

// ---------------------------------------------------------------------------
// Deployments API
// ---------------------------------------------------------------------------

export function listDeployments(token: string, appId: string): Promise<AppDeployment[]> {
    return request<AppDeployment[]>(`/api/v1/apps/${encodeURIComponent(appId)}/deployments`, token);
}

export function deployVersion(token: string, appId: string, versionId: string, enclaveId: string, runtimeEnv?: Record<string, string>): Promise<AppDeployment> {
    return request<AppDeployment>(`/api/v1/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}/deploy`, token, {
        method: 'POST',
        body: JSON.stringify({ enclave_id: enclaveId, runtime_env: runtimeEnv })
    });
}

export function stopDeployment(token: string, appId: string, deploymentId: string): Promise<AppDeployment> {
    return request<AppDeployment>(`/api/v1/apps/${encodeURIComponent(appId)}/deployments/${encodeURIComponent(deploymentId)}/stop`, token, {
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

export function adminStopDeployment(token: string, appId: string, deploymentId: string): Promise<AppDeployment> {
    return request<AppDeployment>(`/api/v1/admin/apps/${encodeURIComponent(appId)}/deployments/${encodeURIComponent(deploymentId)}/stop`, token, {
        method: 'POST',
        body: JSON.stringify({})
    });
}
