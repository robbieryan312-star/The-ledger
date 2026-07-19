/**
 * BEA Regional Price Parities (MARPP) — Florida state profile cost-of-living.
 * Output: data/florida/bea/florida-rpp-sample.json
 *
 * Usage: npm run ingest:bea-rpp-fl
 * Prefers BEA_API_KEY (full MARPP components + metros).
 * Without a key, falls back to BEA RPP all-items series republished by FRED
 * (`*RPPALL` CSV) — official BEA figures, state index + rank-among-50 only.
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

const FRED_BEA_SOURCE = {
  name: 'U.S. Bureau of Economic Analysis',
  url: 'https://fred.stlouisfed.org/series/FLRPPALL',
  tier: 'official' as const,
  description:
    'Regional Price Parities (all items) — BEA series via FRED St. Louis Fed CSV (*RPPALL)',
};

const USPS_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

async function fetchFredLatest(seriesId: string): Promise<{ date: string; value: number }> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  if (!res.ok || text.includes('<html')) {
    throw new Error(`FRED ${seriesId} HTTP ${res.status}`);
  }
  const lines = text
    .trim()
    .split('\n')
    .filter((line) => line && !line.startsWith('observation'));
  const last = lines[lines.length - 1];
  if (!last) throw new Error(`FRED ${seriesId} empty`);
  const [date, raw] = last.split(',');
  const value = Number.parseFloat(raw);
  if (!date || !Number.isFinite(value) || value <= 0) {
    throw new Error(`FRED ${seriesId} invalid row: ${last}`);
  }
  return { date, value };
}

/** Keyless fallback: BEA RPP all-items for 50 states via FRED CSV. */
async function buildFromFred(): Promise<{
  meta: Record<string, unknown>;
  state: {
    allItemsIndex: number;
    period: string;
    rankAmong50: number;
    components: { label: string; index: number }[];
    metros: { name: string; index: number }[];
  };
}> {
  const asOf = new Date().toISOString().slice(0, 10);
  const rows: { code: string; name: string; value: number; date: string }[] = [];
  const errors: string[] = [];
  for (const state of USPS_STATES) {
    try {
      const latest = await fetchFredLatest(`${state.code}RPPALL`);
      rows.push({ code: state.code, name: state.name, value: latest.value, date: latest.date });
    } catch (err) {
      errors.push(`${state.code}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (rows.length < 45) {
    throw new Error(`FRED RPP incomplete (${rows.length}/50): ${errors.slice(0, 5).join('; ')}`);
  }
  const fl = rows.find((row) => row.code === 'FL');
  if (!fl) throw new Error('FRED RPP missing Florida (FLRPPALL)');

  // Ascending index → rank 1 = lowest cost (matches MERIC rankAmong50 convention).
  const ascending = [...rows].sort((a, b) => a.value - b.value);
  const rankAmong50 = ascending.findIndex((row) => row.code === 'FL') + 1;
  const year = fl.date.slice(0, 4);

  return {
    meta: {
      source: FRED_BEA_SOURCE,
      asOf,
      count: 1,
      stateCode: 'FL',
      provenance: 'fetched-live' as const,
      fetchedLive: true,
      fetchedAt: new Date().toISOString(),
      datasetUrl: 'https://fred.stlouisfed.org/series/FLRPPALL',
      note:
        `BEA Regional Price Parities ${year} (all items) via FRED *RPPALL CSV for ${rows.length} states. ` +
        'Components/metros require BEA_API_KEY. Rank 1 = lowest cost among 50 states.',
      retrieval: 'fred-csv',
      errors: errors.length ? errors : undefined,
    },
    state: {
      allItemsIndex: round1(fl.value),
      period: year,
      rankAmong50,
      components: [],
      metros: [],
    },
  };
}

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

  const dir = path.join(projectRoot, 'data', 'florida', 'bea');
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, 'florida-rpp-sample.json');

  if (!key) {
    try {
      const payload = await buildFromFred();
      await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
      console.log(
        `Wrote ${out} (live=true via FRED, index=${payload.state.allItemsIndex}, rank=${payload.state.rankAmong50})`,
      );
      return;
    } catch (err) {
      const payload = {
        meta: {
          source: BEA_SOURCE,
          asOf,
          count: 0,
          stateCode: 'FL',
          provenance: 'honest-gap' as const,
          fetchedLive: false,
          datasetUrl: 'https://apps.bea.gov/api/data/?datasetname=Regional&TableName=MARPP',
          note: `BEA_API_KEY not set and FRED fallback failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
        state: null,
      };
      await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
      console.warn(`Wrote ${out} (provenance=honest-gap)`);
      process.exitCode = 1;
      return;
    }
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

  await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${out} (live=${fetchedLive}, index=${allItemsIndex ?? '—'})`);
  if (!fetchedLive) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
