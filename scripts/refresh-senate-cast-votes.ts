/**
 * Deep-scan senate.gov roll calls for senators whose recent window is all Not Voting,
 * then refresh profile votes.json from the updated national snapshot.
 *
 * Run: npx tsx scripts/refresh-senate-cast-votes.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VoteRecord } from '../lib/types';
import {
  fetchLisToBioguideMap,
  fetchSenateRollCall,
  fetchSenateVoteMenu,
  senateVoteToRecord,
} from '../lib/data/senateVotesClient';
import { MIGRATED_PROFILE_BIOGUIDES } from '../lib/data/memberProfile';
import { getPoliticianByBioguide } from '../lib/data/allPoliticians';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NATIONAL_FILE = path.join(projectRoot, 'data/national/votes/congress-votes.json');
const PROFILES_ROOT = path.join(projectRoot, 'lib/data/generated/profiles');
const TARGET_CONGRESS = 119;
const COLLECT_LIMIT = 45;
const DISPLAY_LIMIT = 10;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function finalizeMemberVotes(candidates: VoteRecord[], targetCount: number): VoteRecord[] {
  const sorted = [...candidates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const cast = sorted.filter((v) => v.vote === 'Yea' || v.vote === 'Nay');
  const absent = sorted.filter((v) => v.vote !== 'Yea' && v.vote !== 'Nay');
  if (cast.length === 0) return sorted.slice(0, targetCount);
  const out = cast.slice(0, targetCount);
  if (out.length < targetCount) out.push(...absent.slice(0, targetCount - out.length));
  return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function deepScanSenator(bioguideId: string, lisId: string): Promise<VoteRecord[]> {
  const menu = (await fetchSenateVoteMenu(TARGET_CONGRESS, 2)).sort(
    (a, b) => b.voteNumber - a.voteNumber,
  );
  const collected: VoteRecord[] = [];
  for (const item of menu) {
    if (collected.length >= COLLECT_LIMIT) break;
    try {
      const roll = await fetchSenateRollCall(TARGET_CONGRESS, 2, item.voteNumber);
      const memberVote = roll.members.find((m) => m.lisMemberId === lisId);
      if (!memberVote) continue;
      collected.push(senateVoteToRecord(bioguideId, roll, memberVote.voteCast));
    } catch {
      /* skip */
    }
    await sleep(100);
  }
  return finalizeMemberVotes(collected, DISPLAY_LIMIT);
}

async function main(): Promise<void> {
  const snapshot = JSON.parse(await readFile(NATIONAL_FILE, 'utf8')) as {
    byBioguideId: Record<string, { bioguideId: string; chamber: string; votes: VoteRecord[]; asOf: string; source: unknown }>;
    meta: Record<string, unknown>;
  };

  const lisMap = await fetchLisToBioguideMap();
  const bioguideToLis = new Map<string, string>();
  for (const [lis, bio] of lisMap) bioguideToLis.set(bio, lis);

  for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
    const row = snapshot.byBioguideId[bioguideId];
    if (!row || row.chamber !== 'senate') continue;
    const cast = row.votes.filter((v) => v.vote === 'Yea' || v.vote === 'Nay').length;
    if (cast > 0) {
      row.votes = finalizeMemberVotes(row.votes, DISPLAY_LIMIT);
      console.log(`${bioguideId}: already has ${cast} cast votes — finalized to ${row.votes.length}`);
      continue;
    }
    const lis = bioguideToLis.get(bioguideId);
    if (!lis) {
      console.warn(`${bioguideId}: no LIS id`);
      continue;
    }
    const votes = await deepScanSenator(bioguideId, lis);
    row.votes = votes;
    row.asOf = new Date().toISOString().slice(0, 10);
    const newCast = votes.filter((v) => v.vote === 'Yea' || v.vote === 'Nay').length;
    console.log(`${bioguideId}: deep scan → ${votes.length} votes (${newCast} Yea/Nay)`);

    const politicianId = getPoliticianByBioguide(bioguideId)?.id ?? bioguideId;
    const profileDir = path.join(PROFILES_ROOT, bioguideId);
    await writeFile(
      path.join(profileDir, 'votes.json'),
      JSON.stringify(
        {
          bioguideId,
          politicianId,
          chamber: 'senate',
          votes,
          asOf: row.asOf,
          source: row.source,
        },
        null,
        2,
      ) + '\n',
    );
  }

  snapshot.meta = {
    ...snapshot.meta,
    asOf: new Date().toISOString().slice(0, 10),
    note: 'Senate cast-vote refresh for migrated profiles with all-Not-Voting recent windows.',
  };
  await writeFile(NATIONAL_FILE, JSON.stringify(snapshot, null, 2) + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
