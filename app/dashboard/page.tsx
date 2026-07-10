import {
  allPoliticians,
  isCurrentlyInOffice,
  resolveOffice,
} from '@/lib/data/allPoliticians';
import { fecFinanceCount, getFecFinance } from '@/lib/data/fecFinance';
import { congressVotesCount } from '@/lib/data/congressVotes';
import { mergeStockTrades } from '@/lib/data/stockTrades';
import type { DashboardPolitician } from '@/lib/dashboard/stateRosterClient';
import DashboardContent from './DashboardContent';

export const metadata = {
  title: 'My Ledger — The Ledger',
  description: 'Personalized view of officials and elections for your state and ZIP.',
};

function buildDashboardPoliticians(): DashboardPolitician[] {
  return allPoliticians.map((p) => {
    const { trades } = mergeStockTrades(p.id, p.stockTrades, p.recordType, p.bioguideId);
    const fec = getFecFinance(p.id, p.bioguideId);
    return {
      ...p,
      resolvedOffice: resolveOffice(p),
      inOfficeResolved: isCurrentlyInOffice(p),
      totalRaisedSort: fec?.receipts ?? p.campaignFinance.totalRaised,
      newestTradeTs: trades.length > 0
        ? Math.max(...trades.map((t) => new Date(t.date).getTime()))
        : 0,
    };
  });
}

export default function DashboardPage() {
  return (
    <DashboardContent
      politicians={buildDashboardPoliticians()}
      fecFinanceCount={fecFinanceCount()}
      congressVotesCount={congressVotesCount()}
    />
  );
}
