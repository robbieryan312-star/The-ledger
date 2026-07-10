import { notFound } from 'next/navigation';
import {
  getPoliticiansForState,
  isCurrentlyInOffice,
  resolveOffice,
} from '@/lib/data/allPoliticians';
import { getFecFinance } from '@/lib/data/fecFinance';
import { mergeStockTrades } from '@/lib/data/stockTrades';
import { getStateEconomicSlice } from '@/lib/data/slices/stateEconomic';
import { getJudiciaryCourtsSlice } from '@/lib/data/slices/judiciaryCourts';
import { getLegislationFloridaBundle } from '@/lib/data/slices/legislationFlorida';
import { comparePoliticiansByOffice } from '@/lib/politicianSort';
import type { DashboardPolitician } from '@/lib/dashboard/stateRosterClient';
import FloridaStateDashboard from '@/components/states/FloridaStateDashboard';
import {
  getFloridaCountiesSample,
  getFloridaRppSample,
  getFloridaTaxSample,
} from '@/lib/data/floridaDashboard';

const SUPPORTED_STATES: Record<string, { name: string }> = {
  FL: { name: 'Florida' },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const meta = SUPPORTED_STATES[upper];
  if (!meta) return { title: 'State — The Ledger' };
  return {
    title: `${meta.name} — State Profile | The Ledger`,
    description: `Florida state profile: economy, workforce, taxes, officials, legislation, and courts from verified sources.`,
  };
}

function buildStateRoster(stateCode: string): DashboardPolitician[] {
  return getPoliticiansForState(stateCode)
    .map((p) => {
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
      };
    })
    .sort(comparePoliticiansByOffice);
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const meta = SUPPORTED_STATES[upper];
  if (!meta) notFound();

  const economic = getStateEconomicSlice();
  const courts = getJudiciaryCourtsSlice();
  const legislationBundle = getLegislationFloridaBundle();
  const legiscanSection = legislationBundle.sections.find((s) => s.sourceId === 'legiscan');
  const politicians = buildStateRoster(upper);
  const counties = getFloridaCountiesSample();
  const rpp = getFloridaRppSample();
  const taxes = getFloridaTaxSample();

  return (
    <FloridaStateDashboard
      economic={economic}
      politicians={politicians}
      legislationRecords={legiscanSection?.records ?? []}
      legislationNote={legiscanSection?.meta.note}
      courtRecords={courts.records}
      courtNote={courts.meta.note}
      counties={{ records: counties.records, stateSummary: counties.stateSummary }}
      rpp={rpp}
      taxes={taxes}
    />
  );
}
