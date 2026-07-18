import { Suspense } from 'react';
import {
  allPoliticians,
  getCoverageStats,
  isCurrentlyInOffice,
  resolveOffice,
  rosterStates,
} from '@/lib/data/allPoliticians';
import { fecFinanceCount, getFecFinance } from '@/lib/data/fecFinance';
import { congressVotesCount, mergeVotingRecord } from '@/lib/data/congressVotes';
import { mergeStockTrades } from '@/lib/data/stockTrades';
import {
  buildPoliticianSearchIndex,
  buildStateRosterIndex,
} from '@/lib/data/politicianSearchIndex';
import PoliticiansContent, { type PoliticiansListEntry } from './PoliticiansContent';

export const metadata = {
  title: 'Politicians — The Ledger',
  description:
    'Browse every current federal official — Congress, governors, executive branch, and judiciary — with sourced office labels from authoritative records.',
};

function buildBrowsePoliticians(): PoliticiansListEntry[] {
  return allPoliticians.map((p) => {
    const { trades } = mergeStockTrades(p.id, p.stockTrades, p.recordType, p.bioguideId);
    const fec = getFecFinance(p.id, p.bioguideId);
    return {
      ...p,
      resolvedOffice: resolveOffice(p),
      inOfficeResolved: isCurrentlyInOffice(p),
      totalRaisedSort: fec?.receipts ?? p.campaignFinance.totalRaised,
      newestTradeTs:
        trades.length > 0
          ? Math.max(...trades.map((t) => new Date(t.date).getTime()))
          : 0,
      displayVoteCount: mergeVotingRecord(
        p.id,
        p.votingRecord,
        p.recordType,
        p.bioguideId,
      ).votes.length,
    };
  });
}

export default async function PoliticiansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialSearchParams = await searchParams;
  const stats = getCoverageStats();
  const filedCount = fecFinanceCount();
  const allCount = allPoliticians.length;
  const politicianHits = buildPoliticianSearchIndex();
  const states = buildStateRosterIndex();
  const politicians = buildBrowsePoliticians();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">The people in power, in plain sight.</h1>
        <p className="text-white/60 text-base mb-1">
          Filter by office, party, or issue — office-ranked roster with authoritative labels.
        </p>
        <div className="text-white/40 text-sm mt-3">
          <p><strong>{allCount}</strong> politicians indexed · <strong>{filedCount}</strong> with campaign finance data</p>
          <p><strong>{stats.total}</strong> current officials in authoritative roster</p>
        </div>
      </div>

      <Suspense fallback={<div className="text-gray-500 text-sm">Loading roster…</div>}>
        <PoliticiansContent
          initialSearchParams={initialSearchParams}
          politicians={politicians}
          rosterStates={rosterStates}
          coverageStats={stats}
          fecFinanceCount={filedCount}
          congressVotesCount={congressVotesCount()}
          politicianHits={politicianHits}
          states={states}
        />
      </Suspense>
    </div>
  );
}
