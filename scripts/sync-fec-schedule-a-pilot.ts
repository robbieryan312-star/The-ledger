/**
 * Phase 17 pilot — committee-scoped Schedule A for S000033 (Bernie Sanders).
 * Output: data/fec/pilot/S000033-schedule-a.json
 *
 * Run: npm run sync:fec-schedule-a-pilot
 */
import { config } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEC_SOURCE,
  fetchCandidateCommittees,
  fetchScheduleAContributorsForCommittees,
  isFecConfigured,
} from '../lib/data/fecClient';
import { aggregateScheduleAOrgs } from '../lib/data/fecOrgRegistry';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(projectRoot, 'data', 'fec', 'pilot', 'S000033-schedule-a.json');
const PILOT_BIOGUIDE = 'S000033';
const PILOT_FEC_CANDIDATE = 'S4VT00033';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function currentTwoYearTransactionPeriod(asOf: string): string {
  const year = new Date(`${asOf}T00:00:00Z`).getUTCFullYear();
  return String(year % 2 === 0 ? year : year + 1);
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  if (!isFecConfigured()) {
    console.error('FEC_API_KEY missing — cannot fetch pilot Schedule A.');
    process.exit(1);
  }

  const twoYearPeriod = currentTwoYearTransactionPeriod(asOf);
  console.log(`Pilot Schedule A for ${PILOT_BIOGUIDE} (${PILOT_FEC_CANDIDATE}), period ${twoYearPeriod}…`);

  const committees = await fetchCandidateCommittees(PILOT_FEC_CANDIDATE, twoYearPeriod);
  console.log(`  authorized committees: ${committees.map((c) => c.committeeId).join(', ') || '(none)'}`);

  if (committees.length === 0) {
    console.error('No authorized candidate committees found.');
    process.exit(1);
  }

  await sleep(200);
  const committeeIds = committees.map((c) => c.committeeId);
  const contributors = await fetchScheduleAContributorsForCommittees(committeeIds, twoYearPeriod, 50);
  console.log(`  itemized receipts fetched: ${contributors.length}`);

  const aggregatedOrgs = aggregateScheduleAOrgs(contributors);
  const withTopics = aggregatedOrgs.filter((o) => o.topicIds.length > 0);
  console.log(`  orgs with topic tags: ${withTopics.length}`);

  const aggregatedByEmployer = new Map<string, { employer: string; totalAmount: number; receiptCount: number }>();
  for (const c of contributors) {
    const employer = (c.employer ?? '').trim();
    if (!employer || employer === 'SELF-EMPLOYED' || employer === 'RETIRED') continue;
    const row = aggregatedByEmployer.get(employer.toUpperCase()) ?? {
      employer,
      totalAmount: 0,
      receiptCount: 0,
    };
    row.totalAmount += c.amount;
    row.receiptCount += 1;
    aggregatedByEmployer.set(employer.toUpperCase(), row);
  }

  const snapshot = {
    meta: {
      source: FEC_SOURCE,
      asOf,
      fetchedAt,
      bioguideId: PILOT_BIOGUIDE,
      fecCandidateId: PILOT_FEC_CANDIDATE,
      queryMode: 'committee_id' as const,
      twoYearPeriod,
      note: 'Phase 17 pilot — committee-scoped Schedule A for Bernie Sanders only.',
    },
    row: {
      bioguideId: PILOT_BIOGUIDE,
      fecCandidateId: PILOT_FEC_CANDIDATE,
      committeeIds,
      contributors,
      aggregatedOrgs: withTopics,
      aggregatedByEmployer: [...aggregatedByEmployer.values()].sort((a, b) => b.totalAmount - a.totalAmount),
      source: FEC_SOURCE,
      asOf,
      fecUrl: `https://www.fec.gov/data/candidate/${PILOT_FEC_CANDIDATE}/`,
    },
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`Top orgs: ${withTopics.slice(0, 5).map((o) => `${o.orgName} ($${o.totalAmount.toLocaleString()})`).join('; ')}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
