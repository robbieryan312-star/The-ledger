/**
 * Discover member news articles from approved-outlet HTML hubs/search pages
 * when homepage RSS is thin or auto-disabled (AP RSS historically flaky).
 *
 * Applies the same subject-or-quoted qualification gate as sync:news-rss.
 */
import {
  isAllowedNewsArticleUrl,
  isOpinionArticleUrl,
  outletForArticleUrl,
  tierForArticleUrl,
} from '../../lib/data/newsFeedRegistry';
import { leadSummary } from '../../lib/data/displaySummary';
import { decodeHtmlEntities } from '../../lib/data/htmlEntities';
import type { NewsItem } from '../../lib/types';
import {
  matchesMemberInText,
  memberNewsPrimaryName,
  type LegislatorNewsRow,
} from './memberNewsMatching';
import { qualifiesMemberNewsItem } from './memberNewsQualification';
import type { ProfileDisplayIdentity } from './profileDisplayIdentity';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_CANDIDATE_URLS = 40;
const MAX_ARTICLE_FETCHES = 28;

type DiscoverySource = {
  outlet: string;
  /** Build discovery page URL from kebab primary-name slug. */
  hubUrl: (slug: string, primaryName: string) => string;
  /** Extract absolute article URLs from hub HTML. */
  extractUrls: (html: string, baseHost: string) => string[];
};

function memberSlug(primaryName: string): string {
  return primaryName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractApArticleUrls(html: string): string[] {
  const found: string[] = [];
  const re = /href="(https:\/\/apnews\.com\/article\/[^"#?]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) found.push(m[1]);
  const rel = /href="(\/article\/[^"#?]+)"/gi;
  while ((m = rel.exec(html)) !== null) found.push(`https://apnews.com${m[1]}`);
  return [...new Set(found)];
}

function extractNprArticleUrls(html: string): string[] {
  const found: string[] = [];
  const re = /href="(https:\/\/www\.npr\.org\/\d{4}\/\d{2}\/\d{2}\/[^"#?]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) found.push(m[1]);
  return [...new Set(found)];
}

const DISCOVERY_SOURCES: DiscoverySource[] = [
  {
    outlet: 'AP News',
    hubUrl: (slug) => `https://apnews.com/hub/${slug}`,
    extractUrls: (html) => extractApArticleUrls(html),
  },
  {
    outlet: 'AP News',
    hubUrl: (_slug, primaryName) =>
      `https://apnews.com/search?q=${encodeURIComponent(primaryName)}`,
    extractUrls: (html) => extractApArticleUrls(html),
  },
  {
    outlet: 'NPR',
    hubUrl: (_slug, primaryName) =>
      `https://www.npr.org/search?query=${encodeURIComponent(primaryName)}&page=1`,
    extractUrls: (html) => extractNprArticleUrls(html),
  },
];

function metaContent(html: string, property: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const m = html.match(re);
  if (m) return decodeHtmlEntities(m[1]);
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    'i',
  );
  const m2 = html.match(re2);
  return m2 ? decodeHtmlEntities(m2[1]) : '';
}

/** Plain-text body excerpts for qualification when og:description is thin on the member. */
function articleLedeText(html: string, maxChars = 1600): string {
  const chunks: string[] = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(html)) !== null && chunks.join(' ').length < maxChars) {
    const text = decodeHtmlEntities(m[1])
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length < 40) continue;
    if (/^(advertisement|sign up|subscribe|related|\d+ of \d+)/i.test(text)) continue;
    if (/AP Photo\//i.test(text) && text.length < 220) continue;
    chunks.push(text);
  }
  return chunks.join(' ').slice(0, maxChars);
}

function formatIsoDate(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const iso = raw.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
  }
  return d.toISOString().slice(0, 10);
}

async function fetchText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; LedgerNewsBot/1.0; +https://github.com/robbieryan312-star/The-ledger)',
      },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, text: await res.text() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function toNewsItem(
  article: { title: string; link: string; date: string; description: string },
  bioguideId: string,
  idx: number,
): NewsItem {
  const outlet = outletForArticleUrl(article.link) ?? 'AP News';
  return {
    id: `${bioguideId.toLowerCase()}-hub-${idx + 1}`,
    headline: article.title,
    summary: leadSummary(article.description || article.title, 200) || article.title,
    date: article.date,
    category: 'Congress',
    isOpinion: isOpinionArticleUrl(article.link),
    isVerified: false,
    url: article.link,
    source: {
      name: outlet,
      url: article.link,
      tier: tierForArticleUrl(article.link) ?? 'nonpartisan',
      date: article.date,
      description: 'Approved-outlet member hub/search discovery',
    },
  };
}

export type OutletDiscoveryResult = {
  items: NewsItem[];
  hubsAttempted: number;
  hubFailures: string[];
  /** Per-outlet: URLs found → qualified kept (source-exhaustion documentation). */
  perOutlet: Record<string, { urlsFound: number; qualified: number; hubErrors: string[] }>;
};

/**
 * Fetch approved-outlet hub/search pages for a member; qualify each article page.
 */
export async function fetchMemberOutletHubArticles(
  leg: LegislatorNewsRow & { state: string },
  displayByBio: Map<string, ProfileDisplayIdentity | { name: string; firstName: string; lastName: string }>,
): Promise<OutletDiscoveryResult> {
  const primaryName = memberNewsPrimaryName(leg, displayByBio);
  const slug = memberSlug(primaryName);
  const items: NewsItem[] = [];
  const seen = new Set<string>();
  const hubFailures: string[] = [];
  let hubsAttempted = 0;
  const perOutlet: OutletDiscoveryResult['perOutlet'] = {};

  const candidateUrls: Array<{ url: string; outlet: string; priority: number }> = [];
  const lastSlug = (leg.lastName ?? primaryName.split(/\s+/).pop() ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  for (const source of DISCOVERY_SOURCES) {
    hubsAttempted += 1;
    const hubUrl = source.hubUrl(slug, primaryName);
    const bucket = (perOutlet[source.outlet] ??= { urlsFound: 0, qualified: 0, hubErrors: [] });
    const result = await fetchText(hubUrl);
    if (!result.ok) {
      const err = `${source.outlet} hub: ${result.error}`;
      hubFailures.push(err);
      bucket.hubErrors.push(result.error);
      continue;
    }
    const urls = source.extractUrls(result.text, source.outlet).slice(0, MAX_CANDIDATE_URLS);
    bucket.urlsFound += urls.length;
    for (const url of urls) {
      if (!isAllowedNewsArticleUrl(url)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      const path = url.toLowerCase();
      // Prefer URLs that already name the member (hub pages mix related politics).
      const priority =
        (path.includes(slug) ? 2 : 0) + (lastSlug && path.includes(lastSlug) ? 1 : 0);
      candidateUrls.push({ url, outlet: source.outlet, priority });
    }
  }

  candidateUrls.sort((a, b) => b.priority - a.priority);

  let fetches = 0;
  for (const { url, outlet } of candidateUrls) {
    if (fetches >= MAX_ARTICLE_FETCHES) break;
    fetches += 1;
    const page = await fetchText(url);
    if (!page.ok) continue;
    const title = decodeHtmlEntities(
      metaContent(page.text, 'og:title') || metaContent(page.text, 'twitter:title') || '',
    ).trim();
    const ogDescription = decodeHtmlEntities(
      metaContent(page.text, 'og:description') ||
        metaContent(page.text, 'twitter:description') ||
        '',
    ).trim();
    const lede = articleLedeText(page.text);
    const description = [ogDescription, lede].filter(Boolean).join(' ').slice(0, 800);
    const date =
      formatIsoDate(metaContent(page.text, 'article:published_time')) ||
      formatIsoDate(metaContent(page.text, 'pubdate')) ||
      formatIsoDate(metaContent(page.text, 'sailthru.date'));
    if (!title || !date) continue;
    const combined = `${title} ${description}`;
    if (!matchesMemberInText(combined, leg, displayByBio)) continue;
    const qualify = qualifiesMemberNewsItem(title, description, leg, displayByBio);
    if (!qualify.ok) continue;
    const item = toNewsItem(
      { title, link: url, date, description: ogDescription || lede || title },
      leg.bioguideId,
      items.length,
    );
    // Prefer registry outlet name
    item.source.name = outletForArticleUrl(url) ?? outlet;
    items.push(item);
    const bucket = (perOutlet[outlet] ??= { urlsFound: 0, qualified: 0, hubErrors: [] });
    bucket.qualified += 1;
  }

  return { items, hubsAttempted, hubFailures, perOutlet };
}
