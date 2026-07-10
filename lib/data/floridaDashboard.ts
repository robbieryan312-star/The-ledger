/**
 * Florida dashboard data loaders — small-sample JSON only (not full corpus).
 */
import countiesSample from '../../data/florida/census/florida-counties-sample.json';
import rppSample from '../../data/florida/bea/florida-rpp-sample.json';
import taxSample from '../../data/florida/taxes/florida-tax-burden-sample.json';
import type { StateEconomicSlice } from '../types/snapshotTypes';

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

export function getFloridaCountiesSample(): {
  records: FloridaCountyRow[];
  stateSummary: {
    populationRank: number | null;
    populationGrowthPct: number | null;
    attainment: FloridaAttainment;
    usAttainmentBachelorsPlusPct?: number;
  };
  meta: {
    source: { name: string; url: string; tier: string };
    asOf: string;
    fetchedLive: boolean;
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
      fetchedLive: boolean;
      provenance: {
        federal: { name: string; url: string; tier: 'official' | 'nonpartisan'; citation?: string; fetchedLive: boolean };
        floridaState: { name: string; url: string; tier: 'official' | 'nonpartisan'; citation?: string; fetchedLive: boolean };
        comparison: { name: string; url: string; tier: 'official' | 'nonpartisan'; citation?: string; fetchedLive: boolean };
        totalBurden: { name: string; url: string; tier: 'official' | 'nonpartisan'; citation?: string; fetchedLive: boolean };
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

export function findEconomicIndicator(slice: StateEconomicSlice, labelIncludes: string) {
  return slice.indicators.find((i) => i.label.toLowerCase().includes(labelIncludes.toLowerCase()));
}
