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
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockPoliticians } from '../lib/data/mockPoliticians';
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

interface LegislatorRow {
  bioguideId: string;
  fecIds?: string[];
}

async function loadEnvLocalAsync(): Promise<void> {
  const envPath = path.join(projectRoot, '.env.local');
  try {
    const content = await readFile(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local optional — key may be set in the environment already.
  }
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

async function main(): Promise<void> {
  await loadEnvLocalAsync();

  const asOf = new Date().toISOString().slice(0, 10);
  const featured = mockPoliticians;
  const keyConfigured = isFecConfigured();

  if (!keyConfigured) {
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

  const byPoliticianId: Record<string, FecFinanceEntry> = {};
  let withData = 0;

  for (const politician of featured) {
    try {
      const fecIds = await resolveFecIds(politician, byBioguide);
      if (fecIds.length === 0) {
        console.log(`  skip ${politician.id}: no FEC candidate ID`);
        await sleep(120);
        continue;
      }

      const totals = await resolveBestCandidateTotals(fecIds, politician.chamber);
      if (!totals) {
        console.log(`  skip ${politician.id}: no totals in OpenFEC`);
        await sleep(120);
        continue;
      }

      byPoliticianId[politician.id] = {
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
      withData += 1;
      console.log(`  ok ${politician.id}: cycle ${totals.electionYear}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  error ${politician.id}: ${msg}`);
    }
    await sleep(150);
  }

  const snapshot = {
    meta: {
      source: FEC_SOURCE,
      asOf,
      featuredQueried: featured.length,
      withFinanceData: withData,
      keyConfigured: true,
      note:
        'Receipts, disbursements, and cash-on-hand from OpenFEC candidate totals. Lobbyist/industry breakdowns on profile pages remain demo until a separate integration.',
    },
    byPoliticianId,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`  as-of: ${asOf}`);
  console.log(`  featured queried: ${featured.length}`);
  console.log(`  with FEC finance data: ${withData}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
