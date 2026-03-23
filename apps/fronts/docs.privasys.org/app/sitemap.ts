import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

export const dynamic = 'force-static';

const BASE = 'https://docs.privasys.org';

export default function sitemap(): MetadataRoute.Sitemap {
    const pages = source.getPages();

    return pages.map((page) => ({
        url: `${BASE}${page.url}/`,
        changeFrequency: 'weekly',
        priority: page.url === '/' ? 1.0 : 0.7,
    }));
}
