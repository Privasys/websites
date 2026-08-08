import { DOCS_BASE, getLlmsPages, pageToMarkdown } from '@/lib/llms';

export const dynamic = 'force-static';

/**
 * llms-full.txt — the entire documentation concatenated as one markdown file,
 * so an AI assistant can ingest the whole current docs in a single fetch.
 */
export function GET(): Response {
    const pages = getLlmsPages();

    const header = [
        '# Privasys Documentation (full)',
        '',
        `> Complete technical documentation for the Privasys confidential computing platform, concatenated from ${DOCS_BASE}/. See ${DOCS_BASE}/llms.txt for the per-page index.`,
        '',
        ''
    ].join('\n');

    const body = pages.map(pageToMarkdown).join('\n---\n\n');

    return new Response(header + body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}
