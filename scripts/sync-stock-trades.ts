/**
 * sync-stock-trades.ts
 *
 * STOCK Act disclosure sync from official sources (no API key):
 *   - Senate: efdsearch.senate.gov PTR search + report HTML (when API available)
 *   - House: disclosures-clerk.house.gov YTD XML index + PTR PDF parsing
 *
 * Output: lib/data/generated/stockTrades.json
 *
 * Run with: npm run sync:stock-trades
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allPoliticians } from '../lib/data/allPoliticians';
import {
  HOUSE_CLERK_SOURCE,
  loadHousePtrIndexes,
  syncHousePtrForTarget,
  type FeaturedHouseTarget,
} from '../lib/data/housePtrClient';
import {
  SENATE_EFD_SOURCE,
  createSenateEfdSession,
  syncSenatePtrForTarget,
  type FeaturedSenateTarget,
} from '../lib/data/senatePtrClient';
import type { Source, StockTrade } from '../lib/types';
import type { StockTradeEntry, StockTradesSnapshot } from '../lib/data/stockTrades';
import {
  buildHouseStockTradeEntry,
  stockEntryToProfileTradesFile,
} from '../lib/data/stockTrades';
import { loadCheckpoint, saveCheckpoint } from './lib/resilientFetch';
import { buildSyncSummary, emitSyncSummary } from './lib/syncKernel';
import { acquireSyncLock } from './lib/syncLock';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'stockTrades.json');
const PROFILES_ROOT = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');
const CHECKPOINT_FILE = '/tmp/ledger-sync-stock-trades-checkpoint.json';
const LOCK_FILE = '/tmp/ledger-sync-stock-trades.lock';

interface LegislatorRow {
  bioguideId: string;
  firstName: string;
  lastName: string;
  stateCode: string;
  chamber: string;
  district?: string;
}

const HOUSE_INDEX_YEARS = [2024, 2025, 2026];
const MAX_HOUSE_FILINGS_PER_MEMBER = 10;
const PTR_SINCE_DATE = '2023-01-01';
const MAX_SENATE_REPORTS_PER_MEMBER = 12;

function parseMembersArg(argv: string[]): Set<string> | null {
  const idx = argv.indexOf('--members');
  if (idx === -1 || !argv[idx + 1]) return null;
  return new Set(
    argv[idx + 1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function parseLimitArg(argv: string[]): number | null {
  const idx = argv.indexOf('--limit');
  if (idx === -1 || !argv[idx + 1]) return null;
  const n = Number.parseInt(argv[idx + 1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function memberInFilter(
  p: { id: string; bioguideId?: string },
  filter: Set<string> | null,
): boolean {
  if (!filter) return true;
  return filter.has(p.id) || (p.bioguideId != null && filter.has(p.bioguideId));
}

async function writeProfileTradesIfExists(
  bioguideId: string | undefined,
  entry: StockTradeEntry,
): Promise<void> {
  if (!bioguideId) return;
  const profileDir = path.join(PROFILES_ROOT, bioguideId);
  try {
    await access(profileDir);
  } catch {
    return;
  }
  const profileTrades = stockEntryToProfileTradesFile(bioguideId, entry);
  await writeFile(
    path.join(profileDir, 'trades.json'),
    `${JSON.stringify(profileTrades, null, 2)}\n`,
    'utf8',
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function houseTarget(p: {
  id: string;
  bioguideId?: string;
  lastName: string;
  stateCode: string;
  district?: string;
}): FeaturedHouseTarget {
  return {
    politicianId: p.id,
    bioguideId: p.bioguideId,
    lastName: p.lastName,
    stateCode: p.stateCode,
    district: p.district,
  };
}

function senateTarget(p: {
  id: string;
  bioguideId?: string;
  lastName: string;
  firstName: string;
  stateCode: string;
}): FeaturedSenateTarget {
  return {
    politicianId: p.id,
    bioguideId: p.bioguideId,
    lastName: p.lastName,
    firstName: p.firstName,
    stateCode: p.stateCode,
  };
}

async function probeSenateEfd(retries = 2): Promise<{ reachable: boolean; error?: string }> {
  let lastError: string | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await createSenateEfdSession();
      return { reachable: true };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      const retryable =
        lastError.includes('503') ||
        lastError.includes('maintenance') ||
        lastError.includes('unreachable') ||
        lastError.includes('timeout') ||
        lastError.includes('aborted');
      if (!retryable || attempt === retries) break;
      const delayMs = 1500 * (attempt + 1) + Math.random() * 400;
      console.warn(`Senate eFD probe attempt ${attempt + 1} failed (${lastError}); retrying in ${Math.round(delayMs)}ms…`);
      await sleep(delayMs);
    }
  }
  return { reachable: false, error: lastError ? `fetch-failed: ${lastError}` : 'fetch-failed: unknown' };
}

async function main(): Promise<void> {
  const releaseLock = await acquireSyncLock(LOCK_FILE);
  try {
    await runSync();
  } finally {
    await releaseLock();
  }
}

async function runSync(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const memberFilter = parseMembersArg(process.argv);
  const memberLimit = parseLimitArg(process.argv);
  const scopedRun = memberFilter != null || memberLimit != null;

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  const houseFromRoster = legislatorsRaw.legislators
    .filter((l) => l.chamber === 'house')
    .map((l) => ({
      id: l.bioguideId,
      bioguideId: l.bioguideId,
      lastName: l.lastName,
      stateCode: l.stateCode,
      district: l.district,
      chamber: 'house' as const,
    }));

  const featured = allPoliticians.filter((p) => p.chamber === 'house' || p.chamber === 'senate');
  const featuredIds = new Set(featured.map((p) => p.id));
  const featuredBioguides = new Set(featured.map((p) => p.bioguideId).filter(Boolean));

  let houseMembers = [
    ...featured.filter((p) => p.chamber === 'house'),
    ...houseFromRoster.filter(
      (h) => !featuredIds.has(h.id) && !featuredBioguides.has(h.bioguideId),
    ),
  ];
  let senateMembers = featured.filter((p) => p.chamber === 'senate');

  if (memberFilter) {
    houseMembers = houseMembers.filter((p) => memberInFilter(p, memberFilter));
    senateMembers = senateMembers.filter((p) => memberInFilter(p, memberFilter));
  }

  if (memberLimit != null) {
    houseMembers = houseMembers.slice(0, memberLimit);
    const houseCount = houseMembers.length;
    senateMembers = senateMembers.slice(0, Math.max(0, memberLimit - houseCount));
  }

  const allTargets = [...houseMembers, ...senateMembers];

  const senateProbe = await probeSenateEfd();
  let senateError: string | undefined = senateProbe.error;
  let houseFilingsParsed = 0;
  let totalOfficialTrades = 0;

  const byPoliticianId: Record<string, StockTradeEntry> = {};
  const checkpoint = (await loadCheckpoint<Record<string, true>>(CHECKPOINT_FILE)) ?? {};

  if (memberFilter) {
    for (const id of memberFilter) delete checkpoint[id];
  }

  let priorSnapshot: StockTradesSnapshot | null = null;
  try {
    priorSnapshot = JSON.parse(await readFile(OUT_FILE, 'utf8')) as StockTradesSnapshot;
    Object.assign(byPoliticianId, priorSnapshot.byPoliticianId ?? {});
  } catch {
    /* fresh run */
  }

  for (const p of allTargets) {
    if (!byPoliticianId[p.id]) {
      byPoliticianId[p.id] = {
        politicianId: p.id,
        bioguideId: p.bioguideId,
        chamber: p.chamber,
        trades: [],
        source: p.chamber === 'senate' ? SENATE_EFD_SOURCE : HOUSE_CLERK_SOURCE,
        asOf,
        note: undefined,
      };
    }
  }

  const scopeLabel = scopedRun
    ? `scoped: ${allTargets.length} member(s)${memberFilter ? ` filter=${[...memberFilter].join(',')}` : ''}${memberLimit != null ? ` limit=${memberLimit}` : ''}`
    : `${houseMembers.length} representatives (national roster + featured)`;
  console.log(`Syncing House PTRs for ${scopeLabel}…`);
  console.log(`Loading House Clerk PTR indexes (${HOUSE_INDEX_YEARS.join(', ')}) — once per run…`);
  const { byYear: houseIndexByYear, failedYears: houseIndexFailedYears } =
    await loadHousePtrIndexes(HOUSE_INDEX_YEARS);
  for (const year of HOUSE_INDEX_YEARS) {
    const count = houseIndexByYear.get(year)?.length ?? 0;
    const fetchFailed = houseIndexFailedYears.includes(year);
    console.log(
      `  ${year} index: ${count} filing(s)${fetchFailed ? ' (fetch-failed)' : count === 0 ? ' (empty)' : ''}`,
    );
  }

  for (const p of houseMembers) {
    if (!scopedRun && checkpoint[p.id]) {
      console.log(`  ${p.id}: checkpoint skip`);
      continue;
    }
    const priorTrades = byPoliticianId[p.id]?.trades ?? [];
    try {
      const { trades, filingsMatched, filingsParsedWithRows } = await syncHousePtrForTarget(
        houseTarget(p),
        HOUSE_INDEX_YEARS,
        {
          maxFilings: MAX_HOUSE_FILINGS_PER_MEMBER,
          sinceDate: PTR_SINCE_DATE,
          indexByYear: houseIndexByYear,
        },
      );
      houseFilingsParsed += filingsMatched;

      const built = buildHouseStockTradeEntry({
        trades,
        priorTrades,
        filingsMatched,
        filingsParsedWithRows,
        houseIndexFailedYears,
        houseIndexYears: HOUSE_INDEX_YEARS,
      });
      totalOfficialTrades += built.trades.length;

      const entry = byPoliticianId[p.id];
      entry.trades = built.trades;
      entry.note = built.note;
      entry.asOf = asOf;
      console.log(`  ${p.id}: ${entry.trades.length} trade(s)${built.note.startsWith('unparsed-filings') ? ' (unparsed filings)' : ''}`);
      if (!scopedRun) {
        checkpoint[p.id] = true;
        await saveCheckpoint(CHECKPOINT_FILE, checkpoint);
      }
      await writeProfileTradesIfExists(p.bioguideId, entry);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ${p.id}: House PTR fetch failed (${msg})`);
      byPoliticianId[p.id].trades = priorTrades;
      byPoliticianId[p.id].note = `fetch-failed: House PTR sync error (${msg}). Prior good trades preserved if any.`;
      await writeProfileTradesIfExists(p.bioguideId, byPoliticianId[p.id]);
    }
    await sleep(200);
  }

  if (senateProbe.reachable) {
    console.log(`Syncing Senate PTRs for ${senateMembers.length} featured senators…`);
    for (const p of senateMembers) {
      if (!scopedRun && checkpoint[p.id]) {
        console.log(`  ${p.id}: checkpoint skip`);
        continue;
      }
      const priorTrades = byPoliticianId[p.id]?.trades ?? [];
      const result = await syncSenatePtrForTarget(senateTarget(p), {
        startDate: '01/01/2023',
        maxReports: MAX_SENATE_REPORTS_PER_MEMBER,
      });
      if (result.error) senateError = result.error;

      const entry = byPoliticianId[p.id];
      if (result.error && priorTrades.length > 0) {
        entry.trades = priorTrades;
        entry.note = `fetch-failed: Senate eFD sync (${result.error}). Prior good trades preserved.`;
      } else {
        entry.trades = result.trades;
        totalOfficialTrades += result.trades.length;
        if (result.trades.length > 0) {
          entry.note = `${result.trades.length} official PTR transaction(s) from Senate eFD.`;
        } else if (result.error) {
          entry.note = `Senate eFD sync unavailable (${result.error}). Demo trades on profile, if any, are labeled separately.`;
        } else {
          entry.note =
            'No Senate PTR reports matched this member in the synced window — demo trades (if any) remain labeled separately.';
        }
      }
      console.log(`  ${p.id}: ${entry.trades.length} trade(s)${result.error ? ` (${result.error})` : ''}`);
      if (!result.error && !scopedRun) {
        checkpoint[p.id] = true;
        await saveCheckpoint(CHECKPOINT_FILE, checkpoint);
      }
      await writeProfileTradesIfExists(p.bioguideId, entry);
      await sleep(200);
    }
  } else {
    console.warn(`Senate eFD unavailable: ${senateProbe.error ?? 'unknown'}`);
    for (const p of senateMembers) {
      byPoliticianId[p.id].note = `Senate eFD unreachable (${senateProbe.error ?? 'maintenance'}). Demo trades on profile, if any, are labeled separately.`;
    }
  }

  const withTradeData = Object.values(byPoliticianId).filter((e) => e.trades.length > 0).length;
  const integrationStatus: StockTradesSnapshot['meta']['integrationStatus'] =
    withTradeData === 0 ? 'stub' : withTradeData < allTargets.length ? 'partial' : 'live';

  const nextSteps: string[] = [];
  if (!senateProbe.reachable || senateError?.includes('503') || senateError?.includes('maintenance')) {
    nextSteps.push(
      'Senate: retry efdsearch.senate.gov/search/report/data/ when maintenance ends; parse view/report HTML tables per PTR.',
    );
  }
  if (withTradeData < houseMembers.length) {
    nextSteps.push(
      'House: members without PTR filings (annual FD only) correctly show zero official trades — do not fabricate.',
    );
  }
  nextSteps.push('Merge official rows via lib/data/stockTrades.ts mergeStockTrades(); demo rows fill only when official snapshot is empty.');
  nextSteps.push('Optional: enrich conflict scores by cross-referencing congressVotes.json committee/vote proximity.');

  const snapshot: StockTradesSnapshot = {
    meta: {
      asOf,
      featuredQueried: allTargets.length,
      withTradeData,
      integrationStatus,
      note:
        withTradeData > 0
          ? `Official STOCK Act PTR sync: ${totalOfficialTrades} transaction(s) for ${withTradeData} featured member(s). Demo trades remain on profiles without official rows.`
          : 'No official STOCK Act trades synced this run. Featured profiles keep clearly labeled demo data where present.',
      nextSteps,
      senateReachable: senateProbe.reachable,
      senateError,
      houseFilingsParsed,
      houseIndexFailedYears,
      totalOfficialTrades,
    },
    byPoliticianId,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`  Congress members queried: ${allTargets.length}`);
  console.log(`  politicians with official trades: ${withTradeData}`);
  console.log(`  total official trades: ${totalOfficialTrades}`);
  console.log(`  integration status: ${integrationStatus}`);
  console.log(`  Senate eFD reachable: ${senateProbe.reachable}`);

  emitSyncSummary(
    buildSyncSummary('sync-stock-trades', {
      status: integrationStatus === 'live' ? 'ok' : integrationStatus === 'partial' ? 'partial' : 'fetch-failed',
      failed: houseIndexFailedYears.map((y) => `house-index-${y}`),
      checkpoint: CHECKPOINT_FILE,
      log: '/tmp/ledger-sync-stock-trades.log',
      preservePrior: true,
    }),
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
