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
import Link from 'next/link';

export const metadata = {
  title: 'Politicians — The Ledger',
  description:
    'Browse every current federal official — Congress, governors, executive branch, and judiciary — with sourced office labels from authoritative records.',
};

function buildBrowsePoliticians(): PoliticiansListEntry[] {
  return allPoliticians.map((p) => {
    const { trades } = mergeStockTrades(p.id, p.stockTrades, p.recordType);
    const fec = getFecFinance(p.id);
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

      <div className="mb-10">
        <h2 className="text-white text-sm font-bold mb-4 uppercase tracking-wide">Featured Officials</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allPoliticians.slice(0, 6).map((p) => (
            <Link
              key={p.id}
              href={`/politicians/${p.id}`}
              className="p-3 rounded-lg bg-[#0d1f35] hover:bg-[#1e3a5f] transition-colors border border-[#1e3a5f]"
            >
              <div className="text-white text-xs font-medium truncate">{p.name}</div>
              <div className="text-gray-400 text-[10px] truncate">{resolveOffice(p).label}</div>
            </Link>
          ))}
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
