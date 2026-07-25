/**
 * National congressional roll-call vote sync for all current members.
 * Output: data/national/votes/congress-votes.json
 *
 * Features:
 * - Resilient fetch with retry/backoff/adaptive rate limiting
 * - Immutable disk cache at data/cache/rollcalls/ and data/cache/billsummaries/
 * - Incremental mode: fetches only roll calls newer than stored high-water mark
 * - Full refetch with --full flag
 * - House + Senate collected concurrently (different API hosts)
 * - §6 honesty reporting: explicit fetch-failed list
 *
 * Run: npm run sync:votes-national
 * Full: npm run sync:votes-national -- --full
 * Full-depth (scoped only): npm run sync:votes-national -- --members S000033 --full --full-depth
 *   Removes the 30-vote display/collection cap and expands Senate LIS collection across
 *   congresses 117–119 (sessions 1 and 2 each). Default (non-full-depth) stays congress 119.
 *   Senate-only scoped runs proceed without CONGRESS_API_KEY (House skipped with warning).
 */
import { config } from 'dotenv';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONGRESS_GOV_SOURCE,
  fetchBioguidePartyMap,
  fetchBillSummary,
  fetchHouseVoteList,
  fetchHouseVoteMembers,
  fetchStats,
  formatBillId,
  houseVoteCongressUrl,
  humanHouseVoteAction,
  isCongressConfigured,
  normalizeVoteChoice,
  policyCategoryFromQuestion,
  voteResultLabel,
  type HouseVoteSummary,
} from '../lib/data/congressClient';
import { computePartyBreakdown } from '../lib/data/partyVoteBreakdown';
import type { Source, VoteChoice, VoteRecord } from '../lib/types';
import {
  SENATE_GOV_SOURCE,
  bioguideToLisFromLocal,
  fetchSenateRollCall,
  fetchSenateVoteMenu,
  senateFetchStats,
  senateVoteToRecord,
} from '../lib/data/senateVotesClient';
import { loadCheckpoint, saveCheckpoint } from './lib/resilientFetch';
import { buildSyncSummary, emitSyncSummary } from './lib/syncKernel';
import { DATA_NATIONAL_VOTES_DIR, NATIONAL_VOTES_FILE, PROJECT_ROOT } from './lib/dataPaths';

const projectRoot = PROJECT_ROOT;
const OUT_DIR = DATA_NATIONAL_VOTES_DIR;
const OUT_FILE = NATIONAL_VOTES_FILE;
const LEGISLATORS_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');
const CHECKPOINT_FILE = '/tmp/ledger-sync-votes-national-checkpoint.json';

const TARGET_CONGRESS = 119;
/** Multi-congress window under `--full-depth` (sessions 1+2 each). Default stays 119 only. */
const FULL_DEPTH_CONGRESSES = [119, 118, 117] as const;
/** Default profile depth; raised under `--full-depth` (requires `--members`). */
let VOTES_PER_MEMBER = 30;
/** Collect window before finalize; raised under `--full-depth`. */
let MAX_SENATE_VOTES_COLLECT = 45;
let MAX_VOTE_PAGES = 6;
const PAGE_SIZE = 50;

const IS_FULL = process.argv.includes('--full');
const IS_FULL_DEPTH = process.argv.includes('--full-depth');
/** Effectively uncapped across the full-depth congress window. */
const FULL_DEPTH_VOTE_CAP = 10_000;

function congressesToScan(): number[] {
  return IS_FULL_DEPTH ? [...FULL_DEPTH_CONGRESSES] : [TARGET_CONGRESS];
}

function parseMembersArg(argv: string[]): Set<string> | null {
  const idx = argv.indexOf('--members');
  if (idx === -1 || !argv[idx + 1]) return null;
  return new Set(
    argv[idx + 1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function memberInFilter(bioguideId: string, filter: Set<string> | null): boolean {
  if (!filter) return true;
  return filter.has(bioguideId);
}

interface LegislatorRow {
  bioguideId: string;
  name: string;
  chamber: string;
  party: string;
  office: string;
  stateCode: string;
}

interface HighWaterMark {
  houseMaxRoll?: Record<string, number>; // keyed by "{congress}-{session}"
  senateMaxVote?: Record<string, number>; // keyed by "{congress}-{session}"
}

interface ExistingNationalVotesSnapshot {
  meta?: {
    highWaterMark?: HighWaterMark;
    [key: string]: unknown;
  };
  byBioguideId?: Record<string, { chamber?: string; votes?: VoteRecord[] }>;
}

interface FetchFailure {
  chamber: string;
  rollNumber: number;
  error: string;
}

const fetchFailures: FetchFailure[] = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Prefer recent Yea/Nay votes when the newest roll calls are all Not Voting. */
function finalizeMemberVotes(candidates: VoteRecord[], targetCount: number): VoteRecord[] {
  const sorted = [...candidates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const cast = sorted.filter((v) => v.vote === 'Yea' || v.vote === 'Nay');
  const absent = sorted.filter((v) => v.vote !== 'Yea' && v.vote !== 'Nay');
  if (cast.length === 0) return sorted.slice(0, targetCount);
  const out = cast.slice(0, targetCount);
  if (out.length < targetCount) {
    out.push(...absent.slice(0, targetCount - out.length));
  }
  return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Real date only — no fallback to today. */
function isoDate(value?: string): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function toHouseVoteRecord(
  bioguideId: string,
  vote: HouseVoteSummary,
  position: VoteChoice,
  question: string | undefined,
  extras?: { billSummary?: string; partyBreakdown?: ReturnType<typeof computePartyBreakdown> },
): VoteRecord | null {
  const date = isoDate(vote.startDate);
  if (!date) return null;
  const billId = formatBillId(vote.legislationType, vote.legislationNumber);
  const url = houseVoteCongressUrl(vote);
  const source: Source = { ...CONGRESS_GOV_SOURCE, url, date };
  return {
    id: `${bioguideId}-h${vote.congress}-${vote.sessionNumber}-${vote.rollCallNumber}`,
    billId,
    billTitle: extras?.billSummary ?? billId,
    billDescription: question
      ? `${question} — ${billId}. Official House roll-call (Congress.gov).`
      : `House roll call ${vote.rollCallNumber}, ${vote.congress}th Congress.`,
    voteAction: humanHouseVoteAction(question),
    billSummary: extras?.billSummary,
    date,
    vote: position,
    result: voteResultLabel(vote.result),
    category: policyCategoryFromQuestion(question, vote.legislationType),
    partyBreakdown: extras?.partyBreakdown,
    source,
  };
}

async function collectRecentHouseVotes(highWaterMark?: HighWaterMark): Promise<HouseVoteSummary[]> {
  const all: HouseVoteSummary[] = [];
  for (const congress of congressesToScan()) {
    for (const session of [2, 1]) {
      const hwKey = `${congress}-${session}`;
      const hwRoll = highWaterMark?.houseMaxRoll?.[hwKey] ?? 0;

      let offset = 0;
      let reachedHighWater = false;
      for (let page = 0; page < MAX_VOTE_PAGES; page += 1) {
        const { votes, nextOffset } = await fetchHouseVoteList(congress, session, PAGE_SIZE, offset);
        for (const v of votes) {
          if (!IS_FULL && !IS_FULL_DEPTH && hwRoll > 0 && v.rollCallNumber <= hwRoll) {
            reachedHighWater = true;
            break;
          }
          all.push(v);
        }
        if (reachedHighWater || nextOffset == null || votes.length === 0) break;
        offset = nextOffset;
        await sleep(80);
      }
    }
  }
  return all.sort((a, b) => {
    const da = new Date(a.startDate ?? 0).getTime();
    const db = new Date(b.startDate ?? 0).getTime();
    if (db !== da) return db - da;
    return (b.rollCallNumber ?? 0) - (a.rollCallNumber ?? 0);
  });
}

async function syncHouseVotes(
  allBioguides: Set<string>,
  highWaterMark?: HighWaterMark,
): Promise<Map<string, VoteRecord[]>> {
  const collected = new Map<string, VoteRecord[]>();
  for (const id of allBioguides) collected.set(id, []);

  if (!isCongressConfigured()) {
    console.warn('CONGRESS_API_KEY not configured — skipping House vote scan.');
    return collected;
  }

  const voteList = await collectRecentHouseVotes(highWaterMark);
  console.log(`  ${voteList.length} House roll calls to process (incremental: ${!IS_FULL})`);

  let partyMap = new Map<string, string>();
  try {
    partyMap = await fetchBioguidePartyMap();
  } catch {
    console.warn('  party map unavailable — omitting party breakdown');
  }

  const billSummaryCache = new Map<string, string | undefined>();
  let skippedNoDate = 0;

  for (const vote of voteList) {
    const pending = [...allBioguides].filter((id) => (collected.get(id)?.length ?? 0) < VOTES_PER_MEMBER);
    if (pending.length === 0) break;

    try {
      const members = await fetchHouseVoteMembers(vote.congress, vote.sessionNumber, vote.rollCallNumber);
      const houseMembers = members.results?.filter((m) => allBioguides.has(m.bioguideId)) ?? [];
      if (houseMembers.length === 0) {
        await sleep(80);
        continue;
      }

      let billSummary: string | undefined;
      if (vote.legislationType && vote.legislationNumber) {
        const key = `${vote.congress}-${vote.legislationType}-${vote.legislationNumber}`;
        billSummary = billSummaryCache.get(key);
        if (billSummary === undefined) {
          billSummary = await fetchBillSummary(vote.congress, vote.legislationType, vote.legislationNumber);
          billSummaryCache.set(key, billSummary);
          await sleep(50);
        }
      }

      const breakdown = computePartyBreakdown(
        (members.results ?? []).map((m) => ({
          party: partyMap.get(m.bioguideId) ?? 'I',
          voteCast: normalizeVoteChoice(m.voteCast),
        })),
      );

      for (const m of houseMembers) {
        const list = collected.get(m.bioguideId) ?? [];
        if (list.length >= VOTES_PER_MEMBER) continue;
        const record = toHouseVoteRecord(
          m.bioguideId,
          vote,
          normalizeVoteChoice(m.voteCast),
          members.voteQuestion,
          { billSummary, partyBreakdown: breakdown },
        );
        if (!record) {
          skippedNoDate += 1;
          continue;
        }
        list.push(record);
        collected.set(m.bioguideId, list);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fetchFailures.push({ chamber: 'house', rollNumber: vote.rollCallNumber, error: msg });
      console.warn(`  skip House ${vote.rollCallNumber}: ${msg}`);
    }
    await sleep(80);
  }

  if (skippedNoDate > 0) {
    console.warn(`  skipped ${skippedNoDate} House vote record(s) with no discoverable roll-call date`);
  }

  return collected;
}

async function syncSenateVotes(
  senators: LegislatorRow[],
  highWaterMark?: HighWaterMark,
): Promise<Map<string, VoteRecord[]>> {
  const collected = new Map<string, VoteRecord[]>();
  for (const s of senators) collected.set(s.bioguideId, []);

  if (senators.length === 0) return collected;

  const bioguideToLis = await bioguideToLisFromLocal();
  for (const sen of senators) {
    if (!bioguideToLis.has(sen.bioguideId)) {
      console.warn(`  ${sen.bioguideId}: no LIS id in local legislators snapshot`);
    }
  }

  // Default: congress 119 session 2 only (recent window). Full-depth: 117–119 × sessions 1+2.
  const congressSessions: Array<{ congress: number; session: number }> = IS_FULL_DEPTH
    ? congressesToScan().flatMap((congress) =>
        [2, 1].map((session) => ({ congress, session })),
      )
    : [{ congress: TARGET_CONGRESS, session: 2 }];

  console.log(
    `  Senate LIS scan windows: ${congressSessions.map((w) => `${w.congress}-${w.session}`).join(', ')}`,
  );

  for (const { congress, session } of congressSessions) {
    const pendingAtStart = senators.filter(
      (s) => (collected.get(s.bioguideId)?.length ?? 0) < MAX_SENATE_VOTES_COLLECT,
    );
    if (pendingAtStart.length === 0) break;

    let menu: Awaited<ReturnType<typeof fetchSenateVoteMenu>>;
    try {
      menu = (await fetchSenateVoteMenu(congress, session)).sort((a, b) => b.voteNumber - a.voteNumber);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fetchFailures.push({
        chamber: 'senate',
        rollNumber: 0,
        error: `vote menu ${congress}-${session}: ${msg}`,
      });
      console.warn(`  Senate vote menu ${congress}-${session} fetch failed: ${msg}`);
      continue;
    }

    const hwKey = `${congress}-${session}`;
    const hwVote = highWaterMark?.senateMaxVote?.[hwKey] ?? 0;

    const filteredMenu =
      IS_FULL || IS_FULL_DEPTH
        ? menu
        : menu.filter((item) => hwVote === 0 || item.voteNumber > hwVote);

    console.log(
      `  ${filteredMenu.length} Senate roll calls ${congress}-${session} to process (of ${menu.length} total, incremental: ${!(IS_FULL || IS_FULL_DEPTH)})`,
    );

    for (const item of filteredMenu) {
      const pending = senators.filter(
        (s) => (collected.get(s.bioguideId)?.length ?? 0) < MAX_SENATE_VOTES_COLLECT,
      );
      if (pending.length === 0) break;

      try {
        const roll = await fetchSenateRollCall(congress, session, item.voteNumber);
        for (const sen of senators) {
          const lis = bioguideToLis.get(sen.bioguideId);
          if (!lis) continue;
          const memberVote = roll.members.find((m) => m.lisMemberId === lis);
          if (!memberVote) continue;
          const list = collected.get(sen.bioguideId) ?? [];
          if (list.length >= MAX_SENATE_VOTES_COLLECT) continue;
          list.push(senateVoteToRecord(sen.bioguideId, roll, memberVote.voteCast));
          collected.set(sen.bioguideId, list);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        fetchFailures.push({ chamber: 'senate', rollNumber: item.voteNumber, error: msg });
        console.warn(`  skip Senate ${congress}-${session} vote ${item.voteNumber}: ${msg}`);
      }
      await sleep(80);
    }
  }

  for (const sen of senators) {
    const raw = collected.get(sen.bioguideId) ?? [];
    collected.set(sen.bioguideId, finalizeMemberVotes(raw, VOTES_PER_MEMBER));
  }

  return collected;
}

async function readExistingVoteSnapshot(): Promise<ExistingNationalVotesSnapshot | null> {
  try {
    return JSON.parse(await readFile(OUT_FILE, 'utf8')) as ExistingNationalVotesSnapshot;
  } catch {
    return null;
  }
}

function mergeVoteLists(existing: VoteRecord[], fresh: VoteRecord[]): VoteRecord[] {
  const ids = new Set(fresh.map((v) => v.id));
  const merged = [...fresh];
  for (const v of existing) {
    if (!ids.has(v.id)) {
      merged.push(v);
      ids.add(v.id);
    }
  }
  return merged
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, VOTES_PER_MEMBER);
}

function computeHighWaterMark(
  byBioguideId: Record<string, { chamber?: string; votes?: VoteRecord[] }>,
): HighWaterMark {
  const houseMaxRoll: Record<string, number> = {};
  const senateMaxVote: Record<string, number> = {};

  for (const entry of Object.values(byBioguideId)) {
    for (const vote of entry.votes ?? []) {
      const m = vote.id.match(/-h(\d+)-(\d+)-(\d+)$/);
      if (m) {
        const key = `${m[1]}-${m[2]}`;
        const roll = parseInt(m[3], 10);
        houseMaxRoll[key] = Math.max(houseMaxRoll[key] ?? 0, roll);
      }
      const s = vote.id.match(/-s(\d+)-(\d+)-(\d+)$/);
      if (s) {
        const key = `${s[1]}-${s[2]}`;
        const voteNum = parseInt(s[3], 10);
        senateMaxVote[key] = Math.max(senateMaxVote[key] ?? 0, voteNum);
      }
    }
  }

  return { houseMaxRoll, senateMaxVote };
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });
  const startTime = Date.now();
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const memberFilter = parseMembersArg(process.argv);
  const scopedRun = memberFilter != null;

  if (IS_FULL_DEPTH) {
    if (!scopedRun || !memberFilter || memberFilter.size === 0) {
      console.error('--full-depth requires --members <bioguideId[,...]> (scoped agent runs only).');
      process.exit(1);
    }
    VOTES_PER_MEMBER = FULL_DEPTH_VOTE_CAP;
    MAX_SENATE_VOTES_COLLECT = FULL_DEPTH_VOTE_CAP;
    MAX_VOTE_PAGES = 40;
    console.log(
      `Full-depth mode: vote cap ${FULL_DEPTH_VOTE_CAP}, senate collect ${FULL_DEPTH_VOTE_CAP}, pages ${MAX_VOTE_PAGES}`,
    );
  }

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  const legislators = legislatorsRaw.legislators.filter(
    (l) => l.chamber === 'senate' || l.chamber === 'house',
  );
  const targetLegislators = scopedRun
    ? legislators.filter((l) => memberInFilter(l.bioguideId, memberFilter))
    : legislators;

  if (scopedRun && targetLegislators.length === 0) {
    console.error(`No legislators match --members filter: ${[...memberFilter!].join(', ')}`);
    process.exit(1);
  }

  const senators = targetLegislators.filter((l) => l.chamber === 'senate');
  const houseMembers = targetLegislators.filter((l) => l.chamber === 'house');

  const scopeField = scopedRun
    ? `scoped: ${[...memberFilter!].join(',')}`
    : 'full';

  console.log(
    scopedRun
      ? `National vote sync (scoped): ${targetLegislators.length} member(s) — ${scopeField}`
      : `National vote sync: ${legislators.length} members (${senators.length} Senate, ${houseMembers.length} House)`,
  );
  console.log(
    `Mode: ${IS_FULL || IS_FULL_DEPTH ? 'FULL refetch' : 'INCREMENTAL'}${IS_FULL_DEPTH ? ' + FULL-DEPTH (uncapped)' : ''}`,
  );

  // House needs CONGRESS_API_KEY. Senate LIS is keyless — allow Senate-only scoped runs without abort.
  const senateOnlyScoped = scopedRun && senators.length > 0 && houseMembers.length === 0;
  if (!isCongressConfigured()) {
    if (senateOnlyScoped) {
      console.warn(
        'CONGRESS_API_KEY not configured — skipping House; proceeding with Senate LIS (keyless).',
      );
    } else {
      console.error(
        'CONGRESS_API_KEY not configured — aborting without changes (full-corpus or House members in scope require the key).',
      );
      emitSyncSummary(
        buildSyncSummary('sync-votes-national', {
          status: 'fetch-failed',
          failed: ['congress-api-key'],
          checkpoint: CHECKPOINT_FILE,
          log: '/tmp/ledger-sync-votes-scoped.log',
          preservePrior: true,
        }),
      );
      process.exit(1);
    }
  }

  const existing = await readExistingVoteSnapshot();
  const underFilledTargets =
    scopedRun &&
    targetLegislators.some((leg) => {
      const prior = existing?.byBioguideId?.[leg.bioguideId];
      return (prior?.votes?.length ?? 0) < VOTES_PER_MEMBER;
    });
  const highWaterMark =
    IS_FULL || IS_FULL_DEPTH || underFilledTargets ? undefined : existing?.meta?.highWaterMark;
  if (underFilledTargets || IS_FULL_DEPTH) {
    console.log(
      IS_FULL_DEPTH
        ? 'Full-depth scoped refresh: bypassing high-water mark'
        : 'Scoped depth refresh: bypassing high-water mark for under-filled manifest members',
    );
  }
  const checkpoint = (await loadCheckpoint<Record<string, true>>(CHECKPOINT_FILE)) ?? {};

  if (memberFilter) {
    for (const id of memberFilter) delete checkpoint[id];
  }

  // House + Senate concurrently (different API hosts) — only for target members when scoped.
  // Skip the empty chamber: a Senate-only scoped run must not walk every House roll call.
  const houseBioguides = new Set(houseMembers.map((l) => l.bioguideId));
  const [houseVotes, senateVotes] = await Promise.all([
    houseBioguides.size > 0
      ? syncHouseVotes(houseBioguides, highWaterMark)
      : Promise.resolve(new Map<string, VoteRecord[]>()),
    syncSenateVotes(senators, highWaterMark),
  ]);
  if (houseBioguides.size === 0 && senators.length > 0) {
    console.log('  Skipping House scan (no House members in scope)');
  }
  if (senators.length === 0 && houseBioguides.size > 0) {
    console.log('  Skipping Senate scan (no Senate members in scope)');
  }

  const underFilledMembers: Array<{ bioguideId: string; name: string; count: number; reason: string }> = [];
  const byBioguideId: Record<
    string,
    {
      bioguideId: string;
      name: string;
      chamber: string;
      votes: VoteRecord[];
      source: Source;
      asOf: string;
    }
  > = {};

  // §6 scoped merge: start from prior snapshot; only refresh targeted members
  if (scopedRun && existing?.byBioguideId) {
    for (const [id, entry] of Object.entries(existing.byBioguideId)) {
      if (!memberFilter!.has(id)) {
        byBioguideId[id] = entry as typeof byBioguideId[string];
      }
    }
  }

  const processLegislators = scopedRun ? targetLegislators : legislators;

  for (const leg of processLegislators) {
    const priorEntry = existing?.byBioguideId?.[leg.bioguideId];
    const priorCount = priorEntry?.votes?.length ?? 0;
    if (
      !IS_FULL_DEPTH &&
      checkpoint[leg.bioguideId] &&
      priorEntry &&
      priorCount >= VOTES_PER_MEMBER
    ) {
      byBioguideId[leg.bioguideId] = priorEntry as typeof byBioguideId[string];
      continue;
    }
    const freshHouse = houseVotes.get(leg.bioguideId) ?? [];
    const freshSenate = senateVotes.get(leg.bioguideId) ?? [];
    const freshVotes = [...freshHouse, ...freshSenate];

    // Merge with existing in incremental mode
    const existingVotes = existing?.byBioguideId?.[leg.bioguideId]?.votes ?? [];
    const forceReplace = IS_FULL || IS_FULL_DEPTH;
    const votes = forceReplace
      ? freshVotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, VOTES_PER_MEMBER)
      : mergeVoteLists(existingVotes, freshVotes);

    // Under-filled only meaningful against the default 30-vote profile depth.
    if (!IS_FULL_DEPTH && votes.length < VOTES_PER_MEMBER) {
      const reason = fetchFailures.some((f) => f.chamber === leg.chamber)
        ? 'fetch-failed rolls reduced available data'
        : 'insufficient roll-call positions in scan window';
      underFilledMembers.push({ bioguideId: leg.bioguideId, name: leg.name, count: votes.length, reason });
    }

    byBioguideId[leg.bioguideId] = {
      bioguideId: leg.bioguideId,
      name: leg.name,
      chamber: leg.chamber,
      votes,
      source: leg.chamber === 'senate' ? SENATE_GOV_SOURCE : CONGRESS_GOV_SOURCE,
      asOf,
    };
    const chamberFetchFailed = fetchFailures.some((f) => f.chamber === leg.chamber);
    if (!chamberFetchFailed || votes.length >= (IS_FULL_DEPTH ? 1 : VOTES_PER_MEMBER)) {
      checkpoint[leg.bioguideId] = true;
      await saveCheckpoint(CHECKPOINT_FILE, checkpoint);
    }
  }

  const withVotes = Object.values(byBioguideId).filter((e) => (e.votes?.length ?? 0) > 0).length;
  const totalVotes = Object.values(byBioguideId).reduce((s, e) => s + (e.votes?.length ?? 0), 0);
  const hwm = computeHighWaterMark(byBioguideId);

  const snapshot = {
    meta: {
      source: CONGRESS_GOV_SOURCE,
      asOf,
      fetchedAt,
      membersQueried: legislators.length,
      membersQueriedThisRun: processLegislators.length,
      scope: scopeField,
      withVoteData: withVotes,
      totalVotePositions: totalVotes,
      failureCount: fetchFailures.length,
      keyConfigured: isCongressConfigured(),
      incremental: !(IS_FULL || IS_FULL_DEPTH),
      highWaterMark: hwm,
      datasetUrl: 'https://www.congress.gov',
      note: scopedRun
        ? `Scoped refresh: ${processLegislators.length} member(s); merged into national snapshot (${legislators.length} total). ${
            IS_FULL_DEPTH
              ? `Full-depth (uncapped up to ${FULL_DEPTH_VOTE_CAP}) across congresses ${FULL_DEPTH_CONGRESSES.join(',')} sessions 1–2 for scoped member(s).`
              : `Up to ${VOTES_PER_MEMBER} recent positions per chamber (congress ${TARGET_CONGRESS}).`
          }`
        : `Up to ${VOTES_PER_MEMBER} recent positions per chamber. House via Congress.gov when keyed; Senate via senate.gov LIS XML.`,
    },
    byBioguideId,
    failures: fetchFailures,
    underFilledMembers,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  const wallTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalNetworkCalls = fetchStats.networkCalls + senateFetchStats.networkCalls;
  const totalCacheHits = fetchStats.cacheHits + senateFetchStats.cacheHits;

  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`  members with votes: ${withVotes}/${legislators.length}`);
  console.log(`  members queried this run: ${processLegislators.length}`);
  console.log(`  scope: ${scopeField}`);
  console.log(`  total vote positions: ${totalVotes}`);
  console.log(`  network calls: ${totalNetworkCalls}`);
  console.log(`  cache hits: ${totalCacheHits}`);
  console.log(`  fetch failures: ${fetchFailures.length}`);
  console.log(`  under-filled (< ${VOTES_PER_MEMBER}): ${underFilledMembers.length}`);
  console.log(`  wall time: ${wallTime}s`);

  if (fetchFailures.length > 0) {
    console.log('\n§6 HONESTY REPORT — fetch-failed roll calls:');
    for (const f of fetchFailures) {
      console.log(`  ${f.chamber} roll ${f.rollNumber}: ${f.error}`);
    }
  }
  if (underFilledMembers.length > 0 && underFilledMembers.length <= 20) {
    console.log('\nUnder-filled members (below VOTES_PER_MEMBER):');
    for (const m of underFilledMembers.slice(0, 20)) {
      console.log(`  ${m.bioguideId} (${m.name}): ${m.count} votes — ${m.reason}`);
    }
  }

  emitSyncSummary(
    buildSyncSummary('sync-votes-national', {
      status: fetchFailures.length > 0 ? 'partial' : 'ok',
      failed: fetchFailures.map((f) => `${f.chamber}-${f.rollNumber}`),
      checkpoint: CHECKPOINT_FILE,
      log: scopedRun ? '/tmp/ledger-sync-votes-scoped.log' : '/tmp/ledger-sync-votes-national.log',
      preservePrior: true,
    }),
  );
}

main().catch((err: unknown) => {
  console.error(
    JSON.stringify({
      ok: false,
      script: 'sync-votes-national',
      error: err instanceof Error ? err.message : String(err),
      at: new Date().toISOString(),
    }),
  );
  process.exit(1);
});
