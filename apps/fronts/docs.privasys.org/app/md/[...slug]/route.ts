import { getLlmsPages, pageToMarkdown } from '@/lib/llms';

export const dynamic = 'force-static';
export const dynamicParams = false;

/**
 * Raw-markdown twin of every docs page: /md/<slug>.md — token-efficient,
 * chrome-free content for AI assistants and other text consumers. Linked from
 * /llms.txt.
 */
export function generateStaticParams(): { slug: string[] }[] {
    return getLlmsPages().map((page) => {
        const slug = [...page.slugs];
        slug[slug.length - 1] = `${slug[slug.length - 1]}.md`;
        return { slug };
    });
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string[] }> }
): Promise<Response> {
    const { slug } = await params;
    const clean = [...slug];
    clean[clean.length - 1] = clean[clean.length - 1].replace(/\.md$/, '');
    const url = `/${clean.join('/')}`;

    const page = getLlmsPages().find((p) => p.url === url);
    if (!page) {
        return new Response('Not found', { status: 404 });
    }

    return new Response(pageToMarkdown(page), {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
    });
}
