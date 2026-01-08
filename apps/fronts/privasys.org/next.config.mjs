import { composePlugins, withNx } from '@nx/next';

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
    nx: {
        // Set this to true if you would like to to use SVGR
        // See: https://github.com/gregberge/svgr
        svgr: false
    },
    experimental: {
        reactCompiler: true
    },
    output: 'export',
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
