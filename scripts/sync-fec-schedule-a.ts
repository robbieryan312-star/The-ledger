/**
 * sync-fec-schedule-a.ts — Schedule A itemized donors for Congress members with FEC IDs.
 * Output: data/fec/national/schedule-a.json
 */
import { config } from 'dotenv';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEC_SOURCE, fetchScheduleAContributors, isFecConfigured } from '../lib/data/fecClient';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEC_NATIONAL = path.join(projectRoot, 'data', 'fec', 'national', 'congress-finance.json');
const OUT_FILE = path.join(projectRoot, 'data', 'fec', 'national', 'schedule-a.json');

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  if (!isFecConfigured()) {
    console.warn('FEC_API_KEY missing — empty schedule-a snapshot.');
    await mkdir(path.dirname(OUT_FILE), { recursive: true });
    await writeFile(
      OUT_FILE,
      JSON.stringify({ meta: { source: FEC_SOURCE, asOf, fetchedAt, count: 0 }, byBioguideId: {} }, null, 2) + '\n',
      'utf8',
    );
    return;
  }

  const fecNational = JSON.parse(await readFile(FEC_NATIONAL, 'utf8')) as {
    byBioguideId: Record<string, { fecCandidateId: string; name?: string }>;
  };

  const entries = Object.entries(fecNational.byBioguideId);
  console.log(`Fetching Schedule A for ${entries.length} members with FEC totals…`);

  const byBioguideId: Record<string, unknown> = {};
  const failures: Array<{ bioguideId: string; reason: string }> = [];

  for (const [bioguideId, row] of entries) {
    try {
      const contributors = await fetchScheduleAContributors(row.fecCandidateId, 15);
      byBioguideId[bioguideId] = {
        bioguideId,
        fecCandidateId: row.fecCandidateId,
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
          datasetUrl: 'https://api.open.fec.gov/v1/schedules/schedule_a/',
          note: 'Itemized individual contributions (Schedule A). Tier 1 official FEC records.',
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
