// Streaming, multi-algorithm file hasher for the connect screen.
//
// crypto.subtle has no incremental API, so we stream the file through
// hash-wasm's incremental hashers in bounded 8 MB slices — the whole file is
// never held in memory, so multi-gigabyte files hash fine. The file never
// leaves the browser. Ported from the legacy explorer.js file-hash tile, now
// using the hash-wasm npm package instead of the vendored UMD bundle.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    createSHA256,
    createSHA1,
    createSHA384,
    createSHA512,
    createSHA3,
    createBLAKE2b,
    createBLAKE3,
    createMD5,
    type IHasher
} from 'hash-wasm';
import { formatBytes } from '~/lib/app-api';

interface HashAlgo {
    label: string;
    create: () => Promise<IHasher>;
}

const HASH_ALGOS: Record<string, HashAlgo> = {
    'sha256': { label: 'SHA-256', create: () => createSHA256() },
    'sha1': { label: 'SHA-1', create: () => createSHA1() },
    'sha384': { label: 'SHA-384', create: () => createSHA384() },
    'sha512': { label: 'SHA-512', create: () => createSHA512() },
    'sha3-256': { label: 'SHA3-256', create: () => createSHA3(256) },
    'blake2b-256': { label: 'BLAKE2b-256', create: () => createBLAKE2b(256) },
    'blake3': { label: 'BLAKE3', create: () => createBLAKE3() },
    'md5': { label: 'MD5', create: () => createMD5() }
};

const ALGO_ORDER = ['sha256', 'sha1', 'sha384', 'sha512', 'sha3-256', 'blake2b-256', 'blake3', 'md5'];

const CHUNK = 8 * 1024 * 1024; // 8 MB resident at a time

async function hashFileStreaming(file: File, algoKey: string, onProgress: (_done: number, _total: number) => void): Promise<string> {
    const spec = HASH_ALGOS[algoKey] || HASH_ALGOS.sha256;
    const hasher = await spec.create();
    hasher.init();
    let offset = 0;
    while (offset < file.size) {
        const end = Math.min(offset + CHUNK, file.size);
        const buf = await file.slice(offset, end).arrayBuffer();
        hasher.update(new Uint8Array(buf));
        offset = end;
        onProgress(offset, file.size);
    }
    return hasher.digest('hex');
}

interface HashResult {
    fileName: string;
    fileSize: number;
    algoLabel: string;
    pct: number;
    status: string;
    hex?: string;
    error?: string;
}

export function FileHashTile() {
    const [algo, setAlgo] = useState('sha256');
    const [dragOver, setDragOver] = useState(false);
    const [result, setResult] = useState<HashResult | null>(null);
    const [copied, setCopied] = useState(false);
    const busyRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // A file dropped anywhere else on the page would make the browser navigate
    // to it. Swallow drops document-wide so only the drop zone acts.
    useEffect(() => {
        const swallow = (e: DragEvent) => e.preventDefault();
        document.addEventListener('dragover', swallow);
        document.addEventListener('drop', swallow);
        return () => {
            document.removeEventListener('dragover', swallow);
            document.removeEventListener('drop', swallow);
        };
    }, []);

    const handleFile = useCallback(async (file: File) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setCopied(false);
        const algoKey = algo;
        const algoLabel = (HASH_ALGOS[algoKey] || HASH_ALGOS.sha256).label;
        setResult({ fileName: file.name || '(unnamed file)', fileSize: file.size, algoLabel, pct: 0, status: 'Reading… 0%' });
        const started = Date.now();
        try {
            const hex = await hashFileStreaming(file, algoKey, (done, total) => {
                const pct = total ? Math.round((done / total) * 100) : 100;
                setResult((r) => r && { ...r, pct, status: `Reading… ${pct}%  (${formatBytes(done)} / ${formatBytes(total)})` });
            });
            const secs = (Date.now() - started) / 1000;
            setResult((r) => r && { ...r, pct: 100, status: `Hashed ${formatBytes(file.size)} locally in ${secs.toFixed(1)}s`, hex });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setResult((r) => r && { ...r, error: `Could not hash the file: ${msg}` });
        } finally {
            busyRef.current = false;
        }
    }, [algo]);

    return (
        <div className='rounded-2xl border border-black/8 dark:border-white/10 p-6'>
            <h2 className='text-lg font-semibold tracking-tight'>Compute a file hash</h2>
            <p className='mt-1 text-sm text-black/55 dark:text-white/55'>
                Drop a file to hash it in your browser. The file never leaves your device: it is streamed through the hash in chunks, so multi-gigabyte files work without loading them into memory.
            </p>

            <label htmlFor='hash-algo-select' className='mt-5 block text-xs font-medium text-black/50 dark:text-white/50'>Algorithm</label>
            <select
                id='hash-algo-select'
                value={algo}
                onChange={(e) => setAlgo(e.target.value)}
                className='mt-1.5 w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/15 dark:focus:ring-white/20'
            >
                {ALGO_ORDER.map((k) => <option key={k} value={k}>{HASH_ALGOS[k].label}</option>)}
            </select>

            <div
                role='button'
                tabIndex={0}
                aria-label='Choose a file or drop it here to hash'
                onClick={() => { if (!busyRef.current) inputRef.current?.click(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!busyRef.current) inputRef.current?.click(); } }}
                onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer?.files?.[0];
                    if (f) void handleFile(f);
                }}
                className={`mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
                    dragOver
                        ? 'border-blue-500 bg-blue-500/5 dark:border-blue-400 dark:bg-blue-400/10'
                        : 'border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30'
                }`}
            >
                <input
                    ref={inputRef}
                    type='file'
                    hidden
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) void handleFile(f);
                    }}
                />
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' aria-hidden className='text-black/40 dark:text-white/40'>
                    <path d='M12 15V4' />
                    <path d='M8 8l4-4 4 4' />
                    <path d='M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3' />
                </svg>
                <span className='text-sm'><strong>Drop a file here</strong> or <span className='text-blue-600 dark:text-blue-400'>browse</span></span>
                <span className='text-xs text-black/40 dark:text-white/40'>Hashed locally · large files (1&nbsp;GB+) supported</span>
            </div>

            {result && (
                <div className='mt-4 rounded-xl border border-black/8 dark:border-white/10 p-4'>
                    <div className='flex items-baseline justify-between gap-3'>
                        <span className='text-sm font-medium truncate'>{result.fileName}</span>
                        <span className='text-xs text-black/40 dark:text-white/40 shrink-0'>{formatBytes(result.fileSize)}</span>
                    </div>
                    <div className='mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10'>
                        <div className='h-full rounded-full bg-blue-500 transition-[width]' style={{ width: `${result.pct}%` }} />
                    </div>
                    <div className='mt-1.5 text-xs text-black/45 dark:text-white/45'>{result.status}</div>
                    {result.error && <div className='mt-2 text-sm text-red-600 dark:text-red-400'>{result.error}</div>}
                    {result.hex && (
                        <div className='mt-3'>
                            <div className='text-[11px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40'>{result.algoLabel}</div>
                            <div className='mt-1 flex items-center gap-2'>
                                <span className='font-mono text-xs break-all'>{result.hex}</span>
                                <button
                                    type='button'
                                    title='Copy'
                                    onClick={() => { navigator.clipboard.writeText(result.hex ?? '').catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                                    className='shrink-0 rounded-md border border-black/10 dark:border-white/15 px-2 py-1 text-[11px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                                >
                                    {copied ? 'Copied ✓' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
