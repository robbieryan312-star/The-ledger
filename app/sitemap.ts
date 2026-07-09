import type { MetadataRoute } from 'next';

const BASE_URL = 'https://the-ledger-gamma.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/states/FL`,
      lastModified: new Date('2026-07-09'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];
}
