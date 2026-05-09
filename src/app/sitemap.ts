import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${APP_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${APP_URL}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${APP_URL}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${APP_URL}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${APP_URL}/portal/login`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];
}
