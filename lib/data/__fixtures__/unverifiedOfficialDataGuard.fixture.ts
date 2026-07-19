/**
 * Florida dashboard data files subject to provenance credibility guard.
 * Prevents placeholder numbers under official/nonpartisan citations.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const FL_DASHBOARD_CREDIBILITY_FILES = [
  'data/florida/census/florida-counties-sample.json',
  'data/florida/census/florida-state-rankings-sample.json',
  'data/florida/bea/florida-rpp-sample.json',
  'data/florida/meric/florida-col-sample.json',
  'data/florida/bls/florida-metro-cpi-sample.json',
  'data/florida/taxes/florida-tax-burden-sample.json',
] as const;

export function floridaDashboardDataPath(rel: string): string {
  return path.join(projectRoot, rel);
}

/** Known-bad: official-tier file with numeric payload but fetchedLive:false / no live provenance. */
export const UNVERIFIED_OFFICIAL_KNOWN_BAD = {
  meta: {
    source: { tier: 'official' as const },
    fetchedLive: false,
    provenance: 'honest-gap' as const,
  },
  state: { allItemsIndex: 99.4 },
};

/** Known-bad: missing provenance on official numeric payload. */
export const UNVERIFIED_OFFICIAL_KNOWN_BAD_MISSING_PROVENANCE = {
  meta: {
    source: { tier: 'official' as const },
    fetchedLive: true,
  },
  records: [{ population: 2685296 }],
};

/** Known-bad: all-zero attainment claimed as fetched-live (false empty). */
export const UNVERIFIED_OFFICIAL_KNOWN_BAD_ZERO_ATTAINMENT = {
  meta: {
    source: { tier: 'official' as const },
    provenance: 'fetched-live' as const,
    fetchedLive: true,
    censusFetchedLive: true,
    blsFetchedLive: true,
    attainmentFetchedLive: true,
  },
  stateSummary: {
    populationRank: 3,
    populationGrowthPct: 1.4,
    attainment: {
      hsPlusPct: 0,
      someCollegePct: 0,
      bachelorsPct: 0,
      graduatePct: 0,
      bachelorsPlusPct: 0,
    },
  },
  records: [{ population: 1, medianHouseholdIncome: 1, medianHomeValue: 1, unemploymentRate: null }],
};

/** Known-good: fetched-live provenance with numeric payload. */
export const UNVERIFIED_OFFICIAL_KNOWN_GOOD = {
  meta: {
    source: { tier: 'official' as const },
    provenance: 'fetched-live' as const,
    fetchedLive: true,
    censusFetchedLive: true,
    blsFetchedLive: true,
    attainmentFetchedLive: true,
  },
  records: [{ population: 1 }],
  stateSummary: {
    attainment: {
      hsPlusPct: 89.6,
      someCollegePct: 29,
      bachelorsPct: 20.7,
      graduatePct: 12.5,
      bachelorsPlusPct: 33.2,
    },
  },
};

/** Known-good: honest-gap with null state (no numbers shipped). */
export const UNVERIFIED_OFFICIAL_KNOWN_GAP = {
  meta: {
    source: { tier: 'official' as const },
    provenance: 'honest-gap' as const,
    fetchedLive: false,
  },
  state: null,
};

/** Known-good: computed-from-published-tables with citation + computedAt. */
export const UNVERIFIED_OFFICIAL_KNOWN_GOOD_COMPUTED = {
  meta: {
    provenance: {
      federal: {
        name: 'IRS',
        url: 'https://www.irs.gov',
        tier: 'official' as const,
        citation: 'IRS Rev. Proc. 2023-34',
        computedAt: '2026-07-10T12:00:00.000Z',
        provenance: 'computed-from-published-tables' as const,
      },
    },
  },
  singleFiler: {
    incomeLevels: [50000],
    federalTax: [4016],
    floridaStateTax: [0],
    totalInFlorida: [4016],
  },
};
