/**
 * sync-topic-positions.ts — Ballotpedia platform positions, VoteSmart NPAT stated
 * positions, and Said→Did vote correlation per topic bucket.
 *
 * Output: lib/data/generated/topicPositions.json
 * Run: npm run sync:topic-positions
 */
import { config } from 'dotenv';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceTier, VoteChoice, VoteRecord } from '../lib/types';
import { RECORD_TOPIC_BUCKETS, voteCongressGovUrl, voteTopicId, classifyTextToRecordTopicId } from '../lib/data/profileRecordByTopic';
import { truncateAtSentenceBoundary } from '../lib/data/displaySummary';
import { normalizeTopicId } from '../lib/data/topicAliases';
import { fetchJson, sleep } from './lib/ingest-utils';
import { NATIONAL_VOTES_FILE } from './lib/dataPaths';
import { buildSyncSummary, emitSyncSummary } from './lib/syncKernel';
import { fetchApprovedMediaStatementsForMember } from './lib/approvedMediaQuotes';
import { isProceduralCrecText } from './lib/crecProceduralFilter';
import { crecFloorSpeechOpenerRegex } from './lib/crecOpener';
import { canRefreshSaidDidLinks, mergeSaidDidLinksForRefresh } from './lib/topicPositionsPreserve';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'topicPositions.json');
const LEGISLATORS_FILE = path.join(OUT_DIR, 'currentLegislators.json');
const NATIONAL_VOTES_FILE_PATH = NATIONAL_VOTES_FILE;
const CHECKPOINT_FILE = '/tmp/sync-topic-positions-checkpoint.json';

const VOTESMART_BASE = 'https://api.votesmart.org';
const BALLOTPEDIA_BASE = 'https://ballotpedia.org';
const VOTESMART_DELAY_MS = 300;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_PLATFORM_PER_TOPIC = 3;
/** Per-topic vote-link candidates in sync; profile migrate caps member total at 15. */
const MAX_SAID_DID_LINKS = 15;
/** CREC floor-speech pool per member — headroom for Said→Did target of 15. */
const MAX_CREC_STATEMENTS_PER_MEMBER = 20;
/** Max GovInfo search granules to examine per member (pre-filter pool; not a display cap). */
const CREC_SEARCH_POOL = 150;
/** GovInfo /search page size — paginate via offsetMark until pool exhausted. */
const CREC_SEARCH_PAGE_SIZE = 100;
/** Congress numbers to search, most-recent first; dedupe by granule stem across sessions. */
const CREC_CONGRESSES = [119, 118] as const;

// --- 17b throughput controls ---
// GovInfo signed-key limit is 36,000 req/hr (10 req/s). Cap global GovInfo request rate
// below that and process members concurrently. Skipping clerk/section-header granules that
// never contain a floor-speech opener is output-preserving (the excerpt extractor already
// discards them), and cuts HTML fetches per member from ~12 to ~2-4.
const MEMBER_CONCURRENCY = Number(process.env.TOPIC_SYNC_CONCURRENCY ?? 5);
const GOVINFO_MAX_RPS = Number(process.env.GOVINFO_MAX_RPS ?? 8);
const CREC_SKIP_PROCEDURAL = (process.env.CREC_SKIP_PROCEDURAL ?? '1') !== '0';

/**
 * CREC section-header granules that are clerk-generated lists, never single-member floor
 * remarks. The excerpt extractor requires a "Mr. LASTNAME. Mr./Madam President/Speaker"
 * opener, which these never contain — so skipping the HTML fetch produces identical output.
 */
const CREC_PROCEDURAL_TITLE_RE =
  /^(text of (the )?(senate |house )?amendments?|amendments? submitted|submission of .*resolutions?|additional cosponsors|additional sponsors|public bills and resolutions|introduction of bills|reports? of committees?|executive communications?|petitions and memorials|enrolled bills?( and joint resolutions)? signed|constitutional authority statement|daily digest)\b/i;

function isProceduralCrecTitle(title: string): boolean {
  return CREC_PROCEDURAL_TITLE_RE.test(title.trim());
}

/** Token-bucket rate limiter shared across concurrent members. */
class RateLimiter {
  private tokens: number;
  private last: number;
  constructor(private readonly rps: number, private readonly burst = rps) {
    this.tokens = burst;
    this.last = Date.now();
  }
  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rps);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await sleep(Math.max(10, ((1 - this.tokens) / this.rps) * 1000));
    }
  }
}

const govinfoLimiter = new RateLimiter(GOVINFO_MAX_RPS);
const ballotpediaLimiter = new RateLimiter(Number(process.env.BALLOTPEDIA_MAX_RPS ?? 2), 2);

/** Fetch with retry/backoff on network errors and 429/503 — protects data layers whose
 *  loss on a transient blip would wipe good data (GovInfo search, Ballotpedia page). */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3,
): Promise<Response | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const res = await fetch(url, init);
      if ((res.status === 429 || res.status === 503) && attempt < attempts - 1) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      return res;
    } catch {
      if (attempt === attempts - 1) return null;
      await sleep(800 * (attempt + 1));
    }
  }
  return null;
}

/** Run an async worker over items with bounded concurrency. */
async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) break;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

const BALLOTPEDIA_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const BOILERPLATE_RE =
  /did not complete|click here to|see also:|ballotpedia's candidate connection|surveycta|javascript:/i;

const POSITION_SECTION_IDS = [
  'Political_positions',
  'Issues',
  'Campaign_themes',
  'Political_positions_and_issues',
];

interface LegislatorRow {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  stateCode: string;
  chamber: string;
}

interface PlatformPositionEntry {
  text: string;
  source: string;
  url: string;
  tier: SourceTier;
  asOf: string;
}

interface StatedPositionSourceEntry {
  tier: SourceTier;
  source: string;
  url: string;
}

interface SaidDidLinkEntry {
  topicId: string;
  statedPositionDate: string | null;
  voteDate: string;
  billTitle: string;
  billNumber: string;
  congressGovUrl: string;
  voteChoice: VoteChoice;
  tier: 'official';
}

interface TopicStatementEntry {
  title: string;
  date: string;
  url: string;
  tier: SourceTier;
  topicId: string;
}

interface TopicPositionData {
  platformPositions?: PlatformPositionEntry[];
  statedPosition?: string;
  statedPositionSource?: StatedPositionSourceEntry;
  statements: TopicStatementEntry[];
  saidDidLinks: SaidDidLinkEntry[];
}

/** Accepts `--member ID` (single) or `--members ID1,ID2,...` (batch). Returns null for full run. */
function parseMemberFilter(): Set<string> | null {
  const ids = new Set<string>();
  const single = process.argv.indexOf('--member');
  if (single !== -1) {
    const value = process.argv[single + 1]?.trim();
    if (value) ids.add(value);
  }
  const batch = process.argv.indexOf('--members');
  if (batch !== -1) {
    for (const raw of (process.argv[batch + 1] ?? '').split(',')) {
      const value = raw.trim();
      if (value) ids.add(value);
    }
  }
  return ids.size > 0 ? ids : null;
}

interface TopicPositionsSnapshot {
  meta: {
    asOf: string;
    source: string;
    totalMembers: number;
    membersWithData: number;
    membersWithPlatformPositions: number;
    membersWithStatedPosition: number;
    membersWithSaidDidLinks: number;
    perTopicCoverage: Record<string, number>;
    votesmartConfigured: boolean;
    note?: string;
  };
  byBioguideId: Record<string, Record<string, TopicPositionData>>;
}

interface VoteSmartCandidate {
  candidateId?: number | string;
  firstName?: string;
  lastName?: string;
  office?: string;
  officeStateId?: string;
}

interface NpatRow {
  rowText?: string;
  answerText?: string;
  optionText?: string;
}

interface NpatSection {
  name?: string;
  row?: NpatRow | NpatRow[];
}

interface NationalVoteMember {
  bioguideId: string;
  votes: VoteRecord[];
}

interface NationalVotesLoadResult {
  loaded: boolean;
  byBioguideId: Map<string, VoteRecord[]>;
}

const NPAT_SECTION_TO_TOPIC: Array<{ patterns: string[]; topicId: string }> = [
  { patterns: ['abortion', 'reproductive', 'pro-life', 'pro-choice'], topicId: 'abortion' },
  { patterns: ['artificial intelligence', 'section 230', 'data privacy', 'technology', 'big tech'], topicId: 'technology' },
  { patterns: ['gun', 'firearm', 'second amendment', 'background check'], topicId: 'public-safety' },
  { patterns: ['health care', 'healthcare', 'medicare', 'medicaid'], topicId: 'healthcare' },
  { patterns: ['immigration', 'border'], topicId: 'immigration' },
  { patterns: ['veteran', 'veterans', 'gi bill', 'va benefits'], topicId: 'defense-veterans' },
  { patterns: ['national security', 'defense', 'military', 'foreign'], topicId: 'defense-veterans' },
  { patterns: ['economy', 'budget', 'taxes', 'fiscal', 'trade', 'housing'], topicId: 'economy-taxes' },
  { patterns: ['environment', 'energy', 'climate'], topicId: 'climate' },
  { patterns: ['education'], topicId: 'education' },
  { patterns: ['criminal justice', 'crime', 'police'], topicId: 'public-safety' },
  { patterns: ['civil rights', 'civil liberties', 'social'], topicId: 'civil-liberties' },
  { patterns: ['judiciary', 'constitutional', 'court'], topicId: 'civil-liberties' },
];

function normalizeArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textMatchesKeyword(text: string, keywords: string[]): boolean {
  const hay = text.toLowerCase();
  return keywords.some((k) => hay.includes(k.trim().toLowerCase()));
}

function mapNpatSectionToTopic(sectionName: string): string | null {
  const hay = sectionName.toLowerCase();
  for (const row of NPAT_SECTION_TO_TOPIC) {
    if (row.patterns.some((p) => hay.includes(p))) return row.topicId;
  }
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    if (bucket.keywords.some((k) => hay.includes(k.trim()))) return bucket.id;
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'");
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/** Reject Ballotpedia scrape text attributed to another politician (e.g. Biden endorsement copy on Sanders page). */
function isMisattributedPlatformText(text: string, leg: LegislatorRow): boolean {
  const t = text.trim();
  const lower = t.toLowerCase();
  const last = leg.lastName.toLowerCase();
  const first = leg.firstName.split(/\s+/)[0]?.toLowerCase() ?? '';

  if (/^(Joe|Biden|Donald|Trump|Barack|Obama|Hillary|Clinton|Kamala|Harris)\s+/i.test(t)) {
    return true;
  }
  if (/\bJoe will\b/i.test(t) && !/\bbernie\b/i.test(lower)) return true;
  if (/\b(Biden|Trump|Harris|Obama)\s+will\b/i.test(t) && !lower.includes(last)) return true;
  if (/\bTo help reform our broken criminal justice system Joe will\b/i.test(t)) return true;

  const isVoteSummary = /voted (yea|nay)/i.test(t);
  const mentionsMember =
    lower.includes(last) ||
    lower.includes(first) ||
    lower.includes('sanders') ||
    lower.includes('bernie');
  if (!isVoteSummary && !mentionsMember && t.length > 55) return true;

  return false;
}

function extractKeyVoteTopicTexts(html: string): string[] {
  const texts: string[] = [];
  const headingRe = /<h[234][^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/h[234]>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(html)) !== null) {
    const id = (match[1] ?? '').replace(/_/g, ' ').toLowerCase();
    if (!id) continue;
    const isTopicHeading =
      /immigration|economy|health|education|climate|environment|public.safety|crime|judiciary|civil|defense|foreign|budget|tax|energy|abortion|reproductive|gun|firearm|veteran|technology|artificial|privacy|section.230/.test(id);
    if (!isTopicHeading) continue;
    const start = match.index + match[0].length;
    const rest = html.slice(start);
    const nextHeading = rest.search(/<h[234][^>]*>/i);
    const sectionHtml = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
    for (const li of sectionHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const t = stripHtml(li[1] ?? '');
      if (t.length >= 20) texts.push(t);
    }
    for (const p of sectionHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = stripHtml(p[1] ?? '');
      if (t.length >= 25) texts.push(t);
    }
  }
  return texts;
}

function extractPositionSectionTextsFromHtml(html: string): string[] {
  const texts: string[] = [];

  for (const sectionId of POSITION_SECTION_IDS) {
    const headingRe = new RegExp(
      `<h[23][^>]*>\\s*<span[^>]*id="${sectionId}"[^>]*>[\\s\\S]*?</h[23]>`,
      'i',
    );
    const match = headingRe.exec(html);
    if (!match) continue;

    const start = match.index + match[0].length;
    const rest = html.slice(start);
    const nextHeading = rest.search(/<h[23][^>]*>/i);
    const sectionHtml = nextHeading === -1 ? rest : rest.slice(0, nextHeading);

    for (const li of sectionHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const t = stripHtml(li[1] ?? '');
      if (t.length >= 20 && !BOILERPLATE_RE.test(t)) texts.push(t);
    }
    for (const p of sectionHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = stripHtml(p[1] ?? '');
      if (t.length >= 30 && !BOILERPLATE_RE.test(t)) texts.push(t);
    }
  }

  texts.push(...extractKeyVoteTopicTexts(html));

  for (const p of html.matchAll(/<p class="survey-response"[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = stripHtml(p[1] ?? '');
    if (t.length >= 20 && !BOILERPLATE_RE.test(t)) texts.push(t);
  }
  for (const ul of html.matchAll(/<ul class="key-messages"[^>]*>([\s\S]*?)<\/ul>/gi)) {
    for (const li of (ul[1] ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const t = stripHtml(li[1] ?? '');
      if (t.length >= 15 && !BOILERPLATE_RE.test(t)) texts.push(t);
    }
  }

  const bioRe = /<h2[^>]*id="Biography"[^>]*>[\s\S]*?<\/h2>([\s\S]*?)(?=<h2|$)/i;
  const bioMatch = bioRe.exec(html);
  if (bioMatch) {
    for (const p of (bioMatch[1] ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = stripHtml(p[1] ?? '');
      if (t.length >= 45 && !BOILERPLATE_RE.test(t)) texts.push(t);
    }
  }

  if (texts.length < 2) {
    for (const p of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = stripHtml(p[1] ?? '');
      if (t.length >= 40 && !BOILERPLATE_RE.test(t)) texts.push(t);
    }
  }

  return [...new Set(texts)];
}

/** connected=false only when the host was unreachable after retries (network failure) —
 *  distinct from a 404/empty page, which is a legitimate "no page" (connected=true). */
async function fetchBallotpediaHtml(slug: string): Promise<{ html: string | null; connected: boolean }> {
  const pageUrl = `${BALLOTPEDIA_BASE}/${encodeURIComponent(slug.replace(/ /g, '_'))}`;
  await ballotpediaLimiter.acquire();
  const res = await fetchWithRetry(pageUrl, {
    headers: {
      'User-Agent': BALLOTPEDIA_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res) return { html: null, connected: false };
  if (res.status === 404) return { html: null, connected: true };
  if (!res.ok && res.status !== 202) return { html: null, connected: true };
  const text = await res.text().catch(() => '');
  if (text.length < 2000 || !text.includes('Ballotpedia')) return { html: null, connected: true };
  return { html: text, connected: true };
}

function ballotpediaSlugCandidates(leg: LegislatorRow): string[] {
  const candidates = new Set<string>();
  const add = (s: string) => {
    const slug = s.trim().replace(/\s+/g, '_');
    if (slug) candidates.add(slug);
  };
  const firstToken = leg.firstName.split(/\s+/)[0] ?? leg.firstName;
  add(`${firstToken}_${leg.lastName}`);
  add(leg.name);
  add(`${leg.firstName}_${leg.lastName}`);
  return [...candidates];
}

interface BallotpediaResult {
  byTopic: Map<string, PlatformPositionEntry[]>;
  /** True only when a usable Ballotpedia page was parsed. False (404/empty/network) means the
   *  caller must NOT treat this as "member has no platform positions" — carry prior forward. */
  reached: boolean;
  /** True if the host answered at all. False = network-unreachable after retries. */
  connected: boolean;
}

async function fetchBallotpediaPositions(
  leg: LegislatorRow,
  asOf: string,
): Promise<BallotpediaResult> {
  let html: string | null = null;
  let pageUrl = `${BALLOTPEDIA_BASE}/`;
  let connected = false;

  for (const slug of ballotpediaSlugCandidates(leg)) {
    const candidate = await fetchBallotpediaHtml(slug);
    if (candidate.connected) connected = true;
    if (candidate.html) {
      html = candidate.html;
      pageUrl = `${BALLOTPEDIA_BASE}/${encodeURIComponent(slug.replace(/ /g, '_'))}`;
      break;
    }
  }

  if (!html) {
    console.warn(`  WARN Ballotpedia: no page found for ${leg.name}${connected ? '' : ' (unreachable)'}`);
    return { byTopic: new Map(), reached: false, connected };
  }

  const positionTexts = extractPositionSectionTextsFromHtml(html);
  if (positionTexts.length === 0) return { byTopic: new Map(), reached: true, connected: true };

  const byTopic = new Map<string, PlatformPositionEntry[]>();
  const topicBuckets = RECORD_TOPIC_BUCKETS.filter((b) => b.id !== 'legislation');

  for (const bucket of topicBuckets) {
    const matched = positionTexts
      .filter((t) => textMatchesKeyword(t, bucket.keywords))
      .filter((t) => !isMisattributedPlatformText(t, leg));
    if (matched.length === 0) continue;
    byTopic.set(
      bucket.id,
      matched.slice(0, MAX_PLATFORM_PER_TOPIC).map((text) => ({
        text,
        source: 'Ballotpedia',
        url: pageUrl,
        tier: 'nonpartisan' as const,
        asOf,
      })),
    );
  }
  return { byTopic, reached: true, connected: true };
}

async function votesmartFetch(
  method: string,
  params: Record<string, string | number>,
  key: string,
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ key, o: 'JSON' });
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v));
  }
  await sleep(VOTESMART_DELAY_MS);
  return fetchJson<Record<string, unknown>>(`${VOTESMART_BASE}/${method}?${qs.toString()}`);
}

async function findVoteSmartCandidateId(leg: LegislatorRow, key: string): Promise<number | null> {
  const officeId = leg.chamber === 'senate' ? 6 : 5;
  try {
    const data = await votesmartFetch('Candidates.getByOfficeState', {
      officeId,
      stateId: leg.stateCode,
    }, key);
    const candidates = normalizeArray(
      (data.candidateList as { candidate?: VoteSmartCandidate | VoteSmartCandidate[] } | undefined)?.candidate,
    );

    const firstLower = leg.firstName.toLowerCase();
    const lastLower = leg.lastName.toLowerCase();

    const exact = candidates.find(
      (c) =>
        (c.firstName ?? '').toLowerCase() === firstLower &&
        (c.lastName ?? '').toLowerCase() === lastLower,
    );
    if (exact?.candidateId != null) return Number(exact.candidateId);

    const partial = candidates.find(
      (c) =>
        (c.lastName ?? '').toLowerCase() === lastLower &&
        (c.firstName ?? '').toLowerCase().startsWith(firstLower.slice(0, 3)),
    );
    if (partial?.candidateId != null) return Number(partial.candidateId);
  } catch (err) {
    console.warn(
      `  WARN VoteSmart candidate lookup failed for ${leg.name}: ${err instanceof Error ? err.message : err}`,
    );
  }
  return null;
}

function extractNpatByTopic(
  npatRoot: Record<string, unknown>,
  candidateId: number,
): Map<string, { position: string; date: string | null }> {
  const out = new Map<string, { position: string; date: string | null }>();
  const npat = (npatRoot.npat ?? npatRoot) as {
    section?: NpatSection | NpatSection[];
    electionDate?: string;
  };
  const positionDate = (npat.electionDate ?? '').slice(0, 10) || null;
  const profileUrl = `https://votesmart.org/candidate/${candidateId}/political-courage-test`;

  for (const section of normalizeArray(npat.section)) {
    const topicId = mapNpatSectionToTopic(section.name ?? '');
    if (!topicId) continue;

    const lines: string[] = [];
    for (const row of normalizeArray(section.row)) {
      const answer = (row.answerText ?? row.optionText ?? '').trim();
      if (!answer || /^n\/?a$/i.test(answer) || /^no opinion$/i.test(answer)) continue;
      lines.push(answer);
    }
    if (lines.length === 0) continue;
    out.set(topicId, { position: lines.join('; '), date: positionDate });
  }

  void profileUrl;
  return out;
}

async function fetchVoteSmartNpatByTopic(
  candidateId: number,
  key: string,
): Promise<Map<string, { position: string; date: string | null }>> {
  try {
    const npatData = await votesmartFetch('Npat.getNpat', { candidateId }, key);
    return extractNpatByTopic(npatData, candidateId);
  } catch {
    return new Map();
  }
}

async function loadNationalVotesAsync(): Promise<NationalVotesLoadResult> {
  try {
    const raw = JSON.parse(await readFile(NATIONAL_VOTES_FILE_PATH, 'utf8')) as {
      byBioguideId?: Record<string, NationalVoteMember>;
    };
    const map = new Map<string, VoteRecord[]>();
    for (const [id, entry] of Object.entries(raw.byBioguideId ?? {})) {
      map.set(id, entry.votes ?? []);
    }
    return { loaded: true, byBioguideId: map };
  } catch {
    console.warn('WARN: could not load national votes — preserving existing Said→Did links.');
    return { loaded: false, byBioguideId: new Map() };
  }
}

function buildSaidDidLinks(
  topicId: string,
  statedPositionDate: string | null,
  votes: VoteRecord[],
): SaidDidLinkEntry[] {
  let filtered = votes.filter((vote) => voteTopicId(vote) === topicId);
  if (statedPositionDate) {
    const afterStatement = filtered.filter((vote) => vote.date >= statedPositionDate);
    if (afterStatement.length > 0) {
      filtered = afterStatement;
    }
  }

  const selected = filtered
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_SAID_DID_LINKS);

  return selected.map((vote) => ({
    topicId,
    statedPositionDate,
    voteDate: vote.date,
    billTitle: vote.billTitle,
    billNumber: vote.billId,
    congressGovUrl: voteCongressGovUrl(vote),
    voteChoice: vote.vote,
    tier: 'official' as const,
  }));
}

interface GovInfoSearchResult {
  title?: string;
  packageId?: string;
  granuleId?: string;
  dateIssued?: string;
}

interface GovInfoSearchResponse {
  results?: GovInfoSearchResult[];
  offsetMark?: string;
}

async function fetchGovInfoCrecSearchPage(
  apiKey: string,
  congress: number,
  searchQuery: string,
  offsetMark: string,
): Promise<{ results: GovInfoSearchResult[]; nextOffset: string | null; ok: boolean }> {
  await govinfoLimiter.acquire();
  const searchRes = await fetchWithRetry(`https://api.govinfo.gov/search?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `collection:CREC AND congress:${congress} AND ${searchQuery}`,
      pageSize: CREC_SEARCH_PAGE_SIZE,
      offsetMark,
      sorts: [{ field: 'publishdate', sortOrder: 'DESC' }],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!searchRes || !searchRes.ok) {
    return { results: [], nextOffset: null, ok: false };
  }
  const searchData = (await searchRes.json()) as GovInfoSearchResponse;
  const results = (searchData.results ?? []).filter((r) => r.granuleId && r.packageId);
  const nextOffset = searchData.offsetMark?.trim();
  const hasMore = Boolean(nextOffset && nextOffset !== offsetMark && results.length > 0);
  return { results, nextOffset: hasMore ? nextOffset! : null, ok: true };
}

async function processCrecGranule(
  result: GovInfoSearchResult,
  leg: LegislatorRow,
  apiKey: string,
  speakerHayNeedle: string,
): Promise<{ entry: TopicStatementEntry | null; htmlFetched: boolean; skippedProcedural: boolean }> {
  if (CREC_SKIP_PROCEDURAL && isProceduralCrecTitle(result.title ?? '')) {
    return { entry: null, htmlFetched: false, skippedProcedural: true };
  }
  try {
    await govinfoLimiter.acquire();
    const textRes = await fetch(
      `https://api.govinfo.gov/packages/${result.packageId}/granules/${result.granuleId}/htm?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
    if (!textRes.ok) return { entry: null, htmlFetched: true, skippedProcedural: false };
    const html = await textRes.text();
    const plain = stripHtml(html);
    const speakerHay = plain.toLowerCase().replace(/\./g, '');
    if (!speakerHay.includes(speakerHayNeedle)) {
      return { entry: null, htmlFetched: true, skippedProcedural: false };
    }

    const excerpt = extractCrecSpeechExcerpt(plain, leg);
    if (!excerpt) return { entry: null, htmlFetched: true, skippedProcedural: false };

    const topicId = mapCrecTextToTopic(excerpt) ?? mapCrecTextToTopic(result.title ?? '');
    if (!topicId) return { entry: null, htmlFetched: true, skippedProcedural: false };

    // A verbatim official CREC statement must have a real granule date — never fall back to
    // today's date, which would fabricate a publication date for the record.
    if (!result.dateIssued) return { entry: null, htmlFetched: true, skippedProcedural: false };
    const date = result.dateIssued.slice(0, 10);
    const url = `https://www.govinfo.gov/app/details/${result.granuleId}`;

    return {
      entry: { title: excerpt, date, url, tier: 'official', topicId },
      htmlFetched: true,
      skippedProcedural: false,
    };
  } catch {
    return { entry: null, htmlFetched: true, skippedProcedural: false };
  }
}

/**
 * GovInfo CREC search query fragment for a member, gender-agnostic for BOTH chambers.
 *
 * The Record addresses a speaker by their own honorific + surname ("Mr. SANDERS.",
 * "Ms. WARREN.", "Mrs. RADEWAGEN."). Hardcoding "Mr. LASTNAME" for senators returned 0
 * granules for every female senator (PROVEN: "Mr. WARREN" -> 0, bare "WARREN" -> 1054,
 * OR-phrase -> 494 live). OR-ing the honorific forms keeps the query as on-target as the
 * old male-only phrase (surname adjacency) while including women — chosen over a bare
 * surname because bare matches every roster/cosponsor mention, flooding the search pool
 * with procedural noise (bare WARREN 1054 vs OR 494). */
function crecSearchQuery(leg: LegislatorRow): string {
  const surname = leg.lastName.toUpperCase();
  return `("Mr. ${surname}" OR "Ms. ${surname}" OR "Mrs. ${surname}" OR "Miss ${surname}")`;
}

/** Honorific-agnostic presence token: the bare uppercase surname shared by every OR form. */
function crecSpeakerHay(leg: LegislatorRow): string {
  return leg.lastName.toUpperCase();
}

function mapCrecTextToTopic(text: string): string | null {
  const topicId = classifyTextToRecordTopicId(text);
  return topicId === 'legislation' ? null : topicId;
}

function crecMemberLastName(leg: LegislatorRow): string {
  return leg.lastName.toUpperCase();
}

function crecGovInfoUrlStem(url: string): string {
  const granule = url.match(/CREC-[^/?#]+/i)?.[0] ?? url;
  // Same physical page can appear as ...-PgS3474-2 vs ...-PgS3474-3
  return granule.replace(/-\d+$/, '');
}

/** A committed CREC floor statement: tier 'official' with a GovInfo CREC granule URL. */
function isCommittedCrecStatement(s: TopicStatementEntry): boolean {
  return s.tier === 'official' && /\/CREC-/i.test(s.url);
}

function shouldAddCrecStatement(existing: TopicStatementEntry[], entry: TopicStatementEntry): boolean {
  const titleKey = entry.title.trim().toLowerCase();
  const stem = crecGovInfoUrlStem(entry.url);
  if (existing.some((e) => e.title.trim().toLowerCase() === titleKey)) return false;
  if (existing.some((e) => crecGovInfoUrlStem(e.url) === stem)) return false;
  return true;
}

function extractCrecSpeechExcerpt(plainText: string, leg: LegislatorRow): string | null {
  const lastName = crecMemberLastName(leg);
  const opener = crecFloorSpeechOpenerRegex(lastName);
  const match = opener.exec(plainText);
  if (!match || match.index === undefined) return null;

  let excerpt = plainText.slice(match.index);
  // Real CREC speaker transitions are honorific + ALL-CAPS surname immediately followed by
  // "." or "," (e.g. "Mr. SANDERS.") or a chamber-officer interjection. Title-case forms like
  // "Mr. President" (a member addressing the chair mid-speech) must NOT be treated as a
  // transition — matching them wrongly truncated members' own speech after their first
  // "Mr. President".
  const nextSpeakerRe = /\b(?:Mr|Ms|Mrs)\.\s+[A-Z][A-Z'\-]+(?=[.,])|The PRESIDING OFFICER|The SPEAKER\b/;
  const nextSpeaker = excerpt.slice(40).search(nextSpeakerRe);
  if (nextSpeaker > 80) {
    excerpt = excerpt.slice(0, 40 + nextSpeaker);
  }

  excerpt = excerpt.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  if (excerpt.length < 80) return null;
  if (isProceduralCrecText(excerpt)) return null;
  if (!opener.test(excerpt)) return null;
  return truncateAtSentenceBoundary(excerpt, 900).slice(0, 900);
}

function earliestStatementDate(statements: TopicStatementEntry[]): string | null {
  const dates = statements
    .map((s) => s.date)
    .filter(Boolean)
    .sort();
  return dates[0] ?? null;
}

interface CrecFetchResult {
  byTopic: Map<string, TopicStatementEntry[]>;
  /** True when the GovInfo search request itself succeeded (even with 0 results). False =
   *  search unreachable — a transient failure, not a genuine "no floor speeches". */
  searchOk: boolean;
  searchResults: number;
  htmlFetches: number;
  skippedProcedural: number;
}

async function fetchGovInfoCrecByTopic(
  leg: LegislatorRow,
  apiKey: string,
): Promise<CrecFetchResult> {
  const byTopic = new Map<string, TopicStatementEntry[]>();
  const searchQuery = crecSearchQuery(leg);
  const speakerHayNeedle = crecSpeakerHay(leg).toLowerCase().replace(/\./g, '');
  let searchOk = false;
  let searchResults = 0;
  let htmlFetches = 0;
  let skippedProcedural = 0;
  let granulesExamined = 0;

  const collected: TopicStatementEntry[] = [];
  const seenStems = new Set<string>();

  try {
    for (const congress of CREC_CONGRESSES) {
      if (granulesExamined >= CREC_SEARCH_POOL) break;
      let offsetMark = '*';

      for (;;) {
        if (granulesExamined >= CREC_SEARCH_POOL) break;

        const page = await fetchGovInfoCrecSearchPage(apiKey, congress, searchQuery, offsetMark);
        if (!page.ok) {
          if (!searchOk) return { byTopic, searchOk, searchResults, htmlFetches, skippedProcedural };
          break;
        }
        searchOk = true;
        searchResults += page.results.length;

        if (page.results.length === 0) break;

        for (const result of page.results) {
          granulesExamined += 1;
          if (granulesExamined > CREC_SEARCH_POOL) break;

          const processed = await processCrecGranule(result, leg, apiKey, speakerHayNeedle);
          if (processed.skippedProcedural) {
            skippedProcedural += 1;
            continue;
          }
          if (processed.htmlFetched) htmlFetches += 1;
          const entry = processed.entry;
          if (!entry) continue;

          const stem = crecGovInfoUrlStem(entry.url);
          if (seenStems.has(stem)) continue;
          if (!shouldAddCrecStatement(collected, entry)) continue;
          seenStems.add(stem);
          collected.push(entry);
        }

        if (!page.nextOffset) break;
        offsetMark = page.nextOffset;
      }
    }

    const capped = collected
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, MAX_CREC_STATEMENTS_PER_MEMBER);

    for (const entry of capped) {
      const existing = byTopic.get(entry.topicId) ?? [];
      existing.push(entry);
      byTopic.set(entry.topicId, existing);
    }
  } catch (err) {
    console.warn(
      `  WARN GovInfo CREC failed for ${leg.name}: ${err instanceof Error ? err.message : err}`,
    );
  }

  return { byTopic, searchOk, searchResults, htmlFetches, skippedProcedural };
}

function buildSnapshotMeta(
  members: LegislatorRow[],
  byBioguideId: Record<string, Record<string, TopicPositionData>>,
  asOf: string,
  votesmartConfigured: boolean,
  govinfoConfigured: boolean,
): TopicPositionsSnapshot['meta'] {
  const topicBuckets = RECORD_TOPIC_BUCKETS.filter((b) => b.id !== 'legislation');
  const perTopicCoverage: Record<string, number> = {};
  for (const bucket of topicBuckets) perTopicCoverage[bucket.id] = 0;

  let membersWithPlatformPositions = 0;
  let membersWithStatedPosition = 0;
  let membersWithSaidDidLinks = 0;

  for (const memberTopics of Object.values(byBioguideId)) {
    let hasPlatform = false;
    let hasStated = false;
    let hasLinks = false;
    for (const [topicId, data] of Object.entries(memberTopics)) {
      if (data.platformPositions?.length) hasPlatform = true;
      if (data.statedPosition) hasStated = true;
      if (data.saidDidLinks.length) hasLinks = true;
      if (
        data.platformPositions?.length ||
        data.statedPosition ||
        data.saidDidLinks.length
      ) {
        perTopicCoverage[topicId] = (perTopicCoverage[topicId] ?? 0) + 1;
      }
    }
    if (hasPlatform) membersWithPlatformPositions += 1;
    if (hasStated) membersWithStatedPosition += 1;
    if (hasLinks) membersWithSaidDidLinks += 1;
  }

  const membersWithData = Object.values(byBioguideId).filter((m) => Object.keys(m).length > 0).length;

  return {
    asOf,
    source: votesmartConfigured
      ? 'Ballotpedia + VoteSmart NPAT + GovInfo CREC + Congress roll-call votes (Said→Did)'
      : govinfoConfigured
        ? 'Ballotpedia + GovInfo CREC + Congress roll-call votes (Said→Did)'
        : 'Ballotpedia + Congress roll-call votes (Said→Did)',
    totalMembers: members.length,
    membersWithData,
    membersWithPlatformPositions,
    membersWithStatedPosition,
    membersWithSaidDidLinks,
    perTopicCoverage,
    votesmartConfigured,
    note: votesmartConfigured
      ? 'Platform positions from Ballotpedia; NPAT from VoteSmart; vote links from national roll-call snapshot.'
      : 'VoteSmart skipped (no key). Platform positions from Ballotpedia where available.',
  };
}

async function writeSnapshot(
  members: LegislatorRow[],
  byBioguideId: Record<string, Record<string, TopicPositionData>>,
  asOf: string,
  votesmartConfigured: boolean,
  govinfoConfigured: boolean,
): Promise<void> {
  const snapshot: TopicPositionsSnapshot = {
    meta: buildSnapshotMeta(members, byBioguideId, asOf, votesmartConfigured, govinfoConfigured),
    byBioguideId,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });

  const votesmartKey = (process.env.VOTESMART_API_KEY ?? '').trim();
  const govinfoKey = (process.env.GOVINFO_API_KEY ?? process.env.DATA_GOV_API_KEY ?? '').trim();
  console.log('VoteSmart key length:', votesmartKey.length);
  console.log('GovInfo key length:', govinfoKey.length);
  if (!votesmartKey) {
    console.warn('WARN: VOTESMART_API_KEY missing — NPAT stated positions will be skipped.');
  }

  const memberFilter = parseMemberFilter();
  // core-rules §5: agent runs must scope; a full-corpus run must be opted in explicitly.
  if (!memberFilter && !process.argv.includes('--full-corpus')) {
    console.error(
      '[sync-topic-positions] refusing to run unscoped. Pass "--member <id>" / ' +
        '"--members <id,...>" to scope an agent run, or "--full-corpus" for a scheduled/owner ' +
        'full run (core-rules §5).',
    );
    process.exit(1);
  }

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  let members = legislatorsRaw.legislators.filter(
    (l) => l.chamber === 'senate' || l.chamber === 'house',
  );
  if (memberFilter) {
    members = members.filter((l) => memberFilter.has(l.bioguideId));
    if (members.length === 0) {
      console.error(`No current legislators found for filter: ${[...memberFilter].join(', ')}`);
      process.exit(1);
    }
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const topicBuckets = RECORD_TOPIC_BUCKETS.filter((b) => b.id !== 'legislation');
  const nationalVotes = await loadNationalVotesAsync();

  let checkpoint: Record<string, boolean> = {};
  try {
    checkpoint = JSON.parse(await readFile(CHECKPOINT_FILE, 'utf8')) as Record<string, boolean>;
  } catch {
    /* fresh */
  }

  let byBioguideId: Record<string, Record<string, TopicPositionData>> = {};
  try {
    const prev = JSON.parse(await readFile(OUT_FILE, 'utf8')) as TopicPositionsSnapshot;
    byBioguideId = prev.byBioguideId ?? {};
  } catch {
    /* fresh */
  }

  if (memberFilter) {
    for (const id of memberFilter) delete checkpoint[id];
  }

  const pending = members.filter((leg) => memberFilter || !checkpoint[leg.bioguideId]);

  console.log(
    `Syncing topic positions for ${pending.length}/${members.length} member${members.length === 1 ? '' : 's'} (${Object.keys(checkpoint).length} checkpointed). Concurrency: ${MEMBER_CONCURRENCY}, GovInfo cap: ${GOVINFO_MAX_RPS}/s, procedural-skip: ${CREC_SKIP_PROCEDURAL ? 'on' : 'off'}. VoteSmart: ${votesmartKey ? 'yes' : 'SKIP'}`,
  );

  async function processMember(leg: LegislatorRow): Promise<Record<string, TopicPositionData>> {
    const priorTopics = byBioguideId[leg.bioguideId];
    const priorHasPlatform = Boolean(
      priorTopics && Object.values(priorTopics).some((d) => d.platformPositions?.length),
    );

    // Locked platform layer: only scrape Ballotpedia for members who don't already have
    // curated platform positions. This preserves the committed layer byte-for-byte (including
    // its legacy topic keys), avoids re-hammering Ballotpedia (throttling), and keeps the run
    // focused on the CREC/Said→Did work this phase adds.
    let ballotByTopic = new Map<string, PlatformPositionEntry[]>();
    let ballotConnected = true;
    if (!priorHasPlatform) {
      const ballot = await fetchBallotpediaPositions(leg, asOf);
      ballotByTopic = ballot.byTopic;
      ballotConnected = ballot.connected;
    }

    const crec = govinfoKey
      ? await fetchGovInfoCrecByTopic(leg, govinfoKey)
      : { byTopic: new Map<string, TopicStatementEntry[]>(), searchOk: true, searchResults: 0, htmlFetches: 0, skippedProcedural: 0 };
    const crecByTopic = crec.byTopic;
    if (govinfoKey) {
      console.log(
        `  CREC ${leg.bioguideId} (${leg.name}): search=${crec.searchResults} htmlFetches=${crec.htmlFetches} skippedProcedural=${crec.skippedProcedural} statements=${[...crecByTopic.values()].reduce((n, a) => n + a.length, 0)}`,
      );
    }

    // Nothing new could be gathered and prior exists → keep prior entry intact.
    if (priorTopics && !crec.searchOk && (priorHasPlatform || !ballotConnected)) {
      console.log(`  PRESERVE ${leg.bioguideId} (${leg.name}): no refreshable source — kept prior entry`);
      return priorTopics;
    }

    const mediaStatements = await fetchApprovedMediaStatementsForMember(leg.bioguideId);
    const mediaByTopic = new Map<string, TopicStatementEntry[]>();
    for (const st of mediaStatements) {
      const list = mediaByTopic.get(st.topicId) ?? [];
      if (list.length < 2) list.push(st);
      mediaByTopic.set(st.topicId, list);
    }

    let npatByTopic = new Map<string, { position: string; date: string | null }>();
    let voteSmartCandidateId: number | null = null;
    if (votesmartKey) {
      voteSmartCandidateId = await findVoteSmartCandidateId(leg, votesmartKey);
      if (voteSmartCandidateId != null) {
        try {
          await votesmartFetch('CandidateBio.getBio', { candidateId: voteSmartCandidateId }, votesmartKey);
        } catch {
          /* optional validation call */
        }
        npatByTopic = await fetchVoteSmartNpatByTopic(voteSmartCandidateId, votesmartKey);
      }
    }
    const npatUrl =
      voteSmartCandidateId != null
        ? `https://votesmart.org/candidate/${voteSmartCandidateId}/political-courage-test`
        : 'https://votesmart.org';

    const memberVotes = nationalVotes.byBioguideId.get(leg.bioguideId) ?? [];
    const canRefreshMemberSaidDid = canRefreshSaidDidLinks(
      nationalVotes.loaded,
      nationalVotes.byBioguideId,
      leg.bioguideId,
    );

    // Build fresh (this-run) statements + Said→Did per canonical topic.
    interface FreshTopic {
      statements: TopicStatementEntry[];
      saidDidLinks: SaidDidLinkEntry[];
      statedPosition?: string;
      statedPositionSource?: StatedPositionSourceEntry;
    }
    const freshByTopic = new Map<string, FreshTopic>();
    for (const bucket of topicBuckets) {
      const crecStatements = crecByTopic.get(bucket.id) ?? [];
      const mediaForTopic = mediaByTopic.get(bucket.id) ?? [];
      const npat = npatByTopic.get(bucket.id);
      const statements = [...mediaForTopic, ...crecStatements];
      if (npat?.position) {
        statements.push({
          title: npat.position,
          date: npat.date ?? asOf,
          url: npatUrl,
          tier: 'nonpartisan',
          topicId: bucket.id,
        });
      }
      const statedPositionDate = npat?.date ?? earliestStatementDate(statements) ?? null;
      const saidDidLinks = buildSaidDidLinks(bucket.id, statedPositionDate, memberVotes);
      if (statements.length > 0 || saidDidLinks.length > 0) {
        const fresh: FreshTopic = { statements, saidDidLinks };
        if (npat?.position) {
          fresh.statedPosition = npat.position;
          fresh.statedPositionSource = { tier: 'nonpartisan', source: 'VoteSmart', url: npatUrl };
        }
        freshByTopic.set(bucket.id, fresh);
      }
    }

    // Start from a clone of the prior entry so the platform layer is preserved exactly.
    const memberTopics: Record<string, TopicPositionData> = priorTopics ? structuredClone(priorTopics) : {};
    const keyByNorm = new Map<string, string>();
    for (const key of Object.keys(memberTopics)) keyByNorm.set(normalizeTopicId(key), key);

    for (const bucket of topicBuckets) {
      const fresh = freshByTopic.get(bucket.id);
      const freshPlatform = ballotByTopic.get(bucket.id);
      const existingKey = keyByNorm.get(bucket.id);

      if (existingKey) {
        const entry = memberTopics[existingKey];
        // Said→Did is deterministic from roll-call votes, but failed/missing vote input is not absence.
        entry.saidDidLinks = mergeSaidDidLinksForRefresh(
          entry.saidDidLinks,
          fresh?.saidDidLinks,
          canRefreshMemberSaidDid,
        );
        // Only overlay statements when CREC actually refreshed; never wipe on a failed fetch.
        if (crec.searchOk) {
          // FAILURE≠ABSENCE (§6): a re-fetch only sees the current search pool, so a genuine
          // older committed floor speech can age out on a later run. Union fresh with prior
          // committed official CREC (dedup by URL stem) so re-sync only ADDs — never drops.
          const merged: TopicStatementEntry[] = [...(fresh?.statements ?? [])];
          for (const prior of entry.statements ?? []) {
            if (!isCommittedCrecStatement(prior)) continue;
            if (isProceduralCrecText(prior.title)) continue;
            if (!shouldAddCrecStatement(merged, prior)) continue;
            merged.push(prior);
          }
          entry.statements = merged;
          if (fresh?.statedPosition) {
            entry.statedPosition = fresh.statedPosition;
            entry.statedPositionSource = fresh.statedPositionSource;
          }
        }
        if (!entry.platformPositions?.length && freshPlatform?.length) {
          entry.platformPositions = freshPlatform;
        }
      } else if (fresh || freshPlatform?.length) {
        const entry: TopicPositionData = {
          statements: fresh?.statements ?? [],
          saidDidLinks: fresh?.saidDidLinks ?? [],
        };
        if (freshPlatform?.length) entry.platformPositions = freshPlatform;
        if (fresh?.statedPosition) {
          entry.statedPosition = fresh.statedPosition;
          entry.statedPositionSource = fresh.statedPositionSource;
        }
        memberTopics[bucket.id] = entry;
      }
    }

    return memberTopics;
  }

  let ioChain: Promise<void> = Promise.resolve();
  const runExclusive = (fn: () => Promise<void>): Promise<void> => {
    const run = ioChain.then(fn);
    ioChain = run.catch(() => {});
    return run;
  };

  let completed = 0;
  await runPool(pending, MEMBER_CONCURRENCY, async (leg) => {
    const memberTopics = await processMember(leg);
    await runExclusive(async () => {
      if (Object.keys(memberTopics).length > 0) {
        byBioguideId[leg.bioguideId] = memberTopics;
      }
      checkpoint[leg.bioguideId] = true;
      await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint) + '\n', 'utf8');
      completed += 1;
      if (completed % 10 === 0 || completed === pending.length) {
        await writeSnapshot(members, byBioguideId, asOf, !!votesmartKey, !!govinfoKey);
        console.log(
          `  progress: ${completed}/${pending.length} — ${Object.keys(byBioguideId).length} members with topic position data`,
        );
      }
    });
  });

  await writeSnapshot(members, byBioguideId, asOf, !!votesmartKey, !!govinfoKey);

  const meta = buildSnapshotMeta(members, byBioguideId, asOf, !!votesmartKey, !!govinfoKey);
  console.log('');
  console.log('── sync:topic-positions complete ──');
  console.log(`Members with data: ${meta.membersWithData}/${members.length}`);
  console.log(`Platform positions: ${meta.membersWithPlatformPositions}`);
  console.log(`VoteSmart NPAT positions: ${meta.membersWithStatedPosition}`);
  console.log(`Said→Did links: ${meta.membersWithSaidDidLinks} members`);
  console.log(`Output: ${OUT_FILE}`);

  emitSyncSummary(
    buildSyncSummary('sync:topic-positions', {
      status: meta.membersWithData > 0 ? 'ok' : 'partial',
      failed: meta.membersWithData === 0 ? members.map((m) => m.bioguideId) : [],
      checkpoint: CHECKPOINT_FILE,
      log: '/tmp/ledger-sync-topic-positions.log',
      preservePrior: true,
    }),
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
