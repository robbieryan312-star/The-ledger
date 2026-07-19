/**
 * BLS v2 metro CPI ingest for Miami + Tampa.
 * Output: data/florida/bls/florida-metro-cpi-sample.json
 */
import { writeFloridaSnapshot } from '../../lib/ingest-utils';
import { BLS_SOURCE, historyFromPoints, latestPoint, type BLSSeriesResult } from '../../lib/bls-api';

const BLS_V2_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

const METROS = [
  {
    metro: 'Miami-Fort Lauderdale-West Palm Beach, FL',
    candidates: ['CUURS35BSA0', 'CUURA35BSA0'],
  },
  {
    metro: 'Tampa-St. Petersburg-Clearwater, FL',
    candidates: ['CUURS35DSA0', 'CUURA35DSA0', 'CUURS35ESA0', 'CUURA35ESA0'],
  },
] as const;

type BLSResp = {
  status: string;
  message?: string[];
  Results?: { series?: BLSSeriesResult[] };
};

async function fetchBlsV2(seriesIds: string[], startYear: number, endYear: number): Promise<Map<string, BLSSeriesResult>> {
  const res = await fetch(BLS_V2_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(60_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seriesid: seriesIds,
      startyear: String(startYear),
      endyear: String(endYear),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`BLS v2 HTTP ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as BLSResp;
  if (json.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS v2 status ${json.status}: ${(json.message ?? []).join('; ')}`);
  }
  const out = new Map<string, BLSSeriesResult>();
  for (const series of json.Results?.series ?? []) {
    out.set(series.seriesID, series);
  }
  return out;
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const endYear = new Date().getFullYear();
  const startYear = endYear - 2;
  const allCandidates = METROS.flatMap((metro) => [...metro.candidates]);
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  const seriesMap = await fetchBlsV2(allCandidates, startYear, endYear);
  for (const metro of METROS) {
    const selected = metro.candidates
      .map((seriesId) => seriesMap.get(seriesId))
      .find((series) => latestPoint(series?.data) != null);
    const latest = latestPoint(selected?.data);
    if (!selected || !latest) {
      errors.push(`No CPI data returned for ${metro.metro} candidates: ${metro.candidates.join(', ')}`);
      continue;
    }
    records.push({
      metro: metro.metro,
      indicator: 'Consumer Price Index for All Urban Consumers: All items',
      unit: 'index',
      seriesId: selected.seriesID,
      latestPeriod: latest.period,
      latestValue: latest.value,
      recent: historyFromPoints(selected.data, 12),
      source: { ...BLS_SOURCE, date: latest.date },
      asOf,
      blsUrl: `https://data.bls.gov/timeseries/${selected.seriesID}`,
    });
  }

  const fetchedLive = records.length === METROS.length;
  const outputRecords = fetchedLive ? records : [];
  const out = await writeFloridaSnapshot('bls', 'florida-metro-cpi-sample.json', {
    meta: {
      source: BLS_SOURCE,
      asOf,
      count: outputRecords.length,
      stateCode: 'FL',
      provenance: fetchedLive ? 'fetched-live' : 'honest-gap',
      fetchedLive,
      fetchedAt: fetchedLive ? new Date().toISOString() : undefined,
      datasetUrl: BLS_V2_URL,
      errors: errors.length ? errors : undefined,
      note: fetchedLive
        ? 'BLS v2 API metro CPI sample for Miami and Tampa.'
        : 'Honest gap: one or more requested Florida metro CPI series did not return data.',
    },
    records: outputRecords,
  });

  console.log(`Wrote ${out} (live=${fetchedLive}, records=${outputRecords.length})`);
  if (!fetchedLive) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
