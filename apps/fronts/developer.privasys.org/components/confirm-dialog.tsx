'use client';

// The portal's own confirmation dialog, in place of the browser's confirm().
// `const confirm = useConfirm();` then `if (!(await confirm({...}))) return;`.
// A destructive action can ask for a name to be typed before it unlocks.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface ConfirmOptions {
    title: string;
    body?: ReactNode;
    /** The button names the outcome: "Delete volume", not "OK". */
    confirmLabel: string;
    cancelLabel?: string;
    danger?: boolean;
    /** When set, the confirm button unlocks only once this exact text is typed. */
    typeToConfirm?: string;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
    const fn = useContext(ConfirmContext);
    if (!fn) throw new Error('useConfirm needs a ConfirmProvider above it');
    return fn;
}

interface Pending extends ConfirmOptions {
    resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<Pending | null>(null);

    const confirm = useCallback<ConfirmFn>(opts => new Promise(resolve => {
        setPending(prev => {
            prev?.resolve(false);
            return { ...opts, resolve };
        });
    }), []);

    const close = useCallback((ok: boolean) => {
        setPending(prev => {
            prev?.resolve(ok);
            return null;
        });
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {pending && <ConfirmDialog key={pending.title} opts={pending} onClose={close} />}
        </ConfirmContext.Provider>
    );
}

function ConfirmDialog({ opts, onClose }: { opts: ConfirmOptions; onClose: (ok: boolean) => void }) {
    const [typed, setTyped] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const locked = opts.typeToConfirm !== undefined && typed !== opts.typeToConfirm;

    useEffect(() => {
        (opts.typeToConfirm !== undefined ? inputRef.current : confirmRef.current)?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [opts.typeToConfirm, onClose]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => onClose(false)}>
            <div
                role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
                className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-5 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <h3 id="confirm-title" className="text-base font-semibold">{opts.title}</h3>
                {opts.body && <div className="text-sm text-black/60 dark:text-white/60 space-y-2">{opts.body}</div>}
                {opts.typeToConfirm !== undefined && (
                    <label className="block text-sm">
                        <span className="text-black/60 dark:text-white/60">
                            Type <span className="font-mono font-medium text-black dark:text-white">{opts.typeToConfirm}</span> to confirm
                        </span>
                        <input
                            ref={inputRef} value={typed} onChange={e => setTyped(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !locked) onClose(true); }}
                            autoComplete="off" spellCheck={false}
                            className="mt-1.5 w-full px-3 py-2 text-sm font-mono rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                        />
                    </label>
                )}
                <div className="flex justify-end gap-2">
                    <button onClick={() => onClose(false)} className="px-3 py-1.5 text-sm rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
                        {opts.cancelLabel ?? 'Cancel'}
                    </button>
                    <button
                        ref={confirmRef} onClick={() => onClose(true)} disabled={locked}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg disabled:opacity-40 ${opts.danger
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-80'}`}
                    >
                        {opts.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
