import type { StateEconomicIndicator, StateEconomicSlice } from '@/lib/types/snapshotTypes';
import {
  formatCompact,
  formatCompactCurrency,
  formatFull,
  formatFullCurrency,
  formatIndicatorFull,
  formatIndicatorValue,
  formatPercent,
} from '@/lib/format/number';

export function findIndicator(
  slice: StateEconomicSlice,
  label: string,
): StateEconomicIndicator | undefined {
  return slice.indicators.find((ind) => ind.label === label);
}

export function indicatorRawValue(ind: StateEconomicIndicator): number {
  if (typeof ind.rawValue === 'number' && Number.isFinite(ind.rawValue)) return ind.rawValue;
  if (ind.value == null) return NaN;
  const cleaned = String(ind.value).replace(/[$,%\s]/g, '').replace(/persons/gi, '').trim();
  return Number.parseFloat(cleaned);
}

export function displayValue(ind: StateEconomicIndicator): string {
  const raw = indicatorRawValue(ind);
  const unit = ind.unit || guessUnit(ind);
  return formatIndicatorValue(raw, unit);
}

export function displayFullValue(ind: StateEconomicIndicator): string {
  const raw = indicatorRawValue(ind);
  const unit = ind.unit || guessUnit(ind);
  return formatIndicatorFull(raw, unit);
}

function guessUnit(ind: StateEconomicIndicator): string {
  if (ind.label.toLowerCase().includes('income') || ind.label.toLowerCase().includes('value')) return 'USD';
  if (ind.label.includes('rate')) return '%';
  if (ind.label.includes('level') || ind.label === 'Employment' || ind.label === 'Labor force') return 'persons';
  if (ind.label === 'Population') return 'count';
  return '';
}

export function employmentRatePercent(unemployment: StateEconomicIndicator): number {
  return 100 - indicatorRawValue(unemployment);
}

export function deltaVsMonthsAgo(
  history: StateEconomicIndicator['history'],
  months = 12,
): { delta: number; pct: number } | null {
  if (!history || history.length < 2) return null;
  const latest = history[0]?.value;
  const prior = history[Math.min(months, history.length - 1)]?.value;
  if (latest == null || prior == null || prior === 0) return null;
  const delta = latest - prior;
  const pct = (delta / prior) * 100;
  return { delta, pct };
}

export function formatDelta(delta: number, unit: string): string {
  const sign = delta > 0 ? '+' : '';
  if (unit === '%' || unit === 'percent') return `${sign}${delta.toFixed(1)} pp`;
  if (unit === 'USD') return `${sign}${formatCompactCurrency(Math.abs(delta)).replace('$', '$')}`;
  return `${sign}${formatCompact(delta)}`;
}

export function populationHeroText(ind: StateEconomicIndicator): { compact: string; full: string } {
  const raw = indicatorRawValue(ind);
  return { compact: formatCompact(raw), full: formatFull(raw) };
}

export function incomeHeroCompact(ind: StateEconomicIndicator): string {
  return formatCompactCurrency(indicatorRawValue(ind));
}

export function homeValueCompact(ind: StateEconomicIndicator): string {
  return formatCompactCurrency(indicatorRawValue(ind));
}

export {
  formatCompact,
  formatCompactCurrency,
  formatFull,
  formatFullCurrency,
  formatPercent,
};
