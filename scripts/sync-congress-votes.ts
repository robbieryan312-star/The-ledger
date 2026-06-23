/**
 * sync-congress-votes.ts
 *
 * Fetches recent House roll-call vote positions from the Congress.gov API v3 for
 * featured profiles with bioguide IDs and writes lib/data/generated/congressVotes.json.
 *
 * Requires CONGRESS_API_KEY in .env.local (free at api.data.gov).
 * Gracefully exits with an empty snapshot when the key is missing.
 *
 * House: Congress.gov API v3 (requires CONGRESS_API_KEY).
 * Senate: official senate.gov LIS XML roll calls (no key) — mapped via
 * unitedstates/congress-legislators LIS IDs.
 *
 * Run with: npm run sync:votes
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockPoliticians } from '../lib/data/mockPoliticians';
import type { Politician, Source, VoteChoice, VoteRecord } from '../lib/types';
import {
  CONGRESS_GOV_SOURCE,
  fetchHouseVoteList,
  fetchHouseVoteMembers,
  formatBillId,
  houseVoteCongressUrl,
  isCongressConfigured,
  normalizeVoteChoice,
  policyCategoryFromQuestion,
  voteResultLabel,
  type HouseVoteSummary,
} from '../lib/data/congressClient';
import type { CongressVoteEntry } from '../lib/data/congressVotes';
import {
  SENATE_GOV_SOURCE,
  fetchLisToBioguideMap,
  fetchSenateRollCall,
  fetchSenateVoteMenu,
  senateVoteToRecord,
} from '../lib/data/senateVotesClient';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'congressVotes.json');

const TARGET_CONGRESS = 119;
const VOTES_PER_MEMBER = 12;
const MAX_VOTE_PAGES = 8;
const PAGE_SIZE = 50;

async function loadEnvLocalAsync(): Promise<void> {
  const envPath = path.join(projectRoot, '.env.local');
  try {
    const content = await readFile(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local optional — key may be set in the environment already.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isoDate(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function voteTitle(vote: HouseVoteSummary, question?: string): string {
  if (question && question !== 'On Passage') {
    return question;
  }
  const bill = formatBillId(vote.legislationType, vote.legislationNumber);
  if (bill !== 'Roll Call Vote') return bill;
  return question ?? `House Roll Call ${vote.rollCallNumber}`;
}

function toVoteRecord(
  politicianId: string,
  vote: HouseVoteSummary,
  position: VoteChoice,
  question: string | undefined,
): VoteRecord {
  const billId = formatBillId(vote.legislationType, vote.legislationNumber);
  const title = voteTitle(vote, question);
  const url = houseVoteCongressUrl(vote);
  const source: Source = {
    ...CONGRESS_GOV_SOURCE,
    url,
    date: isoDate(vote.startDate),
  };

  return {
    id: `${politicianId}-${vote.congress}-${vote.sessionNumber}-${vote.rollCallNumber}`,
    billId,
    billTitle: title,
    billDescription: question
      ? `${question}${billId !== 'Roll Call Vote' ? ` — ${billId}` : ''}. Official House roll-call record from Congress.gov (119th Congress).`
      : `Official House roll-call vote ${vote.rollCallNumber}, ${vote.congress}th Congress, session ${vote.sessionNumber}.`,
    date: isoDate(vote.startDate),
    vote: position,
    result: voteResultLabel(vote.result),
    category: policyCategoryFromQuestion(question, vote.legislationType),
    source,
  };
}

async function collectRecentHouseVotes(): Promise<HouseVoteSummary[]> {
  const all: HouseVoteSummary[] = [];
  const sessions = [2, 1];

  for (const session of sessions) {
    let offset = 0;
    for (let page = 0; page < MAX_VOTE_PAGES; page += 1) {
      const { votes, nextOffset } = await fetchHouseVoteList(
        TARGET_CONGRESS,
        session,
        PAGE_SIZE,
        offset,
      );
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

async function syncSenateVotes(
  senateTargets: Array<Politician & { bioguideId: string }>,
  asOf: string,
): Promise<{ byPoliticianId: Record<string, CongressVoteEntry>; withData: number; votesScanned: number }> {
  const byPoliticianId: Record<string, CongressVoteEntry> = {};
  const collected = new Map<string, VoteRecord[]>();
  for (const p of senateTargets) collected.set(p.id, []);

  if (senateTargets.length === 0) {
    return { byPoliticianId, withData: 0, votesScanned: 0 };
  }

  console.log(`  Fetching Senate roll calls from senate.gov for ${senateTargets.length} featured senators...`);
  const lisMap = await fetchLisToBioguideMap();
  const bioguideToPolitician = new Map(senateTargets.map((p) => [p.bioguideId, p.id]));
  const lisToPolitician = new Map<string, string>();
  for (const [lis, bioguide] of lisMap) {
    const politicianId = bioguideToPolitician.get(bioguide);
    if (politicianId) lisToPolitician.set(lis, politicianId);
  }

  const menu = (await fetchSenateVoteMenu(TARGET_CONGRESS, 2))
    .sort((a, b) => b.voteNumber - a.voteNumber);
  let votesScanned = 0;

  for (const item of menu) {
    const pending = senateTargets.filter(
      (p) => (collected.get(p.id)?.length ?? 0) < VOTES_PER_MEMBER,
    );
    if (pending.length === 0) break;

    try {
      const roll = await fetchSenateRollCall(TARGET_CONGRESS, 2, item.voteNumber);
      votesScanned += 1;
      for (const member of roll.members) {
        const politicianId = lisToPolitician.get(member.lisMemberId);
        if (!politicianId) continue;
        const bucket = collected.get(politicianId);
        if (!bucket || bucket.length >= VOTES_PER_MEMBER) continue;
        bucket.push(senateVoteToRecord(politicianId, roll, member.voteCast));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  skip Senate vote ${item.voteNumber}: ${msg}`);
    }
    await sleep(120);
  }

  let withData = 0;
  for (const politician of senateTargets) {
    const votes = (collected.get(politician.id) ?? []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (votes.length > 0) withData += 1;
    byPoliticianId[politician.id] = {
      politicianId: politician.id,
      bioguideId: politician.bioguideId,
      chamber: 'senate',
      votes,
      source: SENATE_GOV_SOURCE,
      asOf,
      congressGovUrl: 'https://www.senate.gov/legislative/votes_new.htm',
      note:
        votes.length > 0
          ? `${votes.length} recent Senate roll-call positions from official senate.gov LIS XML (119th Congress).`
          : 'No matching Senate roll-call positions found in scanned votes.',
    };
    console.log(`  ${politician.id}: ${votes.length} Senate votes`);
  }

  return { byPoliticianId, withData, votesScanned };
}

async function syncHouseVotes(
  houseTargets: Array<Politician & { bioguideId: string }>,
  asOf: string,
): Promise<{ byPoliticianId: Record<string, CongressVoteEntry>; withData: number; votesScanned: number }> {
  const byPoliticianId: Record<string, CongressVoteEntry> = {};
  const bioguideToPolitician = new Map(houseTargets.map((p) => [p.bioguideId, p.id]));
  const collected = new Map<string, VoteRecord[]>();
  for (const p of houseTargets) collected.set(p.id, []);

  if (houseTargets.length === 0) {
    return { byPoliticianId, withData: 0, votesScanned: 0 };
  }

  console.log(`  Fetching House roll calls from Congress.gov for ${houseTargets.length} featured House members...`);
  const voteList = await collectRecentHouseVotes();
  console.log(`  ${voteList.length} House roll calls loaded — matching member positions...`);

  let votesScanned = 0;
  for (const vote of voteList) {
    const pending = houseTargets.filter(
      (p) => (collected.get(p.id)?.length ?? 0) < VOTES_PER_MEMBER,
    );
    if (pending.length === 0) break;

    try {
      const members = await fetchHouseVoteMembers(
        vote.congress,
        vote.sessionNumber,
        vote.rollCallNumber,
      );
      votesScanned += 1;

      for (const member of members.results ?? []) {
        const politicianId = bioguideToPolitician.get(member.bioguideId);
        if (!politicianId) continue;
        const bucket = collected.get(politicianId);
        if (!bucket || bucket.length >= VOTES_PER_MEMBER) continue;

        bucket.push(
          toVoteRecord(
            politicianId,
            { ...vote, voteQuestion: members.voteQuestion },
            normalizeVoteChoice(member.voteCast),
            members.voteQuestion,
          ),
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  skip House roll call ${vote.rollCallNumber}: ${msg}`);
    }

    await sleep(150);
  }

  let withData = 0;
  for (const politician of houseTargets) {
    const votes = (collected.get(politician.id) ?? []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (votes.length > 0) withData += 1;

    byPoliticianId[politician.id] = {
      politicianId: politician.id,
      bioguideId: politician.bioguideId,
      chamber: 'house',
      votes,
      source: CONGRESS_GOV_SOURCE,
      asOf,
      congressGovUrl: 'https://www.congress.gov',
      note:
        votes.length > 0
          ? `${votes.length} recent House roll-call positions from Congress.gov API (119th Congress).`
          : 'No matching House roll-call positions found in scanned votes.',
    };
    console.log(`  ${politician.id}: ${votes.length} House votes`);
  }

  return { byPoliticianId, withData, votesScanned };
}

async function main(): Promise<void> {
  await loadEnvLocalAsync();

  const asOf = new Date().toISOString().slice(0, 10);
  const featured = mockPoliticians;
  const keyConfigured = isCongressConfigured();

  const houseTargets = featured.filter(
    (p) => p.bioguideId && p.chamber === 'house',
  ) as Array<Politician & { bioguideId: string }>;
  const senateTargets = featured.filter(
    (p) => p.bioguideId && p.chamber === 'senate',
  ) as Array<Politician & { bioguideId: string }>;

  console.log(
    `Syncing votes for ${featured.length} featured profiles (${houseTargets.length} House, ${senateTargets.length} Senate)...`,
  );

  const senateResult = await syncSenateVotes(senateTargets, asOf);

  let houseResult = { byPoliticianId: {} as Record<string, CongressVoteEntry>, withData: 0, votesScanned: 0 };
  if (!keyConfigured) {
    console.warn('CONGRESS_API_KEY not configured — skipping House Congress.gov sync (Senate still synced).');
  } else {
    try {
      houseResult = await syncHouseVotes(houseTargets, asOf);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'CONGRESS_API_KEY_INVALID') {
        console.warn('CONGRESS_API_KEY rejected by Congress.gov — Senate data retained, House skipped.');
      } else {
        throw err;
      }
    }
  }

  const byPoliticianId = { ...senateResult.byPoliticianId, ...houseResult.byPoliticianId };
  const withVoteData = senateResult.withData + houseResult.withData;

  const snapshot = {
    meta: {
      source: CONGRESS_GOV_SOURCE,
      asOf,
      featuredQueried: featured.length,
      withVoteData,
      keyConfigured,
      houseMembersQueried: houseTargets.length,
      senateMembersQueried: senateTargets.length,
      senateMembersSkipped: 0,
      note:
        'House roll-call votes from Congress.gov API v3 when CONGRESS_API_KEY is set. Senate roll-call votes from official senate.gov LIS XML (no key). Governors and profiles without bioguideId show honest missing-data labels.',
    },
    byPoliticianId,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`  as-of: ${asOf}`);
  console.log(`  Senate roll calls scanned: ${senateResult.votesScanned}`);
  console.log(`  House roll calls scanned: ${houseResult.votesScanned}`);
  console.log(`  profiles with official vote data: ${withVoteData}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
