import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { source } from '@/lib/source';

export const DOCS_BASE = 'https://docs.privasys.org';

export interface LlmsPage {
    /** Page URL path, e.g. `/technology/overview` */
    url: string;
    /** Raw-markdown URL path, e.g. `/md/technology/overview.md` */
    mdPath: string;
    slugs: string[];
    title: string;
    description?: string;
    /** Markdown body with frontmatter and MDX import statements stripped. */
    body: string;
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'docs');

/** Section order for llms.txt / llms-full.txt, mirroring content/docs/meta.json. */
const SECTION_ORDER = ['technology', 'solutions', 'tutorials'];

export function sectionOf(page: LlmsPage): string {
    const first = page.slugs[0] ?? '';
    return SECTION_ORDER.includes(first) ? first : 'general';
}

export function sectionTitle(section: string): string {
    if (section === 'general') return 'General';
    return section.charAt(0).toUpperCase() + section.slice(1);
}

function resolveFile(page: { absolutePath: string; path: string }): string | undefined {
    const candidates = [page.absolutePath, path.join(CONTENT_DIR, page.path)];
    return candidates.find((p) => p && fs.existsSync(p));
}

/** Strip top-level MDX `import` lines — noise for text consumers. */
function stripMdxImports(body: string): string {
    return body
        .replace(/^import\s[^\n]*\n/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

let cache: LlmsPage[] | undefined;

/** All docs pages in navigation order, with raw markdown bodies. */
export function getLlmsPages(): LlmsPage[] {
    if (cache) return cache;

    const pages: LlmsPage[] = [];
    for (const page of source.getPages()) {
        const file = resolveFile(page);
        if (!file) continue;

        const { data, content } = matter(fs.readFileSync(file, 'utf-8'));
        pages.push({
            url: page.url,
            mdPath: `/md${page.url}.md`,
            slugs: page.slugs,
            title: (data.title as string) ?? page.slugs[page.slugs.length - 1] ?? 'Untitled',
            description: data.description as string | undefined,
            body: stripMdxImports(content)
        });
    }

    // Stable order: section (meta.json order), then path depth-first.
    pages.sort((a, b) => {
        // Unknown sections ('general') sort last, matching meta.json.
        const rank = (p: LlmsPage) => {
            const i = SECTION_ORDER.indexOf(sectionOf(p));
            return i === -1 ? SECTION_ORDER.length : i;
        };
        const sa = rank(a);
        const sb = rank(b);
        if (sa !== sb) return sa - sb;
        return a.url.localeCompare(b.url);
    });

    cache = pages;
    return pages;
}

/** One page rendered as a standalone markdown document. */
export function pageToMarkdown(page: LlmsPage): string {
    const lines = [`# ${page.title}`, ''];
    if (page.description) {
        lines.push(`> ${page.description}`, '');
    }
    lines.push(`Canonical: ${DOCS_BASE}${page.url}/`, '', page.body, '');
    return lines.join('\n');
}
