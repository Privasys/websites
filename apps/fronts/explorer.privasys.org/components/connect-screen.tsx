// Connect screen: the app/endpoint form (left) plus the local file-hash tile
// (right). Ported from the legacy explorer.js connect card + index.html form.
// Resolving the form yields a ConnectionConfig that flips the app into the
// connected view.

'use client';

import { useEffect, useState } from 'react';
import {
    ENV_CONFIG,
    DEFAULT_BROKER_URL,
    DEFAULT_ATTESTATION_SERVER,
    resolveConnection,
    type ConnectFormValues,
    type ConnectionConfig,
    type EnvKey
} from '~/lib/config';
import { getPrivasys, mintAudienceToken } from '~/lib/privasys-sdk';

const INITIAL_FORM: ConnectFormValues = {
    appName: '',
    env: 'production',
    endpointUrl: '',
    baseUrl: ENV_CONFIG.production.baseUrl,
    gatewayDomain: ENV_CONFIG.production.gatewayDomain,
    brokerUrl: DEFAULT_BROKER_URL,
    attestationServerUrl: DEFAULT_ATTESTATION_SERVER,
    attestationServerToken: ''
};

const inputClass = 'w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-black/15 dark:focus:ring-white/20';
const labelClass = 'mt-4 block text-xs font-medium text-black/60 dark:text-white/60';
const hintClass = 'mt-1 text-[11px] text-black/40 dark:text-white/40';

export function ConnectScreen({ onConnect }: { onConnect: (_c: ConnectionConfig) => void }) {
    const [form, setForm] = useState<ConnectFormValues>(INITIAL_FORM);
    const [error, setError] = useState<string | null>(null);
    const [tokenBtnLabel, setTokenBtnLabel] = useState('Get Token');
    const [tokenBusy, setTokenBusy] = useState(false);

    const set = <K extends keyof ConnectFormValues>(key: K, value: ConnectFormValues[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    // Pre-fill from URL params (?name/app/base/url/as/broker/env). Read on the
    // client only — the page is statically pre-rendered.
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        setForm((f) => {
            const next = { ...f };
            const name = p.get('name') || p.get('app');
            if (name) next.appName = name;
            if (p.get('base')) next.baseUrl = p.get('base') as string;
            if (p.get('url')) next.endpointUrl = p.get('url') as string;
            if (p.get('as')) next.attestationServerUrl = p.get('as') as string;
            if (p.get('broker')) next.brokerUrl = p.get('broker') as string;
            const env = p.get('env');
            if (env === 'production' || env === 'development') {
                next.env = env;
                next.baseUrl = ENV_CONFIG[env].baseUrl;
                next.gatewayDomain = ENV_CONFIG[env].gatewayDomain;
            }
            return next;
        });
    }, []);

    // Switching environment resets the management base URL and gateway domain to
    // the preset for that environment (mirrors the legacy env selector).
    const onEnvChange = (env: EnvKey) => {
        setForm((f) => ({ ...f, env, baseUrl: ENV_CONFIG[env].baseUrl, gatewayDomain: ENV_CONFIG[env].gatewayDomain }));
    };

    const handleConnect = () => {
        const resolved = resolveConnection(form);
        if ('error' in resolved) {
            setError(resolved.error);
            return;
        }
        setError(null);
        onConnect(resolved);
    };

    const onFieldKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConnect();
    };

    // "Get Token" only works against as.privasys.org (or the empty default),
    // which trusts the Privasys.id issuer; self-hosted servers need a manual
    // token.
    const asNorm = form.attestationServerUrl.trim().toLowerCase().replace(/\/+$/, '');
    const tokenBtnEnabled = (asNorm === 'https://as.privasys.org' || asNorm === '') && !tokenBusy;

    const handleGetToken = async () => {
        setTokenBusy(true);
        setTokenBtnLabel('Signing in…');
        try {
            if (!getPrivasys()) {
                throw new Error('Auth SDK not loaded. The hosted privasys-auth-client.iife.js bundle on privasys.id may be unavailable.');
            }
            const token = await mintAudienceToken(form.env, 'attestation-server');
            if (!token) throw new Error('No token returned');
            set('attestationServerToken', token);
            setTokenBtnLabel('✓ Token set');
            setTimeout(() => setTokenBtnLabel('Get Token'), 1500);
        } catch (err) {
            setTokenBtnLabel('Get Token');
            const msg = err instanceof Error ? err.message : String(err);
            // "Authentication cancelled" is the user closing the SDK iframe.
            if (!/cancelled/i.test(msg)) alert(`Failed to obtain token: ${msg}`);
        } finally {
            setTokenBusy(false);
        }
    };

    return (
        <div>
            <section className='mb-10'>
                <h1 className='text-4xl lg:text-5xl font-semibold tracking-tight'>App Explorer</h1>
                <p className='mt-4 max-w-2xl text-black/60 dark:text-white/60'>
                    Connect to a confidential app running inside a hardware-protected enclave. Inspect its
                    remote attestation, authenticate with a passkey or the Privasys wallet, and call its API,
                    all verified independently through the Privasys gateway.
                </p>
            </section>

            <div className='max-w-xl'>
                {/* Connect card */}
                <div className='rounded-2xl border border-black/8 dark:border-white/10 p-6'>
                    <h2 className='text-lg font-semibold tracking-tight'>Connect to an app</h2>
                    <p className='mt-1 text-sm text-black/55 dark:text-white/55'>
                        Enter an app name to explore its attestation and API through the Privasys gateway.
                    </p>

                    <fieldset className='mt-5'>
                        <legend className='text-[11px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40'>Application</legend>

                        <label htmlFor='app-name-input' className={labelClass}>App name</label>
                        <input id='app-name-input' type='text' autoFocus value={form.appName} placeholder='wasm-app-example' onChange={(e) => set('appName', e.target.value)} onKeyDown={onFieldKeyDown} className={inputClass} />
                        <p className={hintClass}>The app name as deployed on the platform (e.g. <code>wasm-app-example</code>).</p>

                        <label htmlFor='env-select' className={labelClass}>Environment</label>
                        <select id='env-select' value={form.env} onChange={(e) => onEnvChange(e.target.value as EnvKey)} className={inputClass}>
                            <option value='production'>Production</option>
                            <option value='development'>Development</option>
                        </select>

                        <label htmlFor='endpoint-input' className={labelClass}>Full endpoint URL <span className='text-black/35 dark:text-white/35'>(optional)</span></label>
                        <input id='endpoint-input' type='text' value={form.endpointUrl} placeholder='https://api.developer.privasys.org/api/v1/apps/wasm-app-example' onChange={(e) => set('endpointUrl', e.target.value)} onKeyDown={onFieldKeyDown} className={inputClass} />
                        <p className={hintClass}>Overrides the default management service if provided.</p>

                        <label htmlFor='base-url-input' className={labelClass}>Management service URL</label>
                        <input id='base-url-input' type='text' value={form.baseUrl} placeholder={ENV_CONFIG[form.env].baseUrl} onChange={(e) => set('baseUrl', e.target.value)} onKeyDown={onFieldKeyDown} className={inputClass} />

                        <label htmlFor='gateway-domain-input' className={labelClass}>Gateway domain</label>
                        <input id='gateway-domain-input' type='text' value={form.gatewayDomain} placeholder={ENV_CONFIG[form.env].gatewayDomain} onChange={(e) => set('gatewayDomain', e.target.value)} onKeyDown={onFieldKeyDown} className={inputClass} />
                        <p className={hintClass}>Domain suffix for RA-TLS gateway routing. Use <code>apps-test.privasys.org</code> for dev instances.</p>

                        <label htmlFor='broker-url-input' className={labelClass}>Auth broker URL <span className='text-black/35 dark:text-white/35'>(optional)</span></label>
                        <input id='broker-url-input' type='text' value={form.brokerUrl} placeholder={DEFAULT_BROKER_URL} onChange={(e) => set('brokerUrl', e.target.value)} onKeyDown={onFieldKeyDown} className={inputClass} />
                        <p className={hintClass}>WebSocket relay for wallet-to-browser authentication.</p>
                    </fieldset>

                    <fieldset className='mt-6'>
                        <legend className='text-[11px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40'>Quote verification</legend>

                        <label htmlFor='attestation-url-input' className={labelClass}>Attestation server URL</label>
                        <input id='attestation-url-input' type='text' value={form.attestationServerUrl} placeholder={DEFAULT_ATTESTATION_SERVER} onChange={(e) => set('attestationServerUrl', e.target.value)} onKeyDown={onFieldKeyDown} className={inputClass} />

                        <label htmlFor='attestation-token-input' className={labelClass}>Attestation server token <span className='text-black/35 dark:text-white/35'>(optional)</span></label>
                        <div className='mt-1.5 flex items-center gap-2'>
                            <input id='attestation-token-input' type='password' value={form.attestationServerToken} placeholder='eyJhbGciOi…' onChange={(e) => set('attestationServerToken', e.target.value)} onKeyDown={onFieldKeyDown} className={inputClass} />
                            <button
                                type='button'
                                disabled={!tokenBtnEnabled}
                                onClick={() => void handleGetToken()}
                                title={tokenBtnEnabled ? 'Sign in with Privasys.id to mint a token scoped to attestation-server' : 'Get Token only works with https://as.privasys.org. For self-hosted servers, paste a token manually.'}
                                className='shrink-0 whitespace-nowrap rounded-lg border border-black/10 dark:border-white/15 px-3 py-2 text-sm text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                            >
                                {tokenBtnLabel}
                            </button>
                        </div>
                        <p className={hintClass}>When the URL points at <code>as.privasys.org</code>, click <em>Get Token</em> to mint an audience-scoped JWT via Privasys.id. Otherwise paste a token manually.</p>
                    </fieldset>

                    {error && <p className='mt-4 text-sm text-red-600 dark:text-red-400'>{error}</p>}

                    <button
                        type='button'
                        onClick={handleConnect}
                        className='mt-6 w-full rounded-lg bg-gradient-to-br from-[#34E89E] to-[#00BCF2] text-[#0F172A] px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity'
                    >
                        Connect
                    </button>
                </div>
            </div>
        </div>
    );
}
