export interface App {
    id: string;
    name: string;
    display_name: string;
    description: string;
    owner_sub: string;
    owner_email: string;
    owner_name: string;
    source_type: string;
    commit_url?: string;
    github_commit?: string;
    gpg_key_id?: string;
    gpg_verified: boolean;
    cwasm_path?: string;
    cwasm_hash?: string;
    cwasm_size?: number;
    status: string;
    review_note?: string;
    reviewer_sub?: string;
    reviewed_at?: string;
    hostname?: string;
    enclave_host?: string;
    enclave_port?: number;
    deployed_at?: string;
    custom_domain?: string;
    domain_verified: boolean;
    current_build_id?: string;
    enclave_id?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateAppRequest {
    name: string;
    display_name?: string;
    description?: string;
    source_type: 'upload' | 'github';
    commit_url?: string;
}

export interface ReviewRequest {
    decision: 'approve' | 'reject';
    note?: string;
}

export interface DeploymentLog {
    id: string;
    app_id: string;
    action: string;
    status: string;
    details?: string;
    initiated_by: string;
    enclave_host?: string;
    enclave_port?: number;
    created_at: string;
}

export interface BuildJob {
    id: string;
    app_id: string;
    commit_url: string;
    github_commit: string;
    status: 'pending' | 'dispatched' | 'running' | 'success' | 'failed' | 'cancelled';
    run_id?: number;
    run_url?: string;
    error_message?: string;
    cwasm_url?: string;
    started_at?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
}

export type AppStatus =
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'building'
    | 'deployed'
    | 'undeployed'
    | 'failed';

export const STATUS_LABELS: Record<AppStatus, string> = {
    submitted: 'Submitted',
    under_review: 'Under review',
    approved: 'Approved',
    rejected: 'Rejected',
    building: 'Building',
    deployed: 'Deployed',
    undeployed: 'Undeployed',
    failed: 'Failed'
};

export const STATUS_COLORS: Record<AppStatus, string> = {
    submitted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    building: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    deployed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    undeployed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
};

// Enclave instance
export interface Enclave {
    id: string;
    name: string;
    host: string;
    port: number;
    mr_enclave: string;
    country: string;
    region: string;
    gps_lat?: number;
    gps_lon?: number;
    provider: string;
    status: 'active' | 'maintenance' | 'retired';
    max_apps: number;
    app_count: number;
    created_at: string;
    updated_at: string;
}

export interface CreateEnclaveRequest {
    name: string;
    host: string;
    port: number;
    mr_enclave?: string;
    country?: string;
    region?: string;
    gps_lat?: number;
    gps_lon?: number;
    provider?: string;
    max_apps?: number;
}
