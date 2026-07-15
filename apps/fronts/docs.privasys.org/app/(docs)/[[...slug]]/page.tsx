import { source } from '@/lib/source';
import { notFound, redirect } from 'next/navigation';

// Reject any slug not listed in generateStaticParams() — prevents noisy
// dev-server warnings for Chrome DevTools probes, CSS requests, etc.
export const dynamicParams = false;
import {
    DocsPage,
    DocsBody,
    DocsTitle,
    DocsDescription
} from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXContent } from 'mdx/types';

interface MdxPageData {
    title: string;
    description?: string;
    body: MDXContent;
    toc: { depth: number; url: string; title: string }[];
}

/** Slugs that should redirect to a default child page. */
const folderRedirects: Record<string, string> = {
    // Root → Technology overview (the former Introduction/Overview, merged in)
    '': '/technology/overview',
    // Folder index redirects (new structure)
    'introduction': '/technology/overview',
    'introduction/overview': '/technology/overview',
    'technology': '/technology/overview',
    'technology/confidential-computing': '/technology/confidential-computing/overview',
    'technology/attestation': '/technology/attestation/remote-attestation',
    'solutions': '/solutions/enclave-os/presentation',
    'solutions/enclave-os': '/solutions/enclave-os/presentation',
    'solutions/enclave-os/enclave-os-mini': '/solutions/enclave-os/enclave-os-mini/architecture',
    'solutions/enclave-os/enclave-os-mini/guides': '/solutions/enclave-os/enclave-os-mini/guides/build-wasm-app',
    'solutions/enclave-os/enclave-os-virtual': '/solutions/enclave-os/enclave-os-virtual/architecture',
    'solutions/enclave-os/attestation': '/solutions/enclave-os/attestation/ra-tls',
    'solutions/enclave-vaults': '/solutions/enclave-vaults/overview',
    'solutions/enclave-agent': '/solutions/enclave-agent/overview',
    'solutions/ai': '/solutions/ai/overview',
    'solutions/platform': '/solutions/platform/overview',
    'solutions/platform/developer-platform': '/solutions/platform/developer-platform/getting-started',

    // Legacy path redirects. The docs were reorganised from a flat layout into
    // the introduction/technology/solutions hierarchy. These map the old URLs
    // (still held by search engines and external links) to their new homes so
    // they consolidate instead of returning 404.
    'why-privasys': '/technology/overview',
    'confidential-computing': '/technology/confidential-computing/overview',
    'confidential-computing/presentation': '/technology/confidential-computing/overview',
    'confidential-computing/attestation': '/technology/attestation/remote-attestation',
    'confidential-computing/trust-model': '/technology/confidential-computing/trust-model',
    'confidential-computing/ra-tls': '/solutions/enclave-os/attestation/ra-tls',
    'enclave-os/architecture': '/solutions/enclave-os/architecture',
    'enclave-os/config-and-merkle-tree': '/solutions/enclave-os/attestation/merkle-tree',
    'enclave-os/ra-tls': '/solutions/enclave-os/attestation/ra-tls',
    'enclave-os/rpc-and-circular-buffers': '/solutions/enclave-os/enclave-os-mini/rpc-and-circular-buffers',
    'enclave-os/rust-and-teaclave': '/solutions/enclave-os/enclave-os-mini/rust-and-teaclave',
    'enclave-os/sealing-and-kv-store': '/solutions/enclave-os/enclave-os-mini/sealing-and-kv-store',
    'enclave-os/wasm-runtime': '/solutions/enclave-os/enclave-os-mini/wasm-runtime',
    'ra-tls-clients': '/solutions/platform/verification-libraries',
    'caddy-ra-tls': '/solutions/platform/overview',
    'cli': '/solutions/cli',
    'cli/agents': '/solutions/cli/agents',
    'cli/apps': '/solutions/cli/apps',
    'cli/authentication': '/solutions/cli/authentication',
    'cli/install': '/solutions/cli/install',
    'cli/scripting': '/solutions/cli/scripting',
    'cli/vault': '/solutions/cli/vault',
    'guides/attestation-server': '/technology/attestation/attestation-server',
    'guides/enclave-os/build-wasm-app': '/solutions/enclave-os/enclave-os-mini/guides/build-wasm-app',
    'guides/enclave-os/deploy': '/solutions/enclave-os/enclave-os-mini/guides/deploy',
    'guides/enclave-os/layer4-proxy': '/solutions/enclave-os/enclave-os-mini/guides/layer4-proxy',
    'guides/deploy-caddy-ra-tls/azure': '/solutions/platform/overview',
    'guides/deploy-caddy-ra-tls/google-cloud': '/solutions/platform/overview',
    'guides/deploy-caddy-ra-tls/ovh-cloud': '/solutions/platform/overview',
    'solutions/wallet/overview': '/solutions/privasys-id/wallet',
    'solutions/privasys-id/session-relay': '/technology/sealed-session',
    'solutions/confidential-containers/concept': '/solutions/platform/overview',
    'solutions/confidential-containers/caddy-ra-tls': '/solutions/platform/overview',
    'solutions/clients/ra-tls-clients': '/solutions/platform/verification-libraries',
    'solutions/enclave-os/rpc-and-circular-buffers': '/solutions/enclave-os/enclave-os-mini/rpc-and-circular-buffers',
    'solutions/enclave-os/rust-and-teaclave': '/solutions/enclave-os/enclave-os-mini/rust-and-teaclave',
    'solutions/enclave-os/sealing-and-kv-store': '/solutions/enclave-os/enclave-os-mini/sealing-and-kv-store',
    'solutions/enclave-os/wasm-runtime': '/solutions/enclave-os/enclave-os-mini/wasm-runtime',
    'solutions/enclave-os/ra-tls': '/solutions/enclave-os/attestation/ra-tls',
    'solutions/platform/deploy/azure': '/solutions/platform/overview',
    'solutions/platform/deploy/google-cloud': '/solutions/platform/overview',
    'solutions/platform/deploy/ovh-cloud': '/solutions/platform/overview'
};

export default async function Page(props: {
    params: Promise<{ slug?: string[] }>;
}) {
    const params = await props.params;
    const slugKey = params.slug?.join('/') ?? '';

    if (slugKey in folderRedirects) {
        redirect(folderRedirects[slugKey]);
    }

    const page = source.getPage(params.slug);
    if (!page) notFound();

    const data = page.data as unknown as MdxPageData;
    const MDX = data.body;

    const filePath = `apps/fronts/docs.privasys.org/content/docs/${slugKey}.mdx`;
    const githubUrl = `https://github.com/Privasys/websites/blob/main/${filePath}`;

    return (
        <DocsPage toc={data.toc} tableOfContent={{ style: 'clerk' }}>
            <DocsTitle>{page.data.title}</DocsTitle>
            <DocsDescription>{page.data.description}</DocsDescription>
            <DocsBody>
                <MDX components={{ ...defaultMdxComponents }} />
            </DocsBody>
            <a
                href={githubUrl}
                rel="noreferrer noopener"
                target="_blank"
                className="inline-flex items-center gap-1.5 w-fit border rounded-xl p-2 font-medium text-sm text-fd-secondary-foreground bg-fd-secondary transition-colors hover:text-fd-accent-foreground hover:bg-fd-accent"
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M12 20h9" />
                    <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                    <path d="m15 5 3 3" />
                </svg>
                Edit on GitHub
            </a>
        </DocsPage>
    );
}

export function generateStaticParams() {
    const params = source.generateParams().filter(
        (params: { slug?: string[] }) =>
            params.slug && params.slug.length > 0 && params.slug[params.slug.length - 1] !== 'index'
    );
    // Include folder slugs that need redirect pages
    const redirectSlugs = Object.keys(folderRedirects)
        .filter((key) => key !== '')
        .map((key) => ({ slug: key.split('/') }));
    // The root `/` route for the optional catch-all [[...slug]]
    return [{ slug: [] }, ...redirectSlugs, ...params];
}

export async function generateMetadata(props: {
    params: Promise<{ slug?: string[] }>;
}) {
    const params = await props.params;
    const slugKey = params.slug?.join('/') ?? '';
    if (slugKey in folderRedirects) return {};

    const page = source.getPage(params.slug);
    if (!page) notFound();

    return {
        title: page.data.title,
        description: page.data.description
    };
}
