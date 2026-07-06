/**
 * sync-news-rss.ts — approved-outlet RSS news for the 6 migrated gold-standard profiles.
 *
 * Output: lib/data/generated/profiles/{bioguideId}/news.json
 * Merges with existing verified items (dedupe by URL; keeps Guardian articles from GDELT).
 *
 * Rate discipline: ~1 req/s/host token bucket, 15s timeout, retry ×2 with backoff + jitter.
 * Per-member checkpointing — re-run resumes instead of restarting.
 * Timed-out feed = fetch-failed marker; prior good items preserved (core-rules §6).
 *
 * Run: npm run sync:news-rss
 * Log: tee /tmp/ledger-sync-news-rss.log
 */
import { config } from 'dotenv';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HostRateLimiter } from '../lib/data/resilientFetch';
import { leadSummary } from '../lib/data/displaySummary';
import { decodeHtmlEntities } from '../lib/data/htmlEntities';
import {
  NEWS_FEED_REGISTRY,
  outletForArticleUrl,
  tierForArticleUrl,
} from '../lib/data/newsFeedRegistry';
import {
  isArticleTypeIntegrityUrl,
  isBareHomepageUrl,
  isNearDuplicateHeadline,
  isWireServiceOutlet,
  normalizeUrlForDedupe,
} from '../lib/data/sourceIntegrity';
import type { NewsItem, Source } from '../lib/types';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');
const legislatorsFile = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');
const CHECKPOINT_FILE = '/tmp/ledger-sync-news-rss-checkpoint.json';
const FEED_HEALTH_FILE = path.join(projectRoot, 'data', 'reports', 'feed-health.json');
const MAX_ITEMS_PER_MEMBER = 15;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_FETCH_ATTEMPTS = 3;

export const MEMBERS = ['S000033', 'O000172', 'M000355', 'M001184', 'W000817', 'C001098'] as const;

interface LegislatorRow {
  bioguideId: string;
  name: string;
  lastName?: string;
  state: string;
  chamber: string;
}

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  outlet: string;
  tier: 'media' | 'nonpartisan' | 'official';
  matchedName: string;
}

interface ExistingNewsFile {
  bioguideId: string;
  items: NewsItem[];
  status?: 'fetch-failed' | 'fetch-blocked';
  note?: string;
}

interface FeedHealthEntry {
  outlet: string;
  feedUrl: string;
  consecutiveFailures: number;
  lastError?: string;
  lastOk?: string;
  disabled?: boolean;
}

interface FeedHealthReport {
  updatedAt: string;
  feeds: Record<string, FeedHealthEntry>;
}

async function loadFeedHealth(): Promise<FeedHealthReport> {
  try {
    return JSON.parse(await readFile(FEED_HEALTH_FILE, 'utf8')) as FeedHealthReport;
  } catch {
    return { updatedAt: new Date().toISOString(), feeds: {} };
  }
}

async function saveFeedHealth(report: FeedHealthReport): Promise<void> {
  report.updatedAt = new Date().toISOString();
  await mkdir(path.dirname(FEED_HEALTH_FILE), { recursive: true });
  await writeFile(FEED_HEALTH_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

const FEED_DISABLE_THRESHOLD = 3;

const feedLimiters = new Map<string, HostRateLimiter>();

function getFeedLimiter(feedUrl: string): HostRateLimiter {
  let limiter = feedLimiters.get(feedUrl);
  if (!limiter) {
    limiter = new HostRateLimiter(1, 1);
    feedLimiters.set(feedUrl, limiter);
  }
  return limiter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffDelay(attempt: number): number {
  return 1000 * Math.pow(2, attempt - 1) + Math.random() * 400;
}

function lastNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1].replace(/[^A-Za-z'-]/g, '');
}

function stripCdata(raw: string): string {
  return raw.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? stripCdata(m[1].replace(/<[^>]+>/g, ' ').trim()) : '';
}

function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || (block.match(/<link[^>]+href="([^"]+)"/i)?.[1] ?? '');
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date');
    const description = extractTag(block, 'description') || extractTag(block, 'content:encoded');
    if (title && link && pubDate) {
      items.push({ title, link: link.trim(), pubDate, description });
    }
  }
  return items;
}

function formatPubDate(raw: string): string | null {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const iso = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    return null;
  }
  return d.toISOString().slice(0, 10);
}

const LIFESTYLE_DROP =
  /\b(recipe|horoscope|crossword|sports score|box score|fashion week|red carpet|celebrity wedding|tv recap|restaurant review)\b/i;

const OPINION_PATH_MARKERS: RegExp[] = [
  /\/opinion\//i,
  /\/opinions\//i,
  /\/commentisfree\//i,
  /\/editorials?\//i,
];

function isOpinionUrl(url: string): boolean {
  try {
    return OPINION_PATH_MARKERS.some((re) => re.test(new URL(url).pathname));
  } catch {
    return false;
  }
}

function matchesMember(text: string, leg: LegislatorRow): string | null {
  const ln = lastNameOf(leg.name);
  if (!ln) return null;
  const honorific = leg.chamber === 'senate' ? `Sen. ${ln}` : `Rep. ${ln}`;
  const patterns = [
    new RegExp(`\\b${leg.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
    new RegExp(`\\bSen\\.\\s+${ln}\\b`, 'i'),
    new RegExp(`\\bRep\\.\\s+${ln}\\b`, 'i'),
    new RegExp(`\\bSenator\\s+${ln}\\b`, 'i'),
    new RegExp(`\\bRepresentative\\s+${ln}\\b`, 'i'),
  ];
  for (const re of patterns) {
    if (re.test(text)) {
      if (re.source.includes('Sen\\.')) return honorific;
      if (re.source.includes('Rep\\.')) return honorific;
      return leg.name;
    }
  }
  if (new RegExp(`\\b${ln}\\b`, 'i').test(text)) return ln;
  return null;
}

function isPoliticallyRelevant(title: string, description: string): boolean {
  const blob = `${title} ${description}`;
  if (LIFESTYLE_DROP.test(blob)) return false;
  const political =
    /\b(congress|senate|house|bill|vote|legislat|president|election|campaign|committee|amendment|filibuster|primary|impeach|spending|budget|tariff|immigration|healthcare|abortion|defense|U\.S\.|Washington)\b/i;
  return political.test(blob);
}

async function fetchFeedXml(feedUrl: string): Promise<{ ok: true; xml: string } | { ok: false; error: string }> {
  const limiter = getFeedLimiter(feedUrl);
  let lastError = 'unknown';

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    await limiter.acquire();
    try {
      const res = await fetch(feedUrl, {
        headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        if (attempt < MAX_FETCH_ATTEMPTS) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        return { ok: false, error: lastError };
      }
      const xml = await res.text();
      if (!xml.includes('<item') && !xml.includes('<entry')) {
        lastError = 'not RSS/Atom';
        if (attempt < MAX_FETCH_ATTEMPTS) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        return { ok: false, error: lastError };
      }
      return { ok: true, xml };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_FETCH_ATTEMPTS) {
        await sleep(backoffDelay(attempt));
        continue;
      }
    }
  }
  return { ok: false, error: lastError };
}

function rawItemsToCandidates(
  rawItems: Array<{ title: string; link: string; pubDate: string; description: string }>,
  leg: LegislatorRow,
  defaultOutlet: string,
  defaultTier: 'media' | 'nonpartisan',
): RssItem[] {
  const out: RssItem[] = [];
  for (const raw of rawItems) {
    const title = decodeHtmlEntities(raw.title).replace(/\s+/g, ' ').trim();
    const link = raw.link.trim();
    const description = decodeHtmlEntities(raw.description);
    const date = formatPubDate(raw.pubDate);
    if (!date || !isArticleTypeIntegrityUrl(link) || isBareHomepageUrl(link)) continue;
    const blob = `${title} ${description}`;
    const matchedName = matchesMember(blob, leg);
    if (!matchedName) continue;
    if (!isPoliticallyRelevant(title, description)) continue;

    const outlet = outletForArticleUrl(link) ?? defaultOutlet;
    const tierRaw = tierForArticleUrl(link) ?? defaultTier;
    const tier: RssItem['tier'] =
      tierRaw === 'official' || tierRaw === 'nonpartisan' || tierRaw === 'media'
        ? tierRaw
        : defaultTier;

    out.push({
      title,
      link,
      pubDate: date,
      description,
      outlet,
      tier,
      matchedName,
    });
  }
  return out;
}

function dedupeCandidates(items: RssItem[]): RssItem[] {
  const byUrl = new Map<string, RssItem>();
  for (const item of items) {
    const key = normalizeUrlForDedupe(item.link);
    if (!byUrl.has(key)) byUrl.set(key, item);
  }
  const deduped: RssItem[] = [];
  for (const item of byUrl.values()) {
    const dupIdx = deduped.findIndex((e) => isNearDuplicateHeadline(e.title, item.title));
    if (dupIdx === -1) {
      deduped.push(item);
      continue;
    }
    const existing = deduped[dupIdx];
    const itemWire = isWireServiceOutlet(item.link);
    const existingWire = isWireServiceOutlet(existing.link);
    if (itemWire && !existingWire) deduped[dupIdx] = item;
  }
  return deduped.sort((a, b) => b.pubDate.localeCompare(a.pubDate));
}

function toNewsItem(candidate: RssItem, idx: number, bioguideId: string): NewsItem {
  const summarySource = candidate.description || candidate.title;
  const summary = leadSummary(summarySource, 200) || candidate.title;
  const source: Source = {
    name: candidate.outlet,
    url: candidate.link,
    tier: candidate.tier,
    date: candidate.pubDate,
  };
  return {
    id: `${bioguideId.toLowerCase()}-rss-${idx + 1}`,
    headline: candidate.title,
    summary,
    date: candidate.pubDate,
    category: 'Congress',
    isOpinion: isOpinionUrl(candidate.link),
    isVerified: false,
    url: candidate.link,
    source,
  };
}

function mergeWithExisting(existing: NewsItem[], fresh: NewsItem[]): NewsItem[] {
  const merged = [...existing];
  const seen = new Set(existing.map((i) => normalizeUrlForDedupe(i.url ?? i.source.url ?? '')));
  for (const item of fresh) {
    const key = normalizeUrlForDedupe(item.url ?? item.source.url ?? '');
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_ITEMS_PER_MEMBER);
}

async function loadExistingNews(bioguideId: string): Promise<ExistingNewsFile | null> {
  const file = path.join(profilesRoot, bioguideId, 'news.json');
  try {
    return JSON.parse(await readFile(file, 'utf8')) as ExistingNewsFile;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });

  const legs = (JSON.parse(await readFile(legislatorsFile, 'utf8')) as { legislators: LegislatorRow[] })
    .legislators;

  let checkpoint: Record<string, { status: 'ok' | 'fetch-failed'; count: number }> = {};
  try {
    checkpoint = JSON.parse(await readFile(CHECKPOINT_FILE, 'utf8')) as typeof checkpoint;
  } catch {
    /* fresh run */
  }

  const feedHealth = await loadFeedHealth();
  const feedFailures: string[] = [];
  const allFeedItems: RssItem[] = [];

  for (const feed of NEWS_FEED_REGISTRY) {
    if (feed.feedUnavailable) {
      console.log(`Skipping ${feed.outlet} (feed-unavailable: ${feed.feedUnavailableReason ?? 'no working RSS'})`);
      continue;
    }
    const healthKey = feed.feedUrl;
    const health = feedHealth.feeds[healthKey];
    if (health?.disabled) {
      console.log(`Skipping ${feed.outlet} (auto-disabled after ${health.consecutiveFailures} failures: ${health.lastError ?? 'unknown'})`);
      feedFailures.push(`${feed.outlet}: auto-disabled (${health.lastError ?? 'unknown'})`);
      continue;
    }
    console.log(`Fetching ${feed.outlet}…`);
    const result = await fetchFeedXml(feed.feedUrl);
    if (!result.ok) {
      console.warn(`  fetch-failed: ${feed.outlet} — ${result.error}`);
      feedFailures.push(`${feed.outlet}: ${result.error}`);
      const prev = feedHealth.feeds[healthKey];
      const consecutiveFailures = (prev?.consecutiveFailures ?? 0) + 1;
      feedHealth.feeds[healthKey] = {
        outlet: feed.outlet,
        feedUrl: feed.feedUrl,
        consecutiveFailures,
        lastError: result.error,
        disabled: consecutiveFailures >= FEED_DISABLE_THRESHOLD,
      };
      continue;
    }
    feedHealth.feeds[healthKey] = {
      outlet: feed.outlet,
      feedUrl: feed.feedUrl,
      consecutiveFailures: 0,
      lastOk: new Date().toISOString(),
    };
    const parsed = parseRssItems(result.xml);
    console.log(`  ${parsed.length} raw items`);
    for (const leg of legs.filter((l) => (MEMBERS as readonly string[]).includes(l.bioguideId))) {
      const matched = rawItemsToCandidates(parsed, leg, feed.outlet, feed.tier === 'nonpartisan' ? 'nonpartisan' : 'media');
      allFeedItems.push(...matched);
    }
  }

  for (const bioguideId of MEMBERS) {
    if (checkpoint[bioguideId]) {
      console.log(`${bioguideId}: checkpoint skip (${checkpoint[bioguideId].status}, ${checkpoint[bioguideId].count})`);
      continue;
    }

    const leg = legs.find((l) => l.bioguideId === bioguideId);
    if (!leg) continue;

    const memberCandidates = dedupeCandidates(allFeedItems.filter((i) => matchesMember(`${i.title} ${i.description}`, leg)));
    const existingFile = await loadExistingNews(bioguideId);
    const existingItems = existingFile?.items ?? [];

    const freshItems = memberCandidates.map((c, idx) => toNewsItem(c, idx, bioguideId));
    const merged = mergeWithExisting(existingItems, freshItems);

    const out: ExistingNewsFile = {
      bioguideId,
      items: merged,
      note: `${merged.length} relevant article(s) from approved-outlet RSS (target ${MAX_ITEMS_PER_MEMBER}).`,
    };

    if (feedFailures.length === NEWS_FEED_REGISTRY.length && merged.length === existingItems.length && existingItems.length === 0) {
      out.status = 'fetch-failed';
      out.note = `fetch-failed: all ${NEWS_FEED_REGISTRY.length} feeds timed out or errored — no prior items to preserve.`;
    } else if (feedFailures.length > 0 && merged.length === 0 && existingItems.length === 0) {
      out.status = 'fetch-failed';
      out.note = `fetch-failed: ${feedFailures.length} feed(s) failed; 0 matches for ${leg.name}.`;
    }

    const dir = path.join(profilesRoot, bioguideId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'news.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
    console.log(`${bioguideId}: wrote ${merged.length} item(s)`);

    checkpoint[bioguideId] = { status: out.status === 'fetch-failed' ? 'fetch-failed' : 'ok', count: merged.length };
    await writeFile(CHECKPOINT_FILE, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
  }

  if (feedFailures.length) {
    console.warn(`Feed failures (${feedFailures.length}):`, feedFailures.join('; '));
  }
  await saveFeedHealth(feedHealth);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
