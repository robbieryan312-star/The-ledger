/**
 * Florida county-map elected officials — reference slice (M8 Option A).
 * Only FIPS present in generated JSON are "live"; all others are honest-gap.
 */
import type { CountyData, Source } from '@/lib/types';
import raw from '@/lib/data/generated/countyMap/fl-reference-counties.json';

export type CountyMapCounty = CountyData & {
  status?: 'filled' | 'honest-gap';
  asOf?: string;
  sources?: Source[];
};

type CountyMapFile = {
  asOf: string;
  scope: string;
  note: string;
  byFips: Record<string, CountyMapCounty>;
};

const file = raw as CountyMapFile;

/** Counties with verified reference data (keyed by 5-digit FIPS). */
export const countyByFips: Record<string, CountyMapCounty> = { ...file.byFips };

/** Group reference counties by state code for USAMap state drilldown lists. */
export const countiesByState: Record<string, CountyMapCounty[]> = (() => {
  const out: Record<string, CountyMapCounty[]> = {};
  for (const county of Object.values(countyByFips)) {
    const list = out[county.stateCode] ?? (out[county.stateCode] = []);
    list.push(county);
  }
  return out;
})();

export const countyMapMeta = {
  asOf: file.asOf,
  scope: file.scope,
  note: file.note,
  referenceFips: Object.keys(countyByFips).sort(),
} as const;

export function hasCountyMapData(fips: string): boolean {
  return Boolean(countyByFips[fips]);
}
