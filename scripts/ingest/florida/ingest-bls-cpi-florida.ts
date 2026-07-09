/**
 * BLS CPI ingest for Florida state profile.
 * Florida-specific CPI metro/regional series are not available in the public v1 API;
 * records US CPI-U as national inflation reference with an explicit honest-gap note.
 */
import { writeFloridaSnapshot } from '../../lib/ingest-utils';
import {
  BLS_SOURCE,
  fetchBlsSeries,
  historyFromPoints,
  latestPoint,
} from '../../lib/bls-api';

const FL_CPI_CANDIDATES = [
  'CUSR1200000000000A',
  'CUSR1200000000000',
  'CUURA311SA0',
  'CUSR36860SA0',
  'CUSR45300SA0',
  'CUSR34940SA0',
];

const US_CPI = 'CUSR0000SA0';

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  let flSeriesId: string | null = null;
  try {
    const probe = await fetchBlsSeries(FL_CPI_CANDIDATES, year - 1, year);
    for (const id of FL_CPI_CANDIDATES) {
      const pts = probe.get(id);
      if (pts?.length && latestPoint(pts)) {
        flSeriesId = id;
        break;
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  if (!flSeriesId) {
    errors.push(
      'No Florida or South Atlantic CPI series returned data from BLS v1 API — Florida-specific CPI unavailable.',
    );
  }

  try {
    const us = await fetchBlsSeries([US_CPI], year - 10, year);
    const pts = us.get(US_CPI);
    const latest = latestPoint(pts);
    if (latest) {
      records.push({
        indicator: 'US CPI-U (national reference)',
        geography: 'US',
        unit: 'index',
        seriesId: US_CPI,
        latestPeriod: latest.period,
        latestValue: latest.value,
        recent: historyFromPoints(pts, 12),
        source: { ...BLS_SOURCE, date: latest.date },
        asOf,
        blsUrl: `https://data.bls.gov/timeseries/${US_CPI}`,
        note: flSeriesId
          ? undefined
          : 'Florida-specific CPI not available via BLS public timeseries API; US urban CPI shown for inflation context only.',
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  if (flSeriesId) {
    try {
      const fl = await fetchBlsSeries([flSeriesId], year - 10, year);
      const pts = fl.get(flSeriesId);
      const latest = latestPoint(pts);
      if (latest) {
        records.unshift({
          indicator: 'Consumer Price Index',
          geography: 'FL',
          unit: 'index',
          seriesId: flSeriesId,
          latestPeriod: latest.period,
          latestValue: latest.value,
          recent: historyFromPoints(pts, 12),
          source: { ...BLS_SOURCE, date: latest.date },
          asOf,
          blsUrl: `https://data.bls.gov/timeseries/${flSeriesId}`,
        });
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const out = await writeFloridaSnapshot('bls', 'florida-cpi.json', {
    meta: {
      source: BLS_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.bls.gov/publicAPI/v1/timeseries/data/',
      note: flSeriesId
        ? 'Florida CPI from BLS regional/metro series.'
        : 'Honest gap: Florida-specific CPI not in BLS v1 API. US CPI-U included as national inflation reference only.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records, FL series: ${flSeriesId ?? 'none'})`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
