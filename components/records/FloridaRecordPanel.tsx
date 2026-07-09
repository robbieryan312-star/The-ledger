'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ExternalLink, Info, ChevronDown, ChevronRight } from 'lucide-react';
import type {
  LegislationBundleSlice,
  NewsBundleSlice,
  SnapshotRecordRow,
  SnapshotSlice,
  SnapshotSliceMeta,
  StateEconomicIndicator,
  StateEconomicSlice,
  StateEducationLaborTier,
} from '@/lib/types/snapshotTypes';
import SourceProvenance from '@/components/ui/SourceProvenance';
import TierDot from '@/components/ui/TierDot';
import {
  deltaVsMonthsAgo,
  displayFullValue,
  displayValue,
  employmentRatePercent,
  findIndicator,
  formatDelta,
  formatPercent,
  indicatorRawValue,
  populationHeroText,
} from '@/lib/format/stateEconomicDisplay';
import { formatCompactCurrency, formatIndicatorValue } from '@/lib/format/number';

function formatFetchedAt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function MetaStrip({ meta, moreHref }: { meta: SnapshotSliceMeta; moreHref?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <SourceProvenance source={meta.source} asOf={meta.asOf} size="sm" />
      {meta.fetchedAt && (
        <span className="text-[10px] text-gray-500">
          Fetched {formatFetchedAt(meta.fetchedAt)}
        </span>
      )}
      {meta.tierFlag && (
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-400/30 text-amber-300/90 bg-amber-400/5 font-semibold uppercase tracking-wide">
          {meta.tierFlag}
        </span>
      )}
      {meta.datasetUrl && (
        <a
          href={meta.datasetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#c8a951] hover:text-white inline-flex items-center gap-0.5"
        >
          Dataset <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
      {moreHref && (
        <Link href={moreHref} className="text-[10px] text-gray-400 hover:text-[#c8a951] ml-auto">
          All sources →
        </Link>
      )}
    </div>
  );
}

function RecordRow({ row }: { row: SnapshotRecordRow }) {
  return (
    <li className="px-4 py-3 hover:bg-[#1e3a5f]/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {row.link ? (
            <a
              href={row.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white font-medium hover:text-[#c8a951] inline-flex items-center gap-1"
            >
              <span className="truncate">{row.title}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
            </a>
          ) : (
            <div className="text-sm text-white font-medium truncate">{row.title}</div>
          )}
          {row.detail && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{row.detail}</p>}
          <div className="mt-1.5">
            <SourceProvenance source={row.source} recordDate={row.date} asOf={row.asOf} />
          </div>
        </div>
        {row.date && (
          <span className="text-[10px] text-gray-500 flex-shrink-0 whitespace-nowrap">{row.date}</span>
        )}
      </div>
    </li>
  );
}

interface PanelProps {
  title: string;
  subtitle?: string;
  slice: SnapshotSlice;
  moreHref?: string;
}

export function FloridaRecordPanel({ title, subtitle, slice, moreHref = '/sources' }: PanelProps) {
  if (!slice.records.length) return null;
  return (
    <section className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e3a5f] bg-[#0a1628]">
        <h2 className="text-white font-bold text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{subtitle}</p>}
        <p className="text-[10px] text-gray-500 mt-1">
          {slice.meta.totalCount} record{slice.meta.totalCount !== 1 ? 's' : ''} on file
          {slice.records.length < slice.meta.totalCount ? ` · showing ${slice.records.length}` : ''}
        </p>
      </div>
      <div className="px-5 py-3 border-b border-[#1e3a5f]/60">
        <MetaStrip meta={slice.meta} moreHref={moreHref} />
        {slice.meta.note && (
          <p className="text-[10px] text-gray-500 leading-relaxed flex items-start gap-1.5">
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-gray-600" />
            {slice.meta.note}
          </p>
        )}
      </div>
      <ul className="divide-y divide-[#1e3a5f]">
        {slice.records.map((row) => (
          <RecordRow key={row.id} row={row} />
        ))}
      </ul>
    </section>
  );
}

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
    <svg width={w} height={h} className="text-[#c8a951]" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={pts.join(' ')}
      />
    </svg>
  );
}

function TrendDropdown({ ind }: { ind: StateEconomicIndicator }) {
  const [open, setOpen] = useState(false);
  const history = ind.history ?? [];
  if (history.length < 2) return null;
  const delta = deltaVsMonthsAgo(history, 12);
  const values = history.map((h) => h.value);

  return (
    <div className="mt-2 border-t border-[#1e3a5f]/60 pt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-[10px] text-gray-500 hover:text-gray-300"
      >
        <span>Trend {delta ? `· vs 12mo ago ${formatDelta(delta.delta, ind.unit)}` : ''}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <MiniSparkline values={values} />
            {delta && (
              <span className={`text-[10px] ${delta.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatDelta(delta.delta, ind.unit)}
                {ind.unit === '%' ? '' : ` (${delta.pct >= 0 ? '+' : ''}${delta.pct.toFixed(1)}%)`}
              </span>
            )}
          </div>
          <table className="w-full text-[10px] text-gray-400">
            <tbody>
              {history.slice(0, 6).map((row) => (
                <tr key={row.period} className="border-b border-[#1e3a5f]/40">
                  <td className="py-1 pr-2">{row.period}</td>
                  <td className="py-1 text-right text-white">{displayFullValue({ ...ind, rawValue: row.value })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NationalDeltaChip({ ind }: { ind: StateEconomicIndicator }) {
  if (ind.nationalValue == null || Number.isNaN(ind.nationalValue)) return null;
  const fl = indicatorRawValue(ind);
  if (!Number.isFinite(fl)) return null;
  const delta = fl - ind.nationalValue;
  const label = ind.nationalLabel ?? 'vs US';
  return (
    <span
      className={`inline-flex text-[10px] px-1.5 py-0.5 rounded border mt-1 ${
        delta <= 0 ? 'border-green-400/30 text-green-400' : 'border-amber-400/30 text-amber-300'
      }`}
      title={`Florida ${displayValue(ind)} vs US ${formatIndicatorValue(ind.nationalValue, ind.unit)}`}
    >
      {label} {formatDelta(delta, ind.unit)}
    </span>
  );
}

function EconomicIndicatorCard({
  ind,
  labelOverride,
  valueOverride,
  children,
}: {
  ind: StateEconomicIndicator;
  labelOverride?: string;
  valueOverride?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative bg-[#0a1628] rounded-lg p-3 border border-[#1e3a5f]/60">
      <div className="absolute top-2 right-2">
        <TierDot tier={ind.source.tier} />
      </div>
      <dt className="text-[10px] text-gray-500 uppercase tracking-wide pr-6">
        {labelOverride ?? ind.label}
      </dt>
      <dd className="text-white font-bold text-lg mt-0.5">{valueOverride ?? displayValue(ind)}</dd>
      {ind.period && <dd className="text-[10px] text-gray-500">{ind.period}</dd>}
      <NationalDeltaChip ind={ind} />
      {ind.note && <dd className="text-[10px] text-gray-600 mt-1 leading-snug">{ind.note}</dd>}
      {ind.tenYearGrowthPct != null && Number.isFinite(ind.tenYearGrowthPct) && (
        <dd className="text-[10px] text-[#c8a951] mt-1">
          10-yr growth: {ind.tenYearGrowthPct >= 0 ? '+' : ''}{ind.tenYearGrowthPct.toFixed(1)}%
        </dd>
      )}
      <TrendDropdown ind={ind} />
      {children}
      {ind.link && (
        <a
          href={ind.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#c8a951] hover:text-white inline-flex items-center gap-0.5 mt-1"
        >
          Source record <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
    </div>
  );
}

function EmploymentRateCard({
  unemployment,
  employment,
  unemploymentLevel,
  laborForce,
}: {
  unemployment: StateEconomicIndicator;
  employment?: StateEconomicIndicator;
  unemploymentLevel?: StateEconomicIndicator;
  laborForce?: StateEconomicIndicator;
}) {
  const [open, setOpen] = useState(false);
  const rate = employmentRatePercent(unemployment);

  return (
    <div className="relative bg-[#0a1628] rounded-lg p-3 border border-[#1e3a5f]/60">
      <div className="absolute top-2 right-2">
        <TierDot tier={unemployment.source.tier} />
      </div>
      <dt className="text-[10px] text-gray-500 uppercase tracking-wide pr-6">Employment rate</dt>
      <dd className="text-white font-bold text-lg mt-0.5">{formatPercent(rate)}</dd>
      <dd className="text-[10px] text-gray-500">{unemployment.period}</dd>
      <NationalDeltaChip ind={unemployment} />
      <TrendDropdown ind={unemployment} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-2 w-full flex items-center justify-between text-[10px] text-gray-500 hover:text-gray-300 border-t border-[#1e3a5f]/60 pt-2"
      >
        <span>Workforce detail</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <dl className="mt-2 grid grid-cols-1 gap-2">
          {employment && (
            <div>
              <dt className="text-[10px] text-gray-500">Employed</dt>
              <dd className="text-sm text-white font-semibold">{displayValue(employment)}</dd>
              <dd className="text-[10px] text-gray-600">{displayFullValue(employment)}</dd>
            </div>
          )}
          {unemploymentLevel && (
            <div>
              <dt className="text-[10px] text-gray-500">Unemployed</dt>
              <dd className="text-sm text-white font-semibold">{displayValue(unemploymentLevel)}</dd>
              <dd className="text-[10px] text-gray-600">{displayFullValue(unemploymentLevel)}</dd>
            </div>
          )}
          {laborForce && (
            <div>
              <dt className="text-[10px] text-gray-500">Labor force</dt>
              <dd className="text-sm text-white font-semibold">{displayValue(laborForce)}</dd>
              <dd className="text-[10px] text-gray-600">{displayFullValue(laborForce)}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

function PopulationHero({ ind }: { ind: StateEconomicIndicator }) {
  const [open, setOpen] = useState(false);
  const { compact, full } = populationHeroText(ind);
  return (
    <div className="relative mb-4 rounded-xl border border-[#c8a951]/30 bg-gradient-to-br from-[#0a1628] to-[#0d1f35] p-5">
      <div className="absolute top-3 right-3">
        <TierDot tier={ind.source.tier} />
      </div>
      <p className="text-[10px] uppercase tracking-widest text-[#c8a951]/80 font-semibold">Population</p>
      <p className="text-3xl sm:text-4xl font-bold text-white mt-1">{compact}</p>
      <p className="text-xs text-gray-500 mt-1">{ind.period}</p>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-2 text-[10px] text-gray-500 hover:text-gray-300"
      >
        {open ? 'Hide full count' : `Full count: ${full}`}
      </button>
    </div>
  );
}

const PHASE2_GAP_LABELS = [
  'Fastest-growing occupations',
] as const;

function HonestGapRow({ label }: { label: string }) {
  return (
    <li className="flex items-center justify-between text-[11px] text-gray-500 py-1">
      <span>{label}</span>
      <span className="text-gray-600 italic">No verified data yet</span>
    </li>
  );
}

function EducationTiersPanel({
  tiers,
  note,
}: {
  tiers: StateEducationLaborTier[];
  note?: string;
}) {
  if (!tiers.length) return null;
  return (
    <div className="mt-4 pt-4 border-t border-[#1e3a5f]/60">
      <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">
        Unemployment &amp; earnings by education
      </h4>
      {note && <p className="text-[10px] text-gray-600 mb-2 leading-relaxed">{note}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {tiers.map((tier) => (
          <div
            key={tier.educationLevel}
            className="relative bg-[#0a1628] rounded-lg p-3 border border-[#1e3a5f]/60"
          >
            <div className="absolute top-2 right-2">
              <TierDot tier={tier.source.tier} />
            </div>
            <p className="text-[10px] text-gray-500 uppercase pr-6">{tier.educationLevel}</p>
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600 text-[10px] block">Unemployment</span>
                <span className="text-white font-semibold">
                  {tier.unemploymentRate != null ? formatPercent(tier.unemploymentRate) : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 text-[10px] block">Median weekly pay</span>
                <span className="text-white font-semibold">
                  {tier.medianWeeklyEarnings != null
                    ? formatCompactCurrency(tier.medianWeeklyEarnings)
                    : '—'}
                </span>
              </div>
            </div>
            {tier.link && (
              <a
                href={tier.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#c8a951] hover:text-white inline-flex items-center gap-0.5 mt-2"
              >
                BLS series <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Phase2MetricsSection({ slice }: { slice: StateEconomicSlice }) {
  const cpi = slice.indicators.find(
    (i) => i.label.includes('CPI') || i.label.includes('Price Index'),
  );
  const jobGrowth = slice.indicators.find((i) => i.label === 'Total nonfarm employment');
  const jobOpenings = slice.indicators.find((i) => i.label === 'Job openings (national)');
  const gaps = slice.meta.honestGaps ?? [];
  const extraGaps = PHASE2_GAP_LABELS.filter((g) => gaps.some((x) => x.includes(g.split(' ')[0])));

  const hasPhase2 =
    cpi || jobGrowth || jobOpenings || (slice.educationTiers?.length ?? 0) > 0 || gaps.length > 0;
  if (!hasPhase2) return null;

  return (
    <div className="mt-4 pt-4 border-t border-[#1e3a5f]/60">
      <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">
        Additional metrics
      </h4>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cpi && <EconomicIndicatorCard ind={cpi} />}
        {jobGrowth && <EconomicIndicatorCard ind={jobGrowth} />}
        {jobOpenings && <EconomicIndicatorCard ind={jobOpenings} labelOverride="Net job openings (US)" />}
      </dl>
      {gaps.includes('Florida-specific Consumer Price Index') && !cpi?.geography?.includes('FL') && (
        <p className="text-[10px] text-gray-600 mt-2 italic">
          Florida-specific CPI: No verified data yet (US CPI-U shown as national inflation reference).
        </p>
      )}
      <EducationTiersPanel tiers={slice.educationTiers ?? []} note={slice.meta.educationNote} />
      {(gaps.length > 0 || extraGaps.length > 0) && (
        <ul className="mt-3 space-y-1">
          {gaps
            .filter((g) => !g.includes('Consumer Price Index'))
            .map((g) => (
              <HonestGapRow key={g} label={g} />
            ))}
          {extraGaps.map((g) => (
            <HonestGapRow key={g} label={g} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function FloridaStateEconomicPanel({ slice }: { slice: StateEconomicSlice }) {
  if (!slice.indicators.length) return null;

  const population = findIndicator(slice, 'Population');
  const income = findIndicator(slice, 'Median household income');
  const homeValue = findIndicator(slice, 'Median home value');
  const unemployment = findIndicator(slice, 'Unemployment rate');
  const unemploymentLevel = findIndicator(slice, 'Unemployment level');
  const employment = findIndicator(slice, 'Employment');
  const laborForce = findIndicator(slice, 'Labor force');

  return (
    <section className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] p-4 mb-4">
      <h3 className="text-white font-semibold text-sm mb-1">
        {slice.stateName} — By the Numbers
      </h3>
      {population && <PopulationHero ind={population} />}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        {income && <EconomicIndicatorCard ind={income} />}
        {homeValue && <EconomicIndicatorCard ind={homeValue} />}
        {unemployment && (
          <EmploymentRateCard
            unemployment={unemployment}
            employment={employment}
            unemploymentLevel={unemploymentLevel}
            laborForce={laborForce}
          />
        )}
      </dl>
      <Phase2MetricsSection slice={slice} />
      <div className="mt-4 pt-3 border-t border-[#1e3a5f]/60">
        <SourceProvenance source={slice.meta.source} asOf={slice.meta.asOf} size="sm" />
        {slice.meta.note && (
          <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">{slice.meta.note}</p>
        )}
      </div>
    </section>
  );
}

/** Compact summary for map sidebar — population + 3 key stats. */
export function FloridaStateEconomicCompact({
  slice,
  statePageHref = '/states/FL',
}: {
  slice: StateEconomicSlice;
  statePageHref?: string;
}) {
  if (!slice.indicators.length) return null;
  const population = findIndicator(slice, 'Population');
  const income = findIndicator(slice, 'Median household income');
  const homeValue = findIndicator(slice, 'Median home value');
  const unemployment = findIndicator(slice, 'Unemployment rate');

  return (
    <div className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] p-3 mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-white text-xs font-semibold">{slice.stateName} snapshot</span>
        <Link href={statePageHref} className="text-[10px] text-[#c8a951] hover:text-[#e8c96a] whitespace-nowrap">
          Full Florida page →
        </Link>
      </div>
      {population && (
        <div className="mb-2">
          <span className="text-[10px] text-gray-500 uppercase">Population</span>
          <div className="text-lg font-bold text-white">{displayValue(population)}</div>
        </div>
      )}
      <dl className="grid grid-cols-3 gap-2 text-center">
        {income && (
          <div>
            <dt className="text-[9px] text-gray-500 uppercase leading-tight">Median income</dt>
            <dd className="text-sm font-semibold text-white">{displayValue(income)}</dd>
          </div>
        )}
        {homeValue && (
          <div>
            <dt className="text-[9px] text-gray-500 uppercase leading-tight">Home value</dt>
            <dd className="text-sm font-semibold text-white">{displayValue(homeValue)}</dd>
          </div>
        )}
        {unemployment && (
          <div>
            <dt className="text-[9px] text-gray-500 uppercase leading-tight">Employment rate</dt>
            <dd className="text-sm font-semibold text-white">
              {formatPercent(employmentRatePercent(unemployment))}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function FloridaLegislationSections({ bundle }: { bundle: LegislationBundleSlice }) {
  return (
    <div className="space-y-6">
      {bundle.sections.map((section) => (
        <FloridaRecordPanel
          key={section.sourceId}
          title={section.label}
          slice={{ meta: section.meta, records: section.records }}
        />
      ))}
    </div>
  );
}

export function FloridaNewsSections({ bundle }: { bundle: NewsBundleSlice }) {
  return (
    <div className="space-y-6">
      {bundle.sections.map((section) => (
        <FloridaRecordPanel
          key={section.sourceId}
          title={section.label}
          subtitle="Journalism — corroborate with official records when possible."
          slice={{ meta: section.meta, records: section.records }}
        />
      ))}
    </div>
  );
}
