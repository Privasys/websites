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
    '': '/introduction',
    'enclave-os': '/enclave-os/architecture',
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

    return (
        <DocsPage toc={data.toc}>
            <DocsTitle>{page.data.title}</DocsTitle>
            <DocsDescription>{page.data.description}</DocsDescription>
            <DocsBody>
                <MDX components={{ ...defaultMdxComponents }} />
            </DocsBody>
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
