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
import { FloridaStateEconomicPanel } from '@/components/records/FloridaRecordPanel';
import { FloridaCourtDecisionsSection } from '@/components/states/FloridaCourtDecisionRow';
import { FloridaLegislationSection } from '@/components/states/FloridaLegislationBillRow';
import FloridaStatePoliticians from '@/components/states/FloridaStatePoliticians';

const SUPPORTED_STATES: Record<string, { name: string; title: string }> = {
  FL: {
    name: 'Florida',
    title: 'Florida — State Profile',
  },
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
    title: `${meta.title} | The Ledger`,
    description: `Verified Florida economic indicators, office-ranked officials, and Supreme Court decisions.`,
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

  return (
    <div className="min-h-screen bg-[#06101e]">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10 space-y-10">
        <header>
          <p className="text-[10px] uppercase tracking-widest text-[#c8a951]/80 font-semibold">State profile</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">{meta.name}</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">
            Economic indicators, office-ranked elected officials, and Florida Supreme Court decisions — sourced from existing verified datasets.
          </p>
        </header>

        <FloridaStateEconomicPanel slice={economic} />

        <FloridaStatePoliticians politicians={politicians} stateName={meta.name} />

        {legiscanSection && legiscanSection.records.length > 0 && (
          <FloridaLegislationSection
            records={legiscanSection.records}
            metaNote={legiscanSection.meta.note}
          />
        )}

        <FloridaCourtDecisionsSection
          title="Florida Supreme Court Decisions"
          records={courts.records}
          metaNote={courts.meta.note}
        />
      </div>
    </div>
  );
}
