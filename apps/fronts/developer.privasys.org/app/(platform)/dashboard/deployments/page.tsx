'use client';

export default function DeploymentsPage() {
    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold">Deployments</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                View the status of your active deployments across Enclave OS Mini and Enclave OS Virtual.
            </p>

            <div className="mt-10 text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
                <h2 className="text-lg font-medium">No deployments</h2>
                <p className="mt-2 text-sm text-black/50 dark:text-white/50 max-w-sm mx-auto">
                    Deployments will appear here once you create and deploy an application.
                </p>
            </div>
        </div>
    );
}
