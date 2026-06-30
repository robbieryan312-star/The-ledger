/**
 * ingest-member-deep.ts — deep Congress.gov profile per member via Congress.gov API v3.
 * Output: lib/data/generated/members/{bioguideId}.json
 *
 * Run: npm run ingest:member
 *      npm run ingest:member -- --bioguide S000033
 *      npm run ingest:member -- --all
 *      npm run ingest:member-all -- --limit 30
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Source, SourceTier } from '../lib/types';
import { RECORD_TOPIC_BUCKETS } from '../lib/data/profileRecordByTopic';
import { loadEnvLocal, sleep } from './lib/ingest-utils';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated', 'members');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');
const CHECKPOINT_FILE = '/tmp/ingest-member-deep-checkpoint.json';
const MANIFEST_FILE = path.join(OUT_DIR, 'manifest.json');
const API_BASE = 'https://api.congress.gov/v3';
const PAGE_LIMIT = 250;
const REQUEST_DELAY_MS = 400;
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_FETCH_RETRIES = 2;
const RETRY_BACKOFF_MS = 2_000;
const MAX_COSPONSORED_PER_TOPIC = 50;
const TOPIC_BUCKET_COUNT = RECORD_TOPIC_BUCKETS.length;
const MAX_COSPONSORED_FETCH = MAX_COSPONSORED_PER_TOPIC * TOPIC_BUCKET_COUNT;

let apiCallCount = 0;

export class CongressApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Congress.gov request failed: HTTP ${status}`);
    this.name = 'CongressApiError';
    this.status = status;
    this.body = body;
  }
}

export function resetApiCallCount(): void {
  apiCallCount = 0;
}

export function getApiCallCount(): number {
  return apiCallCount;
}

const CONGRESS_SOURCE: Source = {
  name: 'Congress.gov',
  url: 'https://www.congress.gov',
  tier: 'official',
};

interface Pagination {
  count?: number;
  next?: string;
}

interface CongressMember {
  bioguideId?: string;
  depiction?: { imageUrl?: string };
  officialWebsiteUrl?: string;
  addressInformation?: { officeAddress?: string; phoneNumber?: string };
  currentMember?: boolean;
}

interface CongressBillRaw {
  title?: string | null;
  number?: string;
  amendmentNumber?: string;
  type?: string;
  congress?: number;
  introducedDate?: string;
  latestAction?: { text?: string };
  url?: string;
  policyArea?: { name?: string };
}

interface LegislationPage {
  sponsoredLegislation?: CongressBillRaw[] | { bills?: CongressBillRaw[] };
  cosponsoredLegislation?: CongressBillRaw[] | { bills?: CongressBillRaw[] };
  pagination?: Pagination;
}

export interface MemberDeepBill {
  topicId: string;
  title: string;
  billNumber: string;
  type?: string;
  congress?: number;
  introducedDate: string;
  latestAction: string | null;
  url: string;
  policyArea: string | null;
  tier: SourceTier;
  role?: 'cosponsor';
}

export interface MemberDeepProfileBlock {
  bioguideId: string;
  officialPhotoUrl: string | null;
  officialWebsite: string | null;
  officeAddress: string | null;
  phone: string | null;
  currentMember: boolean;
  source: Source;
}

export interface MemberDeepTopicBlock {
  sponsored: MemberDeepBill[];
  cosponsored: MemberDeepBill[];
}

export interface MemberDeepProfile {
  meta: {
    bioguideId: string;
    asOf: string;
    source: string;
    totalSponsored: number;
    totalCosponsored: number;
    topicCoverage: Record<string, number>;
  };
  profile: MemberDeepProfileBlock;
  byTopic: Record<string, MemberDeepTopicBlock>;
}

interface LegislatorRow {
  bioguideId: string;
  chamber: string;
}

function parseArgs(): { all: boolean; bioguideId: string; limit?: number } {
  const args = process.argv.slice(2);
  let all = false;
  let bioguideId = 'S000033';
  let limit: number | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') all = true;
    if (args[i] === '--bioguide' && args[i + 1]) {
      bioguideId = args[i + 1];
      i += 1;
    }
    if (args[i] === '--limit' && args[i + 1]) {
      const n = Number.parseInt(args[i + 1], 10);
      if (!Number.isFinite(n) || n < 1) {
        throw new Error('--limit requires a positive integer');
      }
      limit = n;
      i += 1;
    }
  }
  return { all, bioguideId, limit };
}

function getCongressApiKey(): string {
  const key = process.env.CONGRESS_API_KEY?.trim();
  if (!key) {
    throw new Error('CONGRESS_API_KEY is not configured in .env.local');
  }
  return key;
}

async function congressGet<T>(url: string, key: string): Promise<T> {
  await sleep(REQUEST_DELAY_MS);
  const resolved = new URL(url);
  if (!resolved.searchParams.has('api_key')) {
    resolved.searchParams.set('api_key', key);
  }
  if (!resolved.searchParams.has('format')) {
    resolved.searchParams.set('format', 'json');
  }
  const resolvedUrl = resolved.toString();

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt += 1) {
    if (attempt > 0) {
      const backoff = RETRY_BACKOFF_MS * attempt;
      console.log(`  retry ${attempt}/${MAX_FETCH_RETRIES} after ${backoff}ms…`);
      await sleep(backoff);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      apiCallCount += 1;
      const res = await fetch(resolvedUrl, { signal: controller.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new CongressApiError(res.status, body);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof CongressApiError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      const retryable =
        message.includes('abort') ||
        message.includes('terminated') ||
        message.includes('ECONNRESET') ||
        message.includes('ETIMEDOUT') ||
        message.includes('fetch failed') ||
        message.includes('network');
      lastError = err instanceof Error ? err : new Error(message);
      if (!retryable || attempt >= MAX_FETCH_RETRIES) {
        throw lastError;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error('Congress.gov request failed');
}

function buildUrl(
  bioguideId: string,
  pathSuffix: string,
  key: string,
  extraParams?: Record<string, string>,
): string {
  const url = new URL(`${API_BASE}${pathSuffix}`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(PAGE_LIMIT));
  if (extraParams) {
    for (const [param, value] of Object.entries(extraParams)) {
      url.searchParams.set(param, value);
    }
  }
  return url.toString();
}

function extractLegislationList(
  data: LegislationPage,
  field: 'sponsoredLegislation' | 'cosponsoredLegislation',
): CongressBillRaw[] {
  const raw = data[field];
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray(raw.bills)) return raw.bills;
  return [];
}

function billTypeSlug(type?: string): string | null {
  const t = (type ?? '').toUpperCase();
  switch (t) {
    case 'HR': return 'house-bill';
    case 'S': return 'senate-bill';
    case 'HRES': return 'house-resolution';
    case 'SRES': return 'senate-resolution';
    case 'HJRES': return 'house-joint-resolution';
    case 'SJRES': return 'senate-joint-resolution';
    case 'HCONRES': return 'house-concurrent-resolution';
    case 'SCONRES': return 'senate-concurrent-resolution';
    default: return null;
  }
}

function ordinalCongress(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function congressBillPublicUrl(bill: CongressBillRaw, bioguideId: string): string {
  if (bill.url?.includes('www.congress.gov')) return bill.url;
  const slug = billTypeSlug(bill.type);
  const congress = bill.congress ?? 119;
  const number = bill.number ?? bill.amendmentNumber;
  if (slug && number) {
    return `https://www.congress.gov/bill/${ordinalCongress(congress)}-congress/${slug}/${number}`;
  }
  return `https://www.congress.gov/members/${bioguideId}`;
}

function classifyTopicId(title: string): string {
  const hay = title.toLowerCase();
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    if (bucket.keywords.some((k) => hay.includes(k))) return bucket.id;
  }
  return 'legislation';
}

function mapBill(bill: CongressBillRaw, bioguideId: string, role?: 'cosponsor'): MemberDeepBill | null {
  const title = bill.title?.trim();
  if (!title) return null;

  const billNumber = (bill.number ?? bill.amendmentNumber ?? '').trim();
  return {
    topicId: classifyTopicId(title),
    title,
    billNumber,
    type: bill.type,
    congress: bill.congress,
    introducedDate: bill.introducedDate?.slice(0, 10) ?? '',
    latestAction: bill.latestAction?.text?.trim() ?? null,
    url: congressBillPublicUrl(bill, bioguideId),
    policyArea: bill.policyArea?.name?.trim() ?? null,
    tier: 'official',
    ...(role ? { role } : {}),
  };
}

interface TopicFetchBuffer {
  bills: MemberDeepBill[];
  exhausted: boolean;
}

interface CosponsoredFetchResult {
  bills: MemberDeepBill[];
  totalCount: number | null;
  pagesFetched: number;
  earlyStopped: boolean;
}

function initTopicFetchBuffers(): Record<string, TopicFetchBuffer> {
  const out: Record<string, TopicFetchBuffer> = {};
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    out[bucket.id] = { bills: [], exhausted: false };
  }
  return out;
}

function billDedupeKey(bill: MemberDeepBill): string {
  return `${bill.type ?? ''}-${bill.billNumber}-${bill.congress ?? ''}`;
}

function minIntroducedDate(bills: MemberDeepBill[]): string | null {
  let min: string | null = null;
  for (const bill of bills) {
    const date = bill.introducedDate;
    if (!date) continue;
    if (min === null || date < min) min = date;
  }
  return min;
}

function isPageNewestFirst(bills: MemberDeepBill[]): boolean | null {
  const dated = bills.filter((b) => b.introducedDate);
  if (dated.length < 2) return null;
  const first = dated[0].introducedDate;
  const last = dated[dated.length - 1].introducedDate;
  return first >= last;
}

function allTopicCapsResolved(buffers: Record<string, TopicFetchBuffer>): boolean {
  return RECORD_TOPIC_BUCKETS.every((bucket) => {
    const buf = buffers[bucket.id];
    return buf.bills.length >= MAX_COSPONSORED_PER_TOPIC || buf.exhausted;
  });
}

function markTopicExhaustion(
  buffers: Record<string, TopicFetchBuffer>,
  pageOldest: string | null,
  pageAdded: Record<string, boolean>,
): void {
  if (!pageOldest) return;
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    const buf = buffers[bucket.id];
    if (buf.exhausted || buf.bills.length >= MAX_COSPONSORED_PER_TOPIC) continue;
    const bufOldest = minIntroducedDate(buf.bills);
    if (bufOldest !== null && pageOldest < bufOldest && !pageAdded[bucket.id]) {
      buf.exhausted = true;
    }
  }
}

export async function fetchCosponsoredLegislation(
  bioguideId: string,
  key: string,
): Promise<CosponsoredFetchResult> {
  const pathSuffix = `/member/${bioguideId}/cosponsored-legislation`;
  // Default API sort is newest-first. Do NOT pass sort=introducedDate+desc — at limit=250
  // the API returns oldest-first (asc), breaking early-stop and topic-cap logic.
  let nextUrl: string | undefined = buildUrl(bioguideId, pathSuffix, key);
  const mapped: MemberDeepBill[] = [];
  const seenBillKeys = new Set<string>();
  const topicBuffers = initTopicFetchBuffers();
  let page = 0;
  let totalCount: number | null = null;
  let earlyStopped = false;
  let useTopicExhaustion = true;

  while (nextUrl) {
    page += 1;
    console.log(`  cosponsored page ${page}…`);
    const pageData: LegislationPage = await congressGet<LegislationPage>(nextUrl, key);
    if (totalCount === null && pageData.pagination?.count != null) {
      totalCount = pageData.pagination.count;
    }

    const pageBills: MemberDeepBill[] = [];
    const pageAdded: Record<string, boolean> = {};
    for (const raw of extractLegislationList(pageData, 'cosponsoredLegislation')) {
      const bill = mapBill(raw, bioguideId, 'cosponsor');
      if (!bill) continue;
      const dedupeKey = billDedupeKey(bill);
      if (seenBillKeys.has(dedupeKey)) continue;
      seenBillKeys.add(dedupeKey);

      pageBills.push(bill);
      mapped.push(bill);

      const buf = topicBuffers[bill.topicId];
      if (buf && buf.bills.length < MAX_COSPONSORED_PER_TOPIC) {
        buf.bills.push(bill);
        pageAdded[bill.topicId] = true;
      }
    }

    if (page === 1) {
      const orderCheck = isPageNewestFirst(pageBills);
      if (orderCheck === false) {
        useTopicExhaustion = false;
        console.log('  cosponsored page order not newest-first — topic exhaustion early-stop disabled');
      }
    }

    if (useTopicExhaustion) {
      const pageOldest = minIntroducedDate(pageBills);
      markTopicExhaustion(topicBuffers, pageOldest, pageAdded);
    }

    nextUrl = pageData.pagination?.next;

    if (allTopicCapsResolved(topicBuffers)) {
      earlyStopped = true;
      console.log(
        `  cosponsored early stop after page ${page} (${mapped.length} fetched, ${totalCount ?? '?'} total)`,
      );
      break;
    }
  }

  return { bills: mapped, totalCount, pagesFetched: page, earlyStopped };
}

async function fetchAllLegislation(
  bioguideId: string,
  kind: 'sponsored',
  key: string,
): Promise<MemberDeepBill[]> {
  const pathSuffix = `/member/${bioguideId}/sponsored-legislation`;

  let nextUrl: string | undefined = buildUrl(bioguideId, pathSuffix, key);
  const mapped: MemberDeepBill[] = [];
  let page = 0;

  while (nextUrl) {
    page += 1;
    console.log(`  ${kind} page ${page}…`);
    const pageData: LegislationPage = await congressGet<LegislationPage>(nextUrl, key);
    for (const raw of extractLegislationList(pageData, 'sponsoredLegislation')) {
      const bill = mapBill(raw, bioguideId);
      if (bill) mapped.push(bill);
    }
    nextUrl = pageData.pagination?.next;
  }

  return mapped;
}

function emptyByTopic(): Record<string, MemberDeepTopicBlock> {
  const out: Record<string, MemberDeepTopicBlock> = {};
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    out[bucket.id] = { sponsored: [], cosponsored: [] };
  }
  return out;
}

function sortByDateDesc(bills: MemberDeepBill[]): MemberDeepBill[] {
  return [...bills].sort(
    (a, b) => new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime(),
  );
}

function limitCosponsoredPerTopic(byTopic: Record<string, MemberDeepTopicBlock>): void {
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    byTopic[bucket.id].cosponsored = sortByDateDesc(byTopic[bucket.id].cosponsored).slice(
      0,
      MAX_COSPONSORED_PER_TOPIC,
    );
  }
}

function buildTopicCoverage(byTopic: Record<string, MemberDeepTopicBlock>): Record<string, number> {
  const coverage: Record<string, number> = {};
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    const block = byTopic[bucket.id];
    coverage[bucket.id] = block.sponsored.length + block.cosponsored.length;
  }
  return coverage;
}

async function fetchMemberProfile(bioguideId: string, key: string): Promise<MemberDeepProfileBlock> {
  const url = buildUrl(bioguideId, `/member/${bioguideId}`, key).replace(
    `limit=${PAGE_LIMIT}`,
    'limit=1',
  );
  const data = await congressGet<{ member?: CongressMember }>(url, key);
  const member = data.member ?? {};

  return {
    bioguideId,
    officialPhotoUrl: member.depiction?.imageUrl?.trim() ?? null,
    officialWebsite: member.officialWebsiteUrl?.trim() ?? null,
    officeAddress: member.addressInformation?.officeAddress?.trim() ?? null,
    phone: member.addressInformation?.phoneNumber?.trim() ?? null,
    currentMember: member.currentMember === true,
    source: CONGRESS_SOURCE,
  };
}

export async function ingestOneMember(bioguideId: string, key: string, asOf: string): Promise<MemberDeepProfile> {
  console.log(`\nDeep ingest for ${bioguideId} via Congress.gov API v3`);

  console.log('Step A — member profile');
  const profile = await fetchMemberProfile(bioguideId, key);

  console.log('Step B — sponsored legislation');
  const sponsored = await fetchAllLegislation(bioguideId, 'sponsored', key);
  console.log(`  ${sponsored.length} sponsored bills mapped`);

  console.log('Step C — cosponsored legislation');
  const cosponsoredResult = await fetchCosponsoredLegislation(bioguideId, key);
  const cosponsored = cosponsoredResult.bills;
  const totalCosponsored = cosponsoredResult.totalCount ?? cosponsored.length;
  console.log(
    `  ${cosponsored.length} cosponsored bills fetched (${totalCosponsored} total) · ${cosponsoredResult.pagesFetched} pages${cosponsoredResult.earlyStopped ? ' · early stop' : ''}`,
  );

  const byTopic = emptyByTopic();
  for (const bill of sponsored) {
    byTopic[bill.topicId]?.sponsored.push(bill);
  }
  for (const bill of cosponsored) {
    byTopic[bill.topicId]?.cosponsored.push(bill);
  }

  for (const bucket of RECORD_TOPIC_BUCKETS) {
    byTopic[bucket.id].sponsored = sortByDateDesc(byTopic[bucket.id].sponsored);
  }
  limitCosponsoredPerTopic(byTopic);

  const snapshot: MemberDeepProfile = {
    meta: {
      bioguideId,
      asOf,
      source: 'Congress.gov API v3',
      totalSponsored: sponsored.length,
      totalCosponsored,
      topicCoverage: buildTopicCoverage(byTopic),
    },
    profile,
    byTopic,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${bioguideId}.json`);
  await writeFile(outFile, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${outFile}`);
  console.log(
    `Coverage: ${sponsored.length} sponsored · ${totalCosponsored} cosponsored (${cosponsored.length} fetched) · ${Object.values(snapshot.meta.topicCoverage).filter((n) => n > 0).length} topics with bills`,
  );

  return snapshot;
}

async function loadCongressMembers(): Promise<LegislatorRow[]> {
  const raw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as { legislators: LegislatorRow[] };
  return raw.legislators.filter((l) => l.chamber === 'senate' || l.chamber === 'house');
}

async function writeManifest(asOf: string): Promise<void> {
  const files = await readdir(OUT_DIR);
  const bioguideIds = files
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
  await writeFile(
    MANIFEST_FILE,
    JSON.stringify({ asOf, count: bioguideIds.length, bioguideIds }, null, 2) + '\n',
    'utf8',
  );
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const { all, bioguideId, limit } = parseArgs();
  const key = getCongressApiKey();
  const asOf = new Date().toISOString().slice(0, 10);

  if (!all) {
    await ingestOneMember(bioguideId, key, asOf);
    await writeManifest(asOf);
    return;
  }

  const members = await loadCongressMembers();
  let checkpoint: Record<string, boolean> = {};
  try {
    checkpoint = JSON.parse(await readFile(CHECKPOINT_FILE, 'utf8')) as Record<string, boolean>;
  } catch {
    /* fresh run */
  }

  const limitLabel = limit !== undefined ? ` · --limit ${limit}` : '';
  console.log(
    `Deep ingest --all: ${members.length} members (${Object.keys(checkpoint).length} checkpointed)${limitLabel}`,
  );

  let completed = 0;
  for (let i = 0; i < members.length; i += 1) {
    const leg = members[i];
    if (checkpoint[leg.bioguideId]) continue;
    if (limit !== undefined && completed >= limit) {
      console.log(`--limit ${limit} reached (${completed} new members this run)`);
      break;
    }

    try {
      await ingestOneMember(leg.bioguideId, key, asOf);
      checkpoint[leg.bioguideId] = true;
      completed += 1;
      await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint) + '\n', 'utf8');
      if (completed % 5 === 0) {
        await writeManifest(asOf);
      }
    } catch (err) {
      if (err instanceof CongressApiError) {
        console.error(`FAILED ${leg.bioguideId}: HTTP ${err.status} — ${err.message}`);
        if (err.body) {
          console.error(`  response body: ${err.body.slice(0, 1000)}`);
        }
      } else {
        console.error(
          `FAILED ${leg.bioguideId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    if ((i + 1) % 10 === 0 || i === members.length - 1) {
      console.log(`  progress: ${i + 1}/${members.length} processed · ${Object.keys(checkpoint).length} checkpointed`);
    }
  }

  await writeManifest(asOf);
  console.log('');
  console.log('── ingest:member --all complete ──');
  console.log(`New this run: ${completed}${limit !== undefined ? ` (limit ${limit})` : ''}`);
  console.log(`Checkpointed: ${Object.keys(checkpoint).length}/${members.length}`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

const isDirectRun =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
