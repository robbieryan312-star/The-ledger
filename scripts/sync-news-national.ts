/**
 * sync-news-national.ts — per-member federal Congress news via GDELT DOC API.
 * Output: lib/data/generated/newsNational.json (keyed by bioguideId)
 *
 * Tier 3 (media). Every displayed field is copied verbatim from the API response.
 * Run: npm run sync:news-national
 */
import { config } from 'dotenv';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Source } from '../lib/types';
import type { NewsItem } from '../lib/types';
import { leadSummary } from '../lib/data/displaySummary';
import {
  isAllowedNewsArticleUrl,
  isOpinionArticleUrl,
  outletForArticleUrl,
  tierForArticleUrl,
} from '../lib/data/newsFeedRegistry';
import { NEWS_FEED_REGISTRY } from '../lib/data/newsFeedRegistry';
import { normalizeUrlForDedupe } from '../lib/data/sourceIntegrity';
import { applyNewsCorroboration } from '../lib/data/newsCorroboration';
import { buildSyncSummary, emitSyncSummary } from './lib/syncKernel';
import { memberInScope, requireSyncScope } from './lib/sync-scope';
import {
  loadMemberNewsDisplayMap,
  memberNewsNameTokens,
  memberNewsPrimaryName,
  type LegislatorNewsRow,
} from './lib/memberNewsMatching';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const profilesRoot = path.join(OUT_DIR, 'profiles');
const OUT_FILE = path.join(OUT_DIR, 'newsNational.json');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
/** GDELT DOC API inter-member spacing (documented limit: ~1 req / 5s). */
const GDELT_DELAY_MS = 8000;
const MAX_ARTICLES_PER_MEMBER = 25;
const TIMESPAN = '12months';
const CHECKPOINT_FILE = '/tmp/sync-news-national-checkpoint.json';
const GDELT_RATE_LIMIT_DELAYS_MS = [8000, 15000, 25000] as const;

const GDELT_SOURCE: Source = {
  name: 'GDELT',
  url: 'https://api.gdeltproject.org',
  tier: 'media',
  description: 'GDELT 2.0 DOC API — Tier 3 media aggregator; corroborate with Tier 1/2 before citing as fact',
};

interface LegislatorRow {
  bioguideId: string;
  name: string;
  state: string;
  stateCode: string;
  chamber: string;
}

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

export interface MemberNewsArticle {
  title: string;
  outlet: string;
  publishedDate: string;
  url: string;
}

export interface MemberNewsEntry {
  bioguideId: string;
  name: string;
  articles: MemberNewsArticle[];
  feed?: 'gdelt' | 'newsapi';
}

export interface MemberNewsSnapshot {
  meta: {
    source: Source;
    asOf: string;
    fetchedAt: string;
    membersQueried: number;
    membersWithNews: number;
    totalArticles: number;
    gdeltCount: number;
    newsApiCount: number;
    apiEndpoint: string;
    note: string;
  };
  byBioguideId: Record<string, MemberNewsEntry>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chamberLabel(chamber: string): string {
  return chamber === 'senate' ? 'senate' : 'house';
}

function buildGdeltQuery(leg: LegislatorRow, displayByBio: Map<string, { name: string }>): string {
  const primaryName = memberNewsPrimaryName(leg, displayByBio);
  const domains = [
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
  ];
  const domainClause = `(${domains.map((h) => `domain:${h}`).join(' OR ')})`;
  return `"${primaryName}" ${domainClause} sourcelang:english`;
}

function articleFromGdelt(a: GdeltArticle): MemberNewsArticle | null {
  const url = a.url?.trim();
  const title = a.title?.trim();
  if (!url || !title || !url.startsWith('http')) return null;

  const outlet = a.domain?.trim() ?? '';
  const publishedDate = a.seendate?.trim() ?? '';
  if (!outlet || !publishedDate) return null;

  return { title, outlet, publishedDate, url };
}

function articlesFromGdeltResponse(data: GdeltResponse): MemberNewsArticle[] {
  const articles: MemberNewsArticle[] = [];
  const seenUrls = new Set<string>();

  for (const raw of data.articles ?? []) {
    const mapped = articleFromGdelt(raw);
    if (!mapped || seenUrls.has(mapped.url)) continue;
    if (!isAllowedNewsArticleUrl(mapped.url)) continue;
    seenUrls.add(mapped.url);
    articles.push(mapped);
    if (articles.length >= MAX_ARTICLES_PER_MEMBER) break;
  }
  return articles;
}

async function fetchGdeltMemberNews(
  leg: LegislatorRow,
  displayByBio: Map<string, { name: string }>,
  maxAttempts = GDELT_RATE_LIMIT_DELAYS_MS.length,
): Promise<{ articles: MemberNewsArticle[]; failed: boolean; lastError?: string }> {
  const query = buildGdeltQuery(leg, displayByBio);
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: String(MAX_ARTICLES_PER_MEMBER),
    format: 'json',
    sort: 'datedesc',
    timespan: TIMESPAN,
  });
  const datasetUrl = `${GDELT_DOC_API}?${params.toString()}`;

  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(datasetUrl, { signal: AbortSignal.timeout(30_000), headers: { Accept: 'application/json' } });
      const text = await res.text();

      if (res.status === 429 || text.includes('Please limit requests')) {
        const waitMs = GDELT_RATE_LIMIT_DELAYS_MS[attempt];
        if (waitMs === undefined) break;
        console.warn(`    GDELT rate limit for ${leg.name}, waiting ${waitMs}ms…`);
        await sleep(waitMs);
        continue;
      }

      if (text.startsWith('Your search') || text.startsWith('Please limit')) {
        throw new Error(text.split('\n')[0]?.slice(0, 120) ?? 'GDELT query error');
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = JSON.parse(text) as GdeltResponse;
      return { articles: articlesFromGdeltResponse(data), failed: false };
    } catch (err) {
      lastErr = err;
      const waitMs = GDELT_RATE_LIMIT_DELAYS_MS[attempt];
      if (attempt < maxAttempts - 1 && waitMs !== undefined) await sleep(waitMs);
    }
  }
  const reason = lastErr instanceof Error ? lastErr.message : String(lastErr);
  console.warn(`  ${leg.name}: GDELT failed — ${reason}`);
  return { articles: [], failed: true, lastError: reason };
}

function gdeltArticleToNewsItem(
  article: MemberNewsArticle,
  bioguideId: string,
  idx: number,
): NewsItem | null {
  if (!isAllowedNewsArticleUrl(article.url)) return null;
  const outlet = outletForArticleUrl(article.url) ?? article.outlet;
  const tier = tierForArticleUrl(article.url) ?? 'media';
  const date = article.publishedDate.slice(0, 10);
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : article.publishedDate.slice(0, 10);
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
      description: 'GDELT DOC API — corroborate with official record before citing as verified fact',
    },
  };
}

async function mergeGdeltIntoProfileNews(
  bioguideId: string,
  articles: MemberNewsArticle[],
  leg: LegislatorNewsRow,
  displayByBio: Map<string, { name: string; firstName: string; lastName: string }>,
): Promise<number> {
  const profilePath = path.join(profilesRoot, bioguideId, 'news.json');
  let existing: { bioguideId: string; status: string; items: NewsItem[]; note?: string };
  try {
    existing = JSON.parse(await readFile(profilePath, 'utf8')) as typeof existing;
  } catch {
    return 0;
  }
  const seen = new Set(existing.items.map((i) => normalizeUrlForDedupe(i.url ?? i.source.url ?? '')));
  let added = 0;
  for (const [idx, article] of articles.entries()) {
    const item = gdeltArticleToNewsItem(article, bioguideId, idx);
    if (!item) continue;
    const key = normalizeUrlForDedupe(item.url ?? '');
    if (seen.has(key)) continue;
    seen.add(key);
    existing.items.push(item);
    added += 1;
  }
  if (added === 0) return 0;
  existing.items.sort((a, b) => b.date.localeCompare(a.date));
  existing.items = applyNewsCorroboration(
    existing.items,
    memberNewsNameTokens(leg, displayByBio),
  ).slice(0, 15);
  existing.status = existing.items.length > 0 ? 'filled' : existing.status;
  existing.note = `${existing.items.length} article(s) — RSS + approved GDELT outlets (target 15).`;
  await writeFile(profilePath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
  return added;
}

async function main(): Promise<void> {
  const memberFilter = requireSyncScope(process.argv, 'sync-news-national');
  config({ path: path.join(projectRoot, '.env.local') });
  const displayByBio = loadMemberNewsDisplayMap(projectRoot);

  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  const members = legislatorsRaw.legislators.filter(
    (l) =>
      (l.chamber === 'senate' || l.chamber === 'house') &&
      memberInScope(l.bioguideId, memberFilter),
  );
  if (memberFilter && members.length === 0) {
    console.error(`No current legislators match --members filter: ${[...memberFilter].join(', ')}`);
    process.exit(1);
  }

  console.log(`Syncing news for ${members.length} federal Congress members (${TIMESPAN}) — GDELT only…`);

  const byBioguideId: Record<string, MemberNewsEntry> = {};
  let membersWithNews = 0;
  let gdeltCount = 0;
  let totalArticles = 0;
  let fetchFailures = 0;

  let priorSnapshot: MemberNewsSnapshot | null = null;
  try {
    priorSnapshot = JSON.parse(await readFile(OUT_FILE, 'utf8')) as MemberNewsSnapshot;
    Object.assign(byBioguideId, priorSnapshot.byBioguideId ?? {});
    membersWithNews = Object.values(byBioguideId).filter((e) => (e.articles?.length ?? 0) > 0).length;
    totalArticles = Object.values(byBioguideId).reduce((sum, e) => sum + (e.articles?.length ?? 0), 0);
    gdeltCount = membersWithNews;
  } catch {
    /* fresh run */
  }

  let checkpoint: Record<string, boolean> = {};
  try {
    checkpoint = JSON.parse(await readFile(CHECKPOINT_FILE, 'utf8')) as Record<string, boolean>;
  } catch {
    /* no checkpoint yet */
  }

  for (let i = 0; i < members.length; i++) {
    const leg = members[i];
    if (checkpoint[leg.bioguideId]) continue;
    if (i > 0) await sleep(GDELT_DELAY_MS);

    const result = await fetchGdeltMemberNews(leg, displayByBio);

    if (result.failed) {
      fetchFailures += 1;
      console.log(`  ${leg.name}: FETCH FAILED (skipped) — ${result.lastError ?? 'unknown'}`);
      if ((i + 1) % 50 === 0 || i === members.length - 1) {
        console.log(`  progress: ${i + 1}/${members.length} — ${membersWithNews} with news, ${fetchFailures} failed`);
      }
      continue;
    }

    const articles = result.articles;
    let feed: 'gdelt' | undefined;

    if (articles.length > 0) {
      feed = 'gdelt';
      gdeltCount += 1;
      totalArticles += articles.length;
    }

    byBioguideId[leg.bioguideId] = {
      bioguideId: leg.bioguideId,
      name: leg.name,
      articles,
      ...(feed ? { feed } : {}),
    };
    if (articles.length > 0) membersWithNews += 1;
    if ((i + 1) % 50 === 0 || i === members.length - 1) {
      console.log(`  progress: ${i + 1}/${members.length} — ${membersWithNews} with news, ${fetchFailures} failed`);
    }
    console.log(`  ${leg.name}: ${articles.length} article(s)${feed ? ` (${feed})` : ''}`);
    const profileDir = path.join(profilesRoot, leg.bioguideId);
    try {
      await readFile(path.join(profileDir, 'news.json'), 'utf8');
      const added = await mergeGdeltIntoProfileNews(leg.bioguideId, articles, leg, displayByBio);
      if (added > 0) console.log(`    → merged ${added} approved article(s) into profiles/${leg.bioguideId}/news.json`);
    } catch {
      /* not a migrated profile */
    }

    checkpoint[leg.bioguideId] = true;
    await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint));
  }

  const snapshot: MemberNewsSnapshot = {
    meta: {
      source: GDELT_SOURCE,
      asOf,
      fetchedAt,
      membersQueried: members.length,
      membersWithNews,
      totalArticles,
      gdeltCount,
      newsApiCount: 0,
      apiEndpoint: GDELT_DOC_API,
      note:
        'Per-member federal Congress news (last 90 days, English). GDELT 2.0 DOC API only. Tier 3 media — sourced news references, not verified personal quotes.',
    },
    byBioguideId,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`  members queried: ${members.length}`);
  console.log(`  members with news: ${membersWithNews}`);
  console.log(`  members failed (skipped): ${fetchFailures}`);
  console.log(`  total articles: ${totalArticles}`);

  emitSyncSummary(
    buildSyncSummary('sync-news-national', {
      status: fetchFailures > 0 ? 'partial' : 'ok',
      failed: [],
      checkpoint: CHECKPOINT_FILE,
      log: '/tmp/ledger-sync-news-national.log',
      preservePrior: true,
    }),
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
