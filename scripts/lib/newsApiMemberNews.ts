/**
 * NewsAPI supplement for profile news — approved domains only, member name match required.
 * Plan window is ~1 month on developer tier; preserves prior items when key missing or 426.
 */
import { config } from 'dotenv';
import path from 'node:path';
import {
  isAllowedNewsArticleUrl,
  isOpinionArticleUrl,
  outletForArticleUrl,
  tierForArticleUrl,
} from '../../lib/data/newsFeedRegistry';
import { leadSummary } from '../../lib/data/displaySummary';
import type { NewsItem } from '../../lib/types';
import {
  loadMemberNewsDisplayMap,
  matchesMemberInText,
  memberNewsPrimaryName,
  type LegislatorNewsRow,
} from './memberNewsMatching';
import { qualifiesMemberNewsItem } from './memberNewsQualification';

const NEWSAPI_APPROVED_DOMAINS = [
  'thehill.com',
  'politico.com',
  'npr.org',
  'apnews.com',
  'theguardian.com',
  'nytimes.com',
  'washingtonpost.com',
  'pbs.org',
  'rollcall.com',
  'propublica.org',
] as const;

interface NewsApiArticle {
  title?: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  source?: { name?: string };
}

interface NewsApiResponse {
  status?: string;
  code?: string;
  message?: string;
  articles?: NewsApiArticle[];
}

function formatNewsApiDate(raw: string | undefined): string {
  if (!raw?.trim()) return new Date().toISOString().slice(0, 10);
  return raw.trim().slice(0, 10);
}

export function newsApiArticleToNewsItem(
  article: NewsApiArticle,
  bioguideId: string,
  idx: number,
): NewsItem | null {
  const url = article.url?.trim();
  const title = article.title?.trim();
  if (!url || !title || !isAllowedNewsArticleUrl(url)) return null;
  const outlet = outletForArticleUrl(url) ?? article.source?.name?.trim() ?? 'NewsAPI';
  const tier = tierForArticleUrl(url) ?? 'media';
  const date = formatNewsApiDate(article.publishedAt);
  const summary = leadSummary(article.description?.trim() || title, 200) || title;
  return {
    id: `${bioguideId.toLowerCase()}-newsapi-${idx + 1}`,
    headline: title,
    summary,
    date,
    category: 'Congress',
    isOpinion: isOpinionArticleUrl(url),
    isVerified: false,
    url,
    source: {
      name: outlet,
      url,
      tier,
      date,
      description: 'NewsAPI — corroborate with a second independent outlet before citing as verified fact',
    },
  };
}

export async function fetchNewsApiArticlesForMember(
  leg: LegislatorNewsRow & { state: string },
  projectRoot: string,
  opts?: { pageSize?: number },
): Promise<{ items: NewsItem[]; skipped: boolean; error?: string }> {
  config({ path: path.join(projectRoot, '.env.local') });
  const key = process.env.NEWSAPI_KEY?.trim();
  if (!key) {
    return { items: [], skipped: true, error: 'NEWSAPI_KEY not configured' };
  }

  const displayByBio = loadMemberNewsDisplayMap(projectRoot);
  const primaryName = memberNewsPrimaryName(leg, displayByBio);
  const pageSize = opts?.pageSize ?? 50;
  const domains = NEWSAPI_APPROVED_DOMAINS.join(',');
  const q = encodeURIComponent(`${primaryName} OR "Sen. ${leg.lastName ?? 'Sanders'}"`);
  const url =
    `https://newsapi.org/v2/everything?q=${q}&domains=${domains}` +
    `&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: 'application/json' },
    });
    const data = (await res.json()) as NewsApiResponse;
    if (!res.ok || data.status === 'error') {
      return {
        items: [],
        skipped: true,
        error: data.message ?? `HTTP ${res.status}`,
      };
    }

    const items: NewsItem[] = [];
    const seen = new Set<string>();
    for (const [idx, raw] of (data.articles ?? []).entries()) {
      const title = raw.title?.trim() ?? '';
      const description = raw.description?.trim() ?? '';
      const blob = `${title} ${description}`;
      if (!matchesMemberInText(blob, leg, displayByBio)) continue;
      // Same subject/quote gate as RSS + topic feeds (CDC releaser-only = reject).
      if (!qualifiesMemberNewsItem(title, description, leg, displayByBio).ok) continue;
      const item = newsApiArticleToNewsItem(raw, leg.bioguideId, idx);
      if (!item || seen.has(item.url ?? '')) continue;
      seen.add(item.url ?? '');
      items.push(item);
    }
    return { items, skipped: false };
  } catch (err) {
    return {
      items: [],
      skipped: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
