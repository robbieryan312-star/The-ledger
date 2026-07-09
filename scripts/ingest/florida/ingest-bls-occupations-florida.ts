/**
 * Fastest-growing occupations / employment projections — honest gap.
 * BLS OES/projection occupation series are not available via the public v1 timeseries API.
 */
import { writeFloridaSnapshot } from '../../lib/ingest-utils';
import { BLS_SOURCE } from '../../lib/bls-api';

const PROBE_SERIES = [
  'OEUM120000000000000001',
  'OEUS120000000000000001',
  'OEUM000000000000000001',
];

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [
    'BLS occupation projection/OES fastest-growing series not returned by public v1 timeseries API.',
    `Probed: ${PROBE_SERIES.join(', ')}`,
  ];

  const out = await writeFloridaSnapshot('bls', 'florida-occupations.json', {
    meta: {
      source: BLS_SOURCE,
      asOf,
      count: 0,
      stateCode: 'FL',
      fetchedLive: false,
      errors,
      datasetUrl: 'https://www.bls.gov/emp/',
      note:
        'Honest gap: fastest-growing occupations and 10-year occupational projections require BLS Employment Projections tables outside the v1 timeseries API. No verified occupation sample ingested.',
    },
    records: [],
  });

  console.log(`Wrote ${out} (0 records — honest gap for occupations)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
