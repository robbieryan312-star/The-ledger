/**
 * sync-fec-schedule-a.ts — Schedule A itemized donors for Congress members with FEC IDs.
 * Output: data/fec/national/schedule-a.json
 */
import { config } from 'dotenv';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEC_SOURCE,
  fetchCandidateCommittees,
  fetchScheduleAContributorsForCommittees,
  isFecConfigured,
} from '../lib/data/fecClient';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEC_NATIONAL = path.join(projectRoot, 'data', 'fec', 'national', 'congress-finance.json');
const OUT_FILE = path.join(projectRoot, 'data', 'fec', 'national', 'schedule-a.json');

interface ExistingScheduleASnapshot {
  meta?: { membersWithScheduleA?: number; queryMode?: string };
  byBioguideId?: Record<string, { contributors?: unknown[] }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function currentTwoYearTransactionPeriod(asOf: string): string {
  const year = new Date(`${asOf}T00:00:00Z`).getUTCFullYear();
  return String(year % 2 === 0 ? year : year + 1);
}

async function countExistingCommitteeScopedRows(): Promise<number> {
  try {
    const existing = JSON.parse(await readFile(OUT_FILE, 'utf8')) as ExistingScheduleASnapshot;
    if (existing.meta?.queryMode !== 'committee_id') return 0;
    const rowCount = Object.values(existing.byBioguideId ?? {}).filter(
      (row) => (row.contributors?.length ?? 0) > 0,
    ).length;
    return Math.max(existing.meta?.membersWithScheduleA ?? 0, rowCount);
  } catch {
    return 0;
  }
}

async function writeEmptySnapshot(asOf: string, fetchedAt: string, note: string): Promise<void> {
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(
    OUT_FILE,
    JSON.stringify(
      {
        meta: {
          source: FEC_SOURCE,
          asOf,
          fetchedAt,
          membersWithScheduleA: 0,
          failureCount: 0,
          keyConfigured: false,
          queryMode: 'committee_id',
          datasetUrl: 'https://api.open.fec.gov/v1/schedules/schedule_a/',
          note,
        },
        byBioguideId: {},
        failures: [],
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  if (!isFecConfigured()) {
    const existingCount = await countExistingCommitteeScopedRows();
    if (existingCount > 0) {
      console.warn(
        'FEC_API_KEY missing — keeping existing committee-scoped schedule-a.json snapshot ' +
          `(${existingCount} member records). Set FEC_API_KEY in .env.local to refresh.`,
      );
      return;
    }

    console.warn('FEC_API_KEY missing — writing empty committee-scoped schedule-a snapshot.');
    await writeEmptySnapshot(
      asOf,
      fetchedAt,
      'No committee-scoped Schedule A records on file. Set FEC_API_KEY and re-run npm run sync:fec-schedule-a to refresh.',
    );
    return;
  }

  const fecNational = JSON.parse(await readFile(FEC_NATIONAL, 'utf8')) as {
    byBioguideId: Record<string, { fecCandidateId: string; name?: string }>;
  };

  const entries = Object.entries(fecNational.byBioguideId);
  const twoYearPeriod = currentTwoYearTransactionPeriod(asOf);
  console.log(`Fetching committee-scoped Schedule A for ${entries.length} members (${twoYearPeriod} period)…`);

  const byBioguideId: Record<string, unknown> = {};
  const failures: Array<{ bioguideId: string; reason: string }> = [];

  for (const [bioguideId, row] of entries) {
    try {
      const committees = await fetchCandidateCommittees(row.fecCandidateId, twoYearPeriod);
      if (committees.length === 0) {
        failures.push({ bioguideId, reason: 'no authorized candidate committees found' });
        await sleep(150);
        continue;
      }

      const committeeIds = committees.map((c) => c.committeeId);
      const contributors = await fetchScheduleAContributorsForCommittees(committeeIds, twoYearPeriod, 15);
      if (contributors.length === 0) {
        failures.push({ bioguideId, reason: 'no itemized receipts found for authorized committees' });
        await sleep(150);
        continue;
      }

      byBioguideId[bioguideId] = {
        bioguideId,
        fecCandidateId: row.fecCandidateId,
        committeeIds,
        contributors,
        source: FEC_SOURCE,
        asOf,
        fecUrl: `https://www.fec.gov/data/candidate/${row.fecCandidateId}/`,
      };
    } catch (err) {
      failures.push({
        bioguideId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
    await sleep(150);
  }

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(
    OUT_FILE,
    JSON.stringify(
      {
        meta: {
          source: FEC_SOURCE,
          asOf,
          fetchedAt,
          membersWithScheduleA: Object.keys(byBioguideId).length,
          failureCount: failures.length,
          keyConfigured: true,
          queryMode: 'committee_id',
          twoYearTransactionPeriod: twoYearPeriod,
          datasetUrl: 'https://api.open.fec.gov/v1/schedules/schedule_a/',
          note:
            'Committee-scoped itemized receipts (Schedule A) from authorized candidate committees. Tier 1 official FEC records.',
        },
        byBioguideId,
        failures,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  console.log(`Wrote ${OUT_FILE} — ${Object.keys(byBioguideId).length} members, ${failures.length} failures`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
