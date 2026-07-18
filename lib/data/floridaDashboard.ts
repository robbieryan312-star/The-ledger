/**
 * Florida dashboard data loaders — small-sample JSON only (not full corpus).
 */
import countiesSample from '../../data/florida/census/florida-counties-sample.json';
import rppSample from '../../data/florida/bea/florida-rpp-sample.json';
import taxSample from '../../data/florida/taxes/florida-tax-burden-sample.json';
import type { ComputedProvenanceMeta, DataProvenance } from './provenance';

export type FloridaCountyRow = {
  fips: string;
  name: string;
  population: number;
  medianHouseholdIncome: number;
  medianHomeValue: number;
  unemploymentRate: number | null;
};

export type FloridaAttainment = {
  hsPlusPct: number;
  someCollegePct: number;
  bachelorsPct: number;
  graduatePct: number;
  bachelorsPlusPct: number;
};

export type FloridaTaxSectionProvenance = ComputedProvenanceMeta & {
  name: string;
  url: string;
};

export function getFloridaCountiesSample(): {
  records: FloridaCountyRow[];
  stateSummary: {
    populationRank: number | null;
    populationGrowthPct: number | null;
    attainment: FloridaAttainment | null;
    usAttainmentBachelorsPlusPct?: number | null;
  };
  meta: {
    source: { name: string; url: string; tier: string };
    asOf: string;
    provenance: DataProvenance;
    fetchedLive: boolean;
    censusFetchedLive: boolean;
    blsFetchedLive: boolean;
    attainmentFetchedLive: boolean;
    note?: string;
  };
} {
  return countiesSample as ReturnType<typeof getFloridaCountiesSample>;
}

export function getFloridaRppSample() {
  return rppSample as {
    meta: {
      source: { name: string; url: string; tier: string };
      asOf: string;
      provenance: DataProvenance;
      fetchedLive: boolean;
      note?: string;
    };
    state: {
      allItemsIndex: number;
      period: string;
      components: { label: string; index: number }[];
      metros: { name: string; index: number }[];
    } | null;
  };
}

export function getFloridaTaxSample() {
  return taxSample as {
    meta: {
      asOf: string;
      provenance: {
        federal: FloridaTaxSectionProvenance;
        floridaState: FloridaTaxSectionProvenance;
        comparison: FloridaTaxSectionProvenance;
        totalBurden: FloridaTaxSectionProvenance;
      };
    };
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
      source: { name: string; url: string; tier: 'nonpartisan'; citation?: string };
    };
  };
}

export function topBottomCounties(
  records: FloridaCountyRow[],
  key: keyof Pick<FloridaCountyRow, 'population' | 'medianHouseholdIncome' | 'medianHomeValue' | 'unemploymentRate'>,
  n = 5,
): { top: FloridaCountyRow[]; bottom: FloridaCountyRow[] } {
  const eligible =
    key === 'unemploymentRate'
      ? records.filter((r) => r.unemploymentRate != null)
      : records;
  const sorted = [...eligible].sort((a, b) => (b[key] as number) - (a[key] as number));
  return {
    top: sorted.slice(0, n),
    bottom: [...sorted].reverse().slice(0, n),
  };
}

