/**
 * sync-profile-news.ts — GDELT-sourced news.json for the 6 migrated gold-standard profiles
 * (Group C, the last parked category after layout (A) and voting record (B)).
 *
 * Output: lib/data/generated/profiles/{bioguideId}/news.json — bioguideId-keyed, one file
 * per member per the destination-view data policy (news.json feeds the profile News tab).
 *
 * Approved outlets only (see lib/data/sourceIntegrity.ts#isApprovedNewsOutlet). Every kept
 * item requires a specific article URL, named outlet, publication date, tier value, and an
 * explicit isOpinion boolean. Wire (AP/Reuters) + a republishing outlet on the same story
 * count as ONE independent source — the wire-original is kept, republishes are dropped.
 *
 * Retry policy (documented per ledger-core-rules.mdc "read the real error before any
 * restart"): up to 5 attempts per member with exponential backoff (5s, 15s, 30s, 60s, 120s)
 * on HTTP 429 / GDELT's "Please limit requests" text. If all attempts are exhausted, the
 * member's fetch is marked `fetch-blocked` and — critically — any pre-existing verified
 * news.json items are PRESERVED, never wiped by a failed re-fetch (core-rules §6:
 * "Failure is NEVER absence").
 *
 * Resumable: progress is checkpointed to CHECKPOINT_FILE after every member so a rate-limit
 * mid-run (or a killed process) does not lose already-fetched members on re-run.
 *
 * Run: npx tsx scripts/sync-profile-news.ts
 * Log (per ledger operational guardrails): tee to /tmp/ledger-sync-profile-news.log
 */
import { config } from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isApprovedNewsOutlet,
  isArticleTypeIntegrityUrl,
  isNearDuplicateHeadline,
  isWireServiceOutlet,
  normalizeUrlForDedupe,
} from '../lib/data/sourceIntegrity';
import type { NewsItem, Source } from '../lib/types';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');
const legislatorsFile = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');
const CHECKPOINT_FILE = '/tmp/ledger-sync-profile-news-checkpoint.json';
const MAX_ITEMS_PER_MEMBER = 15;
const GDELT_TIMESPAN = '18m';
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000, 120000] as const;
const INTER_MEMBER_DELAY_MS = 8000;

export const MEMBERS = ['S000033', 'O000172', 'M000355', 'M001184', 'W000817', 'C001098'] as const;

interface LegislatorRow {
  bioguideId: string;
  name: string;
  lastName?: string;
  state: string;
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

interface FetchResult {
  status: 'ok' | 'fetch-blocked';
  articles: GdeltArticle[];
  attempts: number;
  lastError?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function formatGdeltDate(seendate: string): string {
  if (/^\d{8}T\d{6}Z$/.test(seendate)) {
    return `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`;
  }
  return seendate.slice(0, 10);
}

function lastNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1].replace(/[^A-Za-z'-]/g, '');
}

async function fetchGdeltForMember(leg: LegislatorRow): Promise<FetchResult> {
  const chamber = leg.chamber === 'senate' ? 'senate' : 'house';
  const query = `"${leg.name}" ${leg.state} ${chamber} sourcelang:english`;
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: '75',
    format: 'json',
    sort: 'datedesc',
    timespan: GDELT_TIMESPAN,
  });
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;

  let lastError: string | undefined;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const waitMs = RETRY_DELAYS_MS[attempt - 1];
      console.log(`    retry ${attempt}/${RETRY_DELAYS_MS.length} for ${leg.name} after ${waitMs}ms backoff…`);
      await sleep(waitMs);
    }
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(45_000) });
      const text = await res.text();
      if (res.status === 429 || text.includes('Please limit requests')) {
        lastError = 'GDELT rate-limit (429 / "Please limit requests")';
        continue;
      }
      if (!res.ok || text.startsWith('Your search')) {
        lastError = `GDELT error: HTTP ${res.status} — ${text.slice(0, 120)}`;
        continue;
      }
      const data = JSON.parse(text) as GdeltResponse;
      return { status: 'ok', articles: data.articles ?? [], attempts: attempt + 1 };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { status: 'fetch-blocked', articles: [], attempts: RETRY_DELAYS_MS.length, lastError };
}

/** Known GDELT opinion-section path fragments per approved outlet (never inferred from title alone). */
const OPINION_PATH_MARKERS: RegExp[] = [
  /\/opinion\//i,
  /\/opinions\//i,
  /\/commentisfree\//i,
  /\/editorials?\//i,
  /^\/perspective\//i,
];

function isOpinionUrl(url: string): boolean {
  try {
    return OPINION_PATH_MARKERS.some((re) => re.test(new URL(url).pathname));
  } catch {
    return false;
  }
}

function outletNameFromDomain(domain: string): string {
  const host = domain.toLowerCase().replace(/^www\./, '');
  const NAMES: Record<string, string> = {
    'nytimes.com': 'The New York Times',
    'washingtonpost.com': 'The Washington Post',
    'wsj.com': 'The Wall Street Journal',
    'politico.com': 'Politico',
    'thehill.com': 'The Hill',
    'apnews.com': 'AP News',
    'reuters.com': 'Reuters',
    'npr.org': 'NPR',
    'pbs.org': 'PBS NewsHour',
    'rollcall.com': 'Roll Call',
    'cq.com': 'CQ',
    'theatlantic.com': 'The Atlantic',
    'bloomberg.com': 'Bloomberg',
    'propublica.org': 'ProPublica',
    'theguardian.com': 'The Guardian',
    'miamiherald.com': 'Miami Herald',
    'tampabay.com': 'Tampa Bay Times',
    'sun-sentinel.com': 'Sun Sentinel',
    'orlandosentinel.com': 'Orlando Sentinel',
    'floridaphoenix.com': 'Florida Phoenix',
    'wusf.org': 'WUSF',
    'wlrn.org': 'WLRN',
  };
  for (const [suffix, name] of Object.entries(NAMES)) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return name;
  }
  return host;
}

/** Relevance heuristic: the member's surname must appear in the headline itself. */
function isRelevantHeadline(title: string, lastName: string): boolean {
  if (!lastName) return true;
  const re = new RegExp(`\\b${lastName}\\b`, 'i');
  return re.test(title);
}

interface CandidateItem {
  headline: string;
  url: string;
  date: string;
  outlet: string;
  tier: 'media' | 'nonpartisan';
  isOpinion: boolean;
}

function articlesToCandidates(articles: GdeltArticle[], lastName: string): CandidateItem[] {
  const candidates: CandidateItem[] = [];
  for (const a of articles) {
    if (!a.url || !a.title || !a.domain || !a.seendate) continue;
    if (!isApprovedNewsOutlet(a.url)) continue;
    if (!isArticleTypeIntegrityUrl(a.url)) continue;
    if (!isRelevantHeadline(a.title, lastName)) continue;
    candidates.push({
      // Whitespace-only cleanup (GDELT occasionally strips quote characters from titles,
      // leaving double spaces) — never alters wording, so the headline stays verbatim.
      headline: a.title.replace(/\s+/g, ' ').trim(),
      url: a.url.trim(),
      date: formatGdeltDate(a.seendate),
      outlet: outletNameFromDomain(a.domain),
      tier: isWireServiceOutlet(a.url) ? 'nonpartisan' : 'media',
      isOpinion: isOpinionUrl(a.url),
    });
  }
  return candidates;
}

/** Dedupe by normalized URL, then by fuzzy headline match — wire-original wins over republishes. */
function dedupeCandidates(items: CandidateItem[]): CandidateItem[] {
  const byNormalizedUrl = new Map<string, CandidateItem>();
  for (const item of items) {
    const key = normalizeUrlForDedupe(item.url);
    if (!byNormalizedUrl.has(key)) byNormalizedUrl.set(key, item);
  }
  const deduped: CandidateItem[] = [];
  for (const item of byNormalizedUrl.values()) {
    const dupIdx = deduped.findIndex((existing) => isNearDuplicateHeadline(existing.headline, item.headline));
    if (dupIdx === -1) {
      deduped.push(item);
      continue;
    }
    const existing = deduped[dupIdx];
    const itemIsWire = item.tier === 'nonpartisan';
    const existingIsWire = existing.tier === 'nonpartisan';
    if (itemIsWire && !existingIsWire) deduped[dupIdx] = item;
  }
  return deduped;
}

function toNewsItem(candidate: CandidateItem, idx: number, bioguideId: string): NewsItem {
  const source: Source = {
    name: candidate.outlet,
    url: candidate.url,
    tier: candidate.tier,
    date: candidate.date,
  };
  return {
    id: `${bioguideId.toLowerCase()}-gdelt-${idx + 1}`,
    headline: candidate.headline,
    // TODO: switch to a leadSummary()-derived excerpt once a fetched article body is
    // available; GDELT's DOC API returns headline/metadata only, no body text, so the
    // headline itself is the only extractive text available at collection time.
    summary: candidate.headline,
    date: candidate.date,
    category: 'Congress',
    isOpinion: candidate.isOpinion,
    isVerified: false,
    url: candidate.url,
    source,
  };
}

interface ExistingNewsFile {
  bioguideId: string;
  items: NewsItem[];
  status?: 'fetch-blocked';
  note?: string;
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });

  const legs = (JSON.parse(await readFile(legislatorsFile, 'utf8')) as { legislators: LegislatorRow[] }).legislators;

  let checkpoint: Record<string, { status: 'ok' | 'fetch-blocked'; count: number }> = {};
  try {
    checkpoint = JSON.parse(await readFile(CHECKPOINT_FILE, 'utf8')) as typeof checkpoint;
  } catch {
    /* no checkpoint yet */
  }

  for (let i = 0; i < MEMBERS.length; i++) {
    const bioguideId = MEMBERS[i];
    if (checkpoint[bioguideId]) {
      console.log(`${bioguideId}: already checkpointed (${checkpoint[bioguideId].status}, ${checkpoint[bioguideId].count} items) — skipping`);
      continue;
    }
    const leg = legs.find((l) => l.bioguideId === bioguideId);
    if (!leg) {
      console.warn(`${bioguideId}: not found in currentLegislators.json — skipping`);
      continue;
    }
    if (i > 0) await sleep(INTER_MEMBER_DELAY_MS);

    console.log(`${bioguideId} (${leg.name}): querying GDELT…`);
    const result = await fetchGdeltForMember(leg);

    const profileDir = path.join(profilesRoot, bioguideId);
    const newsPath = path.join(profileDir, 'news.json');
    const existing = JSON.parse(await readFile(newsPath, 'utf8')) as ExistingNewsFile;
    const existingGoodItems = existing.items ?? [];

    if (result.status === 'fetch-blocked') {
      console.warn(`${bioguideId}: GDELT fetch-blocked after ${result.attempts} attempts — ${result.lastError}`);
      // Never overwrite existing verified items with a failed re-fetch (core-rules §6).
      const output: ExistingNewsFile = existingGoodItems.length > 0
        ? { bioguideId, items: existingGoodItems }
        : {
            bioguideId,
            items: [],
            status: 'fetch-blocked',
            note: `GDELT DOC API fetch failed after ${result.attempts} attempts with exponential backoff (${RETRY_DELAYS_MS.join('ms, ')}ms) — last error: ${result.lastError ?? 'unknown'}. News absence not verified — retry once the shared egress/API issue clears.`,
          };
      await writeFile(newsPath, JSON.stringify(output, null, 2) + '\n');
      checkpoint[bioguideId] = { status: 'fetch-blocked', count: output.items.length };
      await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
      continue;
    }

    const lastName = lastNameOf(leg.name);
    const candidates = dedupeCandidates(articlesToCandidates(result.articles, lastName));
    candidates.sort((a, b) => (a.date < b.date ? 1 : -1));

    const existingUrls = new Set(existingGoodItems.map((it) => normalizeUrlForDedupe(it.url ?? it.source.url ?? '')));
    const freshCandidates = candidates.filter((c) => !existingUrls.has(normalizeUrlForDedupe(c.url)));
    const newItems = freshCandidates
      .slice(0, Math.max(0, MAX_ITEMS_PER_MEMBER - existingGoodItems.length))
      .map((c, idx) => toNewsItem(c, idx, bioguideId));

    const merged = [...existingGoodItems, ...newItems]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, MAX_ITEMS_PER_MEMBER);

    const output: ExistingNewsFile = { bioguideId, items: merged };
    if (merged.length < MAX_ITEMS_PER_MEMBER) {
      output.note = `${merged.length} relevant article${merged.length === 1 ? '' : 's'} found in approved-outlet GDELT coverage (target 15).`;
    }
    await writeFile(newsPath, JSON.stringify(output, null, 2) + '\n');
    console.log(`${bioguideId}: ${merged.length} item(s) after merge (${newItems.length} new from ${candidates.length} candidates)`);

    checkpoint[bioguideId] = { status: 'ok', count: merged.length };
    await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  }

  console.log('Done. Checkpoint at', CHECKPOINT_FILE);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
