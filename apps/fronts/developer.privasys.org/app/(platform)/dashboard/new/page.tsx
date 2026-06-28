'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '~/lib/privasys-auth';
import { useState, useRef, useCallback, useEffect } from 'react';
import { createApp, uploadCwasm, checkAppName, detectAppType, listCachedImages, previewManifest, updateStoreListing } from '~/lib/api';
import type { AppType, CachedImage } from '~/lib/types';
import type { ManifestStore } from '~/lib/api';

type SourceMode = 'github' | 'upload' | 'package' | 'cloud_image';
type NameStatus = 'idle' | 'checking' | 'available' | 'taken';

// App Store categories (mirrors the detail page's list).
const STORE_CATEGORIES = [
    'Productivity', 'Finance', 'Healthcare', 'AI & Machine Learning',
    'Security & Privacy', 'Communication', 'Developer Tools', 'Data Analytics',
    'Education', 'Entertainment', 'Business', 'Social', 'Utilities', 'Other'
];

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
    // cloud_image source: a published per-cloud disk (e.g. GCE image-<name>-<channel>-<digest12>)
    const [cachedImages, setCachedImages] = useState<CachedImage[]>([]);
    const [cloudImageName, setCloudImageName] = useState('');
    const [cloudImageChannel, setCloudImageChannel] = useState('prod');

    // Step 3: Name
    const [name, setName] = useState('');
    const [nameStatus, setNameStatus] = useState<NameStatus>('idle');
    const [nameReason, setNameReason] = useState('');
    const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Step 4: Listing (required so the app is deploy-ready; the App Store deploy
    // gate needs description + category). Pre-filled from the source's privasys.json
    // "store" block when present. Container port is platform-allocated ($PORT).
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [tagline, setTagline] = useState('');
    // Other listing fields the manifest may provide, retained so a later
    // updateStoreListing does not wipe them (the wizard only edits the three above).
    const [storeExtra, setStoreExtra] = useState<ManifestStore | null>(null);
    const [prefilled, setPrefilled] = useState(false);
    const [previewing, setPreviewing] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Derived state ──

    const parsed = sourceMode === 'github' ? parseCommitUrl(commitUrl) : null;

    const availableSourceModes: SourceMode[] = appType === 'wasm'
        ? ['github', 'upload']
        : ['github', 'package', 'cloud_image'];

    const isSourceComplete = sourceMode === 'github' ? !!parsed
        : sourceMode === 'package' ? !!containerImage.trim()
            : sourceMode === 'cloud_image' ? !!cloudImageName && !!cloudImageChannel
                : sourceMode === 'upload' ? !!file
                    : false;

    const isNameComplete = name.trim().length >= 3 && nameStatus === 'available';
    const isListingComplete = description.trim().length > 0 && category.trim().length > 0;

    const canSubmit = appType !== null && isSourceComplete && isNameComplete && isListingComplete && !submitting;

    // ── Summaries for collapsed steps ──

    const typeSummary = appType === 'container' ? 'Container' : appType === 'wasm' ? 'WASM Application' : '';
    const sourceSummary = sourceMode === 'github' && parsed
        ? `GitHub (${parsed.owner}/${parsed.repo}@${parsed.commit.slice(0, 8)})`
        : sourceMode === 'package' && containerImage
            ? `Package (${containerImage.split(':')[0].split('/').pop()})`
            : sourceMode === 'cloud_image' && cloudImageName
                ? `Cloud image (${cloudImageName}/${cloudImageChannel})`
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
        } else if (sourceMode === 'cloud_image' && cloudImageName) {
            inferred = cloudImageName;
        }
        if (inferred && (name === '' || name === prevInferred.current)) {
            setName(inferred);
        }
        prevInferred.current = inferred;
    }, [sourceMode, parsed?.repo, containerImage, cloudImageName]);

    // Load cached images when the user selects the cloud_image source.
    // We deliberately fetch lazily so non-cloud-image flows incur no GCE
    // round-trip on the wizard load.
    useEffect(() => {
        if (sourceMode !== 'cloud_image' || !session?.accessToken) return;
        let cancelled = false;
        listCachedImages(session.accessToken)
            .then(images => { if (!cancelled) setCachedImages(images); })
            .catch(() => { /* leave list empty */ });
        return () => { cancelled = true; };
    }, [sourceMode, session?.accessToken]);

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

    // Pre-fill the Listing step from the source's privasys.json "store" block, when
    // present (github commit / package image). Only fills fields the user has not
    // typed; retains the other store fields so they are not lost on save.
    useEffect(() => {
        if (!session?.accessToken) return;
        let body: { source_type: string; commit_url?: string; image?: string } | null = null;
        if (sourceMode === 'github' && parsed) body = { source_type: 'github', commit_url: commitUrl.trim() };
        else if (sourceMode === 'package' && containerImage.trim()) body = { source_type: 'package', image: containerImage.trim() };
        if (!body) { setStoreExtra(null); setPrefilled(false); return; }
        let cancelled = false;
        setPreviewing(true);
        previewManifest(session.accessToken, body)
            .then(({ store }) => {
                if (cancelled) return;
                if (store) {
                    setStoreExtra(store);
                    setDescription(d => d || store.description || '');
                    setCategory(c => c || store.category || '');
                    setTagline(t => t || store.tagline || '');
                    setPrefilled(!!(store.description || store.category || store.tagline));
                } else {
                    setStoreExtra(null);
                    setPrefilled(false);
                }
            })
            .catch(() => { if (!cancelled) { setStoreExtra(null); setPrefilled(false); } })
            .finally(() => { if (!cancelled) setPreviewing(false); });
        return () => { cancelled = true; };
    }, [sourceMode, parsed?.owner, parsed?.repo, parsed?.commit, containerImage, session?.accessToken]);

    // ── Submit ──

    const handleSubmit = useCallback(async () => {
        if (!session?.accessToken || submitting || !appType) return;

        const appName = name.trim();
        if (!appName) return;

        if (sourceMode === 'github' && !parsed) return;
        if (sourceMode === 'upload' && !file) return;
        if (sourceMode === 'package' && !containerImage.trim()) return;
        if (sourceMode === 'cloud_image' && (!cloudImageName || !cloudImageChannel)) return;

        setSubmitting(true);
        setError(null);

        const isContainerApp =
            sourceMode === 'package' || sourceMode === 'cloud_image' || appType === 'container';

        try {
            const app = await createApp(session.accessToken, {
                name: appName,
                source_type: sourceMode === 'github' ? 'github'
                    : sourceMode === 'package' ? 'package'
                        : sourceMode === 'cloud_image' ? 'cloud_image'
                            : 'upload',
                commit_url: sourceMode === 'github' ? commitUrl.trim() : undefined,
                app_type: (sourceMode === 'package' || sourceMode === 'cloud_image') ? 'container' : appType,
                container_image: sourceMode === 'package' ? containerImage.trim() : undefined,
                cloud_image_name: sourceMode === 'cloud_image' ? cloudImageName : undefined,
                cloud_image_channel: sourceMode === 'cloud_image' ? cloudImageChannel : undefined,
                // Every container app gets an encrypted, vault-backed persistent
                // volume mounted at /data. This is enclave-sealed storage that
                // survives stop/start and image upgrades; the deployer reserves a
                // key handle and mints the DEK in the fleet vault. The key
                // provider is defaulted server-side. Omitting this leaves the
                // volume off, so the container's /data is lost on every restart.
                container_storage: isContainerApp ? true : undefined
            });

            if (sourceMode === 'upload' && file) {
                await uploadCwasm(session.accessToken, app.id, file);
            }

            // Persist the App Store listing so the app is deploy-ready. We send the
            // user-edited Description/Category/Tagline plus any other fields the
            // manifest supplied (retained in storeExtra) so nothing is lost.
            await updateStoreListing(session.accessToken, app.id, {
                store_tagline: tagline.trim() || storeExtra?.tagline || '',
                store_description: description.trim(),
                store_category: category.trim(),
                store_icon_url: storeExtra?.icon_url || '',
                store_screenshots: storeExtra?.screenshots || [],
                store_privacy_url: storeExtra?.privacy_url || '',
                store_tos_url: storeExtra?.tos_url || '',
                store_website_url: storeExtra?.website_url || '',
                store_support_email: storeExtra?.support_email || '',
                store_keywords: storeExtra?.keywords || ''
            });

            window.dispatchEvent(new Event('apps:changed'));
            router.push(`/dashboard/apps/${app.id}?tab=store`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
            setSubmitting(false);
        }
    }, [session?.accessToken, sourceMode, name, parsed, file, commitUrl, submitting, appType, containerImage, cloudImageName, cloudImageChannel, description, category, tagline, storeExtra]);


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
                                if (sourceMode === 'package' || sourceMode === 'cloud_image') setSourceMode('github');
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
                                {m === 'github' ? 'GitHub' : m === 'package' ? 'Package URL' : m === 'cloud_image' ? 'Cloud-optimised image' : 'Upload .cwasm'}
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

                    {sourceMode === 'cloud_image' && (() => {
                        // Group cached images by (name, channel). Each group represents one deployable
                        // image that may be present in several zones; the manager picks the right zone
                        // automatically at deploy time.
                        const groups = new Map<string, CachedImage>();
                        for (const ci of cachedImages) {
                            const key = `${ci.name}|${ci.channel}`;
                            const existing = groups.get(key);
                            if (!existing || ci.created_at > existing.created_at) groups.set(key, ci);
                        }
                        const channels = Array.from(new Set(cachedImages
                            .filter(ci => !cloudImageName || ci.name === cloudImageName)
                            .map(ci => ci.channel))).sort();
                        const selected = cloudImageName && cloudImageChannel
                            ? groups.get(`${cloudImageName}|${cloudImageChannel}`) ?? null
                            : null;
                        const allZonesForSelection = selected
                            ? cachedImages.filter(ci => ci.name === selected.name && ci.channel === selected.channel)
                            : [];
                        return (
                            <div className="space-y-3">
                                {cachedImages.length === 0 ? (
                                    <p className="text-xs text-black/40 dark:text-white/40">
                                        No cloud-optimised images are currently published.
                                    </p>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Image</label>
                                            <select
                                                value={cloudImageName}
                                                onChange={(e) => setCloudImageName(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                                autoFocus
                                            >
                                                <option value="">Select an image...</option>
                                                {Array.from(new Set(cachedImages.map(ci => ci.name))).sort().map(n => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {cloudImageName && (
                                            <div>
                                                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Channel</label>
                                                <div className="flex gap-2">
                                                    {channels.map(ch => (
                                                        <button
                                                            key={ch}
                                                            type="button"
                                                            onClick={() => setCloudImageChannel(ch)}
                                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                                cloudImageChannel === ch
                                                                    ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                                                                    : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                                                            }`}
                                                        >
                                                            {ch}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selected && (
                                            <div className="p-3 rounded-lg bg-black/3 dark:bg-white/5 text-sm space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-black/50 dark:text-white/50 shrink-0">Source:</span>
                                                    <code className="font-mono text-xs break-all">{selected.source_ref || '(unknown)'}</code>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-black/50 dark:text-white/50">Digest:</span>
                                                    <code className="font-mono text-xs">{selected.digest}</code>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-black/50 dark:text-white/50 shrink-0">Available in:</span>
                                                    <span className="text-xs">{allZonesForSelection.map(ci => ci.zone).sort().join(', ')}</span>
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-xs text-black/40 dark:text-white/40">
                                            Cloud-optimised images are pre-published per cloud and skip the network
                                            pull. The enclave manager mounts the labeled disk and verifies its OCI
                                            layout against the source digest.
                                        </p>
                                    </>
                                )}
                            </div>
                        );
                    })()}

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
                    onEdit={() => setCurrentStep(3)}
                >
                    <div className="space-y-3">
                        <NameInput
                            name={name} setName={setName}
                            nameStatus={nameStatus} nameReason={nameReason}
                            disabled={submitting}
                        />
                        <button
                            type="button"
                            onClick={() => setCurrentStep(4)}
                            disabled={!isNameComplete}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                        >
                            Next
                        </button>
                    </div>
                </CollapsibleStep>

                {/* ── Step 4: App Store listing & create ── */}
                <CollapsibleStep
                    step={4} label="App Store listing" summary={currentStep > 4 ? category : ''}
                    active={currentStep === 4} done={false} last
                >
                    <div className="space-y-4">
                        <p className="text-xs text-black/40 dark:text-white/40">
                            A short listing is required before the app can be deployed.
                            {previewing && ' Checking your privasys.json…'}
                            {prefilled && !previewing && ' Pre-filled from your privasys.json — edit if you like.'}
                        </p>
                        <div>
                            <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Description<span className="text-red-500"> *</span></label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={4}
                                maxLength={4000}
                                placeholder="What your app does, the problems it solves, key features and privacy guarantees…"
                                className="w-full px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 placeholder:text-black/30 dark:placeholder:text-white/30 resize-y"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Category<span className="text-red-500"> *</span></label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                >
                                    <option value="">Select a category…</option>
                                    {STORE_CATEGORIES.map(c => (<option key={c} value={c}>{c}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Tagline</label>
                                <input
                                    type="text"
                                    value={tagline}
                                    onChange={e => setTagline(e.target.value)}
                                    maxLength={120}
                                    placeholder="A short, catchy one-liner"
                                    className="w-full px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 placeholder:text-black/30 dark:placeholder:text-white/30"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-black/40 dark:text-white/40">
                            You can add an icon, screenshots and links on the App Store tab after creating.
                            {(appType === 'container' || sourceMode === 'package' || sourceMode === 'cloud_image') && <> The container port is assigned automatically; your container must listen on <code className="font-mono text-black/60 dark:text-white/60">PORT</code>.</>}
                        </p>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                        >
                            {submitting ? 'Creating...' : 'Create application'}
                        </button>
                    </div>
                </CollapsibleStep>
            </div>

            {/* Status message */}
            {submitting && (
                <div className="mt-2 flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
                    <Spinner />
                    {sourceMode === 'github' && parsed
                        ? `Creating application from ${parsed.owner}/${parsed.repo}...`
                        : sourceMode === 'package'
                            ? 'Creating application from package...'
                            : sourceMode === 'cloud_image'
                                ? `Creating application from cloud image ${cloudImageName}/${cloudImageChannel}...`
                                : 'Creating application...'}
                </div>
            )}
        </div>
    );
}

