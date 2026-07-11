// Embeds the REAL shared @privasys/attestation-view React component into the
// vanilla-JS explorer, so the attestation tab is identical to the portal and
// can never drift. Bundled by scripts/build-attestation.cjs (esbuild + the
// Tailwind CSS generated from tailwind.css) into a single self-contained
// attestation.bundle.js. The component is rendered inside a shadow root with
// its Tailwind CSS injected there, so its utility classes are isolated from the
// explorer's own same-named utilities (.flex, .text-xs, …) and vice versa.

import { createRoot } from 'react-dom/client';
import {
    useAttestation,
    AttestationConnect,
    AttestationResultView
} from '@privasys/attestation-view';
import twcss from './tailwind.generated.css';

interface MountConfig {
    /** Full attestation endpoint, e.g. https://api.../api/v1/apps/<name>/attest */
    attestUrl: string;
    /** Attestation-server verify-quote endpoint (enables quote signature check). */
    verifyQuoteUrl?: string;
    /** Lazily mint / return a bearer token for the verify-quote call. */
    getVerifyToken?: () => Promise<string>;
}

function AttestationApp({ config }: { config: MountConfig }) {
    const [state, actions] = useAttestation({
        attestUrl: config.attestUrl,
        verifyQuoteUrl: config.verifyQuoteUrl,
        verifyQuoteToken: config.getVerifyToken,
        autoVerifyQuote: !!config.verifyQuoteUrl
    });

    if (!state.result) {
        return (
            <AttestationConnect
                state={state}
                actions={actions}
                title="Remote Attestation"
                description="Connect to the enclave via RA-TLS and inspect the x.509 certificate, attestation quote, and all custom attestation extensions."
            />
        );
    }

    return (
        <AttestationResultView
            result={state.result}
            quoteVerify={state.quoteVerify}
            quoteVerifying={state.verifying}
            quoteVerifyError={state.quoteVerifyError}
            onRefresh={() => void actions.inspect()}
            onReset={() => void actions.newChallenge()}
            challenge={state.challenge}
            onChallengeChange={actions.setChallenge}
            onRegenerateChallenge={actions.regenerateChallenge}
            loading={state.loading}
            verifyQuoteUrl={config.verifyQuoteUrl}
        />
    );
}

interface MountHandle { unmount: () => void; }

function mount(host: HTMLElement, config: MountConfig): MountHandle {
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    if (!shadow.querySelector('style[data-privasys-attest]')) {
        const style = document.createElement('style');
        style.setAttribute('data-privasys-attest', '');
        style.textContent = twcss as unknown as string;
        shadow.appendChild(style);
    }
    let container = shadow.querySelector('div[data-attest-root]') as HTMLElement | null;
    if (!container) {
        container = document.createElement('div');
        container.setAttribute('data-attest-root', '');
        shadow.appendChild(container);
    }
    const root = createRoot(container);
    root.render(<AttestationApp config={config} />);
    return { unmount: () => root.unmount() };
}

declare global {
    interface Window { PrivasysAttestationView?: { mount: typeof mount }; }
}

window.PrivasysAttestationView = { mount };
