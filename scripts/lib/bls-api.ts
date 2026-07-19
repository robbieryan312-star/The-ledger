/**
 * Shared BLS public timeseries API helpers (v1, no key required).
 */
import { fetchJson } from './ingest-utils';

export const BLS_SOURCE = {
  name: 'U.S. Bureau of Labor Statistics',
  url: 'https://www.bls.gov',
  tier: 'official' as const,
  description: 'Official labor and price statistics via api.bls.gov',
};

export interface BLSDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
}

export interface BLSSeriesResult {
  seriesID: string;
  data: BLSDataPoint[];
}

interface BLSResp {
  status: string;
  Results?: { series: BLSSeriesResult[] };
}

export async function fetchBlsSeries(
  seriesIds: string[],
  startYear: number,
  endYear: number,
): Promise<Map<string, BLSDataPoint[]>> {
  const data = await fetchJson<BLSResp>('https://api.bls.gov/publicAPI/v1/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seriesid: seriesIds,
      startyear: String(startYear),
      endyear: String(endYear),
    }),
  });
  if (data.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS status: ${data.status}`);
  }
  const out = new Map<string, BLSDataPoint[]>();
  for (const s of data.Results?.series ?? []) {
    out.set(s.seriesID, s.data ?? []);
  }
  return out;
}

export function latestPoint(
  points: BLSDataPoint[] | undefined,
): { value: number; period: string; date?: string } | null {
  const latest = points?.[0];
  if (!latest || latest.value === '-' || latest.value == null) return null;
  const value = Number.parseFloat(String(latest.value).replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  const mm = latest.period.replace('M', '').padStart(2, '0');
  const date =
    latest.period.startsWith('M') || latest.period === 'M13'
      ? `${latest.year}-${mm}-01`
      : undefined;
  return { value, period: `${latest.periodName} ${latest.year}`, date };
}

export function historyFromPoints(
  points: BLSDataPoint[] | undefined,
  limit = 12,
): Array<{ period: string; value: number }> {
  if (!points?.length) return [];
  const rows: Array<{ period: string; value: number }> = [];
  for (const p of points.slice(0, limit)) {
    if (p.value === '-' || p.value == null) continue;
    const value = Number.parseFloat(String(p.value).replace(/,/g, ''));
    if (!Number.isFinite(value)) continue;
    rows.push({ period: `${p.periodName} ${p.year}`, value });
  }
  return rows;
}

/**
 * Year-over-year % change from BLS monthly series (newest-first).
 * Requires the same calendar month one year prior (13 monthly observations).
 * Returns null when the series is too short or the prior month is missing.
 */
export function yoyPctFromMonthlyPoints(points: BLSDataPoint[] | undefined): number | null {
  if (!points?.length) return null;
  const monthly = points.filter(
    (p) => /^M(0[1-9]|1[0-2])$/.test(p.period) && p.value != null && p.value !== '-',
  );
  if (monthly.length < 13) return null;
  const latest = monthly[0];
  const latestVal = Number.parseFloat(String(latest.value).replace(/,/g, ''));
  if (!Number.isFinite(latestVal)) return null;
  const priorYear = String(Number.parseInt(latest.year, 10) - 1);
  const prior = monthly.find((p) => p.year === priorYear && p.period === latest.period);
  if (!prior) return null;
  const priorVal = Number.parseFloat(String(prior.value).replace(/,/g, ''));
  if (!Number.isFinite(priorVal) || priorVal === 0) return null;
  return ((latestVal - priorVal) / priorVal) * 100;
}

export function growthOverYears(
  points: BLSDataPoint[] | undefined,
  years: number,
): { startValue: number; endValue: number; pct: number; startPeriod: string; endPeriod: string } | null {
  if (!points?.length) return null;
  const end = latestPoint(points);
  if (!end) return null;
  const endYear = Number.parseInt(points[0].year, 10);
  let startPoint: BLSDataPoint | undefined;
  for (const p of points) {
    const y = Number.parseInt(p.year, 10);
    if (endYear - y >= years) {
      startPoint = p;
      break;
    }
  }
  if (!startPoint || startPoint.value === '-') return null;
  const startValue = Number.parseFloat(String(startPoint.value).replace(/,/g, ''));
  if (!Number.isFinite(startValue) || startValue === 0) return null;
  const pct = ((end.value - startValue) / startValue) * 100;
  return {
    startValue,
    endValue: end.value,
    pct,
    startPeriod: `${startPoint.periodName} ${startPoint.year}`,
    endPeriod: end.period,
  };
}
