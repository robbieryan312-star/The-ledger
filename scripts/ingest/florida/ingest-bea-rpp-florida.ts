/**
 * BEA Regional Price Parities (MARPP) — Florida state profile cost-of-living.
 * Output: data/florida/bea/florida-rpp-sample.json
 *
 * Usage: npm run ingest:bea-rpp-fl
 * Requires BEA_API_KEY — without it writes provenance:'honest-gap' + state:null.
 *
 * LineCodes are resolved by NAME via GetParameterValues (MARPP has no
 * Groceries/Transportation lines — those labels are skipped when absent).
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

/** Preferred component labels — resolved against live MARPP LineCode catalog by NAME. */
const PREFERRED_COMPONENT_NAMES = ['Housing', 'Utilities', 'Goods', 'Services'] as const;

type BeaRow = { DataValue?: string; TimePeriod?: string; GeoName?: string };
type BeaParam = { Key?: string; Desc?: string };

async function beaRequest(
  key: string,
  params: Record<string, string>,
): Promise<unknown> {
  const qs = new URLSearchParams({
    UserID: key,
    datasetname: 'Regional',
    ResultFormat: 'JSON',
    ...params,
  });
  const res = await fetch(`https://apps.bea.gov/api/data?${qs}`, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`BEA HTTP ${res.status}`);
  }
  return res.json();
}

async function beaGet(
  key: string,
  params: Record<string, string>,
): Promise<BeaRow[]> {
  const json = (await beaRequest(key, { method: 'GetData', ...params })) as {
    BEAAPI?: { Results?: { Data?: BeaRow[]; Error?: { APIErrorDescription?: string } } };
  };
  const err = json.BEAAPI?.Results?.Error?.APIErrorDescription;
  if (err) throw new Error(err);
  return json.BEAAPI?.Results?.Data ?? [];
}

/** Resolve MARPP LineCodes by Description NAME (not hardcoded numbers). */
async function resolveMarppLineCodes(
  key: string,
): Promise<{ allItems: string; components: { label: string; lineCode: string }[] }> {
  const json = (await beaRequest(key, {
    method: 'GetParameterValues',
    ParameterName: 'LineCode',
    TableName: 'MARPP',
  })) as {
    BEAAPI?: {
      Results?: {
        ParamValue?: BeaParam[];
        Error?: { APIErrorDescription?: string };
      };
    };
  };
  const err = json.BEAAPI?.Results?.Error?.APIErrorDescription;
  if (err) throw new Error(err);
  const params = json.BEAAPI?.Results?.ParamValue ?? [];
  const byDesc = new Map<string, string>();
  for (const p of params) {
    const desc = (p.Desc ?? '').trim();
    const code = (p.Key ?? '').trim();
    if (desc && code) byDesc.set(desc.toLowerCase(), code);
  }

  const allItems =
    byDesc.get('all items') ??
    byDesc.get('rpps: all items') ??
    [...byDesc.entries()].find(([d]) => d.includes('all items'))?.[1] ??
    '1';

  const components: { label: string; lineCode: string }[] = [];
  for (const label of PREFERRED_COMPONENT_NAMES) {
    const code =
      byDesc.get(label.toLowerCase()) ??
      [...byDesc.entries()].find(([d]) => d === label.toLowerCase() || d.includes(label.toLowerCase()))?.[1];
    if (code) components.push({ label, lineCode: code });
  }

  // Fallback: common published MARPP housing/utilities codes if catalog sparse
  if (components.length === 0) {
    const housing = byDesc.get('housing');
    const utilities = byDesc.get('utilities');
    if (housing) components.push({ label: 'Housing', lineCode: housing });
    if (utilities) components.push({ label: 'Utilities', lineCode: utilities });
  }

  return { allItems, components };
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
  let lineCodes: Awaited<ReturnType<typeof resolveMarppLineCodes>> | null = null;

  try {
    lineCodes = await resolveMarppLineCodes(key);
    if (lineCodes.components.length === 0) {
      errors.push('MARPP LineCode catalog resolved no expenditure components by NAME');
    }

    const stateRows = await beaGet(key, {
      TableName: 'MARPP',
      LineCode: lineCodes.allItems,
      GeoFips: '12000',
      Year: year,
    });
    const stateRow = stateRows[0];
    if (stateRow?.DataValue) {
      const n = Number.parseFloat(stateRow.DataValue);
      allItemsIndex = Number.isFinite(n) && n > 0 ? n : null;
      period = stateRow.TimePeriod ?? year;
      if (allItemsIndex == null) errors.push('state all-items MARPP invalid/sentinel');
    } else {
      errors.push('state all-items MARPP missing');
    }

    for (const comp of lineCodes.components) {
      const rows = await beaGet(key, {
        TableName: 'MARPP',
        LineCode: comp.lineCode,
        GeoFips: '12000',
        Year: year,
      });
      const val = rows[0]?.DataValue;
      if (val) {
        const n = Number.parseFloat(val);
        if (Number.isFinite(n) && n > 0) components.push({ label: comp.label, index: n });
        else errors.push(`component ${comp.label} invalid/sentinel`);
      } else {
        errors.push(`component ${comp.label} missing`);
      }
    }

    for (const metro of METRO_GEO) {
      const rows = await beaGet(key, {
        TableName: 'MARPP',
        LineCode: lineCodes.allItems,
        GeoFips: metro.geoFips,
        Year: year,
      });
      const val = rows[0]?.DataValue;
      if (val) {
        const n = Number.parseFloat(val);
        if (Number.isFinite(n) && n > 0) metros.push({ name: metro.name, index: n });
        else errors.push(`metro ${metro.name} invalid/sentinel`);
      } else {
        errors.push(`metro ${metro.name} missing`);
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const fetchedLive =
    errors.length === 0 &&
    allItemsIndex != null &&
    components.length > 0 &&
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
        ? `BEA MARPP ${period} — LineCodes resolved by NAME; state, components, metro sample.`
        : `BEA fetch incomplete: ${errors.join('; ') || 'unknown'}`,
      errors: errors.length ? errors : undefined,
      resolvedLineCodes: lineCodes
        ? { allItems: lineCodes.allItems, components: lineCodes.components }
        : undefined,
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
