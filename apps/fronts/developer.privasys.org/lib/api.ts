import type { App, CreateAppRequest, ReviewRequest, DeploymentLog, BuildJob, Enclave, CreateEnclaveRequest } from './types';

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
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError(body.error || `API error ${res.status}`, res.status);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

export function listApps(token: string): Promise<App[]> {
    return request<App[]>('/api/v1/apps', token);
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

export function adminEnclaveHealth(token: string): Promise<{ status: string; error?: string }> {
    return request<{ status: string; error?: string }>('/api/v1/admin/enclave/health', token);
}

export function adminListEnclaveApps(token: string): Promise<unknown> {
    return request<unknown>('/api/v1/admin/enclave/apps', token);
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
// User info
// ---------------------------------------------------------------------------

export interface UserInfo {
    sub: string;
    email: string;
    name: string;
    roles: string[];
    is_admin: boolean;
}

export function getUserInfo(token: string): Promise<UserInfo> {
    return request<UserInfo>('/api/v1/me', token);
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
