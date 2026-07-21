import type { MetadataRoute } from 'next';
import { allPoliticians } from '@/lib/data/allPoliticians';
import { SUPPORTED_STATE_CODES } from '@/lib/data/supportedStates';

/**
 * Canonical production domain (approved Vercel project `the-ledger-main`).
 * Owner renamed project + production hostname from `the-ledger-s4dn` (2026-07-21).
 */
const BASE_URL = 'https://the-ledger-main.vercel.app';

/** Public, crawler-indexable static routes. `/dashboard` is user-specific and excluded. */
export const STATIC_ROUTES = [
  '/',
  '/politicians',
  '/legislation',
  '/finance',
  '/congress',
  '/compare',
  '/elections',
  '/lobbying',
  '/sources',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));

  const stateEntries: MetadataRoute.Sitemap = SUPPORTED_STATE_CODES.map((code) => ({
    url: `${BASE_URL}/states/${code}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const politicianEntries: MetadataRoute.Sitemap = allPoliticians.map((p) => ({
    url: `${BASE_URL}/politicians/${p.id}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticEntries, ...stateEntries, ...politicianEntries];
}
