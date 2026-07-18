/**
 * BEA Regional Price Parities (MARPP) — Florida state profile cost-of-living.
 * Output: data/florida/bea/florida-rpp-sample.json
 *
 * Usage: npm run ingest:bea-rpp-fl
 * Requires BEA_API_KEY — without it writes provenance:'honest-gap' + state:null.
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

const METRO_GEO = [
  { name: 'Miami-Fort Lauderdale-West Palm Beach', geoFips: '33100' },
  { name: 'Tampa-St. Petersburg-Clearwater', geoFips: '45300' },
] as const;

/** MARPP expenditure category line codes (BEA Regional table MARPP). */
const COMPONENT_LINES: { label: string; lineCode: number }[] = [
  { label: 'Housing', lineCode: 4 },
  { label: 'Groceries', lineCode: 5 },
  { label: 'Utilities', lineCode: 6 },
  { label: 'Transportation', lineCode: 7 },
];

type BeaRow = { DataValue?: string; TimePeriod?: string; GeoName?: string };

async function beaGet(
  key: string,
  params: Record<string, string>,
): Promise<BeaRow[]> {
  const qs = new URLSearchParams({
    UserID: key,
    method: 'GetData',
    datasetname: 'Regional',
    ResultFormat: 'JSON',
    ...params,
  });
  const res = await fetch(`https://apps.bea.gov/api/data?${qs}`, {
    signal: AbortSignal.timeout(60_000),
  });
  const json = (await res.json()) as {
    BEAAPI?: { Results?: { Data?: BeaRow[]; Error?: { APIErrorDescription?: string } } };
  };
  const err = json.BEAAPI?.Results?.Error?.APIErrorDescription;
  if (err) throw new Error(err);
  return json.BEAAPI?.Results?.Data ?? [];
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const asOf = new Date().toISOString().slice(0, 10);
  const key = process.env.BEA_API_KEY?.trim();
  const year = '2023';

  if (!key) {
    const payload = {
      meta: {
        source: BEA_SOURCE,
        asOf,
        count: 0,
        stateCode: 'FL',
        provenance: 'honest-gap' as const,
        fetchedLive: false,
        datasetUrl: 'https://apps.bea.gov/api/data/?datasetname=Regional&TableName=MARPP',
        note: 'BEA_API_KEY not set — cost-of-living shows honest gap until key is configured.',
      },
      state: null,
    };
    const dir = path.join(projectRoot, 'data', 'florida', 'bea');
    await mkdir(dir, { recursive: true });
    const out = path.join(dir, 'florida-rpp-sample.json');
    await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.warn(`Wrote ${out} (provenance=honest-gap, BEA_API_KEY not set)`);
    return;
  }

  const errors: string[] = [];
  let allItemsIndex: number | null = null;
  let period = year;
  const components: { label: string; index: number }[] = [];
  const metros: { name: string; index: number }[] = [];

  try {
    const stateRows = await beaGet(key, {
      TableName: 'MARPP',
      LineCode: '1',
      GeoFips: '12000',
      Year: year,
    });
    const stateRow = stateRows[0];
    if (stateRow?.DataValue) {
      allItemsIndex = Number.parseFloat(stateRow.DataValue);
      period = stateRow.TimePeriod ?? year;
    } else {
      errors.push('state all-items MARPP missing');
    }

    for (const comp of COMPONENT_LINES) {
      const rows = await beaGet(key, {
        TableName: 'MARPP',
        LineCode: String(comp.lineCode),
        GeoFips: '12000',
        Year: year,
      });
      const val = rows[0]?.DataValue;
      if (val) components.push({ label: comp.label, index: Number.parseFloat(val) });
      else errors.push(`component ${comp.label} missing`);
    }

    for (const metro of METRO_GEO) {
      const rows = await beaGet(key, {
        TableName: 'MARPP',
        LineCode: '1',
        GeoFips: metro.geoFips,
        Year: year,
      });
      const val = rows[0]?.DataValue;
      if (val) metros.push({ name: metro.name, index: Number.parseFloat(val) });
      else errors.push(`metro ${metro.name} missing`);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const fetchedLive =
    errors.length === 0 &&
    allItemsIndex != null &&
    components.length === COMPONENT_LINES.length &&
    metros.length === METRO_GEO.length;

  const payload = {
    meta: {
      source: BEA_SOURCE,
      asOf,
      count: fetchedLive ? 1 + components.length + metros.length : 0,
      stateCode: 'FL',
      provenance: fetchedLive ? ('fetched-live' as const) : ('honest-gap' as const),
      fetchedLive,
      fetchedAt: fetchedLive ? new Date().toISOString() : undefined,
      datasetUrl: 'https://apps.bea.gov/api/data/?datasetname=Regional&TableName=MARPP',
      note: fetchedLive
        ? `BEA MARPP ${period} — state, components, and metro sample from live API.`
        : `BEA fetch incomplete: ${errors.join('; ') || 'unknown'}`,
      errors: errors.length ? errors : undefined,
    },
    state: fetchedLive
      ? {
          allItemsIndex,
          period,
          components,
          metros,
        }
      : null,
  };

  const dir = path.join(projectRoot, 'data', 'florida', 'bea');
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, 'florida-rpp-sample.json');
  await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${out} (live=${fetchedLive}, index=${allItemsIndex ?? '—'})`);
  if (!fetchedLive) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
