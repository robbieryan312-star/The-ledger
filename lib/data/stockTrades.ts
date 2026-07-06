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
  /** Cumulative corpus field — carried forward from prior snapshot; not overwritten by scoped runs. */
  houseFilingsParsed?: number;
  /** Filings matched/processed in this run only. */
  housePtrFilingsParsedThisRun?: number;
  houseIndexFailedYears?: number[];
  totalOfficialTrades?: number;
  membersQueriedThisRun?: number;
  scope?: string;
}

export interface StockTradesSnapshot {
  meta: StockTradesSnapshotMeta;
  byPoliticianId: Record<string, StockTradeEntry>;
}

const snapshot = stockSnapshot as StockTradesSnapshot;

export function getStockTradesSnapshot(): StockTradesSnapshot {
  return snapshot;
}

export function getOfficialStockTrades(politicianId: string, bioguideId?: string): StockTradeEntry | undefined {
  return (
    snapshot.byPoliticianId[politicianId] ??
    (bioguideId ? snapshot.byPoliticianId[bioguideId] : undefined)
  );
}

export function hasOfficialStockTrades(politicianId: string, bioguideId?: string): boolean {
  const entry = getOfficialStockTrades(politicianId, bioguideId);
  return !!entry && entry.trades.length > 0;
}

export function officialStockTradeCount(): number {
  return Object.values(snapshot.byPoliticianId).reduce((sum, e) => sum + e.trades.length, 0);
}

export function politiciansWithOfficialTrades(): number {
  return Object.values(snapshot.byPoliticianId).filter((e) => e.trades.length > 0).length;
}

export interface ProfileTradesFile {
  bioguideId: string;
  status: 'filled' | 'honest-gap' | 'fetch-failed';
  note: string;
  trades: StockTrade[];
}

export interface BuildHouseStockTradeEntryInput {
  trades: StockTrade[];
  priorTrades: StockTrade[];
  filingsMatched: number;
  filingsParsedWithRows: number;
  houseIndexFailedYears: number[];
  houseIndexYears: number[];
}

/** Build snapshot entry trades + note for a House PTR sync result (§6 unparsed-filing honesty). */
export function buildHouseStockTradeEntry(input: BuildHouseStockTradeEntryInput): {
  trades: StockTrade[];
  note: string;
} {
  const {
    trades,
    priorTrades,
    filingsMatched,
    filingsParsedWithRows,
    houseIndexFailedYears,
    houseIndexYears,
  } = input;
  const allIndexFailed =
    houseIndexFailedYears.length > 0 && houseIndexFailedYears.length === houseIndexYears.length;
  const unparsedFilings = Math.max(0, filingsMatched - filingsParsedWithRows);

  if (allIndexFailed) {
    return {
      trades: priorTrades,
      note: `fetch-failed: House PTR index unavailable for all years (${houseIndexFailedYears.join(', ')}). Prior good trades preserved.`,
    };
  }

  if (filingsMatched > 0 && filingsParsedWithRows === 0) {
    const unparsedNote = `unparsed-filings: ${filingsMatched} PTR PDF(s) matched but none parsed (likely scanned images). Not a verified zero-trade record.`;
    return {
      trades: priorTrades.length > 0 ? priorTrades : [],
      note:
        priorTrades.length > 0 ? `${unparsedNote} Prior good trades preserved.` : unparsedNote,
    };
  }

  if (trades.length > 0) {
    let note = `${trades.length} official PTR transaction(s) from House Clerk filings.`;
    if (unparsedFilings > 0) {
      note += ` partial: ${unparsedFilings} of ${filingsMatched} filings unparsed.`;
    }
    return { trades, note };
  }

  if (filingsMatched === 0) {
    if (priorTrades.length > 0) {
      return {
        trades: priorTrades,
        note: `${priorTrades.length} official PTR transaction(s) preserved from prior sync. No new filings matched in index window.`,
      };
    }
    return {
      trades: [],
      note:
        'No House PTR filings matched this member in the synced index window — profile demo trades (if any) remain labeled separately.',
    };
  }

  return { trades: priorTrades.length > 0 ? priorTrades : [], note: 'No official PTR rows parsed this run.' };
}

/** Map a snapshot entry to per-profile trades.json (destination view for migrated members). */
export function stockEntryToProfileTradesFile(
  bioguideId: string,
  entry: Pick<StockTradeEntry, 'trades' | 'note'>,
): ProfileTradesFile {
  const note = entry.note?.trim() ?? 'No verified STOCK Act trades integrated for this profile';
  const isFetchFailed = /fetch-failed/i.test(note);
  const hasTrades = entry.trades.length > 0;
  let status: ProfileTradesFile['status'] = 'honest-gap';
  if (hasTrades) status = 'filled';
  else if (isFetchFailed) status = 'fetch-failed';
  return { bioguideId, status, note, trades: entry.trades };
}

export function countTotalOfficialTrades(byPoliticianId: Record<string, StockTradeEntry>): number {
  return Object.values(byPoliticianId).reduce((sum, e) => sum + e.trades.length, 0);
}

export function deriveStockTradesIntegrationStatus(
  byPoliticianId: Record<string, StockTradeEntry>,
  opts: { senateReachable: boolean; senateError?: string },
): StockTradesSnapshotMeta['integrationStatus'] {
  const entries = Object.values(byPoliticianId);
  const withTradeData = entries.filter((e) => e.trades.length > 0).length;
  const featuredQueried = entries.length;
  if (withTradeData === 0) return 'stub';
  if (!opts.senateReachable || opts.senateError) return 'partial';
  if (withTradeData < featuredQueried) return 'partial';
  return 'live';
}

export function buildStockTradesMetaNote(
  withTradeData: number,
  featuredQueried: number,
  totalOfficialTrades: number,
): string {
  if (withTradeData === 0) {
    return 'No official STOCK Act trades in snapshot. Featured profiles keep clearly labeled demo data where present.';
  }
  return `Official STOCK Act PTR sync: ${totalOfficialTrades} transaction(s) across ${featuredQueried} member entries; ${withTradeData} member(s) with at least one official trade.`;
}

export function buildStockTradesNextSteps(
  byPoliticianId: Record<string, StockTradeEntry>,
  opts: {
    senateReachable: boolean;
    senateError?: string;
    houseMemberCount: number;
  },
): string[] {
  const withTradeData = Object.values(byPoliticianId).filter((e) => e.trades.length > 0).length;
  const nextSteps: string[] = [];
  if (
    !opts.senateReachable ||
    opts.senateError?.includes('503') ||
    opts.senateError?.includes('maintenance')
  ) {
    nextSteps.push(
      'Senate: retry efdsearch.senate.gov/search/report/data/ when maintenance ends; parse view/report HTML tables per PTR.',
    );
  }
  if (withTradeData < opts.houseMemberCount) {
    nextSteps.push(
      'House: members without PTR filings (annual FD only) correctly show zero official trades — do not fabricate.',
    );
  }
  nextSteps.push(
    'Merge official rows via lib/data/stockTrades.ts mergeStockTrades(); demo rows fill only when official snapshot is empty.',
  );
  nextSteps.push(
    'Optional: enrich conflict scores by cross-referencing congressVotes.json committee/vote proximity.',
  );
  return nextSteps;
}

export function buildMergedStockTradesMeta(input: {
  asOf: string;
  byPoliticianId: Record<string, StockTradeEntry>;
  priorMeta?: Partial<StockTradesSnapshotMeta>;
  run: {
    membersQueriedThisRun: number;
    scope: string;
    housePtrFilingsParsedThisRun: number;
    houseIndexFailedYears: number[];
    senateReachable: boolean;
    senateError?: string;
    houseMemberCount: number;
  };
}): StockTradesSnapshotMeta {
  const entries = Object.values(input.byPoliticianId);
  const featuredQueried = entries.length;
  const withTradeData = entries.filter((e) => e.trades.length > 0).length;
  const totalOfficialTrades = countTotalOfficialTrades(input.byPoliticianId);
  const integrationStatus = deriveStockTradesIntegrationStatus(input.byPoliticianId, {
    senateReachable: input.run.senateReachable,
    senateError: input.run.senateError,
  });

  return {
    asOf: input.asOf,
    featuredQueried,
    withTradeData,
    integrationStatus,
    note: buildStockTradesMetaNote(withTradeData, featuredQueried, totalOfficialTrades),
    nextSteps: buildStockTradesNextSteps(input.byPoliticianId, {
      senateReachable: input.run.senateReachable,
      senateError: input.run.senateError,
      houseMemberCount: input.run.houseMemberCount,
    }),
    senateReachable: input.run.senateReachable,
    senateError: input.run.senateError,
    houseFilingsParsed: input.priorMeta?.houseFilingsParsed ?? 0,
    housePtrFilingsParsedThisRun: input.run.housePtrFilingsParsedThisRun,
    houseIndexFailedYears: input.run.houseIndexFailedYears,
    totalOfficialTrades,
    membersQueriedThisRun: input.run.membersQueriedThisRun,
    scope: input.run.scope,
  };
}

export function mergeStockTrades(
  politicianId: string,
  demoTrades: StockTrade[],
  recordType?: 'featured' | 'lightweight',
  bioguideId?: string,
): {
  trades: StockTrade[];
  officialEntry?: StockTradeEntry;
  usingOfficialTrades: boolean;
  demoTradeCount: number;
} {
  const official = getOfficialStockTrades(politicianId, bioguideId);
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

  if (recordType === 'lightweight') {
    return { trades: [], usingOfficialTrades: false, demoTradeCount: 0 };
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
