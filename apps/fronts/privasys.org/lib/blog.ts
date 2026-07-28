import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

export interface BlogPost {
    slug: string;
    title: string;
    author: string;
    date: string;
    excerpt: string;
    content: string;
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function ensureBlogDir() {
    if (!fs.existsSync(BLOG_DIR)) {
        fs.mkdirSync(BLOG_DIR, { recursive: true });
    }
}

export function getAllPosts(): BlogPost[] {
    ensureBlogDir();

    const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));

    const posts = files.map((filename) => {
        // Filenames may be optionally prefixed with the publication date
        // (`YYYY-MM-DD-`) for chronological ordering on disk. The slug
        // (and therefore the public URL) strips that prefix so that
        // renaming a file with a date does not break inbound links.
        const slug = filename
            .replace(/\.md$/, '')
            .replace(/^\d{4}-\d{2}-\d{2}-/, '');
        const filePath = path.join(BLOG_DIR, filename);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        // Strip markdown syntax for the plain-text excerpt
        const plainText = content
            .replace(/#{1,6}\s+/g, '')   // headings
            .replace(/[*_~`>]/g, '')     // emphasis, code, blockquotes
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
            .replace(/\n+/g, ' ')        // newlines
            .trim();

        const excerpt = plainText.length > 100
            ? plainText.slice(0, 100) + '…'
            : plainText;

        return {
            slug,
            title: data.title ?? slug,
            author: data.author ?? 'Privasys Team',
            date: data.date ?? '',
            excerpt,
            content
        };
    });

    // Sort newest first
    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | undefined {
    return getAllPosts().find(p => p.slug === slug);
}

interface HastNode {
    type: string;
    tagName?: string;
    properties?: { className?: string[] };
    children?: HastNode[];
}

/**
 * Rewrites the <pre><code class="language-mermaid"> blocks produced by fenced
 * ```mermaid code into <pre class="mermaid"> elements holding the raw diagram
 * source, which the client-side renderer picks up (see
 * app/components/mermaid-diagrams.tsx). Authors keep writing plain fences;
 * only the presentation changes. `not-prose` opts the block out of the
 * article's code-block styling so the rendered SVG sits on a clean canvas.
 */
function rehypeMermaidBlocks() {
    return (tree: HastNode) => {
        function walk(node: HastNode) {
            if (!node.children) return;
            node.children = node.children.map((child) => {
                const code = child.tagName === 'pre' ? child.children?.[0] : undefined;
                if (code?.tagName === 'code' && (code.properties?.className ?? []).includes('language-mermaid')) {
                    return {
                        type: 'element',
                        tagName: 'pre',
                        properties: { className: ['mermaid', 'not-prose'] },
                        children: code.children
                    };
                }
                walk(child);
                return child;
            });
        }
        walk(tree);
    };
}

export async function renderMarkdown(markdownContent: string): Promise<string> {
    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeMermaidBlocks)
        .use(rehypeKatex)
        .use(rehypeStringify)
        .process(markdownContent);
    return result.toString();
}
