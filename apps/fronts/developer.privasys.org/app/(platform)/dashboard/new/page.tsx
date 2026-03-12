'use client';

import Link from 'next/link';
import { useState } from 'react';

type Target = 'wasm' | 'container' | null;

export default function NewApplicationPage() {
    const [target, setTarget] = useState<Target>(null);

    return (
        <div className="max-w-2xl">
            <Link href="/dashboard" className="text-sm text-black/50 dark:text-white/50 hover:underline">
                &larr; Back to applications
            </Link>
            <h1 className="mt-4 text-2xl font-semibold">Create application</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Choose a deployment target and configure your application.
            </p>

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
                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                />
            </div>

            {/* WASM-specific */}
            {target === 'wasm' && (
                <div className="mt-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Source</label>
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-black/10 dark:border-white/10 cursor-pointer hover:bg-black/2 dark:hover:bg-white/3">
                                <input type="radio" name="wasm-source" value="upload" className="mt-0.5" defaultChecked />
                                <div>
                                    <div className="text-sm font-medium">Upload .cwasm file</div>
                                    <p className="text-xs text-black/50 dark:text-white/50">Upload a pre-compiled Cranelift-native WASM file.</p>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-black/10 dark:border-white/10 cursor-pointer hover:bg-black/2 dark:hover:bg-white/3">
                                <input type="radio" name="wasm-source" value="github" className="mt-0.5" />
                                <div>
                                    <div className="text-sm font-medium">GitHub repository</div>
                                    <p className="text-xs text-black/50 dark:text-white/50">Provide a repository URL and commit. We compile it via GitHub Actions.</p>
                                </div>
                            </label>
                        </div>
                    </div>
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
                    disabled={!target}
                    className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Create application
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
