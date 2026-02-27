import { composePlugins, withNx } from '@nx/next';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
    nx: {
        svgr: false
    },
    output: 'export',
    trailingSlash: true,
    poweredByHeader: false,
    images: {
        unoptimized: true
    }
};

const plugins = [withNx, withMDX];

export default composePlugins(...plugins)(nextConfig);
