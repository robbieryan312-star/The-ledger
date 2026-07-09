/**
 * Florida nonfarm employment growth + national job openings sample (BLS, no key).
 */
import { writeFloridaSnapshot } from '../../lib/ingest-utils';
import {
  BLS_SOURCE,
  fetchBlsSeries,
  growthOverYears,
  historyFromPoints,
  latestPoint,
} from '../../lib/bls-api';

const FL_NONFARM = 'SMU12000000000000001';
const US_JOB_OPENINGS = 'JTS000000000000000JOL';

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  try {
    const data = await fetchBlsSeries([FL_NONFARM, US_JOB_OPENINGS], year - 12, year);
    const flPts = data.get(FL_NONFARM);
    const latest = latestPoint(flPts);
    const growth10 = growthOverYears(flPts, 10);

    if (latest) {
      records.push({
        indicator: 'Total nonfarm employment',
        geography: 'FL',
        unit: 'thousands',
        seriesId: FL_NONFARM,
        latestPeriod: latest.period,
        latestValue: latest.value,
        recent: historyFromPoints(flPts, 12),
        tenYearGrowthPct: growth10?.pct ?? null,
        tenYearGrowthNote: growth10
          ? `${growth10.startPeriod} → ${growth10.endPeriod}`
          : 'Insufficient history for 10-year comparison',
        source: { ...BLS_SOURCE, date: latest.date },
        asOf,
        blsUrl: `https://data.bls.gov/timeseries/${FL_NONFARM}`,
      });
    } else {
      errors.push('Florida nonfarm employment series returned no latest value.');
    }

    const openingsPts = data.get(US_JOB_OPENINGS);
    const openingsLatest = latestPoint(openingsPts);
    if (openingsLatest) {
      records.push({
        indicator: 'Job openings (national)',
        geography: 'US',
        unit: 'thousands',
        seriesId: US_JOB_OPENINGS,
        latestPeriod: openingsLatest.period,
        latestValue: openingsLatest.value,
        recent: historyFromPoints(openingsPts, 6),
        source: { ...BLS_SOURCE, date: openingsLatest.date },
        asOf,
        blsUrl: `https://data.bls.gov/timeseries/${US_JOB_OPENINGS}`,
        note: 'National JOLTS job openings — Florida state openings series not included in this sample.',
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('bls', 'florida-employment-growth.json', {
    meta: {
      source: BLS_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.bls.gov/publicAPI/v1/timeseries/data/',
      note: 'Florida statewide nonfarm employment with 10-year growth; national job openings sample.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
