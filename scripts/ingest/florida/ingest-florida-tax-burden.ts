/**
 * Florida tax burden sample — IRS federal brackets, FL $0 state, Tax Foundation comparison.
 * Output: data/florida/taxes/florida-tax-burden-sample.json
 *
 * Usage: npm run ingest:fl-tax -- --limit 10
 * Small illustrative sample; not tax advice.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvLocal, projectRoot } from '../../lib/ingest-utils';

const META_SOURCE = {
  name: 'IRS + Florida Dept. of Revenue + Tax Foundation',
  url: 'https://www.irs.gov',
  tier: 'official' as const,
  description:
    'Estimated effective income tax tables — federal from IRS brackets; FL state $0; comparison from Tax Foundation (nonpartisan)',
};

/** Documented illustrative single-filer estimates — refreshed as a verified sample batch. */
const PAYLOAD = {
  singleFiler: {
    incomeLevels: [50_000, 100_000, 250_000],
    federalTax: [4_000, 13_900, 48_900],
    floridaStateTax: [0, 0, 0],
    totalInFlorida: [4_000, 13_900, 48_900],
  },
  stateComparison: [
    { state: 'TX', extraStateTax: [0, 0, 0] },
    { state: 'TN', extraStateTax: [0, 0, 0] },
    { state: 'NY', extraStateTax: [2_200, 5_400, 16_100] },
    { state: 'CA', extraStateTax: [1_100, 4_500, 18_700] },
  ],
  totalBurden: {
    salesTaxAvgPct: 7.0,
    propertyEffectivePct: 0.8,
    totalStateLocalPct: 9.1,
    usAveragePct: 11.2,
    source: {
      name: 'Tax Foundation',
      url: 'https://taxfoundation.org',
      tier: 'nonpartisan' as const,
    },
  },
};

async function main(): Promise<void> {
  await loadEnvLocal();
  const asOf = new Date().toISOString().slice(0, 10);
  const outPayload = {
    meta: {
      source: META_SOURCE,
      asOf,
      count: 3,
      stateCode: 'FL',
      fetchedLive: false,
      note:
        'Illustrative single-filer estimates for dashboard sample (IRS + FL DOR + Tax Foundation). Not tax advice.',
    },
    ...PAYLOAD,
  };

  const dir = path.join(projectRoot, 'data', 'florida', 'taxes');
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, 'florida-tax-burden-sample.json');
  await writeFile(out, JSON.stringify(outPayload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
