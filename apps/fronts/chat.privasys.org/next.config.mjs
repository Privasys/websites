import { execSync } from 'node:child_process';
import { composePlugins, withNx } from '@nx/next';

let gitSha = '';
try {
    gitSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch { /* not in a git repo */ }

// The Privasys Harness replaced chat on 2026-09-09. This front now exists
// only to send every visitor to the harness served from its own enclave
// (the enclave-served origin standard: the vanity host is a 301). The
// target is per environment (deploy-chat.yml sets it): the prod harness for
// chat.privasys.org, the dev harness for chat.test.privasys.org.
const harnessHost = process.env.NEXT_PUBLIC_HARNESS_HOST || 'harness.apps.privasys.org';

const nextConfig = {
    nx: { svgr: false },
    output: 'standalone',
    async redirects() {
        return [
            {
                source: '/:path*',
                destination: `https://${harnessHost}/`,
                permanent: true,
            },
        ];
    },
    transpilePackages: ['@privasys/ui', '@privasys/attestation-view', '@privasys/drive-client'],
    trailingSlash: true,
    poweredByHeader: false,
    env: {
        NEXT_PUBLIC_GIT_SHA: gitSha,
        NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || '0.1.0',
        // Default points to the public Privasys management-service. Override per-deployment.
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.developer.privasys.org',
        // Default chat instance when the user hits chat.privasys.org/ (no instance).
        NEXT_PUBLIC_DEFAULT_INSTANCE: process.env.NEXT_PUBLIC_DEFAULT_INSTANCE || 'demo',
    },
};

const plugins = [withNx];
export default composePlugins(...plugins)(nextConfig);
