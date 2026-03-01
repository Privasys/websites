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
    '': '/introduction/overview',
    'introduction': '/introduction/overview',
    'confidential-computing': '/confidential-computing/presentation',
    'solutions': '/solutions/confidential-containers/concept',
    'solutions/confidential-containers': '/solutions/confidential-containers/concept',
    'solutions/enclave-os': '/solutions/enclave-os/architecture',
    'solutions/clients': '/solutions/clients/ra-tls-clients',
    'guides': '/guides/enclave-os/deploy',
    'guides/deploy-caddy-ra-tls': '/guides/deploy-caddy-ra-tls/google-cloud',
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
