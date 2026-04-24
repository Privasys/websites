import { execSync } from 'node:child_process';
import { composePlugins, withNx } from '@nx/next';

let gitSha = '';
try {
    gitSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch { /* not in a git repo */ }

const nextConfig = {
    nx: { svgr: false },
    output: 'standalone',
    transpilePackages: ['@privasys/ui', '@privasys/attestation-view'],
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
