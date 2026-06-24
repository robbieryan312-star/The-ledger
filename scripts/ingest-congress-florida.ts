/**
 * Ingest Florida congressional roll-call votes for all current FL federal members.
 * Output: data/congress/florida-votes.json
 *
 * House: Congress.gov API v3 (CONGRESS_API_KEY)
 * Senate: senate.gov LIS XML (no key)
 */
import {
  loadEnvLocal,
  loadFloridaLegislators,
  sleep,
  writeFloridaSnapshot,
} from './lib/ingest-utils';
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

const TARGET_CONGRESS = 119;
const VOTES_PER_MEMBER = 8;
const MAX_VOTE_PAGES = 4;
const PAGE_SIZE = 50;

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

async function syncFloridaHouseVotes(
  flBioguides: Set<string>,
  asOf: string,
): Promise<Map<string, VoteRecord[]>> {
  const collected = new Map<string, VoteRecord[]>();
  for (const id of flBioguides) collected.set(id, []);

  if (!isCongressConfigured()) {
    console.warn('CONGRESS_API_KEY missing — skipping House votes');
    return collected;
  }

  const partyMap = await fetchBioguidePartyMap();
  let offset = 0;
  let pages = 0;

  while (pages < MAX_VOTE_PAGES) {
    const { votes, nextOffset } = await fetchHouseVoteList(TARGET_CONGRESS, 1, PAGE_SIZE, offset);
    if (votes.length === 0) break;

    console.log(`  House page offset ${offset}: scanning ${votes.length} roll calls`);

    for (const vote of votes) {
      const allFull = [...flBioguides].every(
        (id) => (collected.get(id)?.length ?? 0) >= VOTES_PER_MEMBER,
      );
      if (allFull) break;

      try {
        const members = await fetchHouseVoteMembers(
          vote.congress,
          vote.sessionNumber,
          vote.rollCallNumber,
        );
        const flMembers = members.results?.filter((m) => flBioguides.has(m.bioguideId)) ?? [];
        if (flMembers.length === 0) {
          await sleep(120);
          continue;
        }

        let billSummary: string | undefined;
        if (vote.legislationType && vote.legislationNumber) {
          billSummary = await fetchBillSummary(
            vote.congress,
            vote.legislationType,
            vote.legislationNumber,
          );
        }

        const breakdown = computePartyBreakdown(
          (members.results ?? []).map((m) => ({
            party: partyMap.get(m.bioguideId) ?? 'I',
            voteCast: normalizeVoteChoice(m.voteCast),
          })),
        );

        for (const m of flMembers) {
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

    const allFull = [...flBioguides].every(
      (id) => (collected.get(id)?.length ?? 0) >= VOTES_PER_MEMBER,
    );
    if (allFull || nextOffset === undefined) break;
    offset = nextOffset;
    pages += 1;
  }

  return collected;
}

async function syncFloridaSenateVotes(
  flSenators: Array<{ bioguideId: string; name: string }>,
  asOf: string,
): Promise<Map<string, VoteRecord[]>> {
  const collected = new Map<string, VoteRecord[]>();
  const lisMap = await fetchLisToBioguideMap();
  const bioguideToLis = new Map<string, string>();
  for (const [lis, bio] of lisMap) bioguideToLis.set(bio, lis);

  for (const sen of flSenators) {
    collected.set(sen.bioguideId, []);
  }

  const menu = await fetchSenateVoteMenu(TARGET_CONGRESS, 1);
  const recent = menu.slice(0, 80);

  for (const item of recent) {
    const allFull = flSenators.every(
      (s) => (collected.get(s.bioguideId)?.length ?? 0) >= VOTES_PER_MEMBER,
    );
    if (allFull) break;

    try {
      const roll = await fetchSenateRollCall(TARGET_CONGRESS, 1, item.voteNumber);
      for (const sen of flSenators) {
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

async function main(): Promise<void> {
  await loadEnvLocal();
  const asOf = new Date().toISOString().slice(0, 10);
  const legislators = await loadFloridaLegislators();
  const houseReps = legislators.filter((l) => l.chamber === 'house');
  const senators = legislators.filter((l) => l.chamber === 'senate');
  const flBioguides = new Set(legislators.map((l) => l.bioguideId));

  console.log(`Florida federal members: ${legislators.length} (${senators.length} Senate, ${houseReps.length} House)`);

  const houseVotes = await syncFloridaHouseVotes(flBioguides, asOf);
  const senateVotes = await syncFloridaSenateVotes(senators, asOf);

  const records = legislators.map((leg) => {
    const house = houseVotes.get(leg.bioguideId) ?? [];
    const senate = senateVotes.get(leg.bioguideId) ?? [];
    const votes = [...house, ...senate].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return {
      bioguideId: leg.bioguideId,
      name: leg.name,
      chamber: leg.chamber,
      party: leg.party,
      office: leg.office,
      voteCount: votes.length,
      votes,
      source: leg.chamber === 'senate' ? SENATE_GOV_SOURCE : CONGRESS_GOV_SOURCE,
      asOf,
      congressGovUrl: 'https://www.congress.gov',
    };
  });

  const totalVotes = records.reduce((s, r) => s + r.voteCount, 0);
  const withVotes = records.filter((r) => r.voteCount > 0).length;

  const out = await writeFloridaSnapshot('congress', 'florida-votes.json', {
    meta: {
      source: CONGRESS_GOV_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: true,
      note: `${withVotes}/${records.length} FL federal members with roll-call records; ${totalVotes} total vote positions (up to ${VOTES_PER_MEMBER} per chamber). House via Congress.gov API; Senate via senate.gov LIS.`,
    },
    records,
  });

  console.log(`Wrote ${out}`);
  console.log(`  members with votes: ${withVotes}/${records.length}`);
  console.log(`  total vote positions: ${totalVotes}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
