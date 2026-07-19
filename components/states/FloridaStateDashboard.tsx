import type { ReactNode } from 'react';
import type { DashboardPolitician } from '@/lib/dashboard/stateRosterClient';
import type { StateEconomicSlice, StateEducationLaborTier, SnapshotRecordRow } from '@/lib/types/snapshotTypes';
import {
  deltaVsMonthsAgo,
  displayValue,
  employmentRatePercent,
  findIndicator,
  formatDelta,
  formatPercent,
  incomeVsUsChipClass,
  indicatorRawValue,
  populationHeroText,
} from '@/lib/format/stateEconomicDisplay';
import { displayLabelFor } from '@/lib/format/stateEconomicDisplayLabels';
import { formatCompactCurrency, formatCompact, formatRank } from '@/lib/format/number';
import TierDot from '@/components/ui/TierDot';
import FloridaStatePoliticians from '@/components/states/FloridaStatePoliticians';
import { FloridaLegislationSection } from '@/components/states/FloridaLegislationBillRow';
import { FloridaCourtDecisionsSection } from '@/components/states/FloridaCourtDecisionRow';
import SampleBadge from '@/components/states/SampleBadge';
import {
  topBottomCounties,
  type FloridaCountyRow,
} from '@/lib/data/floridaDashboard';

export type { FloridaCountyRow };

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
      populationRank: number | null;
      populationGrowthPct: number | null;
      attainment: {
        hsPlusPct: number;
        someCollegePct: number;
        bachelorsPct: number;
        graduatePct: number;
        bachelorsPlusPct: number;
      } | null;
      usAttainmentBachelorsPlusPct?: number | null;
    };
    meta: {
      provenance?: 'fetched-live' | 'computed-from-published-tables' | 'honest-gap';
      fetchedLive: boolean;
      censusFetchedLive?: boolean;
      blsFetchedLive?: boolean;
      attainmentFetchedLive?: boolean;
    };
  };
  rpp: {
    meta: {
      provenance?: 'fetched-live' | 'computed-from-published-tables' | 'honest-gap';
      fetchedLive: boolean;
      asOf: string;
      note?: string;
    };
    state: {
      allItemsIndex: number;
      period: string;
      components: { label: string; index: number }[];
      metros: { name: string; index: number }[];
    } | null;
  };
  meric: {
    meta: {
      provenance?: 'fetched-live' | 'computed-from-published-tables' | 'honest-gap';
      fetchedLive: boolean;
      asOf: string;
      period?: string;
      note?: string;
      source: { name: string; url: string; tier: string };
    };
    state: {
      state: string;
      period: string;
      allItemsIndex: number;
      rankAmong50: number;
      reportedRank: number | null;
      components: { label: string; index: number }[];
    } | null;
  };
  metroCpi: {
    meta: {
      provenance?: 'fetched-live' | 'computed-from-published-tables' | 'honest-gap';
      fetchedLive: boolean;
      asOf: string;
      note?: string;
      source: { name: string; url: string; tier: string };
    };
    records: Array<{
      metro: string;
      latestPeriod: string;
      latestValue: number;
      seriesId: string;
    }>;
  };
  rankings: {
    meta: {
      provenance?: 'fetched-live' | 'computed-from-published-tables' | 'honest-gap';
      fetchedLive: boolean;
      asOf: string;
      note?: string;
    };
    ranks: Record<string, { rank: number | null; value: number | null; denominator: number | null }>;
    ageBreakdown: { label: string; percent: number }[];
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
    meta: {
      asOf: string;
      provenance: {
        federal: {
          name: string;
          url: string;
          tier: 'official' | 'nonpartisan';
          citation?: string;
          provenance: 'computed-from-published-tables';
          computedAt: string;
        };
        floridaState: {
          name: string;
          url: string;
          tier: 'official' | 'nonpartisan';
          citation?: string;
          provenance: 'computed-from-published-tables';
          computedAt: string;
        };
        comparison: {
          name: string;
          url: string;
          tier: 'official' | 'nonpartisan';
          citation?: string;
          provenance: 'computed-from-published-tables';
          computedAt: string;
        };
        totalBurden: {
          name: string;
          url: string;
          tier: 'official' | 'nonpartisan';
          citation?: string;
          provenance: 'computed-from-published-tables';
          computedAt: string;
        };
      };
    };
  };
};

const NAV = [
  { href: '#section-01', label: 'By the numbers' },
  { href: '#section-02', label: 'Taxes' },
  { href: '#section-03', label: 'Officials' },
  { href: '#section-04', label: 'Legislation' },
  { href: '#section-05', label: 'Courts' },
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
    <svg width={w} height={h} className="text-[var(--gold)]" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={pts.join(' ')} />
    </svg>
  );
}

function CountyMiniRows({
  rows,
  valueKey,
  format,
}: {
  rows: FloridaCountyRow[];
  valueKey: keyof FloridaCountyRow;
  format: (v: number | null) => string;
}) {
  return (
    <div className="space-y-1">
      {rows.map((r, i) => {
        const raw = r[valueKey];
        const display =
          raw === null || raw === undefined
            ? 'No verified record available'
            : format(raw as number);
        return (
          <div key={r.fips} className="grid grid-cols-[auto_1fr_auto] gap-2 text-[11px] text-[var(--foreground)]/85 py-0.5">
            <span className="text-[var(--muted)]/90 font-mono text-[10px]">{i + 1}</span>
            <span className="truncate">{r.name}</span>
            <span className="font-mono text-[var(--foreground)]">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

const HONEST_GAP = (
  <span className="italic text-[var(--muted)]">No verified record available</span>
);

function RankChip({ rank, of = 50 }: { rank: number | null | undefined; of?: number }) {
  if (rank == null || !Number.isFinite(rank)) return null;
  return (
    <span className="font-mono text-[10.5px] text-[var(--muted)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5">
      #{formatRank(rank)} of {of}
    </span>
  );
}

function RankRow({ label, rank }: { label: string; rank: number | null | undefined }) {
  return (
    <div className="flex justify-between text-[11px] text-[var(--foreground)]/85 py-0.5 gap-2">
      <span>{label}</span>
      <span className="font-mono shrink-0">
        {rank != null && Number.isFinite(rank) ? `#${formatRank(rank)} of 50` : 'No verified record available'}
      </span>
    </div>
  );
}

function StatCard({
  label,
  precision,
  value,
  sub,
  tier,
  children,
}: {
  label: string;
  precision?: string;
  value: string;
  sub?: ReactNode;
  tier: 'official' | 'nonpartisan' | 'media' | 'alleged' | 'unverified';
  children?: ReactNode;
}) {
  return (
    <div className="relative bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[13px] p-4 overflow-hidden min-w-0">
      <div className="absolute top-3 right-3">
        <TierDot tier={tier} />
      </div>
      <p className="text-[11px] text-[var(--muted)] pr-6">{label}</p>
      {precision && <p className="text-[10px] text-[var(--muted)]/90 pr-6 mt-0.5">{precision}</p>}
      <p className="text-[26px] font-semibold text-[var(--foreground)] tracking-tight mt-1.5 leading-none">{value}</p>
      {sub && <div className="text-[11.5px] text-[var(--foreground)]/85 mt-2 flex flex-wrap items-center gap-1.5">{sub}</div>}
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
    <section id={id} className="scroll-mt-24 py-7 border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="font-mono text-[10.5px] tracking-widest text-[var(--gold)]">{eyebrow}</span>
        <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
      </div>
      {note && <p className="text-[12.5px] text-[var(--muted)] mb-4 max-w-prose">{note}</p>}
      {children}
      {sourceLine && (
        <p className="text-[10px] text-[var(--muted)]/90 mt-4 pt-3 border-t border-[var(--border-subtle)]">{sourceLine}</p>
      )}
    </section>
  );
}

function EducationEarningsBlock({ tiers, note }: { tiers: StateEducationLaborTier[]; note?: string }) {
  if (!tiers.length) return null;
  return (
    <div
      className="mt-4 bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[14px] p-4 sm:p-5 overflow-x-auto"
      data-testid="fl-education-earnings-panel"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[var(--foreground)]">Median earnings &amp; unemployment by education level</p>
        {note && <p className="text-[11px] text-[var(--muted)] mt-1">{note}</p>}
        <div className="hidden sm:grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)] gap-3 pt-3 pb-1 text-[9.5px] uppercase tracking-wide text-[var(--muted)]/90">
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
              <p className="text-[12.5px] text-[var(--foreground)] break-words">{tier.educationLevel}</p>
              <p className="text-sm font-mono text-[var(--foreground)] sm:text-right">
                {tier.medianAnnualEarnings != null ? formatCompactCurrency(tier.medianAnnualEarnings) : '—'}
              </p>
              <p className="text-sm font-mono text-[var(--muted)] sm:text-right">
                {tier.unemploymentRate != null ? formatPercent(tier.unemploymentRate) : (
                  <span className="italic text-[var(--muted)]/90" title={tier.unemploymentGapReason}>not available</span>
                )}
              </p>
              <div className="hidden sm:block h-2 rounded bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)]"
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
  const chronological = [...history].reverse();
  const values = chronological.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(0.1, (max - min) * 0.15);
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;
  const range = yMax - yMin || 1;
  const w = 360;
  const h = 140;
  const left = 36;
  const right = 12;
  const top = 12;
  const bottom = 28;
  const plotW = w - left - right;
  const plotH = h - top - bottom;
  const pts = values.map((v, i) => {
    const x = left + (i / (values.length - 1)) * plotW;
    const y = top + plotH - ((v - yMin) / range) * plotH;
    return `${x},${y}`;
  });
  const yTicks = [yMax, (yMin + yMax) / 2, yMin];
  const monthLabel = (period: string) => {
    const m = period.match(/([A-Za-z]{3})/);
    return m?.[1] ?? period.slice(0, 3);
  };
  const xLabelIndexes = [0, Math.floor((values.length - 1) / 2), values.length - 1];
  const descId = 'fl-unemployment-chart-desc';
  return (
    <div className="mt-3 rounded-[14px] border border-[var(--border-subtle)] bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)] p-4">
      <p className="text-[13px] font-semibold text-[var(--foreground)]">Unemployment rate — trailing 12 months</p>
      <p id={descId} className="sr-only">
        Line chart of Florida unemployment rate from {chronological[0]?.period} to{' '}
        {chronological[chronological.length - 1]?.period}, ranging {formatPercent(yMin)} to {formatPercent(yMax)}.
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-md mt-2 text-[var(--gold)]"
        role="img"
        aria-labelledby={descId}
      >
        {yTicks.map((tick) => {
          const y = top + plotH - ((tick - yMin) / range) * plotH;
          return (
            <g key={tick}>
              <line x1={left} x2={w - right} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.12} />
              <text x={left - 6} y={y + 3} textAnchor="end" className="fill-[var(--muted)]" fontSize="9.5" fontFamily="var(--font-mono, ui-monospace)">
                {formatPercent(tick).replace(/%$/, '')}
              </text>
            </g>
          );
        })}
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={pts.join(' ')} />
        {xLabelIndexes.map((i) => {
          const x = left + (i / (values.length - 1)) * plotW;
          return (
            <text
              key={chronological[i].period}
              x={x}
              y={h - 8}
              textAnchor="middle"
              className="fill-[var(--muted)]"
              fontSize="9.5"
              fontFamily="var(--font-mono, ui-monospace)"
            >
              {monthLabel(chronological[i].period)}
            </text>
          );
        })}
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
  meric,
  metroCpi,
  rankings,
  taxes,
}: FloridaDashboardProps) {

  const pop = findIndicator(economic, 'Population');
  const income = findIndicator(economic, 'Median household income');
  const home = findIndicator(economic, 'Median home value');
  const unemployment = findIndicator(economic, 'Unemployment rate');
  const employment = findIndicator(economic, 'Employment');
  const unemploymentLevel = findIndicator(economic, 'Unemployment level');
  const laborForce = findIndicator(economic, 'Labor force');

  const incomeLabel = displayLabelFor('Median household income');
  const homeLabel = displayLabelFor('Median home value');
  const colLabel = displayLabelFor('Cost of living index');
  const employmentLabel = displayLabelFor('Employment');
  const educationLabel = displayLabelFor("Adults with a bachelor's+");
  const laborForceLabel = displayLabelFor('Labor force');
  const unemployedLabel = displayLabelFor('Unemployment level');

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
  const rppState = rpp.state;
  const mericState = meric.state;
  const beaLive =
    rppState != null &&
    (rpp.meta.provenance === 'fetched-live' || rpp.meta.fetchedLive === true);
  const mericLive =
    mericState != null &&
    (meric.meta.provenance === 'fetched-live' || meric.meta.fetchedLive === true);
  /** BEA is the locked headline when live; MERIC is interim headline if BEA is an honest gap. */
  const colHeadline: 'bea' | 'meric' | 'gap' = beaLive ? 'bea' : mericLive ? 'meric' : 'gap';
  const colIndex =
    colHeadline === 'bea'
      ? rppState!.allItemsIndex
      : colHeadline === 'meric'
        ? mericState!.allItemsIndex
        : null;
  const colVsUs =
    colIndex == null
      ? null
      : (() => {
          const d = colIndex - 100;
          return d === 0
            ? 'at U.S. average'
            : `${formatPercent(Math.abs(d)).replace(/%$/, '')}% ${d > 0 ? 'above' : 'below'} U.S. average`;
        })();
  const colRank =
    colHeadline === 'bea'
      ? null
      : colHeadline === 'meric'
        ? mericState!.rankAmong50
        : null;
  const attain = counties.stateSummary.attainment;
  const usBachelorsPlus = counties.stateSummary.usAttainmentBachelorsPlusPct;
  const bachelorsNatDelta =
    attain != null && usBachelorsPlus != null ? attain.bachelorsPlusPct - usBachelorsPlus : null;
  const countiesLive =
    counties.meta.provenance === 'fetched-live' ||
    counties.meta.censusFetchedLive === true ||
    counties.meta.fetchedLive === true;
  const attainmentLive =
    counties.meta.attainmentFetchedLive === true ||
    (countiesLive && attain != null);
  const ranksLive = rankings.meta.provenance === 'fetched-live' || rankings.meta.fetchedLive === true;
  const incomeRank = ranksLive ? rankings.ranks.medianHouseholdIncome?.rank : null;
  const homeRank = ranksLive ? rankings.ranks.medianHomeValue?.rank : null;
  const popRank =
    ranksLive && rankings.ranks.population?.rank != null
      ? rankings.ranks.population.rank
      : counties.stateSummary.populationRank;
  const educationRank = ranksLive ? rankings.ranks.bachelorsPlusPct?.rank : null;
  const employmentRank = ranksLive ? rankings.ranks.unemploymentRate?.rank : null;
  const ageRows = rankings.ageBreakdown ?? [];

  return (
    <div className="max-w-[1160px] mx-auto grid grid-cols-1 lg:grid-cols-[248px_1fr] min-h-screen bg-[var(--bg-base)]">
      <aside className="lg:sticky lg:top-0 lg:h-screen flex flex-col gap-6 p-5 lg:p-6 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)] bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-base)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-5 rounded relative overflow-hidden shadow shrink-0" aria-hidden>
            <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,#c8433a_0_20%,#f4f4f2_20%_40%,#c8433a_40%_60%,#f4f4f2_60%_80%,#c8433a_80%_100%)]" />
            <div className="absolute top-0 left-0 bottom-0 w-[44%] bg-[#25457a]" />
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--foreground)]">Florida</p>
            <p className="text-[11px] text-[var(--muted)]">State profile</p>
          </div>
        </div>
        <nav className="flex lg:flex-col flex-wrap gap-1" aria-label="Section navigation">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] text-[var(--foreground)]/85 hover:text-[var(--foreground)] hover:bg-[var(--gold)]/10 rounded-lg px-3 py-2 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="lg:mt-auto pt-4 border-t border-[var(--border-subtle)] space-y-4">
          {income && (
            <div>
              <p className="text-[10.5px] uppercase tracking-wide text-[var(--muted)]/90">{incomeLabel.title}</p>
              <p className="text-xl font-semibold text-[var(--foreground)] mt-0.5">{displayValue(income)}</p>
            </div>
          )}
          {employment && (
            <div>
              <p className="text-[10.5px] uppercase tracking-wide text-[var(--muted)]/90">{employmentLabel.title}</p>
              <p className="text-xl font-semibold text-[var(--foreground)] mt-0.5">{displayValue(employment)}</p>
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0 px-4 sm:px-8 py-7 pb-16">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-6 border-b border-[var(--border-subtle)]">
          <div>
            <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-[var(--gold)]">State profile</p>
            <h1 className="text-3xl font-semibold text-[var(--foreground)] mt-2 tracking-tight">Florida</h1>
            <p className="text-[13.5px] text-[var(--foreground)]/85 mt-2 max-w-prose leading-relaxed">
              Verified economic indicators, office-ranked officials, legislation, and court decisions — sourced from federal and state records.
            </p>
          </div>
          {pop && (
            <div className="text-left sm:text-right shrink-0">
              <p className="text-[10.5px] uppercase tracking-wide text-[var(--muted)]">Population</p>
              <p className="text-4xl font-semibold text-[var(--foreground)] tracking-tight mt-1">
                {popHero.compact}
              </p>
              <div className="mt-1.5 flex flex-wrap sm:justify-end gap-1.5">
                <RankChip rank={popRank} />
              </div>
              <details className="mt-2 text-[11px] text-[var(--muted)]">
                <summary className="cursor-pointer text-[var(--gold)] list-none">
                  {counties.stateSummary.populationGrowthPct != null && popRank != null ? (
                    <>
                      {counties.stateSummary.populationGrowthPct > 0 ? '▲' : counties.stateSummary.populationGrowthPct < 0 ? '▼' : '●'}
                      {formatPercent(Math.abs(counties.stateSummary.populationGrowthPct)).replace(/%$/, '')}%/yr · #{formatRank(popRank)} of 50
                    </>
                  ) : (
                    <>Population detail ▾</>
                  )}
                </summary>
                <div className="mt-2 text-left sm:text-right border-t border-dashed border-[var(--border-subtle)] pt-2 space-y-3">
                  <div>
                    <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">State ranks</p>
                    <RankRow label="Population" rank={popRank} />
                    <RankRow label={incomeLabel.title} rank={incomeRank} />
                    <RankRow label={homeLabel.title} rank={homeRank} />
                    <RankRow label="Employment (unemployment rate)" rank={employmentRank} />
                    <RankRow label={educationLabel.title} rank={educationRank} />
                    <RankRow label={colLabel.title} rank={colRank} />
                  </div>
                  {ageRows.length > 0 ? (
                    <div>
                      <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">Age breakdown</p>
                      {ageRows.map((row) => (
                        <div key={row.label} className="flex justify-between text-[11px] text-[var(--foreground)]/85 py-0.5 gap-2">
                          <span>{row.label}</span>
                          <span className="font-mono">{formatPercent(row.percent)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] italic text-[var(--muted)]">Age breakdown — No verified record available</p>
                  )}
                  <div>
                    <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">
                      Top counties by population
                      {countiesLive && <SampleBadge />}
                    </p>
                    <CountyMiniRows rows={popByCounty.top} valueKey="population" format={(v) => (v != null ? formatCompact(v) : '—')} />
                    <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1 mt-3">
                      Smallest counties
                      {countiesLive && <SampleBadge />}
                    </p>
                    <CountyMiniRows rows={popByCounty.bottom} valueKey="population" format={(v) => (v != null ? formatCompact(v) : '—')} />
                  </div>
                </div>
              </details>
            </div>
          )}
        </header>

        <SectionShell
          id="section-01"
          eyebrow="§01"
          title="By the numbers"
          note="Income, housing, prices, work, and education — compact figures with county and source detail in each drop-down."
          sourceLine={
            <>
              Source: U.S. Census Bureau ACS · BLS LAUS/CPS ·{' '}
              {colHeadline === 'bea' ? 'BEA Regional Price Parities' : 'MERIC/C2ER cost of living'}
              {countiesLive ? ` · county sample n=${counties.records.length}` : ''}
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {income && (
              <StatCard
                label={incomeLabel.title}
                precision={incomeLabel.sub}
                value={displayValue(income)}
                tier="official"
                sub={
                  <>
                    {incomeNatDelta != null && (
                      <span className={incomeVsUsChipClass(incomeNatDelta)}>
                        {formatDelta(incomeNatDelta, 'USD')} vs U.S. average
                      </span>
                    )}
                    <RankChip rank={incomeRank} />
                  </>
                }
              >
                {income.history && <div className="mt-2"><MiniSparkline values={income.history.map((h) => h.value)} /></div>}
                <details className="mt-2">
                  <summary className="text-[11px] text-[var(--gold)] cursor-pointer list-none">Counties by income ▾{countiesLive && <SampleBadge />}</summary>
                  <div className="mt-2 pt-2 border-t border-dashed border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">Highest</p>
                      <CountyMiniRows rows={incomeByCounty.top} valueKey="medianHouseholdIncome" format={(v) => formatCompactCurrency(v)} />
                    </div>
                    <div>
                      <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">Lowest</p>
                      <CountyMiniRows rows={incomeByCounty.bottom} valueKey="medianHouseholdIncome" format={(v) => formatCompactCurrency(v)} />
                    </div>
                  </div>
                </details>
              </StatCard>
            )}
            {home && (
              <StatCard
                label={homeLabel.title}
                precision={homeLabel.sub}
                value={displayValue(home)}
                tier="official"
                sub={
                  <>
                    {homeNatDelta != null && (
                      <span className={homeNatDelta <= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}>
                        {homeNatDelta > 0 ? '+' : ''}{formatPercent(homeNatDelta).replace(/%$/, '')}% vs U.S. average
                      </span>
                    )}
                    <RankChip rank={homeRank} />
                  </>
                }
              >
                {home.history && <div className="mt-2"><MiniSparkline values={home.history.map((h) => h.value)} /></div>}
                <details className="mt-2">
                  <summary className="text-[11px] text-[var(--gold)] cursor-pointer list-none">Counties by home value ▾{countiesLive && <SampleBadge />}</summary>
                  <div className="mt-2 pt-2 border-t border-dashed border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">Most expensive</p>
                      <CountyMiniRows rows={homeByCounty.top} valueKey="medianHomeValue" format={(v) => formatCompactCurrency(v)} />
                    </div>
                    <div>
                      <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">Most affordable</p>
                      <CountyMiniRows rows={homeByCounty.bottom} valueKey="medianHomeValue" format={(v) => formatCompactCurrency(v)} />
                    </div>
                  </div>
                </details>
              </StatCard>
            )}
            {colHeadline !== 'gap' && colIndex != null ? (
              <StatCard
                label={colLabel.title}
                precision={colLabel.sub}
                value={formatPercent(colIndex).replace(/%$/, '')}
                tier={colHeadline === 'bea' ? 'official' : 'nonpartisan'}
                sub={
                  <>
                    {colVsUs && <span>U.S. = 100 · {colVsUs}</span>}
                    <RankChip rank={colRank} />
                  </>
                }
              >
                <details className="mt-2">
                  <summary className="text-[11px] text-[var(--gold)] cursor-pointer list-none">
                    Sources & local prices ▾
                  </summary>
                  <div className="mt-2 pt-2 border-t border-dashed border-[var(--border-subtle)] space-y-3">
                    {colHeadline === 'bea' && rppState ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9.5px] uppercase text-[var(--muted)]/90">BEA Regional Price Parities (headline)</p>
                          <TierDot tier="official" />
                        </div>
                        <div>
                          <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">Components (RPP)</p>
                          {rppState.components.map((c) => (
                            <div key={c.label} className="flex justify-between text-[11px] text-[var(--foreground)]/85 py-0.5">
                              <span>{c.label}</span>
                              <span className="font-mono">{formatPercent(c.index).replace(/%$/, '')}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">Metro areas</p>
                          {rppState.metros.map((m) => (
                            <div key={m.name} className="flex justify-between text-[11px] text-[var(--foreground)]/85 py-0.5">
                              <span className="truncate pr-2">{m.name}</span>
                              <span className="font-mono shrink-0">{formatPercent(m.index).replace(/%$/, '')}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start justify-between gap-2 text-[11px] text-[var(--foreground)]/85">
                        <div>
                          <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">BEA Regional Price Parities</p>
                          <p className="italic text-[var(--muted)]">No verified record available</p>
                        </div>
                        <TierDot tier="official" />
                      </div>
                    )}
                    {mericState && (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9.5px] uppercase text-[var(--muted)]/90">
                            {colHeadline === 'meric' ? 'MERIC/C2ER (interim headline)' : 'MERIC/C2ER (corroboration)'}
                          </p>
                          <TierDot tier="nonpartisan" />
                        </div>
                        <div className="flex justify-between text-[11px] text-[var(--foreground)]/85 py-0.5">
                          <span>Index · {mericState.period}</span>
                          <span className="font-mono">{formatPercent(mericState.allItemsIndex).replace(/%$/, '')}</span>
                        </div>
                        {mericState.components.map((c) => (
                          <div key={c.label} className="flex justify-between text-[11px] text-[var(--foreground)]/85 py-0.5">
                            <span>{c.label}</span>
                            <span className="font-mono">{formatPercent(c.index).replace(/%$/, '')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9.5px] uppercase text-[var(--muted)]/90">Local price trends (BLS metro CPI)</p>
                        <TierDot tier="official" />
                      </div>
                      {metroCpi.records.length > 0 ? (
                        metroCpi.records.map((row) => (
                          <div key={row.seriesId} className="flex justify-between text-[11px] text-[var(--foreground)]/85 py-0.5 gap-2">
                            <span className="truncate pr-2">{row.metro} · {row.latestPeriod}</span>
                            <span className="font-mono shrink-0">{formatPercent(row.latestValue).replace(/%$/, '')}</span>
                          </div>
                        ))
                      ) : (
                        <p className="italic text-[var(--muted)] text-[11px]">No verified record available</p>
                      )}
                    </div>
                  </div>
                </details>
              </StatCard>
            ) : (
              <div className="relative bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[13px] p-4 min-w-0">
                <p className="text-[11px] text-[var(--muted)]">{colLabel.title}</p>
                <p className="text-[10px] text-[var(--muted)]/90 mt-0.5">{colLabel.sub}</p>
                <p className="text-[15px] text-[var(--muted)] mt-3">{HONEST_GAP}</p>
              </div>
            )}
            {employment && (
              <StatCard
                label={employmentLabel.title}
                value={displayValue(employment)}
                tier="official"
                sub={
                  <>
                    {empRate != null && (
                      <span>Employment rate {formatPercent(empRate)}</span>
                    )}
                    <RankChip rank={employmentRank} />
                  </>
                }
              >
                <details className="mt-2">
                  <summary className="text-[11px] text-[var(--gold)] cursor-pointer list-none">Workforce, counties & trend ▾{countiesLive && <SampleBadge />}</summary>
                  <div className="mt-2 pt-2 border-t border-dashed border-[var(--border-subtle)] space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {laborForce && (
                        <div>
                          <p className="text-[var(--muted)]/90 uppercase text-[10px]">{laborForceLabel.title}</p>
                          <p className="font-semibold text-[var(--foreground)]">{displayValue(laborForce)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[var(--muted)]/90 uppercase text-[10px]">{employmentLabel.title}</p>
                        <p className="font-semibold text-[var(--foreground)]">{displayValue(employment)}</p>
                      </div>
                      {unemploymentLevel && (
                        <div>
                          <p className="text-[var(--muted)]/90 uppercase text-[10px]">{unemployedLabel.title}</p>
                          <p className="font-semibold text-[var(--foreground)]">{displayValue(unemploymentLevel)}</p>
                        </div>
                      )}
                      {unemployment && (
                        <div>
                          <p className="text-[var(--muted)]/90 uppercase text-[10px]">Unemployment rate</p>
                          <p className="font-semibold text-[var(--foreground)]">
                            {displayValue(unemployment)}
                            {unempDelta && (
                              <span
                                className={`ml-1 text-[11px] font-normal ${unempDelta.delta > 0 ? 'text-[var(--negative)]' : unempDelta.delta < 0 ? 'text-[var(--positive)]' : 'text-[var(--muted)]'}`}
                              >
                                {formatDelta(unempDelta.delta, '%')} vs a year ago
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">Lowest unemployment</p>
                        <CountyMiniRows rows={unempByCounty.bottom} valueKey="unemploymentRate" format={(v) => (v != null ? formatPercent(v) : '—')} />
                      </div>
                      <div>
                        <p className="text-[9.5px] uppercase text-[var(--muted)]/90 mb-1">Highest unemployment</p>
                        <CountyMiniRows rows={unempByCounty.top} valueKey="unemploymentRate" format={(v) => (v != null ? formatPercent(v) : '—')} />
                      </div>
                    </div>
                    {unemployment?.history && <UnemploymentChart history={unemployment.history} />}
                  </div>
                </details>
              </StatCard>
            )}
            <StatCard
              label={educationLabel.title}
              precision={educationLabel.sub}
              value={attainmentLive && attain != null ? formatPercent(attain.bachelorsPlusPct) : '—'}
              tier="official"
              sub={
                <>
                  {attainmentLive && bachelorsNatDelta != null ? (
                    <span>
                      {bachelorsNatDelta >= 0 ? '+' : ''}
                      {formatPercent(bachelorsNatDelta).replace(/%$/, '')} pts vs U.S. average
                    </span>
                  ) : (
                    HONEST_GAP
                  )}
                  <RankChip rank={educationRank} />
                </>
              }
            >
              <details className="mt-2">
                <summary className="text-[11px] text-[var(--gold)] cursor-pointer list-none">
                  Education detail ▾
                </summary>
                <div className="mt-2 pt-2 border-t border-dashed border-[var(--border-subtle)] space-y-3">
                  {attainmentLive && attain != null ? (
                    <div className="space-y-1 text-[11px] text-[var(--foreground)]/85">
                      <div className="flex justify-between"><span>HS+</span><span className="font-mono">{formatPercent(attain.hsPlusPct)}</span></div>
                      <div className="flex justify-between"><span>Some college</span><span className="font-mono">{formatPercent(attain.someCollegePct)}</span></div>
                      <div className="flex justify-between"><span>Bachelor&apos;s</span><span className="font-mono">{formatPercent(attain.bachelorsPct)}</span></div>
                      <div className="flex justify-between"><span>Graduate</span><span className="font-mono">{formatPercent(attain.graduatePct)}</span></div>
                    </div>
                  ) : (
                    <p className="italic text-[var(--muted)] text-[11px]">No verified record available</p>
                  )}
                  {economic.educationTiers && (
                    <EducationEarningsBlock tiers={economic.educationTiers} note={economic.meta.educationNote} />
                  )}
                  <details>
                    <summary className="text-[11px] text-[var(--gold)] cursor-pointer list-none">
                      Fastest-growing occupations ▾
                    </summary>
                    <p className="mt-2 text-[11.5px] italic text-[var(--muted)]">
                      No verified record available
                    </p>
                  </details>
                </div>
              </details>
            </StatCard>
          </div>
        </SectionShell>

        <SectionShell
          id="section-02"
          eyebrow="§02"
          title="Taxes"
          note="Single-filer income tax including federal obligations, computed from published IRS / Tax Foundation tables. Florida has no state income tax."
          sourceLine={
            <>
              <a href={taxes.meta.provenance.federal.url} className="underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                {taxes.meta.provenance.federal.name}
              </a>
              {' · '}
              <a href={taxes.meta.provenance.floridaState.url} className="underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                FL DOR ($0 state income tax)
              </a>
              {' · '}
              <a href={taxes.meta.provenance.comparison.url} className="underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                Tax Foundation
              </a>
              {' · '}
              {taxes.meta.asOf}
              <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--muted)] border border-[var(--border-default)] rounded px-1 py-px">
                computed
              </span>
            </>
          }
        >
          <div className="overflow-x-auto rounded-[13px] border border-[var(--border-subtle)]">
            <table className="w-full text-[12px] text-left min-w-[320px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--muted)]">
                  <th className="p-3 font-medium">Single filer income</th>
                  {taxes.singleFiler.incomeLevels.map((inc) => (
                    <th key={inc} className="p-3 font-mono text-right">{formatCompactCurrency(inc)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[var(--foreground)]/85">
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="p-3">Federal income tax</td>
                  {taxes.singleFiler.federalTax.map((v, i) => (
                    <td key={i} className="p-3 font-mono text-right text-[var(--foreground)]">{formatCompactCurrency(v)}</td>
                  ))}
                </tr>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--gold)]/5">
                  <td className="p-3 text-[var(--gold)]">Florida state income tax</td>
                  {taxes.singleFiler.floridaStateTax.map((v, i) => (
                    <td key={i} className="p-3 font-mono text-right text-[var(--gold)]">${v}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[var(--foreground)]">Total paid living in Florida</td>
                  {taxes.singleFiler.totalInFlorida.map((v, i) => (
                    <td key={i} className="p-3 font-mono text-right font-semibold text-[var(--foreground)]">{formatCompactCurrency(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-4 mb-2">For comparison — extra state tax others add on top of the same federal bill:</p>
          <div className="overflow-x-auto rounded-[13px] border border-[var(--border-subtle)]">
            <table className="w-full text-[12px] min-w-[320px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--muted)]">
                  <th className="p-3 text-left">State</th>
                  {taxes.singleFiler.incomeLevels.map((inc) => (
                    <th key={inc} className="p-3 font-mono text-right">{formatCompactCurrency(inc)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taxes.stateComparison.map((row) => (
                  <tr key={row.state} className="border-b border-[var(--border-subtle)] text-[var(--foreground)]/85">
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
            <summary className="text-[11px] text-[var(--gold)] cursor-pointer list-none">The full picture — total tax burden ▾</summary>
            <div className="mt-2 p-3 rounded-lg border border-[var(--border-subtle)] text-[11.5px] text-[var(--foreground)]/85 space-y-1">
              <p>Sales tax avg ~{formatPercent(taxes.totalBurden.salesTaxAvgPct)} · Property ~{formatPercent(taxes.totalBurden.propertyEffectivePct)} effective</p>
              <p>
                Total state+local burden: <b className="text-[var(--foreground)]">{formatPercent(taxes.totalBurden.totalStateLocalPct)}</b> of income vs U.S. avg{' '}
                <b className="text-[var(--foreground)]">{formatPercent(taxes.totalBurden.usAveragePct)}</b>
              </p>
              <p className="text-[var(--muted)]/90">Federal income tax sits on top nationwide — same brackets in every state.</p>
            </div>
          </details>
        </SectionShell>

        <div id="section-03" className="scroll-mt-24">
          <FloridaStatePoliticians politicians={politicians} stateName="Florida" />
        </div>

        {legislationRecords.length > 0 && (
          <section id="section-04" className="scroll-mt-24 py-7 border-b border-[var(--border-subtle)]">
            <div className="mb-4">
              <span className="font-mono text-[10.5px] tracking-widest text-[var(--gold)]">§04</span>
              <h2 className="text-base font-semibold text-[var(--foreground)] mt-1">Legislation</h2>
              <p className="text-[12.5px] text-[var(--muted)] mt-1 max-w-prose">
                Recent Florida bills, in plain language — expand any for the full official text.
              </p>
            </div>
            <FloridaLegislationSection records={legislationRecords} metaNote={legislationNote} compact />
            <p className="text-[10px] text-[var(--muted)]/90 mt-4 pt-3 border-t border-[var(--border-subtle)]">
              Summaries from{' '}
              <a href="https://legiscan.com" target="_blank" rel="noopener noreferrer" className="text-[var(--foreground)]/85 border-b border-[var(--border-default)]">
                LegiScan
              </a>{' '}
              official bill descriptions
            </p>
          </section>
        )}

        <section id="section-05" className="scroll-mt-24 py-7">
          <div className="mb-4">
            <span className="font-mono text-[10.5px] tracking-widest text-[var(--gold)]">§05</span>
            <h2 className="text-base font-semibold text-[var(--foreground)] mt-1">Courts</h2>
            <p className="text-[12.5px] text-[var(--muted)] mt-1 max-w-prose">
              Florida Supreme Court decisions, summarized from the court&apos;s own record — expand for the syllabus and full opinion.
            </p>
          </div>
          <FloridaCourtDecisionsSection title="Florida Supreme Court" records={courtRecords} metaNote={courtNote} compact />
          <p className="text-[10px] text-[var(--muted)]/90 mt-4 pt-3 border-t border-[var(--border-subtle)]">
            Source:{' '}
            <a href="https://www.courtlistener.com" target="_blank" rel="noopener noreferrer" className="text-[var(--foreground)]/85 border-b border-[var(--border-default)]">
              CourtListener
            </a>{' '}
            — Supreme Court of Florida
          </p>
        </section>
      </main>
    </div>
  );
}
