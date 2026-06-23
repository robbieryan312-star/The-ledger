import type { RecordJuxtaposition, StockTrade, VoteRecord } from '../types';

const MAX_DAYS = 90;
const MAX_RESULTS = 6;

/** Sector keywords for ticker → bill text overlap (factual grouping only). */
const TICKER_KEYWORDS: Record<string, string[]> = {
  GILD: ['health', 'drug', 'pharma', 'medicare', 'medicaid', 'fda', 'nih'],
  LLY: ['health', 'drug', 'pharma', 'medicare', 'medicaid', 'fda', 'obesity'],
  COR: ['health', 'drug', 'pharma', 'distribution'],
  CMG: ['restaurant', 'food', 'consumer'],
  INTC: ['semiconductor', 'chip', 'technology', 'science'],
  XOM: ['energy', 'oil', 'gas', 'petroleum'],
  CVX: ['energy', 'oil', 'gas', 'petroleum'],
};

function daysBetween(a: string, b: string): number {
  return Math.abs(Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function billText(vote: VoteRecord): string {
  return `${vote.billTitle} ${vote.billDescription} ${vote.billId} ${vote.category}`.toLowerCase();
}

function sectorOverlap(trade: StockTrade, vote: VoteRecord): boolean {
  const keywords = [
    ...(TICKER_KEYWORDS[trade.ticker] ?? []),
    trade.sector.toLowerCase(),
    trade.companyName.toLowerCase(),
  ].filter((k) => k.length > 2);
  const text = billText(vote);
  return keywords.some((kw) => text.includes(kw));
}

function factualHeadline(
  trade: StockTrade,
  vote: VoteRecord,
  days: number,
  connection: 'sector' | 'temporal',
): string {
  const tradeVerb =
    trade.type === 'Purchase' ? 'Purchased' : trade.type === 'Sale' ? 'Sold' : 'Disclosed';
  const votePhrase = `voted ${vote.vote} on ${vote.billTitle}`;
  const datePhrase =
    days === 0
      ? 'same day as'
      : days === 1
        ? '1 day from'
        : `${days} days from`;

  if (connection === 'sector') {
    return `${tradeVerb} ${trade.ticker} (${trade.date}); ${votePhrase} (${vote.date}) — ${datePhrase} trade date, bill category overlaps ${trade.sector.toLowerCase()} sector`;
  }
  return `Disclosed ${trade.type.toLowerCase()} of ${trade.ticker} on ${trade.date} (filed ${trade.disclosureDate}); ${votePhrase} on ${vote.date} (${datePhrase} PTR filing)`;
}

function dedupeTrades(trades: StockTrade[]): StockTrade[] {
  const seen = new Set<string>();
  const out: StockTrade[] = [];
  for (const t of trades) {
    const key = `${t.ticker}-${t.date}-${t.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * Find sourced vote/trade pairs for featured profiles.
 * Returns factual headlines only — no inferred motive.
 */
export function findRecordJuxtapositions(
  votes: VoteRecord[],
  trades: StockTrade[],
  options?: { maxDays?: number; maxResults?: number },
): RecordJuxtaposition[] {
  const maxDays = options?.maxDays ?? MAX_DAYS;
  const maxResults = options?.maxResults ?? MAX_RESULTS;

  if (!votes.length || !trades.length) return [];

  const officialVotes = votes.filter((v) => v.source?.tier === 'official');
  const officialTrades = dedupeTrades(trades.filter((t) => t.source?.tier === 'official'));
  if (!officialVotes.length || !officialTrades.length) return [];

  const pairs: Array<RecordJuxtaposition & { sortKey: number }> = [];

  for (const trade of officialTrades) {
    for (const vote of officialVotes) {
      const daysFromTrade = daysBetween(trade.date, vote.date);
      const daysFromDisclosure = daysBetween(trade.disclosureDate, vote.date);
      const days = Math.min(daysFromTrade, daysFromDisclosure);
      if (days > maxDays) continue;

      const hasSector = sectorOverlap(trade, vote);
      const connection: 'sector' | 'temporal' = hasSector ? 'sector' : 'temporal';

      pairs.push({
        id: `${trade.id}-${vote.id}`,
        headline: factualHeadline(trade, vote, days, connection),
        tradeDate: trade.date,
        disclosureDate: trade.disclosureDate,
        voteDate: vote.date,
        daysBetween: days,
        connection,
        trade,
        vote,
        sortKey: hasSector ? days : days + 1000,
      });
    }
  }

  pairs.sort((a, b) => a.sortKey - b.sortKey);

  const used = new Set<string>();
  const results: RecordJuxtaposition[] = [];
  for (const p of pairs) {
    const tradeKey = `${p.trade.ticker}-${p.trade.date}`;
    if (used.has(tradeKey)) continue;
    used.add(tradeKey);
    const { sortKey: _, ...row } = p;
    results.push(row);
    if (results.length >= maxResults) break;
  }

  return results;
}
