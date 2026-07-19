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
  getFloridaMetroCpiSample,
  getFloridaMericColSample,
  getFloridaRppSample,
  getFloridaStateRankingsSample,
  getFloridaTaxSample,
} from '@/lib/data/floridaDashboard';
import { SUPPORTED_STATES } from '@/lib/data/supportedStates';

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
  const meric = getFloridaMericColSample();
  const metroCpi = getFloridaMetroCpiSample();
  const rankings = getFloridaStateRankingsSample();
  const taxes = getFloridaTaxSample();

  return (
    <FloridaStateDashboard
      economic={economic}
      politicians={politicians}
      legislationRecords={legiscanSection?.records ?? []}
      legislationNote={legiscanSection?.meta.note}
      courtRecords={courts.records}
      courtNote={courts.meta.note}
      counties={{
        records: counties.records,
        stateSummary: counties.stateSummary,
        meta: {
          provenance: counties.meta.provenance,
          fetchedLive: counties.meta.fetchedLive,
          censusFetchedLive: counties.meta.censusFetchedLive,
          blsFetchedLive: counties.meta.blsFetchedLive,
          attainmentFetchedLive: counties.meta.attainmentFetchedLive,
        },
      }}
      rpp={rpp}
      meric={meric}
      metroCpi={metroCpi}
      rankings={rankings}
      taxes={taxes}
    />
  );
}
