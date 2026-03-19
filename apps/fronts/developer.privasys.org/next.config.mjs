import { execSync } from 'node:child_process';
import { composePlugins, withNx } from '@nx/next';

let gitSha = '';
try {
    gitSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch { /* not in a git repo */ }

const nextConfig = {
    nx: { svgr: false },
    output: 'standalone',
    transpilePackages: ['@privasys/ui'],
    trailingSlash: true,
    poweredByHeader: false,
    env: {
        NEXT_PUBLIC_GIT_SHA: gitSha,
        NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || '0.1.0',
    },
};

const plugins = [withNx];
export default composePlugins(...plugins)(nextConfig);
