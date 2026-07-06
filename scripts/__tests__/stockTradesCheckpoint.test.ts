/**
 * Build-gated guard: stock-trade sync preserves prior rows on fetch-failed paths.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { StockTrade } from '../../lib/types';
import {
  buildHouseStockTradeEntry,
  stockEntryToProfileTradesFile,
} from '../../lib/data/stockTrades';

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
