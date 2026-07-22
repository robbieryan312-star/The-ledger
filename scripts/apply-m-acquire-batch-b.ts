/**
 * apply-m-acquire-batch-b.ts — S000033 Money & ideology profile apply.
 * Refreshes finance + orgVoteLinks from national FEC/Schedule A; does not wipe other categories.
 *
 * Run: npx tsx scripts/apply-m-acquire-batch-b.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPoliticianByBioguide } from '../lib/data/allPoliticians';
import { getNationalFecFinanceByBioguide } from '../lib/data/nationalFecFinance';
import { getScheduleAForBioguide } from '../lib/data/fecScheduleA';
import { getNationalCongressVotesByBioguide } from '../lib/data/nationalCongressVotes';
import { buildOrgVoteTopicLinks } from '../lib/data/buildOrgVoteTopicLinks';
import { aggregateScheduleAOrgs, isConduitScheduleAContributor, isIndividualScheduleAContributor } from '../lib/data/fecOrgRegistry';
import { syncProfileManifestFromDisk } from './lib/profileManifestSync';

const BIOGUIDE = 'S000033';
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profileDir = path.join(projectRoot, 'lib/data/generated/profiles', BIOGUIDE);

async function main(): Promise<void> {
  const politician = getPoliticianByBioguide(BIOGUIDE);
  const politicianId = politician?.id ?? 'bernie-sanders';
  const nationalFec = getNationalFecFinanceByBioguide(BIOGUIDE);
  const scheduleRow = getScheduleAForBioguide(BIOGUIDE);
  const nationalVotes = getNationalCongressVotesByBioguide(BIOGUIDE, politicianId);
  const votes = nationalVotes?.votes ?? [];

  await writeFile(
    path.join(profileDir, 'finance.json'),
    `${JSON.stringify({ bioguideId: BIOGUIDE, entry: nationalFec ?? null }, null, 2)}\n`,
  );

  const contributors = scheduleRow?.contributors ?? [];
  const individualCount = contributors.filter((c) => isIndividualScheduleAContributor(c)).length;
  const conduitCount = contributors.filter((c) => isConduitScheduleAContributor(c)).length;
  const orgAggregates = aggregateScheduleAOrgs(contributors);
  const links =
    scheduleRow && votes.length > 0 ? buildOrgVoteTopicLinks(scheduleRow, votes) : [];

  let note: string | undefined;
  if (links.length === 0) {
    if (!scheduleRow) {
      note =
        'No Schedule A row for S000033 in data/national/fec/schedule-a.json after scoped sync — not a verified no-donor record.';
    } else if (orgAggregates.length === 0) {
      note =
        `Full-depth Schedule A for committee(s) ${(scheduleRow.committeeIds ?? []).join(', ') || 'n/a'} ` +
        `(${contributors.length} itemized receipts; ${individualCount} individual LAST, FIRST; ` +
        `${conduitCount} conduit/earmark processor rows e.g. ActBlue; ` +
        `${contributors.length - individualCount - conduitCount} other non-individual rows). ` +
        `After excluding individuals + conduits and curated-org-only matching (fecOrgRegistry), ` +
        `0 PAC/org rows qualify for org→topic→vote joins — diagnosed small-donor / conduit-heavy profile, not an undiagnosed empty.`;
    } else {
      note =
        `Schedule A has ${orgAggregates.length} curated org aggregate(s) but none subject-overlap a roll-call topic in the current vote corpus — honest gap for joins, not missing Schedule A.`;
    }
  }

  const orgPayload: {
    bioguideId: string;
    links: typeof links;
    status?: string;
    note?: string;
    diagnostics?: Record<string, unknown>;
  } = {
    bioguideId: BIOGUIDE,
    links,
    diagnostics: {
      scheduleAContributors: contributors.length,
      individualContributors: individualCount,
      conduitContributors: conduitCount,
      nonIndividualContributors: contributors.length - individualCount,
      curatedOrgAggregates: orgAggregates.length,
      votesAvailable: votes.length,
      scheduleAAsOf: scheduleRow?.asOf ?? null,
      queryNote: (scheduleRow as { queryNote?: string } | undefined)?.queryNote ?? null,
      scheduleACapHit: contributors.length >= 5000,
    },
  };
  if (links.length === 0) {
    orgPayload.status = 'honest-gap';
    if (note) orgPayload.note = note;
  }

  await writeFile(path.join(profileDir, 'orgVoteLinks.json'), `${JSON.stringify(orgPayload, null, 2)}\n`);
  await syncProfileManifestFromDisk(BIOGUIDE);

  console.log(
    `${BIOGUIDE}: finance=${nationalFec ? 'yes' : 'gap'} receipts=${nationalFec?.receipts ?? 'n/a'} ` +
      `schedA=${contributors.length} orgs=${orgAggregates.length} orgVoteLinks=${links.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
