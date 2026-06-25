import { composePlugins, withNx } from '@nx/next';

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
    nx: {
        svgr: false
    },
    experimental: {
        reactCompiler: true
    },
    transpilePackages: ['@privasys/ui', '@privasys/attestation-view'],
    output: 'export',
    trailingSlash: true,
    poweredByHeader: false,
    basePath: process.env.NX_NEXTJS_BASEPATH,
    images: {
        unoptimized: true
    }
};

const plugins = [
    withNx
];

export default composePlugins(...plugins)(nextConfig);
