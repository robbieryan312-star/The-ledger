import type { ReactNode } from 'react';
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

function StateSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-widest text-[#c8a951]/80 font-semibold">{eyebrow}</p>
        <h2 className="text-white font-bold text-xl mt-1">{title}</h2>
        {description && (
          <p className="text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
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
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10 space-y-12">
        <header className="pb-2 border-b border-[#1e3a5f]/50">
          <p className="text-[10px] uppercase tracking-widest text-[#c8a951]/80 font-semibold">State profile</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">{meta.name}</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">
            Economic indicators, office-ranked elected officials, and Florida Supreme Court decisions — sourced from verified datasets.
          </p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs" aria-label="On this page">
            <a href="#economy" className="text-[#c8a951]/80 hover:text-[#c8a951] transition-colors">Economy</a>
            <a href="#politicians" className="text-[#c8a951]/80 hover:text-[#c8a951] transition-colors">Officials</a>
            {legiscanSection && legiscanSection.records.length > 0 && (
              <a href="#legislation" className="text-[#c8a951]/80 hover:text-[#c8a951] transition-colors">Legislation</a>
            )}
            <a href="#courts" className="text-[#c8a951]/80 hover:text-[#c8a951] transition-colors">Courts</a>
          </nav>
        </header>

        <StateSection
          id="economy"
          eyebrow="By the numbers"
          title="Florida economy"
          description="Demographics, labor market, and education-tier earnings from Census ACS and BLS (national CPS reference where Florida-specific series are unavailable)."
        >
          <FloridaStateEconomicPanel slice={economic} />
        </StateSection>

        <FloridaStatePoliticians politicians={politicians} stateName={meta.name} />

        {legiscanSection && legiscanSection.records.length > 0 && (
          <div id="legislation" className="scroll-mt-24 space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#c8a951]/80 font-semibold">State capitol</p>
              <h2 className="text-white font-bold text-xl mt-1">Recent legislation</h2>
              <p className="text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
                Florida bills tracked from LegiScan — sample records from verified sync.
              </p>
            </div>
            <FloridaLegislationSection
              records={legiscanSection.records}
              metaNote={legiscanSection.meta.note}
            />
          </div>
        )}

        <div id="courts" className="scroll-mt-24 space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#c8a951]/80 font-semibold">Judiciary</p>
            <h2 className="text-white font-bold text-xl mt-1">Florida Supreme Court decisions</h2>
            <p className="text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
              Recent opinions from CourtListener when API access is available.
            </p>
          </div>
          <FloridaCourtDecisionsSection
            title="On file"
            records={courts.records}
            metaNote={courts.meta.note}
          />
        </div>
      </div>
    </div>
  );
}
