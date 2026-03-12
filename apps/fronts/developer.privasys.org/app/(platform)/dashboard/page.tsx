'use client';

import Link from 'next/link';

export default function DashboardPage() {
    return (
        <div className="max-w-4xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Applications</h1>
                <Link
                    href="/dashboard/new"
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                >
                    New application
                </Link>
            </div>

            {/* Empty state */}
            <div className="mt-16 text-center py-20 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
                <div className="text-4xl mb-4">&#x1F680;</div>
                <h2 className="text-lg font-medium">No applications yet</h2>
                <p className="mt-2 text-sm text-black/50 dark:text-white/50 max-w-sm mx-auto">
                    Create your first application to deploy a WASM module or container on confidential infrastructure.
                </p>
                <Link
                    href="/dashboard/new"
                    className="inline-block mt-6 px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                >
                    Create application
                </Link>
            </div>
        </div>
    );
}
