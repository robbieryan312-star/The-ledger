/**
 * sync-fec-schedule-a.ts — Schedule A itemized donors for Congress members with FEC IDs.
 * Output: data/national/fec/schedule-a.json
 *
 * Scoped: npm run sync:fec-schedule-a -- --members S000033
 * Full-depth (org/PAC + individuals, paginated): add --full-depth
 * Full corpus: --full-corpus
 */
import { config } from 'dotenv';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  FEC_SOURCE,
  fetchCandidateCommittees,
  fetchScheduleAContributorsForCommittees,
  isFecConfigured,
} from '../lib/data/fecClient';
import {
  NATIONAL_FEC_FILE,
  NATIONAL_SCHEDULE_A_FILE,
  PROJECT_ROOT,
} from './lib/dataPaths';
import { memberInScope, requireSyncScope } from './lib/sync-scope';

const projectRoot = PROJECT_ROOT;
const FEC_NATIONAL = NATIONAL_FEC_FILE;
const OUT_FILE = NATIONAL_SCHEDULE_A_FILE;

/** Default display sample size (legacy). */
const DEFAULT_LIMIT = 15;
/** Full-depth gold-standard cap per member (paginated; includes org/PAC rows). */
const FULL_DEPTH_LIMIT = 5_000;

interface ExistingScheduleASnapshot {
  meta?: {
    membersWithScheduleA?: number;
    queryMode?: string;
    [key: string]: unknown;
  };
  byBioguideId?: Record<string, ScheduleARow>;
  failures?: Array<{ bioguideId: string; reason: string }>;
}

interface ScheduleARow {
  bioguideId: string;
  fecCandidateId: string;
  committeeIds: string[];
  contributors: unknown[];
  source: unknown;
  asOf: string;
  fecUrl: string;
  queryNote?: string;
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
  const memberFilter = requireSyncScope(process.argv, 'sync-fec-schedule-a');
  const isFullDepth = process.argv.includes('--full-depth');
  if (isFullDepth && (!memberFilter || memberFilter.size === 0)) {
    console.error('--full-depth requires --members <bioguideId[,...]> (scoped agent runs only).');
    process.exit(1);
  }

  config({ path: path.join(projectRoot, '.env.local') });
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const limit = isFullDepth ? FULL_DEPTH_LIMIT : DEFAULT_LIMIT;
  const fetchOpts = isFullDepth
    ? { includeOrganizations: true, paginate: true }
    : { includeOrganizations: false, paginate: false };

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

  let existing: ExistingScheduleASnapshot | null = null;
  try {
    existing = JSON.parse(await readFile(OUT_FILE, 'utf8')) as ExistingScheduleASnapshot;
  } catch {
    existing = null;
  }

  const entries = Object.entries(fecNational.byBioguideId).filter(([bioguideId]) =>
    memberInScope(bioguideId, memberFilter),
  );
  if (memberFilter && entries.length === 0) {
    console.error(
      `No national FEC rows match --members filter: ${[...memberFilter].join(', ')}. Run sync:fec-national first.`,
    );
    process.exit(1);
  }

  const twoYearPeriod = currentTwoYearTransactionPeriod(asOf);
  console.log(
    `Fetching committee-scoped Schedule A for ${entries.length} member(s) (${twoYearPeriod} period; limit=${limit}; orgs=${fetchOpts.includeOrganizations}; paginate=${fetchOpts.paginate})…`,
  );

  const byBioguideId: Record<string, ScheduleARow> = {};
  // §6 scoped merge: preserve other members
  if (memberFilter && existing?.byBioguideId) {
    for (const [id, row] of Object.entries(existing.byBioguideId)) {
      if (!memberFilter.has(id)) byBioguideId[id] = row;
    }
  }

  const failures: Array<{ bioguideId: string; reason: string }> = [];
  if (memberFilter && existing?.failures) {
    for (const f of existing.failures) {
      if (!memberFilter.has(f.bioguideId)) failures.push(f);
    }
  }

  for (const [bioguideId, row] of entries) {
    try {
      const committees = await fetchCandidateCommittees(row.fecCandidateId, twoYearPeriod);
      if (committees.length === 0) {
        failures.push({ bioguideId, reason: 'no authorized candidate committees found' });
        await sleep(150);
        continue;
      }

      const committeeIds = committees.map((c) => c.committeeId);
      const contributors = await fetchScheduleAContributorsForCommittees(
        committeeIds,
        twoYearPeriod,
        limit,
        fetchOpts,
      );
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
        queryNote: isFullDepth
          ? 'full-depth: individuals + organizations/PACs; paginated committee Schedule A'
          : 'legacy sample: individuals only; top receipts by amount',
      };
      console.log(`  ${bioguideId}: ${contributors.length} contributors (${committeeIds.join(',')})`);
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
          scope: memberFilter ? `scoped: ${[...memberFilter].join(',')}` : 'full-corpus',
          fullDepth: isFullDepth,
          contributorLimit: limit,
          includeOrganizations: fetchOpts.includeOrganizations,
          datasetUrl: 'https://api.open.fec.gov/v1/schedules/schedule_a/',
          note: isFullDepth
            ? 'Full-depth committee-scoped Schedule A (individuals + org/PAC receipts, paginated). Tier 1 official FEC.'
            : 'Committee-scoped itemized receipts (Schedule A) from authorized candidate committees. Default sample is individuals-only top receipts. Tier 1 official FEC records.',
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
