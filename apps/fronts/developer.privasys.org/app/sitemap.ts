import type { MetadataRoute } from 'next';

const BASE = 'https://developer.privasys.org';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1.0 },
        { url: `${BASE}/login/`, changeFrequency: 'yearly', priority: 0.5 }
    ];
}
