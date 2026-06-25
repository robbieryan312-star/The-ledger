/**
 * National FEC sync — campaign finance totals for all current Congress members.
 * Output: data/fec/national/congress-finance.json
 *
 * Run: npm run sync:fec-national
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEC_SOURCE,
  fecProfileUrl,
  isFecConfigured,
  resolveBestCandidateTotals,
  searchCandidates,
} from '../lib/data/fecClient';
import type { FecFinanceEntry } from '../lib/data/fecFinance';
import type { Source } from '../lib/types';
import { loadEnvLocal } from './lib/ingest-utils';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'data', 'fec', 'national');
const OUT_FILE = path.join(OUT_DIR, 'congress-finance.json');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');

interface LegislatorRow {
  bioguideId: string;
  name: string;
  lastName: string;
  stateCode: string;
  chamber: string;
  fecIds?: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function officeCode(chamber: string): 'S' | 'H' | undefined {
  if (chamber === 'senate') return 'S';
  if (chamber === 'house') return 'H';
  return undefined;
}

async function resolveFecIds(leg: LegislatorRow): Promise<string[]> {
  if (leg.fecIds?.length) return leg.fecIds;
  const office = officeCode(leg.chamber);
  if (!office) return [];
  const hits = await searchCandidates(leg.lastName, leg.stateCode, office);
  const active = hits.filter((h) => !h.candidateInactive);
  return (active.length > 0 ? active : hits).map((h) => h.candidateId);
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  const legislators = legislatorsRaw.legislators.filter(
    (l) => l.chamber === 'senate' || l.chamber === 'house',
  );

  if (!isFecConfigured()) {
    console.warn('FEC_API_KEY not configured — writing empty national snapshot.');
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(
      OUT_FILE,
      JSON.stringify(
        {
          meta: {
            source: FEC_SOURCE as Source,
            asOf,
            fetchedAt,
            membersQueried: legislators.length,
            withFinanceData: 0,
            keyConfigured: false,
            failures: ['FEC_API_KEY not configured'],
            note: 'Set FEC_API_KEY in .env.local and re-run npm run sync:fec-national',
          },
          byBioguideId: {},
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );
    return;
  }

  console.log(`Syncing FEC totals for ${legislators.length} Congress members…`);

  const byBioguideId: Record<string, FecFinanceEntry> = {};
  const failures: Array<{ bioguideId: string; name: string; reason: string }> = [];
  let withData = 0;

  for (const leg of legislators) {
    try {
      const fecIds = await resolveFecIds(leg);
      if (fecIds.length === 0) {
        failures.push({ bioguideId: leg.bioguideId, name: leg.name, reason: 'no FEC candidate ID' });
        await sleep(100);
        continue;
      }

      const totals = await resolveBestCandidateTotals(fecIds, leg.chamber);
      if (!totals) {
        failures.push({ bioguideId: leg.bioguideId, name: leg.name, reason: 'no OpenFEC totals' });
        await sleep(100);
        continue;
      }

      byBioguideId[leg.bioguideId] = {
        politicianId: leg.bioguideId,
        bioguideId: leg.bioguideId,
        fecCandidateId: totals.candidateId,
        electionYear: totals.electionYear,
        receipts: totals.receipts,
        disbursements: totals.disbursements,
        cashOnHand: totals.cashOnHand,
        individualContributions: totals.individualContributions,
        pacContributions: totals.pacContributions,
        selfFunding: totals.selfFunding,
        coverageStart: totals.coverageStart,
        coverageEnd: totals.coverageEnd,
        reportType: totals.reportType,
        source: FEC_SOURCE,
        asOf,
        fecProfileUrl: fecProfileUrl(totals.candidateId),
      };
      withData += 1;
      if (withData % 25 === 0) console.log(`  progress: ${withData}/${legislators.length}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ bioguideId: leg.bioguideId, name: leg.name, reason });
    }
    await sleep(120);
  }

  const snapshot = {
    meta: {
      source: FEC_SOURCE,
      asOf,
      fetchedAt,
      membersQueried: legislators.length,
      withFinanceData: withData,
      failureCount: failures.length,
      keyConfigured: true,
      datasetUrl: 'https://api.open.fec.gov/v1/',
      note:
        'Receipts, disbursements, and cash-on-hand from OpenFEC candidate totals for all current Congress members.',
    },
    byBioguideId,
    failures,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`  members queried: ${legislators.length}`);
  console.log(`  with FEC finance data: ${withData}`);
  console.log(`  failures: ${failures.length}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
