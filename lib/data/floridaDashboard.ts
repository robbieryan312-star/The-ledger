/**
 * Florida dashboard data loaders — small-sample JSON only (not full corpus).
 */
import countiesSample from '../../data/florida/census/florida-counties-sample.json';
import stateRankingsSample from '../../data/florida/census/florida-state-rankings-sample.json';
import rppSample from '../../data/florida/bea/florida-rpp-sample.json';
import mericColSample from '../../data/florida/meric/florida-col-sample.json';
import metroCpiSample from '../../data/florida/bls/florida-metro-cpi-sample.json';
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

export type FloridaStateAcs = {
  population: number | null;
  medianHouseholdIncome: number | null;
  medianHomeValue: number | null;
  nationalMedianHouseholdIncome: number | null;
  nationalMedianHomeValue: number | null;
  survey: string;
  censusApiUrl: string;
};

export function getFloridaCountiesSample(): {
  records: FloridaCountyRow[];
  stateSummary: {
    populationRank: number | null;
    populationGrowthPct: number | null;
    attainment: FloridaAttainment | null;
    usAttainmentBachelorsPlusPct?: number | null;
    /** Same ACS vintage as county sample — preferred by build-data-slices (Q3 single read-path). */
    acs?: FloridaStateAcs | null;
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

export function getFloridaMericColSample() {
  return mericColSample as {
    meta: {
      source: { name: string; url: string; tier: string };
      asOf: string;
      provenance: DataProvenance;
      fetchedLive: boolean;
      citation: string;
      period: string;
      note?: string;
    };
    state: {
      state: string;
      period: string;
      allItemsIndex: number;
      rankAmong50: number;
      reportedRank: number | null;
      components: { label: string; index: number }[];
    };
  };
}

export function getFloridaMetroCpiSample() {
  return metroCpiSample as {
    meta: {
      source: { name: string; url: string; tier: string };
      asOf: string;
      provenance: DataProvenance;
      fetchedLive: boolean;
      note?: string;
    };
    records: Array<{
      metro: string;
      shortName?: string;
      indicator: string;
      unit: string;
      seriesId: string;
      latestPeriod: string | null;
      latestValue: number | null;
      yoyPct: number | null;
      recent: { period: string; value: number }[];
      source: { name: string; url: string; tier: string; date?: string };
      asOf: string;
      blsUrl: string;
    }>;
  };
}

export function getFloridaStateRankingsSample() {
  return stateRankingsSample as {
    meta: {
      source: { name: string; url: string; tier: string };
      asOf: string;
      provenance: DataProvenance;
      fetchedLive: boolean;
      note?: string;
      period?: string;
    };
    ranks: Record<
      string,
      {
        rank: number | null;
        value: number | null;
        denominator: number | null;
      }
    >;
    ageBreakdown: { label: string; percent: number }[];
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

