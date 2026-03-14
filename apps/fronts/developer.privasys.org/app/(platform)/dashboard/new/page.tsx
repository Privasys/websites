'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useRef } from 'react';
import { createApp, uploadCwasm } from '~/lib/api';

type Target = 'wasm' | 'container' | null;

export default function NewApplicationPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [target, setTarget] = useState<Target>(null);
    const [name, setName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [description, setDescription] = useState('');
    const [source, setSource] = useState<'upload' | 'github'>('upload');
    const [commitUrl, setCommitUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    async function handleSubmit() {
        if (!session?.accessToken || !target || !name) return;
        setSubmitting(true);
        setError(null);

        try {
            const app = await createApp(session.accessToken, {
                name,
                display_name: displayName || undefined,
                description: description || undefined,
                source_type: target === 'wasm' ? source : 'upload',
                commit_url: source === 'github' ? commitUrl : undefined
            });

            if (file && target === 'wasm' && source === 'upload') {
                await uploadCwasm(session.accessToken, app.id, file);
            }

            router.push('/dashboard');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-2xl">
            <Link href="/dashboard" className="text-sm text-black/50 dark:text-white/50 hover:underline">
                &larr; Back to applications
            </Link>
            <h1 className="mt-4 text-2xl font-semibold">Create application</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Choose a deployment target and configure your application.
            </p>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Target selection */}
            <fieldset className="mt-8">
                <legend className="text-sm font-medium mb-3">Deployment target</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setTarget('wasm')}
                        className={`text-left p-4 rounded-xl border transition-colors ${
                            target === 'wasm'
                                ? 'border-black dark:border-white bg-black/3 dark:bg-white/5'
                                : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                        }`}
                    >
                        <div className="font-medium">WASM module</div>
                        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                            Deploy a WebAssembly component inside Enclave OS Mini. Smallest trust boundary.
                        </p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTarget('container')}
                        className={`text-left p-4 rounded-xl border transition-colors ${
                            target === 'container'
                                ? 'border-black dark:border-white bg-black/3 dark:bg-white/5'
                                : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                        }`}
                    >
                        <div className="font-medium">Container</div>
                        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                            Run a standard container inside Enclave OS Virtual. Full Linux, full attestation.
                        </p>
                    </button>
                </div>
            </fieldset>

            {/* Application name */}
            <div className="mt-8">
                <label htmlFor="app-name" className="block text-sm font-medium mb-2">Application name</label>
                <input
                    id="app-name"
                    type="text"
                    placeholder="my-confidential-app"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                />
                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                    3-63 lowercase alphanumeric characters or hyphens, starting with a letter.
                </p>
            </div>

            {/* Display name */}
            <div className="mt-4">
                <label htmlFor="display-name" className="block text-sm font-medium mb-2">Display name <span className="text-black/40 dark:text-white/40 font-normal">(optional)</span></label>
                <input
                    id="display-name"
                    type="text"
                    placeholder="My Confidential App"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                />
            </div>

            {/* Description */}
            <div className="mt-4">
                <label htmlFor="description" className="block text-sm font-medium mb-2">Description <span className="text-black/40 dark:text-white/40 font-normal">(optional)</span></label>
                <textarea
                    id="description"
                    rows={2}
                    placeholder="A short description of your application"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 resize-none"
                />
            </div>

            {/* WASM-specific */}
            {target === 'wasm' && (
                <div className="mt-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Source</label>
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-black/10 dark:border-white/10 cursor-pointer hover:bg-black/2 dark:hover:bg-white/3">
                                <input
                                    type="radio"
                                    name="wasm-source"
                                    value="upload"
                                    checked={source === 'upload'}
                                    onChange={() => setSource('upload')}
                                    className="mt-0.5"
                                />
                                <div>
                                    <div className="text-sm font-medium">Upload .cwasm file</div>
                                    <p className="text-xs text-black/50 dark:text-white/50">Upload a pre-compiled Cranelift-native WASM file.</p>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-black/10 dark:border-white/10 cursor-pointer hover:bg-black/2 dark:hover:bg-white/3">
                                <input
                                    type="radio"
                                    name="wasm-source"
                                    value="github"
                                    checked={source === 'github'}
                                    onChange={() => setSource('github')}
                                    className="mt-0.5"
                                />
                                <div>
                                    <div className="text-sm font-medium">GitHub repository</div>
                                    <p className="text-xs text-black/50 dark:text-white/50">Provide a repository URL and commit. We compile it via GitHub Actions.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {source === 'upload' && (
                        <div>
                            <label className="block text-sm font-medium mb-2">.cwasm file</label>
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="flex items-center justify-center w-full h-28 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl cursor-pointer hover:border-black/30 dark:hover:border-white/30 transition-colors"
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
                                        <div className="text-xs text-black/40 dark:text-white/40 mt-1">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="text-sm text-black/50 dark:text-white/50">
                                            Click to select a .cwasm file
                                        </div>
                                        <div className="text-xs text-black/30 dark:text-white/30 mt-1">Max 10 MB</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {source === 'github' && (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="commit-url" className="block text-sm font-medium mb-2">Commit URL</label>
                                <input
                                    id="commit-url"
                                    type="text"
                                    placeholder="https://github.com/your-org/your-app/commit/abc1234..."
                                    value={commitUrl}
                                    onChange={(e) => setCommitUrl(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                />
                                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                                    Paste the full commit URL from GitHub. The commit must be GPG-signed.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Container-specific */}
            {target === 'container' && (
                <div className="mt-8">
                    <label htmlFor="image-ref" className="block text-sm font-medium mb-2">Container image</label>
                    <input
                        id="image-ref"
                        type="text"
                        placeholder="ghcr.io/your-org/your-app:latest"
                        className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                    <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                        The image will be pulled into a confidential VM with encrypted memory and attested boot.
                    </p>
                </div>
            )}

            {/* Submit */}
            <div className="mt-10 flex gap-3">
                <button
                    type="button"
                    disabled={!target || !name || submitting}
                    onClick={handleSubmit}
                    className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Creating…' : 'Create application'}
                </button>
                <Link
                    href="/dashboard"
                    className="px-5 py-2 text-sm font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/3 dark:hover:bg-white/5 transition-colors"
                >
                    Cancel
                </Link>
            </div>
        </div>
    );
}
