import { getAllPosts } from '~/lib/blog';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '~/app/components/page-shell';

export const metadata: Metadata = {
    title: 'Blog',
    description: 'Latest articles from the Privasys team.',
};

export default function BlogPage() {
    const posts = getAllPosts();

    return (
        <PageShell activePage='blog'>
                <section className='mt-16 lg:mt-24'>
                    <h1 className='text-4xl lg:text-5xl'>Blog</h1>
                    <p className='mt-4 text-lg text-gray-600'>
                        Insights and updates from the Privasys team.
                    </p>
                </section>

                <section className='mt-12 space-y-10'>
                    {posts.length === 0 && (
                        <p className='text-gray-500'>No articles yet. Check back soon!</p>
                    )}

                    {posts.map((post) => (
                        <article key={post.slug} className='border-b border-gray-200 pb-8'>
                            <Link href={`/blog/${post.slug}`}>
                                <h2 className='text-2xl lg:text-3xl hover:opacity-70 transition-opacity'>
                                    {post.title}
                                </h2>
                            </Link>
                            <div className='mt-2 text-sm text-gray-500'>
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
                            <p className='mt-3'>{post.excerpt}</p>
                            <Link
                                href={`/blog/${post.slug}`}
                                className='mt-2 inline-block link text-sm'
                            >
                                Read more →
                            </Link>
                        </article>
                    ))}
                </section>
        </PageShell>
    );
}
