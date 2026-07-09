/**
 * National benchmark series for vs-US comparison chips on Florida economic stats.
 */
import { writeFloridaSnapshot } from '../../lib/ingest-utils';
import { BLS_SOURCE, fetchBlsSeries, latestPoint } from '../../lib/bls-api';

/** All workers 25+ median usual weekly earnings (CPS) — not education-tier series. */
const ALL_WORKERS_WEEKLY_EARNINGS = 'LEU0252887700';

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  const seriesIds = ['LNS14000000', ALL_WORKERS_WEEKLY_EARNINGS];

  try {
    const data = await fetchBlsSeries(seriesIds, year - 2, year);

    const unemp = latestPoint(data.get('LNS14000000'));
    if (unemp) {
      records.push({
        indicator: 'Unemployment rate',
        geography: 'US',
        unit: '%',
        seriesId: 'LNS14000000',
        latestPeriod: unemp.period,
        latestValue: unemp.value,
        matchesFloridaIndicator: 'Unemployment rate',
        source: { ...BLS_SOURCE, date: unemp.date },
        asOf,
        blsUrl: 'https://data.bls.gov/timeseries/LNS14000000',
      });
    }

    const earn = latestPoint(data.get(ALL_WORKERS_WEEKLY_EARNINGS));
    if (earn) {
      const weekly = Number.parseFloat(String(earn.value).replace(/,/g, ''));
      records.push({
        indicator: 'Median weekly earnings (all workers)',
        geography: 'US',
        unit: 'USD/week',
        seriesId: ALL_WORKERS_WEEKLY_EARNINGS,
        latestPeriod: earn.period,
        latestValue: earn.value,
        matchesFloridaIndicator: '',
        source: { ...BLS_SOURCE, date: earn.date },
        asOf,
        blsUrl: `https://data.bls.gov/timeseries/${ALL_WORKERS_WEEKLY_EARNINGS}`,
        note: 'National CPS median usual weekly earnings, all education levels, workers 25+.',
        medianAnnualEarnings: Number.isFinite(weekly) ? Math.round(weekly * 52) : null,
        annualEarningsNote: 'Annualized (weekly × 52)',
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('bls', 'florida-national-benchmarks.json', {
    meta: {
      source: BLS_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.bls.gov/publicAPI/v1/timeseries/data/',
      note: 'National BLS benchmarks for vs-US delta chips on Florida labor indicators.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} benchmarks)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
