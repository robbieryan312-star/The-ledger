/**
 * sync-fec-finance.ts
 *
 * Fetches real campaign finance summaries from the FEC OpenFEC API for the
 * ~17 featured hand-authored profiles and writes lib/data/generated/fecFinance.json.
 *
 * Requires FEC_API_KEY in .env.local (free at api.data.gov).
 * Gracefully exits with an empty snapshot when the key is missing.
 *
 * Run with: npm run sync:fec
 */
import { config } from 'dotenv';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { allPoliticians } from '../lib/data/allPoliticians';
import type { Politician, Source } from '../lib/types';
import {
  FEC_SOURCE,
  fecProfileUrl,
  isFecConfigured,
  resolveBestCandidateTotals,
  searchCandidates,
} from '../lib/data/fecClient';
import type { FecFinanceEntry } from '../lib/data/fecFinance';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'fecFinance.json');
const LEGISLATORS_FILE = path.join(OUT_DIR, 'currentLegislators.json');

interface FecFinanceSnapshot {
  meta?: {
    withFinanceData?: number;
    [key: string]: unknown;
  };
  byPoliticianId?: Record<string, FecFinanceEntry>;
}

interface LegislatorRow {
  bioguideId: string;
  fecIds?: string[];
}

function officeCode(p: Politician): 'S' | 'H' | 'P' | 'G' | undefined {
  if (p.chamber === 'senate') return 'S';
  if (p.chamber === 'house') return 'H';
  if (p.chamber === 'governor') return 'G';
  return undefined;
}

async function resolveFecIds(
  politician: Politician,
  byBioguide: Map<string, string[]>,
): Promise<string[]> {
  if (politician.bioguideId) {
    const ids = byBioguide.get(politician.bioguideId);
    if (ids?.length) return ids;
  }

  const office = officeCode(politician);
  if (!office) return [];

  if (politician.chamber === 'governor') {
    // Governors: try presidential committee (common for recent governors), then broad name search.
    const pres = await searchCandidates(politician.lastName, politician.stateCode, 'P');
    if (pres.length > 0) return pres.map((h) => h.candidateId);
    const broad = await searchCandidates(politician.lastName, politician.stateCode);
    return broad.map((h) => h.candidateId);
  }

  const hits = await searchCandidates(politician.lastName, politician.stateCode, office);
  const active = hits.filter((h) => !h.candidateInactive);
  const pool = active.length > 0 ? active : hits;
  return pool.map((h) => h.candidateId);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mergeFecFinanceEntries(
  priorRows: Record<string, FecFinanceEntry>,
  freshRows: Record<string, FecFinanceEntry>,
): Record<string, FecFinanceEntry> {
  return { ...priorRows, ...freshRows };
}

export function countFecFinanceRows(snapshot: FecFinanceSnapshot | null | undefined): number {
  const rows = Object.values(snapshot?.byPoliticianId ?? {});
  const rowCount = rows.filter((row) => row?.receipts != null || row?.disbursements != null).length;
  return Math.max(snapshot?.meta?.withFinanceData ?? 0, rowCount);
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });

  const asOf = new Date().toISOString().slice(0, 10);
  const featured = allPoliticians;
  const keyConfigured = isFecConfigured();

  if (!keyConfigured) {
    try {
      const existing = JSON.parse(await readFile(OUT_FILE, 'utf8')) as FecFinanceSnapshot;
      const existingCount = countFecFinanceRows(existing);
      if (existingCount > 0) {
        console.warn(
          'FEC_API_KEY not configured — keeping existing fecFinance.json snapshot ' +
            `(${existingCount} profiles). Set FEC_API_KEY in .env.local to refresh.`,
        );
        return;
      }
    } catch {
      // No prior snapshot — write empty stub below.
    }
    console.warn('FEC_API_KEY not configured — writing empty fecFinance.json snapshot.');
    const empty = {
      meta: {
        source: FEC_SOURCE as Source,
        asOf,
        featuredQueried: featured.length,
        withFinanceData: 0,
        keyConfigured: false,
        note: 'Set FEC_API_KEY in .env.local and re-run npm run sync:fec',
      },
      byPoliticianId: {} as Record<string, FecFinanceEntry>,
    };
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(OUT_FILE, JSON.stringify(empty, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${OUT_FILE} (no key — 0 records)`);
    return;
  }

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  const byBioguide = new Map<string, string[]>();
  for (const leg of legislatorsRaw.legislators) {
    if (leg.fecIds?.length) byBioguide.set(leg.bioguideId, leg.fecIds);
  }

  console.log(`Syncing FEC finance for ${featured.length} featured profiles...`);

  let priorRows: Record<string, FecFinanceEntry> = {};
  try {
    const prior = JSON.parse(await readFile(OUT_FILE, 'utf8')) as FecFinanceSnapshot;
    priorRows = prior.byPoliticianId ?? {};
  } catch {
    /* no prior snapshot */
  }

  const freshRows: Record<string, FecFinanceEntry> = {};
  const failures: Array<{ politicianId: string; reason: string }> = [];

  for (const politician of featured) {
    try {
      const fecIds = await resolveFecIds(politician, byBioguide);
      if (fecIds.length === 0) {
        console.log(`  skip ${politician.id}: no FEC candidate ID`);
        failures.push({ politicianId: politician.id, reason: 'no FEC candidate ID' });
        await sleep(120);
        continue;
      }

      const totals = await resolveBestCandidateTotals(fecIds, politician.chamber);
      if (!totals) {
        console.log(`  skip ${politician.id}: no totals in OpenFEC`);
        failures.push({ politicianId: politician.id, reason: 'no OpenFEC totals' });
        await sleep(120);
        continue;
      }

      freshRows[politician.id] = {
        politicianId: politician.id,
        bioguideId: politician.bioguideId,
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
      console.log(`  ok ${politician.id}: cycle ${totals.electionYear}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  error ${politician.id}: ${msg}`);
      failures.push({ politicianId: politician.id, reason: `fetch-failed: ${msg}` });
    }
    await sleep(150);
  }

  const byPoliticianId = mergeFecFinanceEntries(priorRows, freshRows);
  const withData = Object.keys(byPoliticianId).length;

  const snapshot = {
    meta: {
      source: FEC_SOURCE,
      asOf,
      featuredQueried: featured.length,
      withFinanceData: withData,
      refreshedThisRun: Object.keys(freshRows).length,
      preservedFromPrior: Object.keys(priorRows).filter((id) => !freshRows[id]).length,
      failureCount: failures.length,
      keyConfigured: true,
      note:
        failures.length > 0
          ? 'Receipts, disbursements, and cash-on-hand from OpenFEC candidate totals. Prior rows are preserved for profiles skipped or errored during this refresh.'
          : 'Receipts, disbursements, and cash-on-hand from OpenFEC candidate totals. Lobbyist/industry breakdowns on profile pages remain demo until a separate integration.',
    },
    byPoliticianId,
    failures,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`  as-of: ${asOf}`);
  console.log(`  featured queried: ${featured.length}`);
  console.log(`  with FEC finance data: ${withData}`);
}

const isDirectRun =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
