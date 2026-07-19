/**
 * Compact and full number formatting for state economic panels.
 */

function parseNumeric(value: number | string | null | undefined): number | null {
  if (value == null || value === '' || value === '-') return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** 500K · 21.9M · 1.2B */
export function formatCompact(value: number | string | null | undefined): string {
  const n = parseNumeric(value);
  if (n == null) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return `${n}`;
}

/** 500,000 */
export function formatFull(value: number | string | null | undefined): string {
  const n = parseNumeric(value);
  if (n == null) return '—';
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** $500K · $21.9M */
export function formatCompactCurrency(value: number | string | null | undefined): string {
  const n = parseNumeric(value);
  if (n == null) return '—';
  const compact = formatCompact(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  return `${sign}$${compact.replace(/^-/, '')}`;
}

/** $500,000 */
export function formatFullCurrency(value: number | string | null | undefined): string {
  const n = parseNumeric(value);
  if (n == null) return '—';
  return `$${formatFull(n)}`;
}

function stripTrailingZero(value: string): string {
  return value.replace(/\.0$/, '');
}

/** 4.4% */
export function formatPercent(value: number | string | null | undefined, digits = 1): string {
  const n = parseNumeric(value);
  if (n == null) return '—';
  const cappedDigits = Math.min(Math.max(Math.trunc(digits), 0), 1);
  return `${stripTrailingZero(n.toFixed(cappedDigits))}%`;
}

/** 3 */
export function formatRank(value: number | string | null | undefined): string {
  const n = parseNumeric(value);
  if (n == null) return '—';
  return Math.round(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Format indicator display value from raw + unit. */
export function formatIndicatorValue(
  rawValue: number | string | null | undefined,
  unit?: string,
): string {
  const u = (unit ?? '').toLowerCase();
  if (u === '%' || u === 'percent') return formatPercent(rawValue);
  if (u === 'usd' || u === '$') return formatCompactCurrency(rawValue);
  if (u === 'persons' || u === 'count' || u === 'people') return formatCompact(rawValue);
  const n = parseNumeric(rawValue);
  if (n == null) return '—';
  return formatCompact(n);
}

/** Full detail string for dropdown tables. */
export function formatIndicatorFull(
  rawValue: number | string | null | undefined,
  unit?: string,
): string {
  const u = (unit ?? '').toLowerCase();
  if (u === '%' || u === 'percent') return formatPercent(rawValue);
  if (u === 'usd' || u === '$') return formatFullCurrency(rawValue);
  if (u === 'persons' || u === 'count' || u === 'people') return formatFull(rawValue);
  return formatFull(rawValue);
}
