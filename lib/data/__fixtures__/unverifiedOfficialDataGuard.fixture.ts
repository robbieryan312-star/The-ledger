/**
 * Florida dashboard data files subject to fetchedLive credibility guard.
 * Prevents placeholder numbers under official/nonpartisan citations.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const FL_DASHBOARD_CREDIBILITY_FILES = [
  'data/florida/census/florida-counties-sample.json',
  'data/florida/bea/florida-rpp-sample.json',
  'data/florida/taxes/florida-tax-burden-sample.json',
] as const;

export function floridaDashboardDataPath(rel: string): string {
  return path.join(projectRoot, rel);
}

/** Known-bad: official-tier file with numeric payload but fetchedLive:false. */
export const UNVERIFIED_OFFICIAL_KNOWN_BAD = {
  meta: {
    source: { tier: 'official' as const },
    fetchedLive: false,
  },
  state: { allItemsIndex: 99.4 },
};

/** Known-good: fetchedLive:true with numeric payload. */
export const UNVERIFIED_OFFICIAL_KNOWN_GOOD = {
  meta: {
    source: { tier: 'official' as const },
    fetchedLive: true,
  },
  records: [{ population: 1 }],
};

/** Known-good: unfetched BEA with honest null payload (no numbers shipped). */
export const UNVERIFIED_OFFICIAL_KNOWN_GAP = {
  meta: {
    source: { tier: 'official' as const },
    fetchedLive: false,
  },
  state: null,
};
