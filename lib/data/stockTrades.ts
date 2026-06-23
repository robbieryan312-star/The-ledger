/**
 * stockTrades.ts — read generated STOCK Act snapshot and merge official trades
 * over hand-authored demo rows on featured profiles.
 */
import type { Source, StockTrade } from '../types';
import stockSnapshot from './generated/stockTrades.json';

export interface StockTradeEntry {
  politicianId: string;
  bioguideId?: string;
  chamber: string;
  trades: StockTrade[];
  source: Source;
  asOf: string;
  note?: string;
}

export interface StockTradesSnapshotMeta {
  asOf: string;
  featuredQueried: number;
  withTradeData: number;
  integrationStatus: 'stub' | 'partial' | 'live';
  note: string;
  nextSteps: string[];
  senateReachable?: boolean;
  senateError?: string;
  houseFilingsParsed?: number;
  totalOfficialTrades?: number;
}

export interface StockTradesSnapshot {
  meta: StockTradesSnapshotMeta;
  byPoliticianId: Record<string, StockTradeEntry>;
}

const snapshot = stockSnapshot as StockTradesSnapshot;

export function getStockTradesSnapshot(): StockTradesSnapshot {
  return snapshot;
}

export function getOfficialStockTrades(politicianId: string): StockTradeEntry | undefined {
  return snapshot.byPoliticianId[politicianId];
}

export function hasOfficialStockTrades(politicianId: string): boolean {
  const entry = snapshot.byPoliticianId[politicianId];
  return !!entry && entry.trades.length > 0;
}

export function officialStockTradeCount(): number {
  return Object.values(snapshot.byPoliticianId).reduce((sum, e) => sum + e.trades.length, 0);
}

export function politiciansWithOfficialTrades(): number {
  return Object.values(snapshot.byPoliticianId).filter((e) => e.trades.length > 0).length;
}

/**
 * Merge official Tier-1 trades over demo rows.
 * Official trades win when present; demo trades fill gaps and are flagged in the UI.
 */
export function mergeStockTrades(
  politicianId: string,
  demoTrades: StockTrade[],
  recordType?: 'featured' | 'lightweight',
): {
  trades: StockTrade[];
  officialEntry?: StockTradeEntry;
  usingOfficialTrades: boolean;
  demoTradeCount: number;
} {
  if (recordType === 'lightweight') {
    return { trades: [], usingOfficialTrades: false, demoTradeCount: 0 };
  }

  const official = getOfficialStockTrades(politicianId);
  const officialTrades = official?.trades ?? [];

  if (officialTrades.length > 0) {
    return {
      trades: [...officialTrades].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      officialEntry: official,
      usingOfficialTrades: true,
      demoTradeCount: 0,
    };
  }

  return {
    trades: [...demoTrades].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
    officialEntry: official,
    usingOfficialTrades: false,
    demoTradeCount: demoTrades.length,
  };
}
