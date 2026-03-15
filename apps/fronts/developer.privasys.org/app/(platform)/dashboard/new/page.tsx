'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { createApp, uploadCwasm } from '~/lib/api';

type Mode = 'github' | 'manual';

// Parse owner/repo and commit from a GitHub commit URL
function parseCommitUrl(url: string): { owner: string; repo: string; commit: string } | null {
    const m = url.trim().match(/github\.com\/([^/]+)\/([^/]+)\/commit\/([0-9a-f]+)/i);
    return m ? { owner: m[1], repo: m[2], commit: m[3] } : null;
}

// Infer a valid app name from a GitHub repo name
function repoToAppName(repo: string): string {
    return repo
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 63);
}

// Pipeline step component
function PipelineStep({ step, active, done, last, children }: {
    step: number; active: boolean; done: boolean; last?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="flex gap-4">
            {/* Vertical line + circle */}
            <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : active
                            ? 'border-black dark:border-white bg-transparent'
                            : 'border-black/15 dark:border-white/15 bg-transparent'
                }`}>
                    {done ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <span className={`text-xs font-semibold ${active ? 'text-black dark:text-white' : 'text-black/25 dark:text-white/25'}`}>
                            {step}
                        </span>
                    )}
                </div>
                {!last && (
                    <div className={`w-0.5 flex-1 min-h-[24px] transition-colors ${done ? 'bg-emerald-500' : 'bg-black/10 dark:bg-white/10'}`} />
                )}
            </div>
            {/* Content */}
            <div className={`pb-8 flex-1 ${!active && !done ? 'opacity-40' : ''}`}>
                {children}
            </div>
        </div>
    );
}

export default function NewApplicationPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [mode, setMode] = useState<Mode>('github');
    const [commitUrl, setCommitUrl] = useState('');
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-infer app name from commit URL
    const parsed = mode === 'github' ? parseCommitUrl(commitUrl) : null;
    const inferredName = parsed ? repoToAppName(parsed.repo) : '';

    // Auto-submit when a valid commit URL is pasted (with small delay for UX)
    const [autoSubmitReady, setAutoSubmitReady] = useState(false);
    useEffect(() => {
        if (parsed && mode === 'github') {
            const t = setTimeout(() => setAutoSubmitReady(true), 600);
            return () => clearTimeout(t);
        }
        setAutoSubmitReady(false);
    }, [parsed, mode]);

    const handleSubmit = useCallback(async () => {
        if (!session?.accessToken || submitting) return;

        const appName = mode === 'github' ? inferredName : name;
        if (!appName) return;

        if (mode === 'github' && !parsed) return;
        if (mode === 'manual' && !file) return;

        setSubmitting(true);
        setError(null);

        try {
            const app = await createApp(session.accessToken, {
                name: appName,
                source_type: mode === 'github' ? 'github' : 'upload',
                commit_url: mode === 'github' ? commitUrl.trim() : undefined
            });

            if (mode === 'manual' && file) {
                await uploadCwasm(session.accessToken, app.id, file);
            }

            router.push(`/dashboard/apps/${app.id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
            setSubmitting(false);
        }
    }, [session?.accessToken, mode, inferredName, name, parsed, file, commitUrl, submitting, router]);

    // Auto-submit effect
    useEffect(() => {
        if (autoSubmitReady && !submitting && !error) {
            handleSubmit();
        }
    }, [autoSubmitReady, submitting, error, handleSubmit]);

    const isGithubValid = mode === 'github' && !!parsed;
    const isManualValid = mode === 'manual' && !!name && !!file;
    const canSubmit = (isGithubValid || isManualValid) && !submitting;

    return (
        <div className="max-w-xl">
            <h1 className="text-2xl font-semibold">New Application</h1>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="mt-8">
                <PipelineStep step={1} active={true} done={isGithubValid || isManualValid}>
                    <h2 className="text-lg font-semibold mb-1">Application details</h2>

                    {mode === 'github' ? (
                        <div className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    placeholder="https://github.com/your-org/your-app/commit/abc1234..."
                                    value={commitUrl}
                                    onChange={(e) => setCommitUrl(e.target.value)}
                                    disabled={submitting}
                                    className="w-full px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 placeholder:text-black/30 dark:placeholder:text-white/30 disabled:opacity-50"
                                    autoFocus
                                />
                                <p className="mt-1.5 text-xs text-black/40 dark:text-white/40">
                                    Paste the full commit URL from GitHub. The commit must be GPG-signed.
                                </p>
                            </div>
                            {parsed && (
                                <div className="p-3 rounded-lg bg-black/3 dark:bg-white/5 text-sm space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-black/50 dark:text-white/50">Repo:</span>
                                        <span className="font-medium">{parsed.owner}/{parsed.repo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-black/50 dark:text-white/50">App name:</span>
                                        <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">{inferredName}</code>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-black/50 dark:text-white/50">Commit:</span>
                                        <code className="font-mono text-xs">{parsed.commit.slice(0, 12)}</code>
                                    </div>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setMode('manual')}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                            >
                                Configure manually instead
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Application name</label>
                                <input
                                    type="text"
                                    placeholder="my-confidential-app"
                                    value={name}
                                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    disabled={submitting}
                                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 disabled:opacity-50"
                                    autoFocus
                                />
                                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                                    3-63 lowercase alphanumeric characters or hyphens, starting with a letter.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">.cwasm file</label>
                                <div
                                    onClick={() => !submitting && fileRef.current?.click()}
                                    className="flex items-center justify-center w-full h-24 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl cursor-pointer hover:border-black/30 dark:hover:border-white/30 transition-colors"
                                >
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept=".cwasm"
                                        className="hidden"
                                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                    />
                                    {file ? (
                                        <div className="text-center">
                                            <div className="text-sm font-medium">{file.name}</div>
                                            <div className="text-xs text-black/40 dark:text-white/40 mt-0.5">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-black/30 dark:text-white/30">
                                            Drop .cwasm file or click to browse
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={!canSubmit}
                                    className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                                >
                                    {submitting ? 'Creating\u2026' : 'Create application'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode('github'); setFile(null); setName(''); }}
                                    className="text-sm text-black/50 dark:text-white/50 hover:underline"
                                >
                                    Use GitHub instead
                                </button>
                            </div>
                        </div>
                    )}
                </PipelineStep>

                <PipelineStep step={2} active={false} done={false}>
                    <h2 className="text-lg font-semibold">Application review</h2>
                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Your application will be reviewed and approved automatically.
                    </div>
                </PipelineStep>

                <PipelineStep step={3} active={false} done={false}>
                    <h2 className="text-lg font-semibold">Application preparation</h2>
                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                        WASM detection and reproducible build via GitHub Actions.
                    </div>
                </PipelineStep>

                <PipelineStep step={4} active={false} done={false}>
                    <h2 className="text-lg font-semibold">Reproducible build</h2>
                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Compile your application into a .cwasm artifact.
                    </div>
                </PipelineStep>

                <PipelineStep step={5} active={false} done={false}>
                    <h2 className="text-lg font-semibold">Ready to deploy</h2>
                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Select a deployment location for your enclave.
                    </div>
                </PipelineStep>

                <PipelineStep step={6} active={false} done={false} last>
                    <h2 className="text-lg font-semibold">Ready to use</h2>
                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Your application is live and attested.
                    </div>
                </PipelineStep>
            </div>

            {/* Loading overlay when auto-submitting */}
            {submitting && mode === 'github' && (
                <div className="mt-2 flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
                    <div className="w-4 h-4 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
                    Creating application from {parsed?.owner}/{parsed?.repo}\u2026
                </div>
            )}
        </div>
    );
}

