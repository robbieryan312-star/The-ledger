/**
 * Member topic/tag RSS discovery — approved-outlet topic feeds keyed by name slug.
 * Used when homepage politics RSS does not mention the member (depth sync).
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

const FETCH_TIMEOUT_MS = 15_000;

/** Approved topic/tag RSS URL templates — `{slug}` = kebab primary name. */
const TOPIC_FEED_TEMPLATES: ReadonlyArray<{
  outlet: string;
  urlTemplate: string;
  tier: 'media' | 'nonpartisan';
}> = [
  {
    outlet: 'The Guardian',
    urlTemplate: 'https://www.theguardian.com/us-news/{slug}/rss',
    tier: 'media',
  },
  {
    outlet: 'The Hill',
    urlTemplate: 'https://thehill.com/tag/{slug}/feed/',
    tier: 'media',
  },
];

export function memberNewsTopicSlug(primaryName: string): string {
  return primaryName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripCdata(raw: string): string {
  return raw.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  return stripCdata(m[1]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseRssItems(
  xml: string,
): Array<{ title: string; link: string; pubDate: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractTag(block, 'guid');
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date');
    const description = extractTag(block, 'description') || extractTag(block, 'content:encoded');
    if (title && link) items.push({ title, link: link.trim(), pubDate, description });
  }
  return items;
}

function formatPubDate(raw: string): string | null {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const iso = raw.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
  }
  return d.toISOString().slice(0, 10);
}

/** Topic feeds are already member-scoped; only drop clear lifestyle noise. */
const LIFESTYLE_DROP =
  /\b(recipe|horoscope|crossword|sports score|box score|fashion week|red carpet|celebrity wedding|tv recap|restaurant review)\b/i;

function isTopicRelevant(title: string, description: string): boolean {
  return !LIFESTYLE_DROP.test(`${title} ${description}`);
}

async function fetchFeedXml(feedUrl: string): Promise<{ ok: true; xml: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(feedUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const xml = await res.text();
    if (!/<rss[\s>]|<feed[\s>]/i.test(xml)) return { ok: false, error: 'not RSS/Atom' };
    return { ok: true, xml };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function toNewsItem(
  article: { title: string; link: string; date: string; description: string; outlet: string; tier: 'media' | 'nonpartisan' },
  bioguideId: string,
  idx: number,
): NewsItem {
  return {
    id: `${bioguideId.toLowerCase()}-topic-${idx + 1}`,
    headline: article.title,
    summary: leadSummary(article.description || article.title, 200) || article.title,
    date: article.date,
    category: 'Congress',
    isOpinion: isOpinionArticleUrl(article.link),
    isVerified: false,
    url: article.link,
    source: {
      name: outletForArticleUrl(article.link) ?? article.outlet,
      url: article.link,
      tier: tierForArticleUrl(article.link) ?? article.tier,
      date: article.date,
      description: 'Approved-outlet member topic/tag RSS',
    },
  };
}

/**
 * Fetch approved-outlet topic/tag RSS for a member; apply D1 name match + URL guards.
 */
export async function fetchMemberTopicRssArticles(
  leg: LegislatorNewsRow & { state: string },
  displayByBio: Map<string, { name: string; firstName: string; lastName: string }>,
): Promise<{ items: NewsItem[]; feedsAttempted: number; feedFailures: string[] }> {
  const primaryName = memberNewsPrimaryName(leg, displayByBio);
  const slug = memberNewsTopicSlug(primaryName);
  if (!slug) return { items: [], feedsAttempted: 0, feedFailures: [] };

  const items: NewsItem[] = [];
  const seen = new Set<string>();
  const feedFailures: string[] = [];
  let feedsAttempted = 0;

  for (const feed of TOPIC_FEED_TEMPLATES) {
    feedsAttempted += 1;
    const feedUrl = feed.urlTemplate.replace('{slug}', slug);
    const result = await fetchFeedXml(feedUrl);
    if (!result.ok) {
      feedFailures.push(`${feed.outlet}: ${result.error}`);
      continue;
    }
    for (const raw of parseRssItems(result.xml)) {
      const title = decodeHtmlEntities(raw.title).replace(/\s+/g, ' ').trim();
      const link = raw.link.trim();
      // Guardian (and others) entity-encode HTML in description (`&lt;p&gt;...`);
      // decode first, then strip tags so summaries stay plain text.
      const description = decodeHtmlEntities(raw.description)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const date = formatPubDate(raw.pubDate);
      if (!date || !isAllowedNewsArticleUrl(link)) continue;
      if (!matchesMemberInText(`${title} ${description}`, leg, displayByBio)) continue;
      const qualify = qualifiesMemberNewsItem(title, description, leg, displayByBio);
      if (!qualify.ok) continue;
      if (!isTopicRelevant(title, description)) continue;
      if (seen.has(link)) continue;
      seen.add(link);
      const item = toNewsItem(
        { title, link, date, description, outlet: feed.outlet, tier: feed.tier },
        leg.bioguideId,
        items.length,
      );
      items.push(item);
    }
  }

  return { items, feedsAttempted, feedFailures };
}
