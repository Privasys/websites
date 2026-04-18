'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '~/lib/privasys-auth';
import { useState, useRef, useCallback, useEffect } from 'react';
import { createApp, uploadCwasm, checkAppName, detectAppType } from '~/lib/api';
import type { AppType } from '~/lib/types';

type SourceMode = 'github' | 'upload' | 'package';
type NameStatus = 'idle' | 'checking' | 'available' | 'taken';

// ── Helpers ──

function parseCommitUrl(url: string): { owner: string; repo: string; commit: string } | null {
    const m = url.trim().match(/github\.com\/([^/]+)\/([^/]+)\/commit\/([0-9a-f]+)/i);
    return m ? { owner: m[1], repo: m[2], commit: m[3] } : null;
}

function repoToAppName(repo: string): string {
    return repo.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 63);
}

function imageToAppName(image: string): string {
    const withoutTag = image.split(':')[0];
    const last = withoutTag.split('/').pop() || '';
    return last.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 63);
}

// ── Shared icons ──

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>;
}

function XIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>;
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
    return <div className={`${className} border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin`} />;
}

// ── CollapsibleStep ──

function CollapsibleStep({ step, label, summary, active, done, last, onEdit, children }: {
    step: number; label: string; summary?: string; active: boolean; done: boolean; last?: boolean;
    onEdit?: () => void; children: React.ReactNode;
}) {
    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : active
                            ? 'border-black dark:border-white bg-transparent'
                            : 'border-black/15 dark:border-white/15 bg-transparent'
                }`}>
                    {done ? (
                        <CheckIcon />
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
            <div className={`pb-8 flex-1 ${!active && !done ? 'opacity-40' : ''}`}>
                {done && !active ? (
                    <button type="button" onClick={onEdit} className="text-left group w-full">
                        <span className="text-sm text-black/70 dark:text-white/70">{label}: {summary}</span>
                        <span className="ml-2 text-xs text-black/30 dark:text-white/30 opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                    </button>
                ) : active ? (
                    <div>
                        <h2 className="text-lg font-semibold mb-3">{label}</h2>
                        {children}
                    </div>
                ) : (
                    <h2 className="text-lg font-semibold text-black/25 dark:text-white/25">{label}</h2>
                )}
            </div>
        </div>
    );
}

// ── Name input with availability check ──

function NameInput({ name, setName, nameStatus, nameReason, disabled }: {
    name: string; setName: (v: string) => void; nameStatus: NameStatus; nameReason: string; disabled: boolean;
}) {
    return (
        <div>
            <div className="relative">
                <input
                    type="text"
                    placeholder="my-confidential-app"
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    disabled={disabled}
                    className={`w-full px-3 py-2 rounded-lg border bg-transparent text-sm font-mono focus:outline-none focus:ring-2 disabled:opacity-50 ${
                        nameStatus === 'taken'
                            ? 'border-red-400 focus:ring-red-300'
                            : nameStatus === 'available'
                                ? 'border-emerald-400 focus:ring-emerald-300'
                                : 'border-black/10 dark:border-white/10 focus:ring-black/20 dark:focus:ring-white/20'
                    }`}
                    autoFocus
                />
                {nameStatus === 'checking' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner /></div>
                )}
                {nameStatus === 'available' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"><CheckIcon /></div>
                )}
                {nameStatus === 'taken' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500"><XIcon /></div>
                )}
            </div>
            {nameStatus === 'taken' && nameReason && (
                <p className="mt-1 text-xs text-red-500">{nameReason}</p>
            )}
            {nameStatus === 'available' && (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{name}.apps.privasys.org is available</p>
            )}
            {nameStatus === 'idle' && name.length > 0 && name.length < 3 && (
                <p className="mt-1 text-xs text-black/40 dark:text-white/40">Name must be at least 3 characters</p>
            )}
            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                3-63 lowercase alphanumeric characters or hyphens, starting with a letter.
            </p>
        </div>
    );
}

// ── Environment variables editor ──

function EnvVarsEditor({ envVars, setEnvVars, disabled }: {
    envVars: { key: string; value: string; secret: boolean }[];
    setEnvVars: (v: { key: string; value: string; secret: boolean }[]) => void;
    disabled: boolean;
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-black/60 dark:text-white/60">Environment variables</label>
                <button
                    type="button"
                    onClick={() => setEnvVars([...envVars, { key: '', value: '', secret: false }])}
                    disabled={disabled}
                    className="text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
                >
                    + Add variable
                </button>
            </div>
            {envVars.length === 0 ? (
                <p className="text-xs text-black/30 dark:text-white/30">
                    No environment variables configured. Add variables like MODEL_NAME, HF_TOKEN, etc.
                </p>
            ) : (
                <div className="space-y-2">
                    {envVars.map((env, i) => (
                        <div key={i} className="flex gap-2 items-start">
                            <input
                                type="text"
                                placeholder="KEY"
                                value={env.key}
                                onChange={(e) => {
                                    const next = [...envVars];
                                    next[i] = { ...next[i], key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') };
                                    setEnvVars(next);
                                }}
                                disabled={disabled}
                                className="w-[140px] px-2.5 py-1.5 rounded-md border border-black/10 dark:border-white/10 bg-transparent text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 placeholder:text-black/25 dark:placeholder:text-white/25 disabled:opacity-50"
                            />
                            <div className="flex-1 relative">
                                <input
                                    type={env.secret ? 'password' : 'text'}
                                    placeholder="value"
                                    value={env.value}
                                    onChange={(e) => {
                                        const next = [...envVars];
                                        next[i] = { ...next[i], value: e.target.value };
                                        setEnvVars(next);
                                    }}
                                    disabled={disabled}
                                    className="w-full px-2.5 py-1.5 pr-8 rounded-md border border-black/10 dark:border-white/10 bg-transparent text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 placeholder:text-black/25 dark:placeholder:text-white/25 disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = [...envVars];
                                        next[i] = { ...next[i], secret: !next[i].secret };
                                        setEnvVars(next);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
                                    title={env.secret ? 'Show value' : 'Hide value'}
                                >
                                    {env.secret ? (
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.486 0-8.101-2.983-9.534-7.175a.992.992 0 010-.65C3.263 8.42 5.36 6.17 8.125 5.175M9.878 9.878a3 3 0 104.243 4.243M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    )}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEnvVars(envVars.filter((_, j) => j !== i))}
                                disabled={disabled}
                                className="px-1.5 py-1.5 text-black/30 dark:text-white/30 hover:text-red-500 transition-colors disabled:opacity-50"
                                title="Remove"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <p className="mt-1.5 text-xs text-black/40 dark:text-white/40">
                These variables are passed to the container and measured into the attestation Merkle tree.
            </p>
        </div>
    );
}

// ── Main page ──

export default function NewApplicationPage() {
    const { session } = useAuth();
    const router = useRouter();

    // Wizard navigation
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Type
    const [appType, setAppType] = useState<AppType | null>(null);

    // Step 2: Source
    const [sourceMode, setSourceMode] = useState<SourceMode>('github');
    const [commitUrl, setCommitUrl] = useState('');
    const [containerImage, setContainerImage] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [detectedType, setDetectedType] = useState<AppType | null>(null);
    const [detecting, setDetecting] = useState(false);

    // Step 3: Name
    const [name, setName] = useState('');
    const [nameStatus, setNameStatus] = useState<NameStatus>('idle');
    const [nameReason, setNameReason] = useState('');
    const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Step 4: Configuration
    const [containerPort, setContainerPort] = useState('8080');
    const [envVars, setEnvVars] = useState<{ key: string; value: string; secret: boolean }[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Derived state ──

    const parsed = sourceMode === 'github' ? parseCommitUrl(commitUrl) : null;

    const availableSourceModes: SourceMode[] = appType === 'wasm'
        ? ['github', 'upload']
        : ['github', 'package'];

    const isSourceComplete = sourceMode === 'github' ? !!parsed
        : sourceMode === 'package' ? !!containerImage.trim()
            : sourceMode === 'upload' ? !!file
                : false;

    const isNameComplete = name.trim().length >= 3 && nameStatus === 'available';

    const canSubmit = appType !== null && isSourceComplete && isNameComplete && !submitting;

    const needsConfigStep = appType === 'container' || sourceMode === 'package';

    // ── Summaries for collapsed steps ──

    const typeSummary = appType === 'container' ? 'Container' : appType === 'wasm' ? 'WASM Application' : '';
    const sourceSummary = sourceMode === 'github' && parsed
        ? `GitHub (${parsed.owner}/${parsed.repo}@${parsed.commit.slice(0, 8)})`
        : sourceMode === 'package' && containerImage
            ? `Package (${containerImage.split(':')[0].split('/').pop()})`
            : sourceMode === 'upload' && file
                ? `Upload (${file.name})`
                : '';
    const nameSummary = name ? `${name}.apps.privasys.org` : '';

    // ── Auto-infer app name from source ──

    const prevInferred = useRef('');
    useEffect(() => {
        let inferred = '';
        if (sourceMode === 'github' && parsed) {
            inferred = repoToAppName(parsed.repo);
        } else if (sourceMode === 'package' && containerImage) {
            inferred = imageToAppName(containerImage);
        }
        if (inferred && (name === '' || name === prevInferred.current)) {
            setName(inferred);
        }
        prevInferred.current = inferred;
    }, [sourceMode, parsed?.repo, containerImage]);

    // Auto-detect app type from GitHub commit URL (used as a hint)
    useEffect(() => {
        if (sourceMode !== 'github' || !parsed || !session?.accessToken) {
            setDetectedType(null);
            return;
        }
        let cancelled = false;
        setDetecting(true);
        detectAppType(session.accessToken, commitUrl.trim())
            .then(res => {
                if (!cancelled) {
                    const t = (res.app_type === 'container' ? 'container' : 'wasm') as AppType;
                    setDetectedType(t);
                }
            })
            .catch(() => { if (!cancelled) setDetectedType(null); })
            .finally(() => { if (!cancelled) setDetecting(false); });
        return () => { cancelled = true; };
    }, [sourceMode, parsed?.owner, parsed?.repo, parsed?.commit, session?.accessToken]);

    // Debounced name availability check
    useEffect(() => {
        if (checkTimer.current) clearTimeout(checkTimer.current);
        const n = name.trim();
        if (!n || n.length < 3 || !session?.accessToken) {
            setNameStatus('idle');
            setNameReason('');
            return;
        }
        setNameStatus('checking');
        checkTimer.current = setTimeout(async () => {
            try {
                const res = await checkAppName(session.accessToken!, n);
                setNameStatus(res.available ? 'available' : 'taken');
                setNameReason(res.reason || '');
            } catch {
                setNameStatus('idle');
            }
        }, 400);
        return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
    }, [name, session?.accessToken]);

    // ── Submit ──

    const handleSubmit = useCallback(async () => {
        if (!session?.accessToken || submitting || !appType) return;

        const appName = name.trim();
        if (!appName) return;

        if (sourceMode === 'github' && !parsed) return;
        if (sourceMode === 'upload' && !file) return;
        if (sourceMode === 'package' && !containerImage.trim()) return;

        if (appType === 'container' || sourceMode === 'package') {
            const port = parseInt(containerPort, 10);
            if (!port || port < 1 || port > 65535) {
                setError('Container port must be between 1 and 65535');
                return;
            }
        }

        setSubmitting(true);
        setError(null);

        try {
            const filteredEnv = envVars.filter(e => e.key.trim());
            const app = await createApp(session.accessToken, {
                name: appName,
                source_type: sourceMode === 'github' ? 'github' : sourceMode === 'package' ? 'package' : 'upload',
                commit_url: sourceMode === 'github' ? commitUrl.trim() : undefined,
                app_type: sourceMode === 'package' ? 'container' : appType,
                container_image: sourceMode === 'package' ? containerImage.trim() : undefined,
                container_port: (sourceMode === 'package' || appType === 'container') && containerPort ? parseInt(containerPort, 10) : undefined,
                container_env: filteredEnv.length > 0
                    ? Object.fromEntries(filteredEnv.map(e => [e.key.trim(), e.value]))
                    : undefined
            });

            if (sourceMode === 'upload' && file) {
                await uploadCwasm(session.accessToken, app.id, file);
            }

            router.push(`/dashboard/apps/${app.id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
            setSubmitting(false);
        }
    }, [session?.accessToken, sourceMode, name, parsed, file, commitUrl, submitting, appType, containerPort, containerImage, envVars]);


    // ── Wizard ──

    return (
        <div className="max-w-xl">
            <h1 className="text-2xl font-semibold">New Application</h1>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="mt-8">
                {/* ── Step 1: Application Type ── */}
                <CollapsibleStep
                    step={1} label="Application type" summary={typeSummary}
                    active={currentStep === 1} done={currentStep > 1 && appType !== null}
                    onEdit={() => setCurrentStep(1)}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setAppType('container');
                                if (sourceMode === 'upload') setSourceMode('github');
                                setCurrentStep(2);
                            }}
                            className={`p-4 rounded-xl border-2 text-left transition-all hover:border-black/30 dark:hover:border-white/30 ${
                                appType === 'container' ? 'border-black dark:border-white' : 'border-black/10 dark:border-white/10'
                            }`}
                        >
                            <div className="text-sm font-semibold">Container</div>
                            <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                                Docker container running in a TDX enclave.
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAppType('wasm');
                                if (sourceMode === 'package') setSourceMode('github');
                                setCurrentStep(2);
                            }}
                            className={`p-4 rounded-xl border-2 text-left transition-all hover:border-black/30 dark:hover:border-white/30 ${
                                appType === 'wasm' ? 'border-black dark:border-white' : 'border-black/10 dark:border-white/10'
                            }`}
                        >
                            <div className="text-sm font-semibold">WASM Application</div>
                            <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                                WebAssembly application with reproducible builds.
                            </div>
                        </button>
                    </div>
                </CollapsibleStep>

                {/* ── Step 2: Source ── */}
                <CollapsibleStep
                    step={2} label="Source" summary={sourceSummary}
                    active={currentStep === 2} done={currentStep > 2 && isSourceComplete}
                    onEdit={() => setCurrentStep(2)}
                >
                    {/* Source mode tabs */}
                    <div className="flex gap-2 mb-4">
                        {availableSourceModes.map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setSourceMode(m)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                    sourceMode === m
                                        ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                                        : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                                }`}
                            >
                                {m === 'github' ? 'GitHub' : m === 'package' ? 'Package URL' : 'Upload .cwasm'}
                            </button>
                        ))}
                    </div>

                    {sourceMode === 'github' && (
                        <div className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    placeholder="https://github.com/your-org/your-app/commit/abc1234..."
                                    value={commitUrl}
                                    onChange={(e) => setCommitUrl(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 placeholder:text-black/30 dark:placeholder:text-white/30"
                                    autoFocus
                                />
                                <p className="mt-1.5 text-xs text-black/40 dark:text-white/40">
                                    Paste the full commit URL from GitHub. The commit must be GPG-signed.
                                </p>
                            </div>
                            {parsed && (
                                <div className="p-3 rounded-lg bg-black/3 dark:bg-white/5 text-sm space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-black/50 dark:text-white/50">Repo:</span>
                                        <span className="font-medium">{parsed.owner}/{parsed.repo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-black/50 dark:text-white/50">Commit:</span>
                                        <code className="font-mono text-xs">{parsed.commit.slice(0, 12)}</code>
                                    </div>
                                    {detecting ? (
                                        <div className="flex items-center gap-1.5">
                                            <Spinner className="w-3 h-3" />
                                            <span className="text-xs text-black/40 dark:text-white/40">Detecting type...</span>
                                        </div>
                                    ) : detectedType && detectedType !== appType ? (
                                        <p className="text-xs text-amber-600 dark:text-amber-400">
                                            This repository looks like a {detectedType === 'container' ? 'container' : 'WASM'} project.{' '}
                                            <button type="button" onClick={() => { setAppType(detectedType); setCurrentStep(2); }} className="underline">
                                                Switch type
                                            </button>
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    )}

                    {sourceMode === 'package' && (
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="ghcr.io/your-org/your-app:latest"
                                value={containerImage}
                                onChange={(e) => setContainerImage(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 placeholder:text-black/30 dark:placeholder:text-white/30"
                                autoFocus
                            />
                            <p className="text-xs text-black/40 dark:text-white/40">
                                The full container image reference (e.g. ghcr.io/org/app:tag or docker.io/user/app:v1).
                            </p>
                        </div>
                    )}

                    {sourceMode === 'upload' && (
                        <div>
                            <div
                                onClick={() => fileRef.current?.click()}
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
                    )}

                    <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        disabled={!isSourceComplete}
                        className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                    >
                        Next
                    </button>
                </CollapsibleStep>

                {/* ── Step 3: Application Name ── */}
                <CollapsibleStep
                    step={3} label="Application name" summary={nameSummary}
                    active={currentStep === 3} done={currentStep > 3 && isNameComplete}
                    onEdit={() => setCurrentStep(3)} last={!needsConfigStep}
                >
                    <div className="space-y-3">
                        <NameInput
                            name={name} setName={setName}
                            nameStatus={nameStatus} nameReason={nameReason}
                            disabled={submitting}
                        />
                        {needsConfigStep ? (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(4)}
                                disabled={!isNameComplete}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                            >
                                {submitting ? 'Creating...' : 'Create application'}
                            </button>
                        )}
                    </div>
                </CollapsibleStep>

                {/* ── Step 4: Configuration & Submit (containers only) ── */}
                {needsConfigStep && <CollapsibleStep
                    step={4} label="Configuration" active={currentStep === 4} done={false} last
                >
                    <div className="space-y-4">
                        {(appType === 'container' || sourceMode === 'package') && (
                            <div>
                                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Container port</label>
                                <input
                                    type="number"
                                    placeholder="8080"
                                    value={containerPort}
                                    onChange={(e) => setContainerPort(e.target.value)}
                                    disabled={submitting}
                                    className="w-32 px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 disabled:opacity-50"
                                />
                                <p className="mt-1 text-xs text-black/40 dark:text-white/40">The port your container listens on.</p>
                            </div>
                        )}

                        {appType === 'container' || sourceMode === 'package' ? (
                            <EnvVarsEditor envVars={envVars} setEnvVars={setEnvVars} disabled={submitting} />
                        ) : (
                            <p className="text-xs text-black/40 dark:text-white/40">
                                Environment variables for WASM applications will be supported in a future update.
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                        >
                            {submitting ? 'Creating...' : 'Create application'}
                        </button>
                    </div>
                </CollapsibleStep>}
            </div>

            {/* Status message */}
            {submitting && (
                <div className="mt-2 flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
                    <Spinner />
                    {sourceMode === 'github' && parsed
                        ? `Creating application from ${parsed.owner}/${parsed.repo}...`
                        : sourceMode === 'package'
                            ? 'Creating application from package...'
                            : 'Creating application...'}
                </div>
            )}
        </div>
    );
}

