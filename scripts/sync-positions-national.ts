/**
 * sync-positions-national.ts — VoteSmart stated positions + Congressional Record
 * floor statements per topic bucket for all current Congress members.
 *
 * Output: lib/data/generated/memberPositions.json
 * Run: npm run sync:positions-national
 */
import { config } from 'dotenv';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Source, SourceTier } from '../lib/types';
import { RECORD_TOPIC_BUCKETS } from '../lib/data/profileRecordByTopic';
import { fetchJson, sleep } from './lib/ingest-utils';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'memberPositions.json');
const LEGISLATORS_FILE = path.join(OUT_DIR, 'currentLegislators.json');
const CHECKPOINT_FILE = '/tmp/sync-positions-national-checkpoint.json';

const VOTESMART_BASE = 'https://api.votesmart.org';
const GOVINFO_SEARCH = 'https://api.govinfo.gov/search';
const VOTESMART_DELAY_MS = 250;
const GOVINFO_DELAY_MS = 400;
const FLOOR_STATEMENTS_PER_TOPIC = 3;
const DISPLAY_FLOOR_STATEMENTS = 3;

const VOTESMART_SOURCE: Source = {
  name: 'VoteSmart',
  url: 'https://votesmart.org',
  tier: 'nonpartisan',
};

interface LegislatorRow {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  stateCode: string;
  chamber: string;
}

interface FloorStatement {
  title: string;
  date: string;
  url: string;
  excerpt: string;
  tier: SourceTier;
}

interface TopicPositionEntry {
  statedPosition?: string;
  positionSource?: Source;
  floorStatements: FloorStatement[];
}

interface GovInfoResult {
  title?: string;
  packageId?: string;
  granuleId?: string;
  dateIssued?: string;
}

interface GovInfoSearch {
  count?: number;
  results?: GovInfoResult[];
}

interface VoteSmartOfficial {
  candidateId?: number | string;
  firstName?: string;
  officeStateId?: string;
  officeName?: string;
  officeTypeId?: number | string;
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

function normalizeArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function mapTextToTopicId(text: string): string | null {
  const hay = text.toLowerCase();
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    if (bucket.keywords.some((k) => hay.includes(k.trim()))) return bucket.id;
  }
  return null;
}

function isoDate(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function govinfoUrl(result: GovInfoResult): string {
  if (result.packageId && result.granuleId) {
    return `https://www.govinfo.gov/app/details/${result.packageId}/granule/${result.granuleId}`;
  }
  if (result.packageId) {
    return `https://www.govinfo.gov/app/details/${result.packageId}`;
  }
  return 'https://www.govinfo.gov';
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
  const url = `${VOTESMART_BASE}/${method}?${qs.toString()}`;
  await sleep(VOTESMART_DELAY_MS);
  return fetchJson<Record<string, unknown>>(url);
}

async function findVoteSmartCandidateId(
  leg: LegislatorRow,
  key: string,
): Promise<number | null> {
  try {
    const data = await votesmartFetch('Officials.getByLastname', { lastName: leg.lastName }, key);
    const officials = normalizeArray(
      (data.candidateList as { candidate?: VoteSmartOfficial | VoteSmartOfficial[] } | undefined)?.candidate,
    );
    const chamberMatch = (officeName?: string) => {
      const o = (officeName ?? '').toLowerCase();
      if (leg.chamber === 'senate') return o.includes('senator') || o.includes('senate');
      return o.includes('representative') || o.includes('house');
    };
    const exact = officials.find(
      (c) =>
        (c.firstName ?? '').toLowerCase() === leg.firstName.toLowerCase() &&
        c.officeStateId === leg.stateCode &&
        chamberMatch(c.officeName),
    );
    if (exact?.candidateId != null) return Number(exact.candidateId);
    const byState = officials.find(
      (c) =>
        (c.firstName ?? '').toLowerCase() === leg.firstName.toLowerCase() &&
        c.officeStateId === leg.stateCode,
    );
    if (byState?.candidateId != null) return Number(byState.candidateId);
  } catch {
    // skip member
  }
  return null;
}

function npatPositionsByTopic(npatRoot: Record<string, unknown>): Map<string, string> {
  const byTopic = new Map<string, string[]>();
  const npat = (npatRoot.npat ?? npatRoot) as { section?: NpatSection | NpatSection[] };
  const sections = normalizeArray(npat.section);

  for (const section of sections) {
    const topicFromSection = mapTextToTopicId(section.name ?? '');
    const rows = normalizeArray(section.row);
    for (const row of rows) {
      const answer = (row.answerText ?? row.optionText ?? '').trim();
      if (!answer || /^n\/?a$/i.test(answer) || /^no opinion$/i.test(answer)) continue;
      const question = (row.rowText ?? '').trim();
      const line = question ? `${question}: ${answer}` : answer;
      const topicId = topicFromSection ?? mapTextToTopicId(`${section.name ?? ''} ${question}`);
      if (!topicId) continue;
      const list = byTopic.get(topicId) ?? [];
      list.push(line);
      byTopic.set(topicId, list);
    }
  }

  const out = new Map<string, string>();
  for (const [topicId, lines] of byTopic) {
    out.set(topicId, lines.slice(0, 4).join('; '));
  }
  return out;
}

async function fetchVoteSmartPositions(
  candidateId: number,
  key: string,
  asOf: string,
): Promise<Map<string, { text: string; source: Source }>> {
  const out = new Map<string, { text: string; source: Source }>();

  try {
    await votesmartFetch('CandidateBio.getBio', { candidateId }, key);
  } catch {
    // optional per brief — bio lookup for candidate validation
  }

  try {
    const npatData = await votesmartFetch('Npat.getNpat', { candidateId }, key);
    const npatPositions = npatPositionsByTopic(npatData);
    for (const [topicId, text] of npatPositions) {
      out.set(topicId, {
        text,
        source: { ...VOTESMART_SOURCE, date: asOf },
      });
    }
  } catch {
    // no NPAT on file
  }

  return out;
}

async function searchCongressionalRecord(
  leg: LegislatorRow,
  topicKeywords: string[],
  govinfoKey: string,
): Promise<FloorStatement[]> {
  const keywordQuery = topicKeywords.slice(0, 6).join(' OR ');
  const query = `"${leg.name}" ${keywordQuery} AND collection:CREC`;

  const delays = [2000, 5000, 10000];
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      await sleep(GOVINFO_DELAY_MS);
      const data = await fetchJson<GovInfoSearch>(`${GOVINFO_SEARCH}?api_key=${encodeURIComponent(govinfoKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          pageSize: FLOOR_STATEMENTS_PER_TOPIC,
          offsetMark: '*',
          sorts: [{ field: 'publishdate', sortOrder: 'DESC' }],
        }),
      });

      const statements: FloorStatement[] = [];
      for (const r of data.results ?? []) {
        const title = (r.title ?? '').trim();
        if (!title) continue;
        const date = isoDate(r.dateIssued);
        statements.push({
          title,
          date,
          url: govinfoUrl(r),
          excerpt: title,
          tier: 'official',
        });
      }
      return statements.slice(0, DISPLAY_FLOOR_STATEMENTS);
    } catch (err) {
      if (attempt >= delays.length) throw err;
      console.warn(
        `GovInfo retry ${attempt + 1} for ${leg.name} (${topicKeywords[0]}): ${err instanceof Error ? err.message : err}`,
      );
      await sleep(delays[attempt]);
    }
  }
  return [];
}

interface Checkpoint {
  completedBioguideIds: string[];
}

async function loadCheckpoint(): Promise<Set<string>> {
  try {
    const raw = await readFile(CHECKPOINT_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Checkpoint;
    return new Set(parsed.completedBioguideIds ?? []);
  } catch {
    return new Set();
  }
}

async function saveCheckpoint(completed: Set<string>): Promise<void> {
  await writeFile(
    CHECKPOINT_FILE,
    JSON.stringify({ completedBioguideIds: [...completed] }, null, 2) + '\n',
    'utf8',
  );
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });
  const votesmartKey = (process.env.VOTESMART_API_KEY ?? '').trim();
  const govinfoKey = (
    process.env.GOVINFO_API_KEY ??
    process.env.DATA_GOV_API_KEY ??
    process.env.FEC_API_KEY ??
    ''
  ).trim();

  if (!govinfoKey) {
    console.error('Missing GOVINFO_API_KEY / DATA_GOV_API_KEY — cannot query Congressional Record.');
    process.exit(1);
  }

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  const legislators = legislatorsRaw.legislators.filter(
    (l) => l.chamber === 'senate' || l.chamber === 'house',
  );

  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const completed = await loadCheckpoint();

  let existing: Record<string, Record<string, TopicPositionEntry>> = {};
  try {
    const prev = JSON.parse(await readFile(OUT_FILE, 'utf8')) as {
      byBioguideId?: Record<string, Record<string, TopicPositionEntry>>;
    };
    existing = prev.byBioguideId ?? {};
  } catch {
    // fresh run
  }

  const byBioguideId: Record<string, Record<string, TopicPositionEntry>> = { ...existing };
  let membersWithPositions = 0;
  let membersWithFloorStatements = 0;
  let membersWithAnyTopicData = 0;
  let topicSlotsFilled = 0;
  const topicBuckets = RECORD_TOPIC_BUCKETS.filter((b) => b.id !== 'legislation');

  for (const [bioguideId, topics] of Object.entries(byBioguideId)) {
    if (!completed.has(bioguideId)) continue;
    let hasPosition = false;
    let hasFloor = false;
    for (const entry of Object.values(topics)) {
      if (entry.statedPosition) hasPosition = true;
      if (entry.floorStatements?.length > 0) hasFloor = true;
      if (entry.statedPosition || entry.floorStatements?.length > 0) topicSlotsFilled += 1;
    }
    if (hasPosition) membersWithPositions += 1;
    if (hasFloor) membersWithFloorStatements += 1;
    if (hasPosition || hasFloor) membersWithAnyTopicData += 1;
  }

  console.log(
    `Syncing positions for ${legislators.length} members (${completed.size} already checkpointed). VoteSmart: ${votesmartKey ? 'yes' : 'SKIP'}`,
  );

  for (let i = 0; i < legislators.length; i += 1) {
    const leg = legislators[i];
    if (completed.has(leg.bioguideId)) continue;

    const memberTopics: Record<string, TopicPositionEntry> = {};
    let hasPosition = false;
    let hasFloor = false;

    let votesmartPositions = new Map<string, { text: string; source: Source }>();
    if (votesmartKey) {
      const candidateId = await findVoteSmartCandidateId(leg, votesmartKey);
      if (candidateId != null) {
        votesmartPositions = await fetchVoteSmartPositions(candidateId, votesmartKey, asOf);
      }
    }

    for (const bucket of topicBuckets) {
      const floorStatements = await searchCongressionalRecord(leg, bucket.keywords, govinfoKey);
      const vs = votesmartPositions.get(bucket.id);
      const entry: TopicPositionEntry = { floorStatements };

      if (vs) {
        entry.statedPosition = vs.text;
        entry.positionSource = vs.source;
        hasPosition = true;
      }
      if (floorStatements.length > 0) {
        hasFloor = true;
      }

      if (entry.statedPosition || entry.floorStatements.length > 0) {
        memberTopics[bucket.id] = entry;
        topicSlotsFilled += 1;
        if (entry.statedPosition) topicSlotsFilled += 0;
      }
    }

    if (Object.keys(memberTopics).length > 0) {
      byBioguideId[leg.bioguideId] = memberTopics;
    }

    if (hasPosition) membersWithPositions += 1;
    if (hasFloor) membersWithFloorStatements += 1;
    if (hasPosition || hasFloor) membersWithAnyTopicData += 1;

    completed.add(leg.bioguideId);
    await saveCheckpoint(completed);

    if ((i + 1) % 10 === 0 || i === legislators.length - 1) {
      console.log(
        `[${i + 1}/${legislators.length}] ${leg.name} — topics: ${Object.keys(memberTopics).length}, positions so far: ${membersWithPositions}, floor: ${membersWithFloorStatements}`,
      );
      await mkdir(OUT_DIR, { recursive: true });
      await writeFile(
        OUT_FILE,
        JSON.stringify(
          {
            meta: {
              source: {
                name: 'VoteSmart + Congressional Record (GovInfo)',
                url: 'https://votesmart.org',
                tier: 'nonpartisan',
                description:
                  'Stated positions from VoteSmart NPAT/PCT surveys and floor statements from the Congressional Record via GovInfo.',
              },
              asOf,
              fetchedAt,
              membersQueried: completed.size,
              membersWithPositions,
              membersWithFloorStatements,
              membersWithAnyTopicData,
              topicCoveragePct: 0,
              votesmartConfigured: !!votesmartKey,
            },
            byBioguideId,
          },
          null,
          2,
        ) + '\n',
        'utf8',
      );
    }
  }

  const totalTopicSlots = legislators.length * topicBuckets.length;
  const topicCoveragePct =
    totalTopicSlots > 0 ? Math.round((topicSlotsFilled / totalTopicSlots) * 1000) / 10 : 0;

  const snapshot = {
    meta: {
      source: {
        name: 'VoteSmart + Congressional Record (GovInfo)',
        url: 'https://votesmart.org',
        tier: 'nonpartisan' as const,
        description:
          'Stated positions from VoteSmart NPAT/PCT surveys and floor statements from the Congressional Record via GovInfo.',
      },
      asOf,
      fetchedAt,
      membersQueried: legislators.length,
      membersWithPositions,
      membersWithFloorStatements,
      membersWithAnyTopicData,
      topicCoveragePct,
      votesmartConfigured: !!votesmartKey,
      note: votesmartKey
        ? 'VoteSmart NPAT/PCT + Congressional Record (CREC via GovInfo).'
        : 'Congressional Record only — set VOTESMART_API_KEY for stated positions.',
    },
    byBioguideId,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log('');
  console.log('── sync:positions-national complete ──');
  console.log(`Members with VoteSmart positions: ${membersWithPositions}/${legislators.length}`);
  console.log(`Members with floor statements: ${membersWithFloorStatements}/${legislators.length}`);
  console.log(`Members with any topic data: ${membersWithAnyTopicData}/${legislators.length}`);
  console.log(`Topic slot coverage: ${topicCoveragePct}%`);
  console.log(`Output: ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
