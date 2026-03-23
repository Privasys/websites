import type { MetadataRoute } from 'next';
import { getAllPosts } from '~/lib/blog';

export const dynamic = 'force-static';

const BASE = 'https://privasys.org';

const SUPPORTED_COUNTRIES = ['uk', 'us', 'eu', 'fr', 'de', 'sg', 'jp', 'au'];
const APP_SLUGS = ['confidential-vault', 'private-inference', 'secure-analytics'];

export default function sitemap(): MetadataRoute.Sitemap {
    const staticPages: MetadataRoute.Sitemap = [
        { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1.0 },
        { url: `${BASE}/solutions/enclave-os/`, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${BASE}/solutions/enclave-vaults/`, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${BASE}/solutions/enclave-agent/`, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${BASE}/solutions/platform/`, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${BASE}/blog/`, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${BASE}/legal/`, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${BASE}/legal/terms/`, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${BASE}/legal/privacy/`, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${BASE}/legal/company/`, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${BASE}/legal/modern-slavery/`, changeFrequency: 'yearly', priority: 0.3 }
    ];

    const blogPosts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
        url: `${BASE}/blog/${post.slug}/`,
        lastModified: new Date(post.date),
        changeFrequency: 'monthly',
        priority: 0.7
    }));

    const countryPages: MetadataRoute.Sitemap = SUPPORTED_COUNTRIES.flatMap((country) => [
        {
            url: `${BASE}/${country}/apps/`,
            changeFrequency: 'weekly' as const,
            priority: 0.6
        },
        ...APP_SLUGS.map((slug) => ({
            url: `${BASE}/${country}/apps/${slug}/`,
            changeFrequency: 'monthly' as const,
            priority: 0.5
        }))
    ]);

    return [...staticPages, ...blogPosts, ...countryPages];
}
