import { composePlugins, withNx } from '@nx/next';

const nextConfig = {
    nx: { svgr: false },
    transpilePackages: ['@privasys/ui'],
    output: 'export',
    trailingSlash: true,
    poweredByHeader: false,
    images: { unoptimized: true }
};

const plugins = [withNx];
export default composePlugins(...plugins)(nextConfig);
