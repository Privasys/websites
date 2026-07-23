// API Testing tab — discovers the app's WIT schema, renders a type-aware
// parameter form per exported function, invokes it over the RA-TLS gateway and
// shows the response plus a call history. Ported from the legacy explorer.js
// API tab (loadSchema / sendRpc / renderApiTesting / createParamInput).
//
// Endpoint selection mirrors the legacy behavior: with a FIDO2 app session the
// public `/call/<fn>` path is used (X-App-Auth); otherwise the JWT-gated
// `/rpc/<fn>` path.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionConfig } from '~/lib/config';
import type { Fido2Actions, Fido2State } from '~/components/use-fido2-auth';
import { appFetch } from '~/lib/app-api';
import { getAllFunctions, witTypeLabel, defaultValueForType, type AppSchema, type FunctionSchema, type WitType } from '~/lib/wit';

interface HistoryEntry {
    id: number;
    func: string;
    params: Record<string, unknown>;
    response: string;
    status: 'ok' | 'error';
    elapsed: number;
    timestamp: Date;
}

const inputClass = 'w-full px-3 py-2 text-[13px] font-mono rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30 transition-colors placeholder:text-black/25 dark:placeholder:text-white/25';

function ParamInput({ param, value, onChange }: { param: { name: string; type: WitType }; value: unknown; onChange: (_v: unknown) => void }) {
    const ty = param.type;
    switch (ty.kind) {
        case 'bool':
            return (
                <div className='flex items-center gap-3 py-1'>
                    <button
                        type='button'
                        onClick={() => onChange(!value)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-black/15 dark:bg-white/15'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : ''}`} />
                    </button>
                    <span className='text-xs text-black/50 dark:text-white/50'>{String(!!value)}</span>
                </div>
            );
        case 'u8': case 'u16': case 'u32': case 'u64':
        case 's8': case 's16': case 's32': case 's64':
        case 'f32': case 'f64': case 'float32': case 'float64':
            return (
                <input
                    type='number'
                    value={typeof value === 'number' ? value : 0}
                    onChange={(e) => onChange(ty.kind.startsWith('f') || ty.kind.startsWith('float') ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)}
                    className={inputClass}
                    placeholder='0'
                />
            );
        case 'enum':
            return (
                <select value={String(value || '')} onChange={(e) => onChange(e.target.value)} className={inputClass}>
                    {(ty.names || []).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
            );
        case 'string': case 'char':
            return (
                <input
                    type='text'
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClass}
                    placeholder={ty.kind === 'char' ? 'single character' : `Enter ${param.name}…`}
                />
            );
        default:
            return (
                <textarea
                    value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                    onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { onChange(e.target.value); } }}
                    rows={3}
                    spellCheck={false}
                    className={`${inputClass} resize-y`}
                    placeholder='JSON value'
                />
            );
    }
}

export function ApiTestingTab({ connection, fido2, fido2Actions }: { connection: ConnectionConfig; fido2: Fido2State; fido2Actions: Fido2Actions }) {
    const [schema, setSchema] = useState<AppSchema | null>(null);
    const [schemaLoading, setSchemaLoading] = useState(true);
    const [schemaError, setSchemaError] = useState<string | null>(null);

    const [selectedFunc, setSelectedFunc] = useState('');
    const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
    // Mirror of selectedFunc for loadSchema (which must not re-run on
    // selection changes but needs the current value to preserve it).
    const selectedFuncRef = useRef('');
    useEffect(() => { selectedFuncRef.current = selectedFunc; }, [selectedFunc]);

    // Consent gate for priced calls: true = the charge strip is showing and
    // the next confirm actually sends.
    const [priceConfirm, setPriceConfirm] = useState(false);

    // The exact headers the last call sent (auth token masked) and the HTTP
    // status + interesting response headers it got back — surfaced in the
    // request/response tiles so the billing protocol is visible.
    const [reqHeaders, setReqHeaders] = useState<[string, string][] | null>(null);
    const [respMeta, setRespMeta] = useState<{ status: number; headers: [string, string][] } | null>(null);

    // An auth-gated call failed without a valid session — offer sign-in
    // inline (mounting the shared auth frame) instead of a dead end.
    const [authNeeded, setAuthNeeded] = useState(false);
    const inlineAuthRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (fido2.status === 'complete' && fido2.token) setAuthNeeded(false);
    }, [fido2.status, fido2.token]);

    const [response, setResponse] = useState<string | null>(null);
    const [responseStatus, setResponseStatus] = useState<'ok' | 'error' | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [elapsed, setElapsed] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const historyCounter = useRef(0);

    const base = connection.baseUrl;
    const appName = connection.appName;
    const token = fido2.token;

    const initParamValues = useCallback((fn: FunctionSchema) => {
        const vals: Record<string, unknown> = {};
        for (const p of fn.params) vals[p.name] = defaultValueForType(p.type);
        setParamValues(vals);
    }, []);

    const loadSchema = useCallback(() => {
        let cancelled = false;
        setSchemaLoading(true);
        setSchemaError(null);
        setSchema(null);
        appFetch<{ status: string; schema: AppSchema; message?: string }>(base, `/api/v1/apps/${encodeURIComponent(appName)}/schema`, { sessionToken: token })
            .then((resp) => {
                if (cancelled) return;
                if (!resp || resp.status !== 'schema') throw new Error(resp?.message || 'Failed to fetch schema');
                setSchema(resp.schema);
                const fns = getAllFunctions(resp.schema);
                // Keep the user's selection across schema reloads (the schema
                // refetches whenever the auth token changes — sign-in, expiry);
                // only fall back to the first function when the previous
                // selection no longer exists in the new schema.
                const prev = selectedFuncRef.current;
                if (fns.length > 0 && !fns.some((f) => f.name === prev)) {
                    setSelectedFunc(fns[0].name);
                    initParamValues(fns[0]);
                }
            })
            .catch((e: unknown) => { if (!cancelled) setSchemaError(e instanceof Error ? e.message : 'Failed to load schema'); })
            .finally(() => { if (!cancelled) setSchemaLoading(false); });
        return () => { cancelled = true; };
    }, [base, appName, token, initParamValues]);

    useEffect(() => loadSchema(), [loadSchema]);

    const getSelectedFunction = useCallback((): FunctionSchema | undefined => {
        if (!schema) return undefined;
        return getAllFunctions(schema).find((f) => f.name === selectedFunc);
    }, [schema, selectedFunc]);

    const sendCall = useCallback(async () => {
        const fn = getSelectedFunction();
        if (!fn || sending) return;
        setSending(true);
        setError(null);
        setResponse(null);
        setResponseStatus(null);
        setElapsed(null);
        const start = performance.now();
        const pushHistory = (entry: Omit<HistoryEntry, 'id'>) => {
            setHistory((prev) => [{ id: historyCounter.current++, ...entry }, ...prev].slice(0, 20));
        };
        try {
            // Always the public /call path: it forwards X-App-Auth when present
            // and allows anonymous calls to public functions (the enclave
            // enforces each function's policy). The JWT-gated /rpc path is the
            // developer-portal flow, not the explorer's.
            const rpcPath = `/api/v1/apps/${encodeURIComponent(appName)}/call/${encodeURIComponent(fn.name)}`;
            // A priced call carries the user's exact-price approval (given via
            // the charge strip) as X-Billing-Approved; the attested runtime
            // refuses priced calls without it and the platform maps refusals
            // to HTTP 402 (X-Billing-Price carries the price to approve).
            // Exempt (wallet-class) callers send no approval — they are not
            // charged and the enclave skips the requirement for them.
            const approvedCredits = callerExempt(fn) ? 0 : (fn.price?.credits ?? 0);
            const extraHeaders = approvedCredits > 0 ? { 'X-Billing-Approved': `${approvedCredits} credits` } : undefined;
            // Mirror the wire in the UI: exact request headers (token masked)
            // and, below, the response status + billing headers.
            setReqHeaders([
                ['Content-Type', 'application/json'],
                ...(token ? [['X-App-Auth', '●●●●' + token.slice(-6)] as [string, string]] : []),
                ...(extraHeaders ? Object.entries(extraHeaders) : [])
            ]);
            setRespMeta(null);
            const data = await appFetch<Record<string, unknown>>(base, rpcPath, {
                method: 'POST',
                body: JSON.stringify(paramValues),
                sessionToken: token,
                headers: extraHeaders,
                onResponse: (status, h) => {
                    const interesting: [string, string][] = [];
                    for (const name of ['x-billing-charged', 'x-billing-price', 'content-type']) {
                        const v = h.get(name);
                        if (v) interesting.push([name.replace(/\b[a-z]/g, (c) => c.toUpperCase()), v]);
                    }
                    setRespMeta({ status, headers: interesting });
                }
            });
            const ms = Math.round(performance.now() - start);
            // Detect a dead app session in a 200 response. Three shapes:
            // the enclave's original "session token expired", its clearer
            // "app session token invalid or expired" (wasm-v0.42+), and the
            // legacy JSON-parse noise a pre-v0.42 enclave emits when a stale
            // restored session token falls through to its JWT parser (seen
            // after an enclave restart/measurement rotation wiped sessions).
            const deadSession = Boolean(data && data.status === 'error' && typeof data.message === 'string' && (
                data.message.includes('session token expired') ||
                data.message.includes('session token invalid or expired') ||
                (data.message.includes('app auth failed') && data.message.includes('JWT header JSON'))
            ));
            if (deadSession) {
                fido2Actions.expireLocally();
                setAuthNeeded(true);
                setElapsed(ms);
                setError('Session expired. Please sign in again.');
                setResponseStatus('error');
                pushHistory({ func: fn.name, params: { ...paramValues }, response: 'Session expired. Please sign in again.', status: 'error', elapsed: ms, timestamp: new Date() });
                return;
            }
            // Auth-gated (or caller-priced) function called without a valid
            // session — surface the inline sign-in instead of a dead end.
            const needsAuth = Boolean(data && data.status === 'error' && typeof data.message === 'string' && data.message.includes('authentication required'));
            if (needsAuth) {
                setAuthNeeded(true);
                setElapsed(ms);
                setError('This API requires authentication. Sign in below and send again.');
                setResponseStatus('error');
                pushHistory({ func: fn.name, params: { ...paramValues }, response: 'Authentication required.', status: 'error', elapsed: ms, timestamp: new Date() });
                return;
            }
            const json = JSON.stringify(data, null, 2);
            setElapsed(ms);
            setResponse(json);
            setResponseStatus('ok');
            pushHistory({ func: fn.name, params: { ...paramValues }, response: json, status: 'ok', elapsed: ms, timestamp: new Date() });
        } catch (e) {
            const ms = Math.round(performance.now() - start);
            const msg = e instanceof Error ? e.message : 'Request failed';
            setElapsed(ms);
            setError(msg);
            setResponseStatus('error');
            pushHistory({ func: fn.name, params: { ...paramValues }, response: msg, status: 'error', elapsed: ms, timestamp: new Date() });
        } finally {
            setSending(false);
        }
    }, [getSelectedFunction, sending, token, appName, base, paramValues, fido2Actions]);

    // Ctrl/Cmd+Enter to send.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (schema) requestSend();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [schema, sendCall]);

    function handleFuncChange(name: string) {
        setSelectedFunc(name);
        setResponse(null);
        setResponseStatus(null);
        setError(null);
        setElapsed(null);
        setPriceConfirm(false);
        if (!schema) return;
        const fn = getAllFunctions(schema).find((f) => f.name === name);
        if (fn) initParamValues(fn);
    }

    // Whether the signed-in caller is exempt from a price rule: their access
    // token carries the IdP's non-identifying wallet-class marker and the rule
    // grants free_for:["wallet"]. Decoded client-side purely for UX (no strip,
    // no consent needed); the enclave makes the authoritative check.
    function callerExempt(fn?: FunctionSchema): boolean {
        if (!fn?.price?.free_for?.includes('wallet') || !token) return false;
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { wallet?: boolean | string };
            return payload.wallet === true || payload.wallet === 'true';
        } catch {
            return false;
        }
    }

    // Priced calls (x-privasys.price, attested on the schema) require explicit
    // consent per send: the first Send reveals the charge strip; only
    // "Charge & send" dispatches. Exempt callers skip the ceremony entirely.
    function requestSend() {
        const fn = getSelectedFunction();
        if ((fn?.price?.credits ?? 0) > 0 && !callerExempt(fn) && !priceConfirm) {
            setPriceConfirm(true);
            return;
        }
        setPriceConfirm(false);
        void sendCall();
    }

    function loadFromHistory(entry: HistoryEntry) {
        setSelectedFunc(entry.func);
        setParamValues(entry.params);
        setResponse(entry.response);
        setResponseStatus(entry.status);
        setElapsed(entry.elapsed);
        setError(entry.status === 'error' ? entry.response : null);
    }

    if (schemaLoading) {
        return (
            <div className='flex items-center justify-center py-16 gap-3 text-sm text-black/40 dark:text-white/40'>
                <svg className='animate-spin h-5 w-5' viewBox='0 0 24 24'><circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' /><path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z' /></svg>
                Discovering API schema…
            </div>
        );
    }

    if (schemaError) {
        return (
            <div className='flex flex-col items-center justify-center py-16 gap-3 text-center'>
                <div className='w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center'>
                    <svg className='w-5 h-5 text-amber-600 dark:text-amber-400' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
                </div>
                <p className='text-sm text-black/60 dark:text-white/60'>Could not load API schema</p>
                <p className='text-xs text-black/30 dark:text-white/30 max-w-sm'>{schemaError}</p>
                <button type='button' onClick={loadSchema} className='mt-1 rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5'>Retry</button>
            </div>
        );
    }

    const allFuncs = schema ? getAllFunctions(schema) : [];
    if (allFuncs.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center py-16 gap-3 text-center'>
                <div className='w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center'>
                    <svg className='w-5 h-5 text-black/30 dark:text-white/30' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' /></svg>
                </div>
                <p className='text-sm text-black/60 dark:text-white/60'>No exported functions</p>
                <p className='text-xs text-black/30 dark:text-white/30'>Ensure a WASM component with exports is deployed.</p>
            </div>
        );
    }

    const currentFunc = getSelectedFunction();
    const hasParams = currentFunc && currentFunc.params.length > 0;

    return (
        <div className='space-y-4'>
            {/* Inline sign-in — shown when an auth-gated call failed without a
                valid session, so the user can authenticate without leaving the
                tab. Mounts the same shared auth frame as the Authenticate tab. */}
            {authNeeded && fido2.status !== 'complete' && (
                <section className='rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-400/10 p-5'>
                    <p className='text-sm text-amber-800 dark:text-amber-300'>This API requires authentication.</p>
                    <div ref={inlineAuthRef} className='mt-3' />
                    {!fido2.signingIn && (
                        <button
                            type='button'
                            onClick={() => { if (inlineAuthRef.current) fido2Actions.signInInto(inlineAuthRef.current); }}
                            className='mt-3 rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-semibold hover:opacity-90'
                        >
                            Sign in
                        </button>
                    )}
                </section>
            )}
            {/* Request builder */}
            <section className='rounded-xl border border-black/10 dark:border-white/10 overflow-hidden'>
                <div className='flex items-stretch border-b border-black/10 dark:border-white/10'>
                    <div className='flex items-center px-3 bg-emerald-50 dark:bg-emerald-900/20 border-r border-black/10 dark:border-white/10'>
                        <span className='text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider'>POST</span>
                    </div>
                    <select
                        value={selectedFunc}
                        onChange={(e) => handleFuncChange(e.target.value)}
                        className='flex-1 px-3 py-3 text-sm font-mono bg-transparent focus:outline-none cursor-pointer'
                    >
                        {allFuncs.map((fn) => <option key={fn.name} value={fn.name}>/rpc/{schema?.name}/{fn.name}</option>)}
                    </select>
                    <button
                        type='button'
                        onClick={requestSend}
                        disabled={sending || !selectedFunc}
                        className='px-6 py-3 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40 transition-colors'
                    >
                        {sending ? <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'><circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' /><path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z' /></svg> : 'Send'}
                    </button>
                </div>

                {currentFunc && (
                    <div className='px-4 py-2.5 bg-black/2 dark:bg-white/2 border-b border-black/5 dark:border-white/5'>
                        <code className='text-xs text-black/50 dark:text-white/50'>
                            <span className='text-blue-600 dark:text-blue-400'>fn</span>{' '}
                            <span className='text-black/80 dark:text-white/80 font-medium'>{currentFunc.name}</span>
                            <span className='text-black/40 dark:text-white/40'>(</span>
                            {currentFunc.params.map((p, i) => (
                                <span key={p.name}>
                                    {i > 0 && <span className='text-black/30 dark:text-white/30'>, </span>}
                                    <span className='text-black/60 dark:text-white/60'>{p.name}</span>
                                    <span className='text-black/30 dark:text-white/30'>: </span>
                                    <span className='text-purple-600 dark:text-purple-400'>{witTypeLabel(p.type)}</span>
                                </span>
                            ))}
                            <span className='text-black/40 dark:text-white/40'>)</span>
                            {currentFunc.results.length > 0 && (
                                <>
                                    <span className='text-black/30 dark:text-white/30'> → </span>
                                    {currentFunc.results.map((r, i) => (
                                        <span key={r.name ?? i}>
                                            {i > 0 && <span className='text-black/30 dark:text-white/30'>, </span>}
                                            <span className='text-emerald-600 dark:text-emerald-400'>{witTypeLabel(r.type)}</span>
                                        </span>
                                    ))}
                                </>
                            )}
                        </code>
                        {(currentFunc.price?.credits ?? 0) > 0 && (callerExempt(currentFunc) ? (
                            <span
                                title='This function is priced, but your wallet-class session is exempt: you will not be charged.'
                                className='ml-3 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/25 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300'
                            >
                                Free for you (wallet user)
                            </span>
                        ) : (
                            <span
                                title='Developer-set per-call fee, attested in the app measurement: the price shown is exactly what the enclave charges on a successful call.'
                                className='ml-3 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/25 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300'
                            >
                                {(currentFunc.price?.credits ?? 0).toLocaleString()} credits ({((currentFunc.price?.credits ?? 0) / 1_000_000).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 4 })})
                                {currentFunc.price?.free_for?.includes('wallet') ? ' · free for wallet users' : ''}
                            </span>
                        ))}
                    </div>
                )}

                {/* Charge consent — a priced call never fires on the first
                    click; the caller confirms the attested price explicitly. */}
                {priceConfirm && (currentFunc?.price?.credits ?? 0) > 0 && (
                    <div className='flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-500/20'>
                        <span className='text-sm text-amber-800 dark:text-amber-300'>
                            This call charges <strong>{(currentFunc?.price?.credits ?? 0).toLocaleString()} credits</strong> ({((currentFunc?.price?.credits ?? 0) / 1_000_000).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 4 })}) to your account on success. The app developer earns 85%.
                        </span>
                        <button
                            type='button'
                            onClick={() => { setPriceConfirm(false); void sendCall(); }}
                            className='ml-auto shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 text-xs font-semibold'
                        >
                            Charge & send
                        </button>
                        <button
                            type='button'
                            onClick={() => setPriceConfirm(false)}
                            className='shrink-0 rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5'
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* The exact headers the last Send put on the wire. */}
                {reqHeaders && (
                    <div className='px-4 py-2 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2'>
                        <div className='text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-1'>Request headers</div>
                        {reqHeaders.map(([k, v]) => (
                            <div key={k}>
                                <code className='text-[11px] text-black/60 dark:text-white/60'>
                                    <span className={k === 'X-Billing-Approved' ? 'text-amber-700 dark:text-amber-400 font-semibold' : ''}>{k}</span>: {v}
                                </code>
                            </div>
                        ))}
                    </div>
                )}

                <div className='p-4'>
                    {hasParams ? (
                        <div className='space-y-3'>
                            <div className='text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium'>Parameters</div>
                            <div className='space-y-2.5'>
                                {currentFunc!.params.map((p) => (
                                    <div key={p.name} className='flex items-start gap-3'>
                                        <div className='flex items-center gap-1.5 min-h-[36px] min-w-[120px] shrink-0'>
                                            <span className='text-xs font-mono font-medium text-black/70 dark:text-white/70'>{p.name}</span>
                                            <span className='text-[10px] font-mono text-black/25 dark:text-white/25'>{witTypeLabel(p.type)}</span>
                                        </div>
                                        <div className='flex-1'>
                                            <ParamInput param={p} value={paramValues[p.name]} onChange={(v) => setParamValues((prev) => ({ ...prev, [p.name]: v }))} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className='flex items-center gap-2 py-2 text-xs text-black/30 dark:text-white/30'>
                            <svg className='w-4 h-4' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
                            This function takes no parameters
                        </div>
                    )}
                </div>

                <div className='px-4 py-2 border-t border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2'>
                    <span className='text-[10px] text-black/25 dark:text-white/25'>
                        Press <kbd className='px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono'>Ctrl+Enter</kbd> to send
                    </span>
                </div>
            </section>

            {/* Response */}
            {(response || error) && (
                <section className='rounded-xl border border-black/10 dark:border-white/10 overflow-hidden'>
                    <div className='flex items-center justify-between px-4 py-2.5 border-b border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2'>
                        <div className='flex items-center gap-3'>
                            <span className='text-xs font-semibold'>Response</span>
                            {responseStatus === 'ok' && (
                                <span className='flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
                                    <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />{respMeta ? `${respMeta.status} OK` : '200 OK'}
                                </span>
                            )}
                            {responseStatus === 'error' && (
                                <span className='flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400'>
                                    <span className='w-1.5 h-1.5 rounded-full bg-red-500' />{respMeta && respMeta.status >= 400 ? `HTTP ${respMeta.status}` : 'Error'}
                                </span>
                            )}
                            {elapsed != null && <span className='text-[11px] text-black/30 dark:text-white/30'>{elapsed}ms</span>}
                        </div>
                        <button
                            type='button'
                            onClick={() => { navigator.clipboard.writeText(response || error || '').catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                            className='text-[11px] text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70'
                        >
                            {copied ? 'Copied ✓' : 'Copy'}
                        </button>
                    </div>
                    {/* Response headers — mirrors the request tile's section. */}
                    {respMeta && respMeta.headers.length > 0 && (
                        <div className='px-4 py-2 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2'>
                            <div className='text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-1'>Response headers</div>
                            {respMeta.headers.map(([k, v]) => (
                                <div key={k}>
                                    <code className='text-[11px] text-black/60 dark:text-white/60'>
                                        <span className={k.toLowerCase().startsWith('x-billing') ? 'text-amber-700 dark:text-amber-400 font-semibold' : ''}>{k}</span>: {v}
                                    </code>
                                </div>
                            ))}
                        </div>
                    )}
                    {error ? (
                        <div className='p-4 text-sm text-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-900/10'>{error}</div>
                    ) : (
                        <pre className='p-4 text-xs font-mono text-black/80 dark:text-white/80 bg-black/2 dark:bg-white/2 break-all whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed'>{response}</pre>
                    )}
                </section>
            )}

            {/* History */}
            {history.length > 0 && (
                <section className='rounded-xl border border-black/10 dark:border-white/10 overflow-hidden'>
                    <div className='flex items-center justify-between px-4 py-2.5 border-b border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2'>
                        <span className='text-xs font-semibold'>History</span>
                        <button type='button' onClick={() => setHistory([])} className='text-[11px] text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60'>Clear</button>
                    </div>
                    <div className='divide-y divide-black/5 dark:divide-white/5 max-h-48 overflow-y-auto'>
                        {history.map((entry) => (
                            <button
                                key={entry.id}
                                type='button'
                                onClick={() => loadFromHistory(entry)}
                                className='w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-black/3 dark:hover:bg-white/3 transition-colors'
                            >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <span className='text-xs font-mono text-black/70 dark:text-white/70 truncate flex-1'>{entry.func}</span>
                                <span className='text-[10px] text-black/25 dark:text-white/25 shrink-0'>{entry.elapsed}ms</span>
                                <span className='text-[10px] text-black/20 dark:text-white/20 shrink-0'>{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
