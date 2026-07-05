import { allPoliticians } from '@/lib/data/allPoliticians';
import { mergeStockTrades, getStockTradesSnapshot } from '@/lib/data/stockTrades';
import type { Party, StockTrade } from '@/lib/types';
import CongressContent from './CongressContent';

export const metadata = {
  title: 'Congressional Stock Trades — The Ledger',
  description: 'STOCK Act disclosures from Senate and House members, with conflict review indicators.',
};

type TradeWithMeta = StockTrade & {
  politician: string;
  politicianId: string;
  party: Party;
  stateCode: string;
  gainLossPct: number | null;
  gainLossDollar: number | null;
  isOfficial: boolean;
};

function priceMovePct(t: StockTrade): number | null {
  if (t.purchasePriceApprox == null || t.currentPrice == null) return null;
  return ((t.currentPrice - t.purchasePriceApprox) / t.purchasePriceApprox) * 100;
}

function estimatedDollarMove(t: StockTrade): number | null {
  const pct = priceMovePct(t);
  if (pct === null || t.purchasePriceApprox == null || t.currentPrice == null) return null;
  return (t.currentPrice - t.purchasePriceApprox) * ((t.amount ?? t.amountMin) / t.purchasePriceApprox);
}

function buildCongressTrades(): TradeWithMeta[] {
  return allPoliticians
    .filter((p) => (p.chamber === 'house' || p.chamber === 'senate') && p.recordType !== 'lightweight')
    .flatMap((p) => {
      const { trades, usingOfficialTrades } = mergeStockTrades(p.id, p.stockTrades, p.recordType);
      return trades.map((t) => ({
        ...t,
        politician: p.name,
        politicianId: p.id,
        party: p.party,
        stateCode: p.stateCode,
        gainLossPct: priceMovePct(t),
        gainLossDollar: estimatedDollarMove(t),
        isOfficial: usingOfficialTrades,
      }));
    });
}

export default function CongressPage() {
  return (
    <CongressContent
      allTrades={buildCongressTrades()}
      stockMeta={getStockTradesSnapshot().meta}
    />
  );
}
