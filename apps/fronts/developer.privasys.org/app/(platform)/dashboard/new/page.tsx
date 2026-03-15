'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { createApp, uploadCwasm, listEnclaves } from '~/lib/api';
import type { Enclave } from '~/lib/types';

type Mode = 'github' | 'manual';
type WizardState = 'input' | 'submitted';

interface SubmittedApp {
    id: string;
    name: string;
    source_type: string;
    status: string;
}

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

    const [wizardState, setWizardState] = useState<WizardState>('input');
    const [submittedApp, setSubmittedApp] = useState<SubmittedApp | null>(null);

    const [mode, setMode] = useState<Mode>('github');
    const [commitUrl, setCommitUrl] = useState('');
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [enclaveId, setEnclaveId] = useState<string | null>(null);
    const [enclaves, setEnclaves] = useState<Enclave[]>([]);
    const [enclavesLoading, setEnclavesLoading] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch available enclaves
    useEffect(() => {
        if (!session?.accessToken) return;
        listEnclaves(session.accessToken)
            .then(list => {
                const active = list.filter(e => e.status === 'active');
                setEnclaves(active);
                if (active.length === 1) setEnclaveId(active[0].id);
            })
            .catch(() => {})
            .finally(() => setEnclavesLoading(false));
    }, [session?.accessToken]);

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
                commit_url: mode === 'github' ? commitUrl.trim() : undefined,
                enclave_id: enclaveId || undefined
            });

            if (mode === 'manual' && file) {
                await uploadCwasm(session.accessToken, app.id, file);
            }

            setSubmittedApp({ id: app.id, name: app.name || appName, source_type: mode, status: app.status || 'submitted' });
            setWizardState('submitted');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
            setSubmitting(false);
        }
    }, [session?.accessToken, mode, inferredName, name, parsed, file, commitUrl, submitting, enclaveId]);

    // Auto-submit effect
    useEffect(() => {
        if (autoSubmitReady && enclaveId && !submitting && !error) {
            handleSubmit();
        }
    }, [autoSubmitReady, enclaveId, submitting, error, handleSubmit]);

    const isGithubValid = mode === 'github' && !!parsed;
    const isManualValid = mode === 'manual' && !!name && !!file;
    const canSubmit = (isGithubValid || isManualValid) && !!enclaveId && !submitting;

    // ── Submitted state: auto-redirect to detail page ──
    useEffect(() => {
        if (wizardState === 'submitted' && submittedApp) {
            const t = setTimeout(() => router.push(`/dashboard/apps/${submittedApp.id}`), 3000);
            return () => clearTimeout(t);
        }
    }, [wizardState, submittedApp, router]);

    if (wizardState === 'submitted' && submittedApp) {
        return (
            <div className="max-w-xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold">Application submitted</h1>
                </div>
                <p className="text-sm text-black/60 dark:text-white/60 mb-8">
                    <strong>{submittedApp.name}</strong> has been created successfully.
                    {submittedApp.status === 'building'
                        ? ' A reproducible build has been triggered automatically.'
                        : submittedApp.status === 'approved'
                            ? ' Your application has been approved and is being prepared.'
                            : ' Your application is being processed.'}
                </p>

                <div className="space-y-0">
                    {(() => {
                        const s = submittedApp.status;
                        const stepIdx: number = s === 'deployed' ? 6 : (s === 'deploying' || s === 'built') ? 4 : (s === 'building' || s === 'approved') ? 3 : 2;
                        return (
                            <>
                                <PipelineStep step={1} active={stepIdx === 1} done={stepIdx > 1}>
                                    <h2 className="text-lg font-semibold">Application details</h2>
                                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                                        {submittedApp.source_type === 'github' ? 'Created from GitHub commit' : 'Uploaded manually'}
                                    </div>
                                </PipelineStep>

                                <PipelineStep step={2} active={stepIdx === 2} done={stepIdx > 2}>
                                    <h2 className="text-lg font-semibold">Review &amp; approval</h2>
                                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                                        {stepIdx > 2 ? 'Automatically approved.' : 'Your application is queued for review.'}
                                    </div>
                                </PipelineStep>

                                <PipelineStep step={3} active={stepIdx === 3} done={stepIdx > 3}>
                                    <h2 className="text-lg font-semibold">Reproducible build</h2>
                                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                                        {stepIdx === 3 ? 'Building via GitHub Actions\u2026' : stepIdx > 3 ? 'Build complete.' : 'Compile your application into a .cwasm artifact.'}
                                    </div>
                                </PipelineStep>

                                <PipelineStep step={4} active={stepIdx === 4} done={stepIdx > 4}>
                                    <h2 className="text-lg font-semibold">Deploy to enclave</h2>
                                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                                        {stepIdx === 4 ? 'Deploying to enclave\u2026' : stepIdx > 4 ? 'Deployed successfully.' : 'Automatically deployed to your chosen location.'}
                                    </div>
                                </PipelineStep>

                                <PipelineStep step={5} active={stepIdx === 5} done={stepIdx > 5} last>
                                    <h2 className="text-lg font-semibold">Live &amp; attested</h2>
                                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                                        Your application is live and remotely attestable.
                                    </div>
                                </PipelineStep>
                            </>
                        );
                    })()}
                </div>

                <div className="flex items-center gap-3 mt-4">
                    <button
                        type="button"
                        onClick={() => router.push(`/dashboard/apps/${submittedApp.id}`)}
                        className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                    >
                        View application
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        className="text-sm text-black/50 dark:text-white/50 hover:underline"
                    >
                        Back to dashboard
                    </button>
                </div>
                <p className="mt-3 text-xs text-black/40 dark:text-white/40">
                    Redirecting to your application in a few seconds{'\u2026'}
                </p>
            </div>
        );
    }

    // ── Input state ──
    return (
        <div className="max-w-xl">
            <h1 className="text-2xl font-semibold">New Application</h1>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="mt-8">
                <PipelineStep step={1} active={true} done={(isGithubValid || isManualValid) && !!enclaveId}>
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

                    {/* Deployment location picker */}
                    <div className="mt-6 pt-5 border-t border-black/10 dark:border-white/10">
                        <label className="block text-sm font-medium mb-2">Deployment location</label>
                        {enclavesLoading ? (
                            <div className="flex items-center gap-2 text-sm text-black/40 dark:text-white/40">
                                <div className="w-4 h-4 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
                                Loading locations{'\u2026'}
                            </div>
                        ) : enclaves.length === 0 ? (
                            <p className="text-sm text-black/40 dark:text-white/40">No deployment locations available.</p>
                        ) : (
                            <div className="space-y-2">
                                {enclaves.map(e => (
                                    <button
                                        key={e.id}
                                        type="button"
                                        onClick={() => setEnclaveId(e.id)}
                                        disabled={submitting}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                            enclaveId === e.id
                                                ? 'border-black dark:border-white bg-black/3 dark:bg-white/5'
                                                : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium">{e.name}</div>
                                                <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                                                    {e.region}{e.country ? `, ${e.country}` : ''} {'\u00b7'} {e.provider}
                                                </div>
                                            </div>
                                            {enclaveId === e.id && (
                                                <div className="w-5 h-5 rounded-full bg-black dark:bg-white flex items-center justify-center shrink-0">
                                                    <svg className="w-3 h-3 text-white dark:text-black" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                        <path d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </PipelineStep>

                <PipelineStep step={2} active={false} done={false}>
                    <h2 className="text-lg font-semibold">Review &amp; approval</h2>
                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Your application will be reviewed and approved automatically.
                    </div>
                </PipelineStep>

                <PipelineStep step={3} active={false} done={false}>
                    <h2 className="text-lg font-semibold">Reproducible build</h2>
                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Compile your application into a .cwasm artifact via GitHub Actions.
                    </div>
                </PipelineStep>

                <PipelineStep step={4} active={false} done={false}>
                    <h2 className="text-lg font-semibold">Deploy to enclave</h2>
                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Automatically deployed to your chosen location.
                    </div>
                </PipelineStep>

                <PipelineStep step={5} active={false} done={false} last>
                    <h2 className="text-lg font-semibold">Live &amp; attested</h2>
                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                        Your application is live and remotely attestable.
                    </div>
                </PipelineStep>
            </div>

            {/* Status messages */}
            {submitting && mode === 'github' && (
                <div className="mt-2 flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
                    <div className="w-4 h-4 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
                    Creating application from {parsed?.owner}/{parsed?.repo}{'\u2026'}
                </div>
            )}
            {!submitting && isGithubValid && !enclaveId && (
                <div className="mt-2 text-sm text-black/50 dark:text-white/50">
                    Select a deployment location above to continue.
                </div>
            )}
        </div>
    );
}

