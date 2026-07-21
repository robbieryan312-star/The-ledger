/**
 * Refresh migrated profile votes.json (+ finance, orgVoteLinks, manifest) from national snapshots.
 * No sync — reads committed data/national/votes and data/national/fec only.
 *
 * Run: npx tsx scripts/refresh-migrated-profile-votes.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIGRATED_PROFILE_BIOGUIDES } from '../lib/data/memberProfile';
import { getPoliticianByBioguide } from '../lib/data/allPoliticians';
import { getNationalCongressVotesByBioguide } from '../lib/data/nationalCongressVotes';
import { getNationalFecFinanceByBioguide } from '../lib/data/nationalFecFinance';
import { getScheduleAForBioguide } from '../lib/data/fecScheduleA';
import { buildOrgVoteTopicLinks } from '../lib/data/buildOrgVoteTopicLinks';
import type { VoteRecord } from '../lib/types';
import { preserveExistingFinanceIfFreshMissing, preserveExistingVotesIfFreshShallower } from './lib/profileMigrate';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');

const S000033_ORG_VOTE_LINKS_NOTE =
  'Pilot Schedule A (committee C00411330, two-year 2026) contains only individual itemized contributors in LAST, FIRST form. After individual-donor exclusion and curated-org-only matching, no org/PAC rows qualify for org→topic→vote joins — an honest gap, not an undiagnosed empty.';

type ExistingVotesPayload = {
  votes?: VoteRecord[];
  chamber?: string;
  asOf?: string;
  source?: string;
};

type ExistingFinancePayload = {
  entry?: unknown;
};

async function refreshOne(bioguideId: string): Promise<void> {
  const politician = getPoliticianByBioguide(bioguideId);
  const politicianId = politician?.id ?? bioguideId;
  const profileDir = path.join(profilesRoot, bioguideId);

  const nationalVotes = getNationalCongressVotesByBioguide(bioguideId, politicianId);
  const nationalFec = getNationalFecFinanceByBioguide(bioguideId);
  let existingVotesPayload: ExistingVotesPayload | null = null;
  let existingFinancePayload: ExistingFinancePayload | null = null;
  try {
    existingVotesPayload = JSON.parse(await readFile(path.join(profileDir, 'votes.json'), 'utf8')) as ExistingVotesPayload;
  } catch {
    /* no prior votes.json */
  }
  try {
    existingFinancePayload = JSON.parse(await readFile(path.join(profileDir, 'finance.json'), 'utf8')) as ExistingFinancePayload;
  } catch {
    /* no prior finance.json */
  }

  const freshVotes = nationalVotes?.votes ?? [];
  const votes = preserveExistingVotesIfFreshShallower(freshVotes, existingVotesPayload);
  const preservedExistingVotes = (existingVotesPayload?.votes?.length ?? 0) > freshVotes.length;
  const financeEntry = preserveExistingFinanceIfFreshMissing(nationalFec ?? null, existingFinancePayload);

  const votesPayload =
    votes.length > 0
      ? {
          bioguideId,
          politicianId,
          chamber: preservedExistingVotes ? existingVotesPayload?.chamber : nationalVotes?.chamber,
          votes,
          asOf: preservedExistingVotes ? existingVotesPayload?.asOf : nationalVotes?.asOf,
          source: preservedExistingVotes ? existingVotesPayload?.source : nationalVotes?.source,
        }
      : {
          bioguideId,
          politicianId,
          votes: [] as never[],
          asOf: new Date().toISOString().slice(0, 10),
          status: 'unavailable' as const,
          note: 'Member absent from data/national/votes/congress-votes.json — not a verified no-votes record',
        };

  await writeFile(path.join(profileDir, 'votes.json'), JSON.stringify(votesPayload, null, 2) + '\n');

  await writeFile(
    path.join(profileDir, 'finance.json'),
    JSON.stringify({ bioguideId, entry: financeEntry }, null, 2) + '\n',
  );

  const scheduleRow = getScheduleAForBioguide(bioguideId);
  const orgLinks = scheduleRow && votes.length > 0 ? buildOrgVoteTopicLinks(scheduleRow, votes) : [];
  const orgVotePayload: { bioguideId: string; links: typeof orgLinks; note?: string } = {
    bioguideId,
    links: orgLinks,
  };
  if (bioguideId === 'S000033' && orgLinks.length === 0) {
    orgVotePayload.note = S000033_ORG_VOTE_LINKS_NOTE;
  }
  await writeFile(
    path.join(profileDir, 'orgVoteLinks.json'),
    JSON.stringify(orgVotePayload, null, 2) + '\n',
  );

  const manifestPath = path.join(profileDir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    categories: Record<string, string>;
  };

  manifest.categories.votes =
    votes.length > 0 ? 'filled' : votesPayload.status === 'unavailable' ? 'honest-gap' : 'honest-gap';
  manifest.categories.finance = financeEntry ? 'filled' : 'honest-gap';
  manifest.categories.orgVoteLinks = orgLinks.length > 0 ? 'filled' : 'honest-gap';

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(
    `${bioguideId}: votes=${votes.length} finance=${nationalFec ? 'yes' : 'gap'} orgVoteLinks=${orgLinks.length}`,
  );
}

async function main(): Promise<void> {
  for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
    await refreshOne(bioguideId);
  }
}

main();
