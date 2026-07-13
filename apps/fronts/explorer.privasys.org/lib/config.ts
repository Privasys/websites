// Environment presets and connection resolution for the WASM App Explorer.
//
// Ported verbatim from the legacy vanilla-JS explorer.js so the connect
// screen behaves identically: an app name plus an environment is enough to
// derive the management-service base URL and the RA-TLS gateway domain, while
// a full endpoint URL (or explicit base URL) overrides the preset.

export type EnvKey = 'production' | 'development';

export interface EnvPreset {
    baseUrl: string;
    gatewayDomain: string;
    authOrigin: string;
}

export const ENV_CONFIG: Record<EnvKey, EnvPreset> = {
    production: { baseUrl: 'https://api.developer.privasys.org', gatewayDomain: 'apps.privasys.org', authOrigin: 'https://privasys.id' },
    development: { baseUrl: 'https://api-test.developer.privasys.org', gatewayDomain: 'apps-test.privasys.org', authOrigin: 'https://privasys.id' }
};

export const DEFAULT_BROKER_URL = 'wss://relay.privasys.org/relay';
export const FIDO2_TIMEOUT = 120000;
export const DEFAULT_ATTESTATION_SERVER = 'https://as.privasys.org';

// The resolved, ready-to-use connection the connected view runs against.
export interface ConnectionConfig {
    appName: string;
    baseUrl: string;
    env: EnvKey;
    gatewayDomain: string;
    gatewayUrl: string;
    brokerUrl: string;
    attestationServerUrl: string;
    attestationServerToken: string;
    // When true (a URL-driven deep link), the attestation tab inspects the
    // certificate immediately instead of waiting for a click.
    autoInspect?: boolean;
}

// Raw form fields the connect screen collects.
export interface ConnectFormValues {
    appName: string;
    env: EnvKey;
    endpointUrl: string;
    baseUrl: string;
    gatewayDomain: string;
    brokerUrl: string;
    attestationServerUrl: string;
    attestationServerToken: string;
}

const stripTrailingSlash = (s: string): string => s.replace(/\/+$/, '');

// Build a ready-to-use connection from URL query params so the explorer can be
// deep-linked straight to an app's Remote Attestation, e.g.
//   /?app=wasm-app-example&env=development
// `app` (or `appName`/`name`) is required; `env` (or `environment`) accepts
// production/development and the short forms prod/dev/test. Everything else
// uses the environment preset, with quote verification enabled. Returns null
// when no app is given (fall back to the connect screen).
export function connectionFromParams(params: URLSearchParams): ConnectionConfig | null {
    const appName = (params.get('app') || params.get('appName') || params.get('name') || '').trim();
    if (!appName) return null;

    const envRaw = (params.get('env') || params.get('environment') || '').trim().toLowerCase();
    const env: EnvKey = envRaw === 'development' || envRaw === 'dev' || envRaw === 'test' ? 'development' : 'production';

    const resolved = resolveConnection({
        appName,
        env,
        endpointUrl: '',
        baseUrl: '',
        gatewayDomain: '',
        brokerUrl: '',
        attestationServerUrl: DEFAULT_ATTESTATION_SERVER,
        attestationServerToken: ''
    });
    if ('error' in resolved) return null;
    return { ...resolved, autoInspect: true };
}

// Resolve the raw connect-form values into a ConnectionConfig, mirroring the
// legacy handleConnect(). Returns a string error message when the app name /
// base URL cannot be determined.
export function resolveConnection(form: ConnectFormValues): ConnectionConfig | { error: string } {
    const fullInput = form.endpointUrl.trim();
    const baseInput = form.baseUrl.trim();
    const nameInput = form.appName.trim();
    const env = ENV_CONFIG[form.env];

    let baseUrl = '';
    let appName = '';

    if (fullInput) {
        const match = fullInput.match(/^(https?:\/\/[^/]+(?:\/[^/]+)*?)\/api\/v1\/apps\/([^/?#]+)\/?$/i);
        if (match) {
            baseUrl = match[1];
            appName = decodeURIComponent(match[2]);
        } else {
            baseUrl = fullInput;
            appName = nameInput;
        }
    } else if (nameInput) {
        baseUrl = baseInput || env.baseUrl;
        appName = nameInput;
    } else if (baseInput) {
        baseUrl = baseInput;
        appName = nameInput;
    }

    if (!baseUrl || !appName) {
        return { error: 'Enter an app name to connect.' };
    }

    const gatewayDomain = form.gatewayDomain.trim() || env.gatewayDomain;
    const brokerUrl = form.brokerUrl.trim() || DEFAULT_BROKER_URL;

    return {
        appName,
        baseUrl: stripTrailingSlash(baseUrl),
        env: form.env,
        gatewayDomain,
        gatewayUrl: `${appName}.${gatewayDomain}`,
        brokerUrl,
        attestationServerUrl: stripTrailingSlash(form.attestationServerUrl.trim()),
        attestationServerToken: form.attestationServerToken.trim()
    };
}
