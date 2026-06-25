/**
 * sync-stock-trades.ts
 *
 * STOCK Act disclosure sync from official sources (no API key):
 *   - Senate: efdsearch.senate.gov PTR search + report HTML (when API available)
 *   - House: disclosures-clerk.house.gov YTD XML index + PTR PDF parsing
 *
 * Run with: npm run sync:stock-trades
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockPoliticians } from '../lib/data/mockPoliticians';
import {
  HOUSE_CLERK_SOURCE,
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

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'stockTrades.json');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');

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
        lastError.includes('unreachable');
      if (!retryable || attempt === retries) break;
      const delayMs = 1500 * (attempt + 1);
      console.warn(`Senate eFD probe attempt ${attempt + 1} failed (${lastError}); retrying in ${delayMs}ms…`);
      await sleep(delayMs);
    }
  }
  return { reachable: false, error: lastError };
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);

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

  const featured = mockPoliticians.filter((p) => p.chamber === 'house' || p.chamber === 'senate');
  const featuredIds = new Set(featured.map((p) => p.id));
  const featuredBioguides = new Set(featured.map((p) => p.bioguideId).filter(Boolean));

  const houseMembers = [
    ...featured.filter((p) => p.chamber === 'house'),
    ...houseFromRoster.filter(
      (h) => !featuredIds.has(h.id) && !featuredBioguides.has(h.bioguideId),
    ),
  ];
  const senateMembers = featured.filter((p) => p.chamber === 'senate');
  const allTargets = [...houseMembers, ...senateMembers];

  const senateProbe = await probeSenateEfd();
  let senateError: string | undefined = senateProbe.error;
  let houseFilingsParsed = 0;
  let totalOfficialTrades = 0;

  const byPoliticianId: Record<string, StockTradeEntry> = {};

  for (const p of allTargets) {
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

  console.log(`Syncing House PTRs for ${houseMembers.length} representatives (national roster + featured)…`);
  for (const p of houseMembers) {
    try {
      const { trades, filingsParsed } = await syncHousePtrForTarget(houseTarget(p), HOUSE_INDEX_YEARS, {
        maxFilings: MAX_HOUSE_FILINGS_PER_MEMBER,
        sinceDate: PTR_SINCE_DATE,
      });
      houseFilingsParsed += filingsParsed;
      totalOfficialTrades += trades.length;

      const entry = byPoliticianId[p.id];
      entry.trades = trades;
      if (trades.length > 0) {
        entry.note = `${trades.length} official PTR transaction(s) from House Clerk filings (Tier 1).`;
      } else {
        entry.note =
          'No House PTR filings matched this member in the synced index window — profile demo trades (if any) remain labeled separately.';
      }
      console.log(`  ${p.id}: ${trades.length} trade(s)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ${p.id}: House PTR fetch failed (${msg})`);
      byPoliticianId[p.id].note = `House PTR sync error for this member (${msg}). Demo trades on profile, if any, are labeled separately.`;
    }
    await sleep(200);
  }

  if (senateProbe.reachable) {
    console.log(`Syncing Senate PTRs for ${senateMembers.length} featured senators…`);
    for (const p of senateMembers) {
      const result = await syncSenatePtrForTarget(senateTarget(p), {
        startDate: '01/01/2023',
        maxReports: MAX_SENATE_REPORTS_PER_MEMBER,
      });
      if (result.error) senateError = result.error;

      const entry = byPoliticianId[p.id];
      entry.trades = result.trades;
      totalOfficialTrades += result.trades.length;
      if (result.trades.length > 0) {
        entry.note = `${result.trades.length} official PTR transaction(s) from Senate eFD (Tier 1).`;
      } else if (result.error) {
        entry.note = `Senate eFD sync unavailable (${result.error}). Demo trades on profile, if any, are labeled separately.`;
      } else {
        entry.note =
          'No Senate PTR reports matched this member in the synced window — demo trades (if any) remain labeled separately.';
      }
      console.log(`  ${p.id}: ${result.trades.length} trade(s)${result.error ? ` (${result.error})` : ''}`);
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
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
