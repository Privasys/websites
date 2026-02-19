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
        const slug = filename.replace(/\.md$/, '');
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
            content,
        };
    });

    // Sort newest first
    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | undefined {
    return getAllPosts().find(p => p.slug === slug);
}

export async function renderMarkdown(markdownContent: string): Promise<string> {
    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeKatex)
        .use(rehypeStringify)
        .process(markdownContent);
    return result.toString();
}
