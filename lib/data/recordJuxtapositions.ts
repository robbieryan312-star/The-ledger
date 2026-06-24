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
    trade.type === 'Purchase' ? 'bought' : trade.type === 'Sale' ? 'sold' : 'disclosed';
  const company = trade.companyName.split(',')[0].split('(')[0].trim();
  const voteAction = vote.vote === 'Yea' ? 'voted yes' : vote.vote === 'Nay' ? 'voted no' : `voted ${vote.vote.toLowerCase()}`;

  const billLabel =
    vote.billSummary ??
    (vote.billTitle.length > 60 || /^H\.R\.\d+$/i.test(vote.billTitle)
      ? vote.billId
      : vote.billTitle);

  const timing =
    days === 0
      ? 'the same day as the trade was filed'
      : days === 1
        ? '1 day after the trade was filed'
        : `${days} days after the trade was filed`;

  if (connection === 'sector') {
    return `On ${trade.date}, ${tradeVerb} ${trade.ticker} (${company}). On ${vote.date}, ${voteAction} on ${billLabel} — ${timing}; the bill topic overlaps the ${trade.sector.toLowerCase()} sector in integrated records.`;
  }

  return `On ${trade.date}, ${tradeVerb} ${trade.ticker} (${company}; STOCK Act filing dated ${trade.disclosureDate}). On ${vote.date}, ${voteAction} on ${billLabel} — ${timing}. These dates are close in the official record; proximity alone does not show wrongdoing.`;
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
