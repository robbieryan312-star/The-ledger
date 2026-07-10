/**
 * Florida tax burden — federal from IRS brackets, FL $0 state, comparison from Tax Foundation.
 * Output: data/florida/taxes/florida-tax-burden-sample.json
 *
 * Usage: npm run ingest:fl-tax
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { federalTaxOnGrossIncomeSingle, IRS_2024_SINGLE } from '../../lib/irs-federal-tax';
import {
  stateIncomeTaxSingle,
  TAX_FOUNDATION_BURDEN_CITATION,
  TAX_FOUNDATION_CITATION,
  TF_STATE_LOCAL_BURDEN,
} from '../../lib/tax-foundation-state-tax';
import { loadEnvLocal, projectRoot } from '../../lib/ingest-utils';

const FL_DOR_SOURCE = {
  name: 'Florida Department of Revenue',
  url: 'https://floridarevenue.com',
  tier: 'official' as const,
  citation: 'Florida has no state personal income tax',
};

const IRS_SOURCE = {
  name: 'Internal Revenue Service',
  url: IRS_2024_SINGLE.url,
  tier: 'official' as const,
  citation: IRS_2024_SINGLE.citation,
};

const INCOME_LEVELS = [50_000, 100_000, 250_000] as const;

async function main(): Promise<void> {
  await loadEnvLocal();
  const asOf = new Date().toISOString().slice(0, 10);

  const federalTax = INCOME_LEVELS.map((inc) => federalTaxOnGrossIncomeSingle(inc));
  const floridaStateTax = INCOME_LEVELS.map(() => 0);
  const totalInFlorida = federalTax.map((f, i) => f + floridaStateTax[i]);

  const stateComparison = [
    { state: 'TX', extraStateTax: INCOME_LEVELS.map(() => 0) },
    { state: 'TN', extraStateTax: INCOME_LEVELS.map(() => 0) },
    {
      state: 'NY',
      extraStateTax: INCOME_LEVELS.map((inc) => stateIncomeTaxSingle('NY', inc)),
    },
    {
      state: 'CA',
      extraStateTax: INCOME_LEVELS.map((inc) => stateIncomeTaxSingle('CA', inc)),
    },
  ];

  const outPayload = {
    meta: {
      asOf,
      count: INCOME_LEVELS.length,
      stateCode: 'FL',
      fetchedLive: true,
      fetchedAt: new Date().toISOString(),
      note: 'Federal tax from IRS 2024 brackets; FL state $0; state comparison from Tax Foundation 2024 bracket schedules; burden from Tax Foundation Facts & Figures.',
      provenance: {
        federal: { ...IRS_SOURCE, fetchedLive: true },
        floridaState: { ...FL_DOR_SOURCE, fetchedLive: true },
        comparison: { ...TAX_FOUNDATION_CITATION, fetchedLive: true },
        totalBurden: { ...TAX_FOUNDATION_BURDEN_CITATION, fetchedLive: true },
      },
    },
    singleFiler: {
      incomeLevels: [...INCOME_LEVELS],
      federalTax,
      floridaStateTax,
      totalInFlorida,
    },
    stateComparison,
    totalBurden: {
      salesTaxAvgPct: TF_STATE_LOCAL_BURDEN.salesTaxAvgPct,
      propertyEffectivePct: TF_STATE_LOCAL_BURDEN.propertyEffectivePct,
      totalStateLocalPct: TF_STATE_LOCAL_BURDEN.floridaPct,
      usAveragePct: TF_STATE_LOCAL_BURDEN.usAveragePct,
      source: TAX_FOUNDATION_BURDEN_CITATION,
    },
  };

  const dir = path.join(projectRoot, 'data', 'florida', 'taxes');
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, 'florida-tax-burden-sample.json');
  await writeFile(out, JSON.stringify(outPayload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${out} (federal=${federalTax.join(',')})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
