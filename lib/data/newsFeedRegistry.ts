/**
 * Approved-outlet RSS feeds for profile News tabs.
 * Canonical list for sync-news-rss.ts and news URL guards.
 * Tier values per `.cursor/rules/ledger-core-rules.mdc` §3.
 */
import type { SourceTier } from '../types';

export interface NewsFeedEntry {
  outlet: string;
  feedUrl: string;
  tier: SourceTier;
  /** Hostname(s) this feed's article links may use (without www). */
  articleHosts: string[];
}

/** RSS feeds from approved journalism outlets only (D3 spec). */
export const NEWS_FEED_REGISTRY: NewsFeedEntry[] = [
  {
    outlet: 'NPR',
    feedUrl: 'https://feeds.npr.org/1014/rss.xml',
    tier: 'media',
    articleHosts: ['npr.org'],
  },
  {
    outlet: 'The Hill',
    feedUrl: 'https://thehill.com/feeds/rss/politics',
    tier: 'media',
    articleHosts: ['thehill.com'],
  },
  {
    outlet: 'Politico',
    feedUrl: 'https://rss.politico.com/politics-news.xml',
    tier: 'media',
    articleHosts: ['politico.com'],
  },
  {
    outlet: 'Roll Call',
    feedUrl: 'https://rollcall.com/feed/',
    tier: 'media',
    articleHosts: ['rollcall.com'],
  },
  {
    outlet: 'Reuters',
    feedUrl: 'https://feeds.reuters.com/reuters/politicsNews',
    tier: 'nonpartisan',
    articleHosts: ['reuters.com'],
  },
  {
    outlet: 'PBS NewsHour',
    feedUrl: 'https://www.pbs.org/newshour/feeds/rss/politics',
    tier: 'media',
    articleHosts: ['pbs.org'],
  },
  {
    outlet: 'ProPublica',
    feedUrl: 'https://www.propublica.org/feeds/propublica/main',
    tier: 'nonpartisan',
    articleHosts: ['propublica.org'],
  },
  {
    outlet: 'The Guardian',
    feedUrl: 'https://www.theguardian.com/us-news/rss',
    tier: 'media',
    articleHosts: ['theguardian.com'],
  },
  {
    outlet: 'Miami Herald',
    feedUrl: 'https://www.miamiherald.com/news/politics-government/?widgetName=rssfeed&widgetContentId=791504&getXmlFeed=true',
    tier: 'media',
    articleHosts: ['miamiherald.com'],
  },
  {
    outlet: 'Tampa Bay Times',
    feedUrl: 'https://www.tampabay.com/feed/',
    tier: 'media',
    articleHosts: ['tampabay.com'],
  },
  {
    outlet: 'Sun Sentinel',
    feedUrl: 'https://www.sun-sentinel.com/arcio/rss/category/news/politics/',
    tier: 'media',
    articleHosts: ['sun-sentinel.com'],
  },
  {
    outlet: 'Orlando Sentinel',
    feedUrl: 'https://www.orlandosentinel.com/arcio/rss/category/news/politics/',
    tier: 'media',
    articleHosts: ['orlandosentinel.com'],
  },
  {
    outlet: 'Florida Phoenix',
    feedUrl: 'https://floridaphoenix.com/feed/',
    tier: 'media',
    articleHosts: ['floridaphoenix.com'],
  },
  {
    outlet: 'WUSF',
    feedUrl: 'https://www.wusf.org/politics/feed',
    tier: 'media',
    articleHosts: ['wusf.org'],
  },
  {
    outlet: 'WLRN',
    feedUrl: 'https://www.wlrn.org/tags/politics/rss.xml',
    tier: 'media',
    articleHosts: ['wlrn.org'],
  },
];

const REGISTRY_HOSTS = new Set<string>();
for (const entry of NEWS_FEED_REGISTRY) {
  for (const h of entry.articleHosts) REGISTRY_HOSTS.add(h.toLowerCase());
}

/**
 * Approved journalism article hosts for news.json validation (includes outlets without
 * an active RSS feed in this registry — e.g. GDELT-sourced Guardian/AP items).
 * Canonical list: `.cursor/rules/ledger-core-rules.mdc` §3 + ledger-data-policy journalism list.
 */
const ADDITIONAL_APPROVED_ARTICLE_HOSTS = [
  'nytimes.com',
  'washingtonpost.com',
  'wsj.com',
  'apnews.com',
  'theatlantic.com',
  'bloomberg.com',
  'cq.com',
] as const;

const ALL_APPROVED_NEWS_HOSTS = new Set<string>([
  ...REGISTRY_HOSTS,
  ...ADDITIONAL_APPROVED_ARTICLE_HOSTS,
]);

function hostMatchesAllowlist(host: string, allowlist: Set<string>): boolean {
  return Array.from(allowlist).some((a) => host === a || host.endsWith(`.${a}`));
}

/** True when the article URL hostname is on the approved news allowlist (registry + journalism). */
export function isRegistryNewsHost(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '');
    return hostMatchesAllowlist(host, ALL_APPROVED_NEWS_HOSTS);
  } catch {
    return false;
  }
}

/** congress.gov official-record notes preserved from prior verified syncs (not RSS-sourced). */
export function isOfficialRecordNewsUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '');
    return host === 'congress.gov' || host.endsWith('.congress.gov');
  } catch {
    return false;
  }
}

export function isAllowedNewsArticleUrl(url: string | undefined): boolean {
  return isRegistryNewsHost(url) || isOfficialRecordNewsUrl(url);
}

export function outletForArticleUrl(url: string): string | undefined {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '');
    for (const entry of NEWS_FEED_REGISTRY) {
      if (entry.articleHosts.some((a) => host === a || host.endsWith(`.${a}`))) {
        return entry.outlet;
      }
    }
    if (host.includes('apnews.com')) return 'AP News';
    if (host.includes('nytimes.com')) return 'The New York Times';
    if (isOfficialRecordNewsUrl(url)) return 'Congress.gov';
  } catch {
    /* ignore */
  }
  return undefined;
}

export function tierForArticleUrl(url: string): SourceTier | undefined {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '');
    for (const entry of NEWS_FEED_REGISTRY) {
      if (entry.articleHosts.some((a) => host === a || host.endsWith(`.${a}`))) {
        return entry.tier;
      }
    }
    if (host.includes('apnews.com') || host.includes('reuters.com')) return 'nonpartisan';
    if (isOfficialRecordNewsUrl(url)) return 'official';
  } catch {
    /* ignore */
  }
  return 'media';
}
