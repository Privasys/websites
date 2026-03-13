import { composePlugins, withNx } from '@nx/next';

const nextConfig = {
    nx: { svgr: false },
    transpilePackages: ['@privasys/ui'],
    trailingSlash: true,
    poweredByHeader: false,
};

const plugins = [withNx];
export default composePlugins(...plugins)(nextConfig);
