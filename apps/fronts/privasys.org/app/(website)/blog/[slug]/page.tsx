import { getAllPosts, getPostBySlug, renderMarkdown } from '~/lib/blog';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '~/app/components/page-shell';
import 'katex/dist/katex.min.css';

interface BlogPostPageProps {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = getPostBySlug(slug);
    if (!post) return {};

    const ogDescription = post.excerpt.length > 50
        ? post.excerpt.slice(0, 50) + '…'
        : post.excerpt;

    return {
        title: `Blog | ${post.title}`,
        description: post.excerpt,
        openGraph: {
            title: `Privasys | Blog | ${post.title}`,
            description: ogDescription,
            type: 'article',
            url: `https://privasys.org/blog/${slug}`,
        },
    };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const post = getPostBySlug(slug);
    if (!post) notFound();

    const htmlContent = await renderMarkdown(post.content);

    return (
        <PageShell activePage='blog'>
                <section className='mt-16 lg:mt-24'>
                    <Link href='/blog' className='link text-sm'>← Back to Blog</Link>

                    <h1 className='mt-6 text-4xl lg:text-5xl'>{post.title}</h1>
                    <div className='mt-3 text-sm text-gray-500'>
                        <span>{post.author}</span>
                        <span className='mx-2'>·</span>
                        <time dateTime={post.date}>
                            {new Date(post.date).toLocaleDateString('en-GB', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </time>
                    </div>

                    <article
                        className='mt-10 prose prose-lg max-w-none'
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                </section>
        </PageShell>
    );
}
