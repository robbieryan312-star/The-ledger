/**
 * National congressional roll-call vote sync for all current members.
 * Output: data/votes/national/congress-votes.json
 *
 * Run: npm run sync:votes-national
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
  fetchLisToBioguideMap,
  fetchSenateRollCall,
  fetchSenateVoteMenu,
  senateVoteToRecord,
} from '../lib/data/senateVotesClient';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'data', 'votes', 'national');
const OUT_FILE = path.join(OUT_DIR, 'congress-votes.json');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');

const TARGET_CONGRESS = 119;
const VOTES_PER_MEMBER = 10;
const MAX_VOTE_PAGES = 6;
const PAGE_SIZE = 50;

interface LegislatorRow {
  bioguideId: string;
  name: string;
  chamber: string;
  party: string;
  office: string;
  stateCode: string;
}

interface ExistingNationalVotesSnapshot {
  byBioguideId?: Record<string, { chamber?: string; votes?: VoteRecord[] }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isoDate(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function toHouseVoteRecord(
  bioguideId: string,
  vote: HouseVoteSummary,
  position: VoteChoice,
  question: string | undefined,
  extras?: { billSummary?: string; partyBreakdown?: ReturnType<typeof computePartyBreakdown> },
): VoteRecord {
  const billId = formatBillId(vote.legislationType, vote.legislationNumber);
  const url = houseVoteCongressUrl(vote);
  const source: Source = { ...CONGRESS_GOV_SOURCE, url, date: isoDate(vote.startDate) };
  return {
    id: `${bioguideId}-h${vote.congress}-${vote.sessionNumber}-${vote.rollCallNumber}`,
    billId,
    billTitle: extras?.billSummary ?? billId,
    billDescription: question
      ? `${question} — ${billId}. Official House roll-call (Congress.gov).`
      : `House roll call ${vote.rollCallNumber}, ${vote.congress}th Congress.`,
    voteAction: humanHouseVoteAction(question),
    billSummary: extras?.billSummary,
    date: isoDate(vote.startDate),
    vote: position,
    result: voteResultLabel(vote.result),
    category: policyCategoryFromQuestion(question, vote.legislationType),
    partyBreakdown: extras?.partyBreakdown,
    source,
  };
}

async function collectRecentHouseVotes(): Promise<HouseVoteSummary[]> {
  const all: HouseVoteSummary[] = [];
  for (const session of [2, 1]) {
    let offset = 0;
    for (let page = 0; page < MAX_VOTE_PAGES; page += 1) {
      const { votes, nextOffset } = await fetchHouseVoteList(TARGET_CONGRESS, session, PAGE_SIZE, offset);
      all.push(...votes);
      if (nextOffset == null || votes.length === 0) break;
      offset = nextOffset;
      await sleep(120);
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
  asOf: string,
): Promise<Map<string, VoteRecord[]>> {
  const collected = new Map<string, VoteRecord[]>();
  for (const id of allBioguides) collected.set(id, []);

  if (!isCongressConfigured()) {
    console.warn('CONGRESS_API_KEY not configured — skipping House vote scan.');
    return collected;
  }

  const voteList = await collectRecentHouseVotes();
  console.log(`  ${voteList.length} House roll calls loaded`);

  let partyMap = new Map<string, string>();
  try {
    partyMap = await fetchBioguidePartyMap();
  } catch {
    console.warn('  party map unavailable — omitting party breakdown');
  }

  const billSummaryCache = new Map<string, string | undefined>();

  for (const vote of voteList) {
    const pending = [...allBioguides].filter((id) => (collected.get(id)?.length ?? 0) < VOTES_PER_MEMBER);
    if (pending.length === 0) break;

    try {
      const members = await fetchHouseVoteMembers(vote.congress, vote.sessionNumber, vote.rollCallNumber);
      const houseMembers = members.results?.filter((m) => allBioguides.has(m.bioguideId)) ?? [];
      if (houseMembers.length === 0) {
        await sleep(120);
        continue;
      }

      let billSummary: string | undefined;
      if (vote.legislationType && vote.legislationNumber) {
        const key = `${vote.congress}-${vote.legislationType}-${vote.legislationNumber}`;
        billSummary = billSummaryCache.get(key);
        if (billSummary === undefined) {
          billSummary = await fetchBillSummary(vote.congress, vote.legislationType, vote.legislationNumber);
          billSummaryCache.set(key, billSummary);
          await sleep(80);
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
        list.push(
          toHouseVoteRecord(
            m.bioguideId,
            vote,
            normalizeVoteChoice(m.voteCast),
            members.voteQuestion,
            { billSummary, partyBreakdown: breakdown },
          ),
        );
        collected.set(m.bioguideId, list);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  skip House ${vote.rollCallNumber}: ${msg}`);
    }
    await sleep(150);
  }

  return collected;
}

async function syncSenateVotes(
  senators: LegislatorRow[],
  asOf: string,
): Promise<Map<string, VoteRecord[]>> {
  const collected = new Map<string, VoteRecord[]>();
  for (const s of senators) collected.set(s.bioguideId, []);

  const lisMap = await fetchLisToBioguideMap();
  const bioguideToLis = new Map<string, string>();
  for (const [lis, bioguide] of lisMap) {
    if (collected.has(bioguide)) bioguideToLis.set(bioguide, lis);
  }

  const menu = (await fetchSenateVoteMenu(TARGET_CONGRESS, 2)).sort((a, b) => b.voteNumber - a.voteNumber);

  for (const item of menu) {
    const pending = senators.filter((s) => (collected.get(s.bioguideId)?.length ?? 0) < VOTES_PER_MEMBER);
    if (pending.length === 0) break;

    try {
      const roll = await fetchSenateRollCall(TARGET_CONGRESS, 2, item.voteNumber);
      for (const sen of senators) {
        const lis = bioguideToLis.get(sen.bioguideId);
        if (!lis) continue;
        const memberVote = roll.members.find((m) => m.lisMemberId === lis);
        if (!memberVote) continue;
        const list = collected.get(sen.bioguideId) ?? [];
        if (list.length >= VOTES_PER_MEMBER) continue;
        list.push(senateVoteToRecord(sen.bioguideId, roll, memberVote.voteCast));
        collected.set(sen.bioguideId, list);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  skip Senate vote ${item.voteNumber}: ${msg}`);
    }
    await sleep(120);
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

function preserveExistingHouseVotes(
  houseVotes: Map<string, VoteRecord[]>,
  houseMembers: LegislatorRow[],
  existing: ExistingNationalVotesSnapshot | null,
): number {
  if (!existing?.byBioguideId) return 0;

  let retained = 0;
  for (const leg of houseMembers) {
    const prior = existing.byBioguideId[leg.bioguideId];
    if (prior?.chamber === 'house' && (prior.votes?.length ?? 0) > 0) {
      houseVotes.set(leg.bioguideId, prior.votes ?? []);
      retained += 1;
    }
  }
  return retained;
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  const legislators = legislatorsRaw.legislators.filter(
    (l) => l.chamber === 'senate' || l.chamber === 'house',
  );
  const allBioguides = new Set(legislators.map((l) => l.bioguideId));
  const senators = legislators.filter((l) => l.chamber === 'senate');
  const houseMembers = legislators.filter((l) => l.chamber === 'house');

  console.log(`National vote sync: ${legislators.length} members (${senators.length} Senate)`);

  const houseVotes = await syncHouseVotes(allBioguides, asOf);
  if (!isCongressConfigured()) {
    const retained = preserveExistingHouseVotes(houseVotes, houseMembers, await readExistingVoteSnapshot());
    if (retained > 0) {
      console.log(`  retained ${retained} House member vote lists from existing congress-votes.json`);
    }
  }
  const senateVotes = await syncSenateVotes(senators, asOf);

  const failures: Array<{ bioguideId: string; name: string; reason: string }> = [];
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

  for (const leg of legislators) {
    const house = houseVotes.get(leg.bioguideId) ?? [];
    const senate = senateVotes.get(leg.bioguideId) ?? [];
    const votes = [...house, ...senate].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (votes.length === 0) {
      failures.push({ bioguideId: leg.bioguideId, name: leg.name, reason: 'no roll-call positions in scan window' });
    }
    byBioguideId[leg.bioguideId] = {
      bioguideId: leg.bioguideId,
      name: leg.name,
      chamber: leg.chamber,
      votes,
      source: leg.chamber === 'senate' ? SENATE_GOV_SOURCE : CONGRESS_GOV_SOURCE,
      asOf,
    };
  }

  const withVotes = legislators.filter((l) => (byBioguideId[l.bioguideId]?.votes.length ?? 0) > 0).length;
  const totalVotes = legislators.reduce((s, l) => s + (byBioguideId[l.bioguideId]?.votes.length ?? 0), 0);

  const snapshot = {
    meta: {
      source: CONGRESS_GOV_SOURCE,
      asOf,
      fetchedAt,
      membersQueried: legislators.length,
      withVoteData: withVotes,
      totalVotePositions: totalVotes,
      failureCount: failures.length,
      keyConfigured: isCongressConfigured(),
      datasetUrl: 'https://www.congress.gov',
      note: `Up to ${VOTES_PER_MEMBER} recent positions per chamber. House via Congress.gov when keyed; Senate via senate.gov LIS XML.`,
    },
    byBioguideId,
    failures,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`  members with votes: ${withVotes}/${legislators.length}`);
  console.log(`  total vote positions: ${totalVotes}`);
  console.log(`  failures: ${failures.length}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
