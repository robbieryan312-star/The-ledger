import type { ReactNode } from 'react';
import type { DashboardPolitician } from '@/lib/dashboard/stateRosterClient';
import type { StateEconomicSlice, StateEducationLaborTier, SnapshotRecordRow } from '@/lib/types/snapshotTypes';
import {
  deltaVsMonthsAgo,
  displayValue,
  employmentRatePercent,
  formatDelta,
  formatPercent,
  indicatorRawValue,
  populationHeroText,
} from '@/lib/format/stateEconomicDisplay';
import { formatCompactCurrency, formatCompact } from '@/lib/format/number';
import TierDot from '@/components/ui/TierDot';
import FloridaStatePoliticians from '@/components/states/FloridaStatePoliticians';
import { FloridaLegislationSection } from '@/components/states/FloridaLegislationBillRow';
import { FloridaCourtDecisionsSection } from '@/components/states/FloridaCourtDecisionRow';

export type FloridaCountyRow = {
  fips: string;
  name: string;
  population: number;
  medianHouseholdIncome: number;
  medianHomeValue: number;
  unemploymentRate: number;
};

export type FloridaDashboardProps = {
  economic: StateEconomicSlice;
  politicians: DashboardPolitician[];
  legislationRecords: SnapshotRecordRow[];
  legislationNote?: string;
  courtRecords: SnapshotRecordRow[];
  courtNote?: string;
  counties: {
    records: FloridaCountyRow[];
    stateSummary: {
      populationRank: number;
      populationGrowthPct: number;
      attainment: {
        hsPlusPct: number;
        someCollegePct: number;
        bachelorsPct: number;
        graduatePct: number;
        bachelorsPlusPct: number;
      };
    };
  };
  rpp: {
    state: {
      allItemsIndex: number;
      period: string;
      components: { label: string; index: number }[];
      metros: { name: string; index: number }[];
    };
  };
  taxes: {
    singleFiler: {
      incomeLevels: number[];
      federalTax: number[];
      floridaStateTax: number[];
      totalInFlorida: number[];
    };
    stateComparison: { state: string; extraStateTax: number[] }[];
    totalBurden: {
      salesTaxAvgPct: number;
      propertyEffectivePct: number;
      totalStateLocalPct: number;
      usAveragePct: number;
    };
    meta: { asOf: string };
  };
};

function findEconomicIndicator(slice: StateEconomicSlice, labelIncludes: string) {
  return slice.indicators.find((i) => i.label.toLowerCase().includes(labelIncludes.toLowerCase()));
}

function topBottomCounties(
  records: FloridaCountyRow[],
  key: keyof Pick<FloridaCountyRow, 'population' | 'medianHouseholdIncome' | 'medianHomeValue' | 'unemploymentRate'>,
  n = 5,
) {
  const sorted = [...records].sort((a, b) => (b[key] as number) - (a[key] as number));
  return {
    top: sorted.slice(0, n),
    bottom: [...sorted].reverse().slice(0, n),
  };
}

const NAV = [
  { href: '#section-01', label: 'Economy & cost of living' },
  { href: '#section-02', label: 'Jobs & workforce' },
  { href: '#section-03', label: 'Taxes' },
  { href: '#section-04', label: 'Officials' },
  { href: '#section-05', label: 'Legislation' },
  { href: '#section-06', label: 'Courts' },
] as const;

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const pts = [...values].reverse().map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="text-[#d8b45a]" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={pts.join(' ')} />
    </svg>
  );
}

function CountyMiniRows({ rows, valueKey, format }: { rows: FloridaCountyRow[]; valueKey: keyof FloridaCountyRow; format: (v: number) => string }) {
  return (
    <div className="space-y-1">
      {rows.map((r, i) => (
        <div key={r.fips} className="grid grid-cols-[auto_1fr_auto] gap-2 text-[11px] text-[#b4c0cf] py-0.5">
          <span className="text-[#54606f] font-mono text-[10px]">{i + 1}</span>
          <span className="truncate">{r.name}</span>
          <span className="font-mono text-[#eef1f6]">{format(r[valueKey] as number)}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tier,
  children,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  tier: 'official' | 'nonpartisan' | 'media' | 'alleged' | 'unverified';
  children?: ReactNode;
}) {
  return (
    <div className="relative bg-gradient-to-b from-[#0f1e30] to-[#0d1826] border border-white/[0.055] rounded-[13px] p-4 overflow-hidden min-w-0">
      <div className="absolute top-3 right-3">
        <TierDot tier={tier} />
      </div>
      <p className="text-[11px] text-[#748396] pr-6">{label}</p>
      <p className="text-[26px] font-semibold text-[#eef1f6] tracking-tight mt-1.5 leading-none">{value}</p>
      {sub && <div className="text-[11.5px] text-[#b4c0cf] mt-2 flex flex-wrap items-center gap-1.5">{sub}</div>}
      {children}
    </div>
  );
}

function SectionShell({
  id,
  eyebrow,
  title,
  note,
  sourceLine,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  note?: string;
  sourceLine?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-7 border-b border-white/[0.055] last:border-b-0">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="font-mono text-[10.5px] tracking-widest text-[#d8b45a]">{eyebrow}</span>
        <h2 className="text-base font-semibold text-[#eef1f6]">{title}</h2>
      </div>
      {note && <p className="text-[12.5px] text-[#748396] mb-4 max-w-prose">{note}</p>}
      {children}
      {sourceLine && (
        <p className="text-[10px] text-[#54606f] mt-4 pt-3 border-t border-white/[0.055]">{sourceLine}</p>
      )}
    </section>
  );
}

function EducationEarningsBlock({ tiers, note }: { tiers: StateEducationLaborTier[]; note?: string }) {
  if (!tiers.length) return null;
  return (
    <div
      className="mt-4 bg-gradient-to-b from-[#0f1e30] to-[#0d1826] border border-white/[0.055] rounded-[14px] p-4 sm:p-5 overflow-x-auto"
      data-testid="fl-education-earnings-panel"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#eef1f6]">Median earnings &amp; unemployment by education level</p>
        {note && <p className="text-[11px] text-[#748396] mt-1">{note}</p>}
        <div className="hidden sm:grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)] gap-3 pt-3 pb-1 text-[9.5px] uppercase tracking-wide text-[#54606f]">
          <span>Education</span>
          <span className="text-right">Annual pay</span>
          <span className="text-right">Unemployment</span>
          <span />
        </div>
        <div className="divide-y divide-white/[0.055]">
          {tiers.map((tier) => (
            <div
              key={tier.educationLevel}
              className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)] gap-2 sm:gap-3 py-3 items-center min-w-0"
            >
              <p className="text-[12.5px] text-[#eef1f6] break-words">{tier.educationLevel}</p>
              <p className="text-sm font-mono text-[#eef1f6] sm:text-right">
                {tier.medianAnnualEarnings != null ? formatCompactCurrency(tier.medianAnnualEarnings) : '—'}
              </p>
              <p className="text-sm font-mono text-[#748396] sm:text-right">
                {tier.unemploymentRate != null ? formatPercent(tier.unemploymentRate) : (
                  <span className="italic text-[#54606f]" title={tier.unemploymentGapReason}>not available</span>
                )}
              </p>
              <div className="hidden sm:block h-2 rounded bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded bg-gradient-to-r from-[#b8922f] to-[#d8b45a]"
                  style={{ width: `${Math.min(100, ((tier.medianAnnualEarnings ?? 0) / 110000) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UnemploymentChart({ history }: { history: { period: string; value: number }[] }) {
  if (history.length < 2) return null;
  const values = history.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 320;
  const h = 80;
  const pts = [...values].reverse().map((v, i) => {
    const x = 24 + (i / (values.length - 1)) * (w - 48);
    const y = 12 + (h - 24) - ((v - min) / range) * (h - 28);
    return `${x},${y}`;
  });
  return (
    <div className="mt-3 rounded-[14px] border border-white/[0.055] bg-gradient-to-b from-[#0f1e30] to-[#0d1826] p-4">
      <p className="text-[13px] font-semibold text-[#eef1f6]">Unemployment rate — trailing 12 months</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md mt-2 text-[#d8b45a]">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={pts.join(' ')} />
      </svg>
    </div>
  );
}

export default function FloridaStateDashboard({
  economic,
  politicians,
  legislationRecords,
  legislationNote,
  courtRecords,
  courtNote,
  counties,
  rpp,
  taxes,
}: FloridaDashboardProps) {

  const pop = findEconomicIndicator(economic, 'population');
  const income = findEconomicIndicator(economic, 'median household income');
  const home = findEconomicIndicator(economic, 'median home value');
  const unemployment = findEconomicIndicator(economic, 'unemployment rate');
  const employment = findEconomicIndicator(economic, 'employment');
  const unemploymentLevel = findEconomicIndicator(economic, 'unemployment level');
  const laborForce = findEconomicIndicator(economic, 'labor force');

  const popByCounty = topBottomCounties(counties.records, 'population');
  const incomeByCounty = topBottomCounties(counties.records, 'medianHouseholdIncome');
  const homeByCounty = topBottomCounties(counties.records, 'medianHomeValue');
  const unempByCounty = topBottomCounties(counties.records, 'unemploymentRate');

  const empRate = unemployment ? employmentRatePercent(unemployment) : null;
  const unempDelta = unemployment?.history ? deltaVsMonthsAgo(unemployment.history, 12) : null;
  const popHero = pop ? populationHeroText(pop) : { compact: '—', full: '—' };

  const incomeNatDelta =
    income?.nationalValue != null && Number.isFinite(income.nationalValue)
      ? indicatorRawValue(income)! - income.nationalValue
      : null;
  const homeNatDelta =
    home?.nationalValue != null && Number.isFinite(home.nationalValue)
      ? ((indicatorRawValue(home)! - home.nationalValue) / home.nationalValue) * 100
      : null;
  const rppNatDelta = 100 - rpp.state.allItemsIndex;
  const attain = counties.stateSummary.attainment;
  const bachelorsNatDelta = attain.bachelorsPlusPct - 35.5;

  return (
    <div className="max-w-[1160px] mx-auto grid grid-cols-1 lg:grid-cols-[248px_1fr] min-h-screen bg-[#060a11]">
      <aside className="lg:sticky lg:top-0 lg:h-screen flex flex-col gap-6 p-5 lg:p-6 border-b lg:border-b-0 lg:border-r border-white/[0.055] bg-gradient-to-b from-[#0a1220] to-[#080e18]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-5 rounded relative overflow-hidden shadow shrink-0" aria-hidden>
            <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,#c8433a_0_20%,#f4f4f2_20%_40%,#c8433a_40%_60%,#f4f4f2_60%_80%,#c8433a_80%_100%)]" />
            <div className="absolute top-0 left-0 bottom-0 w-[44%] bg-[#25457a]" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#eef1f6]">Florida</p>
            <p className="text-[11px] text-[#748396]">State profile</p>
          </div>
        </div>
        <nav className="flex lg:flex-col flex-wrap gap-1" aria-label="Section navigation">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] text-[#b4c0cf] hover:text-[#eef1f6] hover:bg-[#d8b45a]/10 rounded-lg px-3 py-2 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="lg:mt-auto pt-4 border-t border-white/[0.055] space-y-4">
          {income && (
            <div>
              <p className="text-[10.5px] uppercase tracking-wide text-[#54606f]">Median income</p>
              <p className="text-xl font-semibold text-[#eef1f6] mt-0.5">{displayValue(income)}</p>
            </div>
          )}
          {empRate != null && (
            <div>
              <p className="text-[10.5px] uppercase tracking-wide text-[#54606f]">Employment rate</p>
              <p className="text-xl font-semibold text-[#eef1f6] mt-0.5">{formatPercent(empRate)}</p>
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0 px-4 sm:px-8 py-7 pb-16">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-6 border-b border-white/[0.055]">
          <div>
            <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-[#d8b45a]">State profile</p>
            <h1 className="text-3xl font-semibold text-[#eef1f6] mt-2 tracking-tight">Florida</h1>
            <p className="text-[13.5px] text-[#b4c0cf] mt-2 max-w-prose leading-relaxed">
              Verified economic indicators, office-ranked officials, legislation, and court decisions — sourced from federal and state records.
            </p>
          </div>
          {pop && (
            <div className="text-left sm:text-right shrink-0">
              <p className="text-[10.5px] uppercase tracking-wide text-[#748396]">Population</p>
              <p className="text-4xl font-semibold text-[#eef1f6] tracking-tight mt-1">
                {popHero.compact}
              </p>
              <details className="mt-2 text-[11px] text-[#748396]">
                <summary className="cursor-pointer text-[#d8b45a] list-none">
                  ▲{counties.stateSummary.populationGrowthPct}%/yr · #{counties.stateSummary.populationRank} largest state
                </summary>
                <div className="mt-2 text-left sm:text-right border-t border-dashed border-white/10 pt-2">
                  <p className="text-[9.5px] uppercase text-[#54606f] mb-1">Top counties by population</p>
                  <CountyMiniRows rows={popByCounty.top} valueKey="population" format={(v) => formatCompact(v)} />
                </div>
              </details>
            </div>
          )}
        </header>

        <SectionShell
          id="section-01"
          eyebrow="§01"
          title="Economy & cost of living"
          sourceLine={
            <>
              Source: U.S. Census Bureau ACS (county sample n={counties.records.length}) · BEA Regional Price Parities
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {income && (
              <StatCard
                label="Median household income"
                value={displayValue(income)}
                tier="official"
                sub={
                  incomeNatDelta != null && (
                    <span className={incomeNatDelta <= 0 ? 'text-[#54ac8b]' : 'text-[#d17b6f]'}>
                      {formatDelta(-incomeNatDelta, 'USD')} vs U.S. average
                    </span>
                  )
                }
              >
                {income.history && <div className="mt-2"><MiniSparkline values={income.history.map((h) => h.value)} /></div>}
                <details className="mt-2">
                  <summary className="text-[11px] text-[#d8b45a] cursor-pointer list-none">Counties by income ▾</summary>
                  <div className="mt-2 pt-2 border-t border-dashed border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9.5px] uppercase text-[#54606f] mb-1">Highest</p>
                      <CountyMiniRows rows={incomeByCounty.top} valueKey="medianHouseholdIncome" format={(v) => formatCompactCurrency(v)} />
                    </div>
                    <div>
                      <p className="text-[9.5px] uppercase text-[#54606f] mb-1">Lowest</p>
                      <CountyMiniRows rows={incomeByCounty.bottom} valueKey="medianHouseholdIncome" format={(v) => formatCompactCurrency(v)} />
                    </div>
                  </div>
                </details>
              </StatCard>
            )}
            {home && (
              <StatCard
                label="Median home value"
                value={displayValue(home)}
                tier="official"
                sub={
                  homeNatDelta != null && (
                    <span>{homeNatDelta.toFixed(0)}% vs U.S. average</span>
                  )
                }
              >
                {home.history && <div className="mt-2"><MiniSparkline values={home.history.map((h) => h.value)} /></div>}
                <details className="mt-2">
                  <summary className="text-[11px] text-[#d8b45a] cursor-pointer list-none">Counties by home value ▾</summary>
                  <div className="mt-2 pt-2 border-t border-dashed border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9.5px] uppercase text-[#54606f] mb-1">Most expensive</p>
                      <CountyMiniRows rows={homeByCounty.top} valueKey="medianHomeValue" format={(v) => formatCompactCurrency(v)} />
                    </div>
                    <div>
                      <p className="text-[9.5px] uppercase text-[#54606f] mb-1">Most affordable</p>
                      <CountyMiniRows rows={homeByCounty.bottom} valueKey="medianHomeValue" format={(v) => formatCompactCurrency(v)} />
                    </div>
                  </div>
                </details>
              </StatCard>
            )}
            <StatCard
              label="Cost of living index"
              value={`${rpp.state.allItemsIndex}`}
              tier="official"
              sub={<span>U.S. = 100 · {rppNatDelta.toFixed(1)}% below U.S. average</span>}
            >
              <details className="mt-2">
                <summary className="text-[11px] text-[#d8b45a] cursor-pointer list-none">Components & metros ▾</summary>
                <div className="mt-2 pt-2 border-t border-dashed border-white/10 space-y-3">
                  <div>
                    <p className="text-[9.5px] uppercase text-[#54606f] mb-1">Components (RPP)</p>
                    {rpp.state.components.map((c) => (
                      <div key={c.label} className="flex justify-between text-[11px] text-[#b4c0cf] py-0.5">
                        <span>{c.label}</span>
                        <span className="font-mono">{c.index}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[9.5px] uppercase text-[#54606f] mb-1">Metro areas</p>
                    {rpp.state.metros.map((m) => (
                      <div key={m.name} className="flex justify-between text-[11px] text-[#b4c0cf] py-0.5">
                        <span className="truncate pr-2">{m.name}</span>
                        <span className="font-mono shrink-0">{m.index}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </StatCard>
          </div>
        </SectionShell>

        <SectionShell
          id="section-02"
          eyebrow="§02"
          title="Jobs & workforce"
          sourceLine={<>Source: BLS LAUS + CPS education tiers (national reference where FL series unavailable) · {economic.meta.asOf}</>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unemployment && empRate != null && (
              <StatCard
                label="Employment rate"
                value={formatPercent(empRate)}
                tier="official"
                sub={
                  <>
                    {unemployment.nationalValue != null && (
                      <span>{formatDelta(empRate - (100 - unemployment.nationalValue), '%')} vs U.S.</span>
                    )}
                    <div className="w-full mt-2 pt-2 border-t border-dashed border-white/[0.055] text-[11.5px]">
                      Unemployment <b className="text-[#eef1f6]">{displayValue(unemployment)}</b>
                      {unempDelta && (
                        <span className="text-[#54ac8b] ml-1">
                          {formatDelta(-unempDelta.delta, '%')} vs a year ago
                        </span>
                      )}
                    </div>
                  </>
                }
              >
                <details className="mt-2">
                  <summary className="text-[11px] text-[#d8b45a] cursor-pointer list-none">Workforce, counties & trend ▾</summary>
                  <div className="mt-2 pt-2 border-t border-dashed border-white/10 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {laborForce && <div><p className="text-[#54606f] uppercase text-[10px]">Labor force</p><p className="font-semibold text-[#eef1f6]">{displayValue(laborForce)}</p></div>}
                      {employment && <div><p className="text-[#54606f] uppercase text-[10px]">Employed</p><p className="font-semibold text-[#eef1f6]">{displayValue(employment)}</p></div>}
                      {unemploymentLevel && <div><p className="text-[#54606f] uppercase text-[10px]">Unemployed</p><p className="font-semibold text-[#eef1f6]">{displayValue(unemploymentLevel)}</p></div>}
                      <div><p className="text-[#54606f] uppercase text-[10px]">Unemp rate</p><p className="font-semibold text-[#eef1f6]">{displayValue(unemployment)}</p></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9.5px] uppercase text-[#54606f] mb-1">Lowest unemployment</p>
                        <CountyMiniRows rows={unempByCounty.bottom} valueKey="unemploymentRate" format={(v) => `${v}%`} />
                      </div>
                      <div>
                        <p className="text-[9.5px] uppercase text-[#54606f] mb-1">Highest unemployment</p>
                        <CountyMiniRows rows={unempByCounty.top} valueKey="unemploymentRate" format={(v) => `${v}%`} />
                      </div>
                    </div>
                    {unemployment.history && <UnemploymentChart history={unemployment.history} />}
                  </div>
                </details>
              </StatCard>
            )}
            <StatCard
              label="Adults with a bachelor's+"
              value={`${attain.bachelorsPlusPct}%`}
              tier="official"
              sub={<span>{bachelorsNatDelta.toFixed(0)} pts vs U.S. average (sample)</span>}
            >
              <details className="mt-2">
                <summary className="text-[11px] text-[#d8b45a] cursor-pointer list-none">Attainment breakdown ▾</summary>
                <div className="mt-2 pt-2 border-t border-dashed border-white/10 space-y-1 text-[11px] text-[#b4c0cf]">
                  <div className="flex justify-between"><span>HS+</span><span className="font-mono">{attain.hsPlusPct}%</span></div>
                  <div className="flex justify-between"><span>Some college</span><span className="font-mono">{attain.someCollegePct}%</span></div>
                  <div className="flex justify-between"><span>Bachelor&apos;s</span><span className="font-mono">{attain.bachelorsPct}%</span></div>
                  <div className="flex justify-between"><span>Graduate</span><span className="font-mono">{attain.graduatePct}%</span></div>
                </div>
              </details>
            </StatCard>
          </div>

          {economic.educationTiers && (
            <EducationEarningsBlock tiers={economic.educationTiers} note={economic.meta.educationNote} />
          )}

          <div className="mt-4 rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3 text-[11.5px] text-[#748396]">
            <span className="text-[#d8b45a] font-medium">Fastest-growing occupations:</span>{' '}
            No verified data yet — BLS Employment Projections sample pending (honest gap).
          </div>
        </SectionShell>

        <SectionShell
          id="section-03"
          eyebrow="§03"
          title="Taxes"
          note="Estimated single-filer income tax including federal obligations. Florida has no state income tax."
          sourceLine={<>Source: IRS brackets · FL Dept. of Revenue ($0 state income tax) · Tax Foundation burden comparison · {taxes.meta.asOf}</>}
        >
          <div className="overflow-x-auto rounded-[13px] border border-white/[0.055]">
            <table className="w-full text-[12px] text-left min-w-[320px]">
              <thead>
                <tr className="border-b border-white/[0.055] text-[#748396]">
                  <th className="p-3 font-medium">Single filer income</th>
                  {taxes.singleFiler.incomeLevels.map((inc) => (
                    <th key={inc} className="p-3 font-mono text-right">{formatCompactCurrency(inc)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[#b4c0cf]">
                <tr className="border-b border-white/[0.055]">
                  <td className="p-3">Federal income tax</td>
                  {taxes.singleFiler.federalTax.map((v, i) => (
                    <td key={i} className="p-3 font-mono text-right text-[#eef1f6]">{formatCompactCurrency(v)}</td>
                  ))}
                </tr>
                <tr className="border-b border-white/[0.055] bg-[#d8b45a]/5">
                  <td className="p-3 text-[#d8b45a]">Florida state income tax</td>
                  {taxes.singleFiler.floridaStateTax.map((v, i) => (
                    <td key={i} className="p-3 font-mono text-right text-[#d8b45a]">${v}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[#eef1f6]">Total paid living in Florida</td>
                  {taxes.singleFiler.totalInFlorida.map((v, i) => (
                    <td key={i} className="p-3 font-mono text-right font-semibold text-[#eef1f6]">{formatCompactCurrency(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[#748396] mt-4 mb-2">For comparison — extra state tax others add on top of the same federal bill:</p>
          <div className="overflow-x-auto rounded-[13px] border border-white/[0.055]">
            <table className="w-full text-[12px] min-w-[320px]">
              <thead>
                <tr className="border-b border-white/[0.055] text-[#748396]">
                  <th className="p-3 text-left">State</th>
                  {taxes.singleFiler.incomeLevels.map((inc) => (
                    <th key={inc} className="p-3 font-mono text-right">{formatCompactCurrency(inc)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taxes.stateComparison.map((row) => (
                  <tr key={row.state} className="border-b border-white/[0.055] text-[#b4c0cf]">
                    <td className="p-3">{row.state}</td>
                    {row.extraStateTax.map((v, i) => (
                      <td key={i} className="p-3 font-mono text-right">+{formatCompactCurrency(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="mt-4">
            <summary className="text-[11px] text-[#d8b45a] cursor-pointer list-none">The full picture — total tax burden ▾</summary>
            <div className="mt-2 p-3 rounded-lg border border-white/[0.055] text-[11.5px] text-[#b4c0cf] space-y-1">
              <p>Sales tax avg ~{taxes.totalBurden.salesTaxAvgPct}% · Property ~{taxes.totalBurden.propertyEffectivePct}% effective</p>
              <p>
                Total state+local burden: <b className="text-[#eef1f6]">{taxes.totalBurden.totalStateLocalPct}%</b> of income vs U.S. avg{' '}
                <b className="text-[#eef1f6]">{taxes.totalBurden.usAveragePct}%</b>
              </p>
              <p className="text-[#54606f]">Federal income tax sits on top nationwide — same brackets in every state.</p>
            </div>
          </details>
        </SectionShell>

        <div id="section-04" className="scroll-mt-24">
          <FloridaStatePoliticians politicians={politicians} stateName="Florida" />
        </div>

        {legislationRecords.length > 0 && (
          <section id="section-05" className="scroll-mt-24 py-7 border-b border-white/[0.055]">
            <div className="mb-4">
              <span className="font-mono text-[10.5px] tracking-widest text-[#d8b45a]">§05</span>
              <h2 className="text-base font-semibold text-[#eef1f6] mt-1">Legislation</h2>
              <p className="text-[12.5px] text-[#748396] mt-1 max-w-prose">
                Recent Florida bills, in plain language — expand any for the full official text.
              </p>
            </div>
            <FloridaLegislationSection records={legislationRecords} metaNote={legislationNote} compact />
            <p className="text-[10px] text-[#54606f] mt-4 pt-3 border-t border-white/[0.055]">
              Summaries from{' '}
              <a href="https://legiscan.com" target="_blank" rel="noopener noreferrer" className="text-[#b4c0cf] border-b border-white/[0.10]">
                LegiScan
              </a>{' '}
              official bill descriptions
            </p>
          </section>
        )}

        <section id="section-06" className="scroll-mt-24 py-7">
          <div className="mb-4">
            <span className="font-mono text-[10.5px] tracking-widest text-[#d8b45a]">§06</span>
            <h2 className="text-base font-semibold text-[#eef1f6] mt-1">Courts</h2>
            <p className="text-[12.5px] text-[#748396] mt-1 max-w-prose">
              Florida Supreme Court decisions, summarized from the court&apos;s own record — expand for the syllabus and full opinion.
            </p>
          </div>
          <FloridaCourtDecisionsSection title="Florida Supreme Court" records={courtRecords} metaNote={courtNote} compact />
          <p className="text-[10px] text-[#54606f] mt-4 pt-3 border-t border-white/[0.055]">
            Source:{' '}
            <a href="https://www.courtlistener.com" target="_blank" rel="noopener noreferrer" className="text-[#b4c0cf] border-b border-white/[0.10]">
              CourtListener
            </a>{' '}
            — Supreme Court of Florida
          </p>
        </section>
      </main>
    </div>
  );
}
