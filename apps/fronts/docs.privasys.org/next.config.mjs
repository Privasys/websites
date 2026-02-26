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
    },
    async redirects() {
        return [
            {
                source: '/',
                destination: '/introduction',
                permanent: false,
            },
            {
                source: '/enclave-os',
                destination: '/enclave-os/architecture',
                permanent: false,
            },
        ];
    }
};

const plugins = [withNx, withMDX];

export default composePlugins(...plugins)(nextConfig);
