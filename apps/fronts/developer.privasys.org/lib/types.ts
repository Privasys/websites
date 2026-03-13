export interface App {
    id: string;
    name: string;
    display_name: string;
    description: string;
    owner_sub: string;
    owner_email: string;
    source_type: string;
    github_repo?: string;
    github_branch?: string;
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
    created_at: string;
    updated_at: string;
}

export interface CreateAppRequest {
    name: string;
    display_name?: string;
    description?: string;
    source_type: 'upload' | 'github';
    github_repo?: string;
    github_branch?: string;
}

export type AppStatus =
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'deployed'
    | 'undeployed'
    | 'failed';

export const STATUS_LABELS: Record<AppStatus, string> = {
    submitted: 'Submitted',
    under_review: 'Under review',
    approved: 'Approved',
    rejected: 'Rejected',
    deployed: 'Deployed',
    undeployed: 'Undeployed',
    failed: 'Failed'
};

export const STATUS_COLORS: Record<AppStatus, string> = {
    submitted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    deployed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    undeployed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
};
