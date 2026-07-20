/**
 * Build-gated guard: stock-trade sync preserves prior rows on fetch-failed paths.
 * Also: empty trades with Senate eFD 503 / fetch-failed must never render silent empty.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { StockTrade } from '../../lib/types';
import { allPoliticians } from '../../lib/data/allPoliticians';
import {
  buildHouseStockTradeEntry,
  buildMergedStockTradesMeta,
  isTradesFetchFailedGap,
  mergeStockTrades,
  stockEntryToProfileTradesFile,
  tradesEmptyStateCopy,
  TRADES_HONEST_GAP_LABEL,
  type StockTradeEntry,
} from '../../lib/data/stockTrades';
import {
  S000033_TRADES_FETCH_FAILED_KNOWN_GOOD,
  TRADES_SILENT_EMPTY_KNOWN_BAD,
} from '../../lib/data/__fixtures__/stockTradesHonestGap.fixture';

/** Frozen fixture: member had 2 official trades before a House index fetch-failed run. */
export const STOCK_TRADES_KNOWN_GOOD_PRIOR: StockTrade[] = [
  {
    id: 'house-ptr-fixture-1',
    ticker: 'AAPL',
    companyName: 'Apple Inc',
    type: 'Purchase',
    date: '2024-03-15',
    disclosureDate: '2024-03-20',
    daysToDisclose: 5,
    amount: 15000,
    amountMin: 1001,
    amountMax: 15000,
    conflictScore: 0,
    sector: 'Equities',
    source: {
      name: 'House Clerk Financial Disclosure',
      url: 'https://disclosures-clerk.house.gov/FinancialDisclosure',
      tier: 'official',
    },
  },
];

test('fetch-failed note must not wipe prior official trades (fixture contract)', () => {
  const priorTrades = [...STOCK_TRADES_KNOWN_GOOD_PRIOR];
  const fetchFailedNote = 'fetch-failed: House PTR index unavailable for all years (2024, 2025, 2026). Prior good trades preserved.';
  assert.match(fetchFailedNote, /fetch-failed/);
  assert.match(fetchFailedNote, /Prior good trades preserved/);
  assert.equal(priorTrades.length, 1);
  assert.equal(priorTrades[0].ticker, 'AAPL');
});

test('Senate fetch-failed preserves prior trades when error is set', () => {
  const priorTrades = [...STOCK_TRADES_KNOWN_GOOD_PRIOR];
  const result = { trades: [] as StockTrade[], error: 'fetch-failed: HTTP 503' };
  const entryTrades = result.error && priorTrades.length > 0 ? priorTrades : result.trades;
  assert.equal(entryTrades.length, 1);
  assert.equal(entryTrades[0].id, 'house-ptr-fixture-1');
});

test('unparsed House PTR filings get honest note not clean empty (Kelly docIds 20034607/20034302)', () => {
  const { trades, note } = buildHouseStockTradeEntry({
    trades: [],
    priorTrades: [],
    filingsMatched: 3,
    filingsParsedWithRows: 0,
    houseIndexFailedYears: [],
    houseIndexYears: [2024, 2025, 2026],
  });
  assert.match(note, /unparsed-filings: 3 PTR PDF\(s\) matched but none parsed/);
  assert.match(note, /Not a verified zero-trade record/);
  assert.equal(trades.length, 0);
  assert.notEqual(
    note,
    'No House PTR filings matched this member in the synced index window — profile demo trades (if any) remain labeled separately.',
  );

  const profileFile = stockEntryToProfileTradesFile('K000376', { trades, note });
  assert.match(profileFile.note, /unparsed-filings/);
  assert.equal(profileFile.status, 'honest-gap');
  assert.equal(profileFile.trades.length, 0);
});

test('migrated profile aggregate paths resolve official trades by bioguideId', () => {
  const pelosi = allPoliticians.find((p) => p.bioguideId === 'P000197');
  assert.ok(pelosi, 'P000197 must be present in the roster');
  assert.notEqual(pelosi.id, pelosi.bioguideId, 'fixture needs slug id distinct from bioguideId');

  const withoutBioguide = mergeStockTrades(pelosi.id, pelosi.stockTrades, pelosi.recordType);
  const withBioguide = mergeStockTrades(
    pelosi.id,
    pelosi.stockTrades,
    pelosi.recordType,
    pelosi.bioguideId,
  );

  assert.equal(withoutBioguide.usingOfficialTrades, false);
  assert.equal(withBioguide.usingOfficialTrades, true);
  assert.ok(withBioguide.trades.length > 0, 'bioguideId lookup must expose official PTR rows');
  assert.equal(withBioguide.officialEntry?.politicianId, 'P000197');
});

test('scoped run meta merges from prior snapshot (§6 meta honesty)', () => {
  const houseSource = {
    name: 'House Clerk Financial Disclosure',
    url: 'https://disclosures-clerk.house.gov/FinancialDisclosure',
    tier: 'official' as const,
  };
  const byPoliticianId: Record<string, StockTradeEntry> = {};
  for (let i = 0; i < 10; i++) {
    const politicianId = i === 0 ? 'W000821' : i === 1 ? 'C001103' : `H${i}`;
    const tradeCount = i === 0 ? 55 : i === 1 ? 0 : 50;
    byPoliticianId[politicianId] = {
      politicianId,
      bioguideId: politicianId.length === 7 ? politicianId : undefined,
      chamber: 'house',
      trades: Array.from({ length: tradeCount }, (_, j) => ({
        ...STOCK_TRADES_KNOWN_GOOD_PRIOR[0],
        id: `fixture-${politicianId}-${j}`,
      })),
      source: houseSource,
      asOf: '2026-07-06',
    };
  }

  const meta = buildMergedStockTradesMeta({
    asOf: '2026-07-06',
    byPoliticianId,
    priorMeta: {
      featuredQueried: 10,
      houseFilingsParsed: 693,
      senateError: 'fetch-failed: maintenance',
      senateReachable: false,
    },
    run: {
      membersQueriedThisRun: 2,
      scope: 'scoped: 2 member(s) filter=W000821,C001103',
      housePtrFilingsParsedThisRun: 13,
      houseIndexFailedYears: [],
      senateReachable: false,
      senateError: 'fetch-failed: maintenance',
      houseMemberCount: 10,
    },
  });

  assert.equal(meta.featuredQueried, 10);
  assert.equal(meta.totalOfficialTrades, 455);
  assert.equal(meta.integrationStatus, 'partial');
  assert.match(meta.senateError ?? '', /maintenance/);
  assert.equal(meta.houseFilingsParsed, 693);
  assert.equal(meta.housePtrFilingsParsedThisRun, 13);
  assert.equal(meta.membersQueriedThisRun, 2);
  assert.match(meta.scope ?? '', /^scoped:/);
  assert.match(meta.note, /455 transaction/);
});

test('S000033 Senate eFD 503 empty trades must use honest-gap label (never silent empty)', () => {
  const disk = JSON.parse(
    readFileSync(
      path.join(process.cwd(), 'lib/data/generated/profiles/S000033/trades.json'),
      'utf8',
    ),
  ) as { bioguideId: string; status: string; note: string; trades: unknown[] };

  assert.equal(disk.bioguideId, S000033_TRADES_FETCH_FAILED_KNOWN_GOOD.bioguideId);
  assert.equal(disk.trades.length, 0);
  assert.equal(disk.status, 'fetch-failed');
  assert.match(disk.note, /Senate eFD/);
  assert.match(disk.note, /503/);

  const copy = tradesEmptyStateCopy({
    status: disk.status,
    note: disk.note,
    name: 'Bernie Sanders',
  });
  assert.equal(copy.headline, TRADES_HONEST_GAP_LABEL);
  assert.equal(copy.isHonestGap, true);
  assert.match(copy.detail, /Senate eFD/);

  // Frozen bad: silent empty must be rejected by the same detector.
  assert.equal(
    isTradesFetchFailedGap({
      status: TRADES_SILENT_EMPTY_KNOWN_BAD.status,
      note: TRADES_SILENT_EMPTY_KNOWN_BAD.note,
    }),
    false,
  );
  const silent = tradesEmptyStateCopy({
    status: TRADES_SILENT_EMPTY_KNOWN_BAD.status,
    note: TRADES_SILENT_EMPTY_KNOWN_BAD.note,
    name: 'Bernie Sanders',
  });
  assert.notEqual(silent.headline, TRADES_HONEST_GAP_LABEL);

  // Snapshot entry note (mega-bundle) also maps to fetch-failed + honest-gap UI.
  const fromSnapshot = stockEntryToProfileTradesFile('S000033', {
    trades: [],
    note: 'Senate eFD sync unavailable (Senate eFD search API under maintenance (HTTP 503)). Demo trades on profile, if any, are labeled separately.',
  });
  assert.equal(fromSnapshot.status, 'fetch-failed');
  assert.equal(
    tradesEmptyStateCopy({
      status: fromSnapshot.status,
      note: fromSnapshot.note,
      name: 'Bernie Sanders',
    }).headline,
    TRADES_HONEST_GAP_LABEL,
  );

  // UI must wire the helper + canonical label (regression: "No stock trades reported" alone).
  const uiSrc = readFileSync(
    path.join(process.cwd(), 'components/politicians/StockTrades.tsx'),
    'utf8',
  );
  assert.match(uiSrc, /tradesEmptyStateCopy/);
  assert.match(uiSrc, /@\/lib\/tradesHonestGap/);
  assert.match(uiSrc, /tradesStatus/);
  assert.match(uiSrc, /tradesNote/);
  const clientSrc = readFileSync(
    path.join(process.cwd(), 'components/politicians/PoliticianProfileClient.tsx'),
    'utf8',
  );
  assert.match(clientSrc, /TRADES_HONEST_GAP_LABEL/);
  assert.match(clientSrc, /tradesShowHonestGap/);
  assert.match(clientSrc, /@\/lib\/tradesHonestGap/);
  const pageSrc = readFileSync(
    path.join(process.cwd(), 'app/politicians/[id]/page.tsx'),
    'utf8',
  );
  assert.match(pageSrc, /stockEntryToProfileTradesFile/);
  assert.match(pageSrc, /tradesStatus=/);
});
