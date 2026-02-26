import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
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

export default async function Page(props: {
    params: Promise<{ slug?: string[] }>;
}) {
    const params = await props.params;
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
    // Always include the root slug for Next.js static export compliance
    const params = source.generateParams().filter(
        (params: { slug?: string[] }) =>
            params.slug && params.slug.length > 0 && params.slug[params.slug.length - 1] !== 'index'
    );
    return [{ slug: [] }, ...params];
}

export async function generateMetadata(props: {
    params: Promise<{ slug?: string[] }>;
}) {
    const params = await props.params;
    const page = source.getPage(params.slug);
    if (!page) notFound();

    return {
        title: page.data.title,
        description: page.data.description
    };
}
