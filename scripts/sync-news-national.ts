/**
 * sync-news-national.ts — per-member federal Congress news via GDELT DOC API.
 * Output: lib/data/generated/newsNational.json (keyed by bioguideId)
 *
 * Tier 3 (media). Every displayed field is copied verbatim from the API response.
 * Run: npm run sync:news-national
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Source } from '../lib/types';
import { loadEnvLocal } from './lib/ingest-utils';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'newsNational.json');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
/** GDELT DOC API inter-member spacing (documented limit: ~1 req / 5s). */
const GDELT_DELAY_MS = 2000;
const MAX_ARTICLES_PER_MEMBER = 5;
const TIMESPAN = '90d';
const CHECKPOINT_FILE = '/tmp/sync-news-national-checkpoint.json';
const GDELT_RATE_LIMIT_DELAYS_MS = [5000, 10000] as const;

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

function buildGdeltQuery(leg: LegislatorRow): string {
  const chamber = chamberLabel(leg.chamber);
  return `"${leg.name}" ${leg.state} ${chamber} sourcelang:english`;
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
    seenUrls.add(mapped.url);
    articles.push(mapped);
    if (articles.length >= MAX_ARTICLES_PER_MEMBER) break;
  }
  return articles;
}

async function fetchGdeltMemberNews(
  leg: LegislatorRow,
  maxAttempts = GDELT_RATE_LIMIT_DELAYS_MS.length,
): Promise<MemberNewsArticle[]> {
  const query = buildGdeltQuery(leg);
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
      const res = await fetch(datasetUrl, { headers: { Accept: 'application/json' } });
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
      return articlesFromGdeltResponse(data);
    } catch (err) {
      lastErr = err;
      const waitMs = GDELT_RATE_LIMIT_DELAYS_MS[attempt];
      if (attempt < maxAttempts - 1 && waitMs !== undefined) await sleep(waitMs);
    }
  }
  if (lastErr !== undefined) {
    const reason = lastErr instanceof Error ? lastErr.message : String(lastErr);
    console.warn(`  ${leg.name}: GDELT failed — ${reason}`);
  }
  return [];
}

async function main(): Promise<void> {
  await loadEnvLocal();

  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  const members = legislatorsRaw.legislators.filter(
    (l) => l.chamber === 'senate' || l.chamber === 'house',
  );

  console.log(`Syncing news for ${members.length} federal Congress members (${TIMESPAN}) — GDELT only…`);

  const byBioguideId: Record<string, MemberNewsEntry> = {};
  let membersWithNews = 0;
  let gdeltCount = 0;
  let totalArticles = 0;

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

    let articles: MemberNewsArticle[] = [];
    let feed: 'gdelt' | undefined;

    articles = await fetchGdeltMemberNews(leg);
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
      console.log(`  progress: ${i + 1}/${members.length} — ${membersWithNews} with news so far`);
    }
    console.log(`  ${leg.name}: ${articles.length} article(s)${feed ? ` (${feed})` : ''}`);

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
  console.log(`  total articles: ${totalArticles}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
