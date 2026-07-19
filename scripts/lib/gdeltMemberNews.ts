/**
 * GDELT DOC API fetch for a single Congress member — approved-outlet filter applied post-fetch.
 */
import {
  isAllowedNewsArticleUrl,
  isOpinionArticleUrl,
  outletForArticleUrl,
  tierForArticleUrl,
} from '../../lib/data/newsFeedRegistry';
import { leadSummary } from '../../lib/data/displaySummary';
import type { NewsItem } from '../../lib/types';
import { memberNewsPrimaryName, type LegislatorNewsRow } from './memberNewsMatching';

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const GDELT_RATE_LIMIT_DELAYS_MS = [8_000, 12_000] as const;
const GDELT_INTER_DOMAIN_DELAY_MS = 6_000;

/** GDELT seendate → ISO date (YYYY-MM-DD). */
export function formatGdeltSeenDate(raw: string): string {
  const compact = raw.trim();
  const m = compact.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const iso = compact.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : compact;
}

export interface GdeltMemberArticle {
  title: string;
  outlet: string;
  publishedDate: string;
  url: string;
}

interface GdeltResponse {
  articles?: Array<{ url?: string; title?: string; seendate?: string; domain?: string }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const GDELT_APPROVED_DOMAINS = [
  'thehill.com',
  'politico.com',
  'npr.org',
  'theguardian.com',
  'apnews.com',
  'pbs.org',
  'nytimes.com',
  'washingtonpost.com',
  'rollcall.com',
  'propublica.org',
] as const;

function buildGdeltDomainQuery(primaryName: string, domain: string): string {
  return `${primaryName} domain:${domain} sourcelang:english`;
}

export function gdeltArticleToNewsItem(
  article: GdeltMemberArticle,
  bioguideId: string,
  idx: number,
): NewsItem | null {
  if (!isAllowedNewsArticleUrl(article.url)) return null;
  const outlet = outletForArticleUrl(article.url) ?? article.outlet;
  const tier = tierForArticleUrl(article.url) ?? 'media';
  const isoDate = formatGdeltSeenDate(article.publishedDate);
  return {
    id: `${bioguideId.toLowerCase()}-gdelt-${idx + 1}`,
    headline: article.title,
    summary: leadSummary(article.title, 200),
    date: isoDate,
    category: 'Congress',
    isOpinion: isOpinionArticleUrl(article.url),
    isVerified: false,
    url: article.url,
    source: {
      name: outlet,
      url: article.url,
      tier,
      date: isoDate,
      description: 'GDELT DOC API — corroborate with a second independent outlet before citing as verified fact',
    },
  };
}

async function fetchGdeltDomainBatch(
  query: string,
  timespan: string,
  maxRecords: number,
): Promise<{ articles: GdeltMemberArticle[]; rateLimited: boolean; error?: string }> {
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: String(Math.min(maxRecords, 15)),
    format: 'json',
    sort: 'datedesc',
    timespan,
  });
  const datasetUrl = `${GDELT_DOC_API}?${params.toString()}`;

  let lastErr: unknown;
  for (let attempt = 0; attempt < GDELT_RATE_LIMIT_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(datasetUrl, {
        signal: AbortSignal.timeout(35_000),
        headers: { Accept: 'application/json' },
      });
      const text = await res.text();
      if (res.status === 429 || text.includes('Please limit requests')) {
        const waitMs = GDELT_RATE_LIMIT_DELAYS_MS[attempt];
        if (waitMs === undefined) return { articles: [], rateLimited: true, error: 'rate limited' };
        await sleep(waitMs);
        continue;
      }
      if (text.startsWith('Your search') || text.startsWith('Your query') || text.startsWith('Parentheses')) {
        return { articles: [], rateLimited: false, error: text.split('\n')[0]?.slice(0, 120) };
      }
      if (!res.ok) {
        throw new Error(text.slice(0, 120) || `HTTP ${res.status}`);
      }
      const data = JSON.parse(text) as GdeltResponse;
      const articles: GdeltMemberArticle[] = [];
      for (const raw of data.articles ?? []) {
        const url = raw.url?.trim();
        const title = raw.title?.trim();
        const publishedDate = raw.seendate?.trim() ?? '';
        const outlet = raw.domain?.trim() ?? '';
        if (!url || !title || !publishedDate || !outlet) continue;
        if (!isAllowedNewsArticleUrl(url)) continue;
        articles.push({ title, outlet, publishedDate, url });
      }
      return { articles, rateLimited: false };
    } catch (err) {
      lastErr = err;
      const waitMs = GDELT_RATE_LIMIT_DELAYS_MS[attempt];
      if (attempt < GDELT_RATE_LIMIT_DELAYS_MS.length - 1 && waitMs !== undefined) await sleep(waitMs);
    }
  }
  return {
    articles: [],
    rateLimited: false,
    error: lastErr instanceof Error ? lastErr.message : String(lastErr),
  };
}

/** Query GDELT per approved domain (OR clauses are unreliable); merge unique articles. */
export async function fetchGdeltArticlesForMember(
  leg: LegislatorNewsRow & { state: string },
  displayByBio: Map<string, { name: string }>,
  opts?: { maxRecords?: number; timespan?: string; maxDomains?: number },
): Promise<{ articles: GdeltMemberArticle[]; failed: boolean; error?: string }> {
  const maxRecords = opts?.maxRecords ?? 25;
  const timespan = opts?.timespan ?? '12months';
  const maxDomains = opts?.maxDomains ?? GDELT_APPROVED_DOMAINS.length;
  const primaryName = memberNewsPrimaryName(leg, displayByBio);
  const articles: GdeltMemberArticle[] = [];
  const seen = new Set<string>();
  let lastError: string | undefined;
  let rateLimited = false;

  const domains = GDELT_APPROVED_DOMAINS.slice(0, maxDomains);
  for (let i = 0; i < domains.length; i++) {
    if (articles.length >= maxRecords) break;
    if (i > 0) await sleep(GDELT_INTER_DOMAIN_DELAY_MS);
    const domain = domains[i];
    const query = buildGdeltDomainQuery(primaryName, domain);
    const batch = await fetchGdeltDomainBatch(query, timespan, maxRecords - articles.length);
    if (batch.rateLimited) rateLimited = true;
    if (batch.error && batch.articles.length === 0) lastError = batch.error;
    for (const article of batch.articles) {
      if (seen.has(article.url)) continue;
      seen.add(article.url);
      articles.push(article);
      if (articles.length >= maxRecords) break;
    }
  }

  if (articles.length > 0) {
    return { articles, failed: false };
  }
  return {
    articles: [],
    failed: true,
    error: rateLimited ? 'GDELT rate limited' : (lastError ?? 'no approved articles'),
  };
}
