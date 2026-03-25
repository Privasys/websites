export type AppType = 'wasm' | 'container';

export interface App {
    id: string;
    name: string;
    display_name: string;
    description: string;
    owner_sub: string;
    owner_email: string;
    owner_name: string;
    app_type: AppType;
    source_type: string;
    commit_url?: string;
    github_commit?: string;
    gpg_key_id?: string;
    gpg_verified: boolean;
    cwasm_path?: string;
    cwasm_hash?: string;
    cwasm_size?: number;
    container_image?: string;
    container_port?: number;
    container_env?: string;
    container_storage?: boolean;
    container_storage_key?: string;
    container_mcp?: Record<string, unknown>;
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
    // App Store listing
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
    created_at: string;
    updated_at: string;
}

export interface CreateAppRequest {
    name: string;
    display_name?: string;
    description?: string;
    source_type: 'upload' | 'github';
    app_type?: AppType;
    commit_url?: string;
    enclave_id?: string;
    container_image?: string;
    container_port?: number;
    container_env?: Record<string, string>;
    container_storage?: boolean;
    container_storage_key?: string;
    container_mcp?: Record<string, unknown>;
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
    version_id?: string;
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
    | 'built'
    | 'deployed'
    | 'undeployed'
    | 'failed';

export const STATUS_LABELS: Record<AppStatus, string> = {
    submitted: 'Submitted',
    under_review: 'Under review',
    approved: 'Approved',
    rejected: 'Rejected',
    building: 'Building',
    built: 'Built',
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
    built: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    deployed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    undeployed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
};

// Enclave instance
export type TeeType = 'sgx' | 'tdx';

export interface Enclave {
    id: string;
    name: string;
    host: string;
    port: number;
    tee_type: TeeType;
    mr_enclave: string;
    country: string;
    region: string;
    gps_lat?: number;
    gps_lon?: number;
    provider: string;
    owner: string;
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
    tee_type?: TeeType;
    mr_enclave?: string;
    country?: string;
    region?: string;
    gps_lat?: number;
    gps_lon?: number;
    provider?: string;
    owner?: string;
    max_apps?: number;
}

// App version (each commit submission)
export interface AppVersion {
    id: string;
    app_id: string;
    version_number: number;
    commit_url?: string;
    github_commit?: string;
    gpg_key_id?: string;
    gpg_verified: boolean;
    app_type: AppType;
    source_type: string;
    cwasm_path?: string;
    cwasm_hash?: string;
    cwasm_size?: number;
    container_image?: string;
    status: VersionStatus;
    build_id?: string;
    created_at: string;
    updated_at: string;
}

export type VersionStatus = 'submitted' | 'approved' | 'building' | 'ready' | 'failed';

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
    submitted: 'Submitted',
    approved: 'Approved',
    building: 'Building',
    ready: 'Ready',
    failed: 'Failed'
};

export const VERSION_STATUS_COLORS: Record<VersionStatus, string> = {
    submitted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    building: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
};

// App deployment (version deployed to an enclave)
export interface AppDeployment {
    id: string;
    app_id: string;
    version_id: string;
    enclave_id?: string;
    enclave_host: string;
    enclave_port: number;
    hostname?: string;
    status: DeploymentStatus;
    deployed_by: string;
    deployed_at?: string;
    stopped_at?: string;
    created_at: string;
    updated_at: string;
}

export type DeploymentStatus = 'pending' | 'deploying' | 'active' | 'failed' | 'stopped';

export const DEPLOYMENT_STATUS_LABELS: Record<DeploymentStatus, string> = {
    pending: 'Pending',
    deploying: 'Deploying',
    active: 'Active',
    failed: 'Failed',
    stopped: 'Stopped'
};

export const DEPLOYMENT_STATUS_COLORS: Record<DeploymentStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    deploying: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    stopped: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
};

// RA-TLS attestation result
export interface AttestationCertificate {
    subject: string;
    issuer: string;
    serial_number: string;
    not_before: string;
    not_after: string;
    signature_algorithm: string;
    public_key_sha256: string;
}

export interface AttestationQuote {
    type: string;
    oid: string;
    is_mock: boolean;
    version?: number;
    report_data?: string;
    raw_base64?: string;
    mr_enclave?: string;
    mr_signer?: string;
    mr_td?: string;
    rtmr0?: string;
    rtmr1?: string;
    rtmr2?: string;
    rtmr3?: string;
    format?: string;
}

export interface AttestationExtension {
    oid: string;
    label: string;
    value_hex: string;
}

export interface AttestationTLS {
    version: string;
    cipher_suite: string;
}

export interface AttestationResult {
    certificate: AttestationCertificate;
    pem: string;
    quote: AttestationQuote | null;
    extensions: AttestationExtension[];
    tls: AttestationTLS;
    // Per-workload (SNI) certificate data
    app_extensions?: AttestationExtension[];
    app_pem?: string;
    app_quote?: AttestationQuote | null;
    // Challenge mode
    challenge_mode: boolean;
    challenge?: string;
    // Stored CWASM hash for verification against APP_CODE_HASH_OID (3.2)
    cwasm_hash?: string;
    // TCG2 event log for RTMR replay verification (TDX only)
    event_log_events?: EventLogDigest[];
    event_log_source?: string;
    // Application-level RTMR[3] events from the enclave manager
    app_events?: AppEvent[];
}

export interface EventLogDigest {
    pcr: number;
    event_type: number;
    digest: string;       // SHA-384 hex
    data_text?: string;   // Human-readable event data when decodable
}

export interface AppEvent {
    timestamp: string;
    pcr: number;
    digest_sha384: string;
    digest_sha256: string;
    type: string;        // "container_load" | "container_unload"
    description: string;
}
