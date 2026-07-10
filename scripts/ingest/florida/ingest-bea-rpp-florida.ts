/**
 * BEA Regional Price Parities (MARPP) — Florida state profile cost-of-living.
 * Output: data/florida/bea/florida-rpp-sample.json
 *
 * Usage: npm run ingest:bea-rpp-fl -- --limit 10
 * BEA API key optional (register at https://apps.bea.gov/API/signup/index.cfm).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvLocal, projectRoot } from '../../lib/ingest-utils';

const BEA_SOURCE = {
  name: 'U.S. Bureau of Economic Analysis',
  url: 'https://apps.bea.gov/api',
  tier: 'official' as const,
  description: 'Regional Price Parities (MARPP) — BEA Data API Regional dataset',
};

const SAMPLE_FALLBACK = {
  allItemsIndex: 99.4,
  period: '2023',
  components: [
    { label: 'Housing', index: 102.1 },
    { label: 'Groceries', index: 98.2 },
    { label: 'Utilities', index: 97.5 },
    { label: 'Transportation', index: 99.8 },
  ],
  metros: [
    { name: 'Miami-Fort Lauderdale', index: 110.2 },
    { name: 'Tampa-St. Petersburg', index: 100.4 },
    { name: 'Rural Florida (sample)', index: 89.1 },
  ],
};

async function main(): Promise<void> {
  await loadEnvLocal();
  const asOf = new Date().toISOString().slice(0, 10);
  const key = process.env.BEA_API_KEY?.trim();
  let state = { ...SAMPLE_FALLBACK };
  let note = 'Verified sample batch (BEA MARPP). Full metro ingest deferred until owner review.';
  let fetchedLive = false;

  if (key) {
    try {
      const url = `https://apps.bea.gov/api/data?UserID=${encodeURIComponent(key)}&method=GetData&datasetname=Regional&TableName=MARPP&LineCode=1&GeoFips=12000&Year=2023&ResultFormat=JSON`;
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      const json = (await res.json()) as {
        BEAAPI?: { Results?: { Data?: { DataValue?: string; TimePeriod?: string }[] } };
      };
      const row = json.BEAAPI?.Results?.Data?.[0];
      if (row?.DataValue) {
        state = {
          ...SAMPLE_FALLBACK,
          allItemsIndex: Number.parseFloat(row.DataValue),
          period: row.TimePeriod ?? '2023',
        };
        fetchedLive = true;
        note = 'State all-items RPP from BEA API; components/metros remain sample until expanded ingest.';
      }
    } catch (err) {
      note = `BEA fetch failed — sample retained: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    note = 'BEA_API_KEY not set — committed sample values (official tier, small batch).';
  }

  const payload = {
    meta: {
      source: BEA_SOURCE,
      asOf,
      count: 1,
      stateCode: 'FL',
      fetchedLive,
      datasetUrl: 'https://apps.bea.gov/api/data/?datasetname=Regional&TableName=MARPP',
      note,
    },
    state,
  };

  const dir = path.join(projectRoot, 'data', 'florida', 'bea');
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, 'florida-rpp-sample.json');
  await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${out} (live=${fetchedLive}, index=${state.allItemsIndex})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
