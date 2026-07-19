/**
 * Florida state rankings + age breakdown from Census ACS.
 * Output: data/florida/census/florida-state-rankings-sample.json
 *
 * Prefers api.census.gov when CENSUS_API_KEY / DATA_GOV_API_KEY is set.
 * Falls back to the public data.census.gov access API (no key required).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { B15003_VARS, attainmentFromB15003 } from '../../lib/census-attainment';
import { loadEnvLocal, projectRoot, writeSnapshotPreservingLive } from '../../lib/ingest-utils';

const CENSUS_SOURCE = {
  name: 'U.S. Census Bureau ACS',
  url: 'https://api.census.gov',
  tier: 'official' as const,
  description: 'ACS 5-year state rankings and Florida age distribution',
};

const EXCLUDED_STATE_CODES = new Set(['11', '72']);
const YEARS = ['2023', '2022', '2021'];
const DATA_CENSUS_TABLE_YEAR = '2023';

const AGE_VARS = [
  'B01001_001E',
  'B01001_003E', 'B01001_004E', 'B01001_005E', 'B01001_006E',
  'B01001_007E', 'B01001_008E', 'B01001_009E', 'B01001_010E',
  'B01001_011E', 'B01001_012E', 'B01001_013E', 'B01001_014E',
  'B01001_015E', 'B01001_016E', 'B01001_017E', 'B01001_018E', 'B01001_019E',
  'B01001_020E', 'B01001_021E', 'B01001_022E', 'B01001_023E', 'B01001_024E', 'B01001_025E',
  'B01001_027E', 'B01001_028E', 'B01001_029E', 'B01001_030E',
  'B01001_031E', 'B01001_032E', 'B01001_033E', 'B01001_034E',
  'B01001_035E', 'B01001_036E', 'B01001_037E', 'B01001_038E',
  'B01001_039E', 'B01001_040E', 'B01001_041E', 'B01001_042E', 'B01001_043E',
  'B01001_044E', 'B01001_045E', 'B01001_046E', 'B01001_047E', 'B01001_048E', 'B01001_049E',
] as const;

type CensusTable = {
  headers: string[];
  rows: string[][];
  year: string;
  url: string;
};

type RankRecord = {
  state: string;
  stateCode: string;
  value: number | null;
};

function cleanUrl(url: string): string {
  return url.replace(/key=[^&]+/, 'key=***');
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseNum(value: string | undefined): number | null {
  if (value == null || value === '' || value === '-' || value === '-666666666') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function fetchCensusJson(url: string): Promise<string[][]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  if (text.includes('Missing Key') || text.includes('missing_key')) {
    throw new Error('Census API key required');
  }
  return JSON.parse(text) as string[][];
}

async function fetchFirstAvailable(pathPart: string, query: string, key: string): Promise<CensusTable> {
  const errors: string[] = [];
  for (const year of YEARS) {
    const url = `https://api.census.gov/data/${year}/${pathPart}?${query}&key=${encodeURIComponent(key)}`;
    try {
      const raw = await fetchCensusJson(url);
      return { headers: raw[0], rows: raw.slice(1), year, url };
    } catch (err) {
      errors.push(`${year}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(errors.join('; '));
}

async function fetchDataCensusTable(tableId: string, geography: string): Promise<CensusTable> {
  const url = `https://data.census.gov/api/access/data/table?id=${encodeURIComponent(tableId)}&g=${encodeURIComponent(geography)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(90_000),
    headers: { 'User-Agent': 'TheLedger/1.0 (civic transparency; rankings ingest)' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`data.census.gov HTTP ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { response?: { data?: string[][] } };
  const data = json.response?.data;
  if (!data || data.length < 2) throw new Error(`data.census.gov empty for ${tableId}`);
  return {
    headers: data[0],
    rows: data.slice(1),
    year: DATA_CENSUS_TABLE_YEAR,
    url,
  };
}

function rowObject(headers: string[], row: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((header, idx) => {
    obj[header] = row[idx];
  });
  return obj;
}

function stateCodeFromGeoId(geoId: string | undefined, fallback?: string): string | null {
  if (fallback && /^\d{2}$/.test(fallback)) return fallback;
  if (!geoId) return null;
  const m = geoId.match(/US(\d{2})$/);
  return m?.[1] ?? null;
}

function eligibleStateRows(table: CensusTable, valueKey: string): RankRecord[] {
  const stateIdx = table.headers.indexOf('state');
  const nameIdx = table.headers.indexOf('NAME');
  const geoIdx = table.headers.indexOf('GEO_ID');
  const valueIdx = table.headers.indexOf(valueKey);
  if (nameIdx < 0 || valueIdx < 0) return [];
  return table.rows
    .map((row) => {
      const stateCode = stateCodeFromGeoId(
        geoIdx >= 0 ? row[geoIdx] : undefined,
        stateIdx >= 0 ? row[stateIdx] : undefined,
      );
      return {
        state: row[nameIdx],
        stateCode: stateCode ?? '',
        value: parseNum(row[valueIdx]),
      };
    })
    .filter((row) => row.state && row.stateCode && !EXCLUDED_STATE_CODES.has(row.stateCode) && row.value != null);
}

function rankForFlorida(
  records: RankRecord[],
  direction: 'high' | 'low',
): { rank: number | null; value: number | null; denominator: number } {
  const sorted = [...records].sort((a, b) =>
    direction === 'high' ? (b.value ?? 0) - (a.value ?? 0) : (a.value ?? 0) - (b.value ?? 0),
  );
  const idx = sorted.findIndex((row) => row.stateCode === '12');
  return {
    rank: idx >= 0 ? idx + 1 : null,
    value: sorted[idx]?.value ?? null,
    denominator: sorted.length,
  };
}

function ageBreakdown(headers: string[], row: string[]): Array<{ label: string; percent: number }> {
  const obj = rowObject(headers, row);
  const n = (key: string): number => parseNum(obj[key]) ?? 0;
  const total = n('B01001_001E');
  if (total <= 0) return [];
  const sum = (keys: string[]) => keys.reduce((acc, key) => acc + n(key), 0);
  const groups = [
    {
      label: 'Under 18',
      value: sum(['B01001_003E', 'B01001_004E', 'B01001_005E', 'B01001_006E', 'B01001_027E', 'B01001_028E', 'B01001_029E', 'B01001_030E']),
    },
    {
      label: '18–24',
      value: sum(['B01001_007E', 'B01001_008E', 'B01001_009E', 'B01001_010E', 'B01001_031E', 'B01001_032E', 'B01001_033E', 'B01001_034E']),
    },
    {
      label: '25–44',
      value: sum(['B01001_011E', 'B01001_012E', 'B01001_013E', 'B01001_014E', 'B01001_035E', 'B01001_036E', 'B01001_037E', 'B01001_038E']),
    },
    {
      label: '45–64',
      value: sum(['B01001_015E', 'B01001_016E', 'B01001_017E', 'B01001_018E', 'B01001_019E', 'B01001_039E', 'B01001_040E', 'B01001_041E', 'B01001_042E', 'B01001_043E']),
    },
    {
      label: '65+',
      value: sum(['B01001_020E', 'B01001_021E', 'B01001_022E', 'B01001_023E', 'B01001_024E', 'B01001_025E', 'B01001_044E', 'B01001_045E', 'B01001_046E', 'B01001_047E', 'B01001_048E', 'B01001_049E']),
    },
  ];
  return groups.map((group) => ({ label: group.label, percent: round1((group.value / total) * 100) }));
}

async function writePayload(payload: Record<string, unknown>): Promise<string> {
  const dir = path.join(projectRoot, 'data', 'florida', 'census');
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, 'florida-state-rankings-sample.json');
  await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return out;
}

async function writeHonestGap(reason: string): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const out = path.join(
    projectRoot,
    'data',
    'florida',
    'census',
    'florida-state-rankings-sample.json',
  );
  // Data-loss prevention (core-rules §6): never overwrite a prior fetched-live rankings
  // snapshot with null ranks on fetch failure. Preserve the last good numbers instead.
  const { action } = await writeSnapshotPreservingLive(out, {
    meta: {
      source: CENSUS_SOURCE,
      asOf,
      count: 0,
      stateCode: 'FL',
      provenance: 'honest-gap' as const,
      fetchedLive: false,
      datasetUrl: 'https://data.census.gov/',
      note: reason,
    },
    ranks: {
      medianHouseholdIncome: { rank: null, value: null, denominator: null },
      medianHomeValue: { rank: null, value: null, denominator: null },
      population: { rank: null, value: null, denominator: null },
      bachelorsPlusPct: { rank: null, value: null, denominator: null },
      unemploymentRate: { rank: null, value: null, denominator: null },
    },
    ageBreakdown: [],
  });
  console.warn(
    action === 'preserved-prior'
      ? `Preserved prior fetched-live ${out} — refused to overwrite ranks with honest-gap`
      : `Wrote ${out} (provenance=honest-gap)`,
  );
}

async function buildFromApiKey(key: string): Promise<Record<string, unknown>> {
  const asOf = new Date().toISOString().slice(0, 10);
  const notes: string[] = [];
  const core = await fetchFirstAvailable(
    'acs/acs5',
    'get=NAME,B19013_001E,B25077_001E,B01003_001E&for=state:*',
    key,
  );

  const attainment = await fetchFirstAvailable(
    'acs/acs5',
    `get=NAME,${B15003_VARS}&for=state:*`,
    key,
  );

  let unemploymentRank = {
    rank: null as number | null,
    value: null as number | null,
    denominator: null as number | null,
  };
  try {
    const unemp = await fetchFirstAvailable('acs/acs5/profile', 'get=NAME,DP03_0009PE&for=state:*', key);
    unemploymentRank = rankForFlorida(eligibleStateRows(unemp, 'DP03_0009PE'), 'low');
  } catch (err) {
    notes.push(`Unemployment rank skipped: ${err instanceof Error ? err.message : String(err)}`);
  }

  const attainmentRecords: RankRecord[] = attainment.rows
    .map((row) => {
      const obj = rowObject(attainment.headers, row);
      const summary = attainmentFromB15003(obj);
      return {
        state: obj.NAME,
        stateCode: obj.state,
        value: summary?.bachelorsPlusPct ?? null,
      };
    })
    .filter((row) => row.state && row.stateCode && !EXCLUDED_STATE_CODES.has(row.stateCode) && row.value != null);

  const age = await fetchFirstAvailable(
    'acs/acs5',
    `get=NAME,${AGE_VARS.join(',')}&for=state:12`,
    key,
  );

  return {
    meta: {
      source: CENSUS_SOURCE,
      asOf,
      count: 1,
      stateCode: 'FL',
      provenance: 'fetched-live' as const,
      fetchedLive: true,
      fetchedAt: new Date().toISOString(),
      datasetUrl: cleanUrl(core.url),
      citation: `https://api.census.gov/data/${core.year}/acs/acs5`,
      period: `ACS 5-Year ${core.year}`,
      note:
        notes.length > 0
          ? notes.join('; ')
          : "Ranks exclude District of Columbia and Puerto Rico. Rank 1 is highest for income, home value, population, and bachelor's+ share; rank 1 is lowest for unemployment.",
      rankExclusions: ['District of Columbia', 'Puerto Rico'],
      auxiliaryUrls: {
        attainment: cleanUrl(attainment.url),
        ageBreakdown: cleanUrl(age.url),
      },
    },
    ranks: {
      medianHouseholdIncome: rankForFlorida(eligibleStateRows(core, 'B19013_001E'), 'high'),
      medianHomeValue: rankForFlorida(eligibleStateRows(core, 'B25077_001E'), 'high'),
      population: rankForFlorida(eligibleStateRows(core, 'B01003_001E'), 'high'),
      bachelorsPlusPct: rankForFlorida(attainmentRecords, 'high'),
      unemploymentRate: unemploymentRank,
    },
    ageBreakdown: ageBreakdown(age.headers, age.rows[0] ?? []),
  };
}

async function buildFromDataCensusGov(): Promise<Record<string, unknown>> {
  const asOf = new Date().toISOString().slice(0, 10);
  const notes: string[] = [];
  const allStatesGeo = '010XX00US$0400000';
  const flGeo = '040XX00US12';
  const year = DATA_CENSUS_TABLE_YEAR;

  const income = await fetchDataCensusTable(`ACSDT5Y${year}.B19013`, allStatesGeo);
  const home = await fetchDataCensusTable(`ACSDT5Y${year}.B25077`, allStatesGeo);
  const population = await fetchDataCensusTable(`ACSDT5Y${year}.B01003`, allStatesGeo);
  const attainment = await fetchDataCensusTable(`ACSDT5Y${year}.B15003`, allStatesGeo);
  const age = await fetchDataCensusTable(`ACSDT5Y${year}.B01001`, flGeo);

  let unemploymentRank = {
    rank: null as number | null,
    value: null as number | null,
    denominator: null as number | null,
  };
  try {
    const unemp = await fetchDataCensusTable(`ACSDP5Y${year}.DP03`, allStatesGeo);
    unemploymentRank = rankForFlorida(eligibleStateRows(unemp, 'DP03_0009PE'), 'low');
  } catch (err) {
    notes.push(`Unemployment rank skipped: ${err instanceof Error ? err.message : String(err)}`);
  }

  const attainmentRecords: RankRecord[] = attainment.rows
    .map((row) => {
      const obj = rowObject(attainment.headers, row);
      const summary = attainmentFromB15003(obj);
      const stateCode = stateCodeFromGeoId(obj.GEO_ID, obj.state);
      return {
        state: obj.NAME,
        stateCode: stateCode ?? '',
        value: summary?.bachelorsPlusPct ?? null,
      };
    })
    .filter((row) => row.state && row.stateCode && !EXCLUDED_STATE_CODES.has(row.stateCode) && row.value != null);

  return {
    meta: {
      source: {
        ...CENSUS_SOURCE,
        url: 'https://data.census.gov',
        description: 'ACS 5-year state rankings and Florida age distribution via data.census.gov',
      },
      asOf,
      count: 1,
      stateCode: 'FL',
      provenance: 'fetched-live' as const,
      fetchedLive: true,
      fetchedAt: new Date().toISOString(),
      datasetUrl: income.url,
      citation: `https://data.census.gov/table?q=ACSDT5Y${year}.B19013`,
      period: `ACS 5-Year ${year}`,
      note:
        notes.length > 0
          ? `${notes.join('; ')} Retrieved via data.census.gov (no API key).`
          : "Ranks exclude District of Columbia and Puerto Rico. Rank 1 is highest for income, home value, population, and bachelor's+ share; rank 1 is lowest for unemployment. Retrieved via data.census.gov (no API key).",
      rankExclusions: ['District of Columbia', 'Puerto Rico'],
      auxiliaryUrls: {
        home: home.url,
        population: population.url,
        attainment: attainment.url,
        ageBreakdown: age.url,
      },
    },
    ranks: {
      medianHouseholdIncome: rankForFlorida(eligibleStateRows(income, 'B19013_001E'), 'high'),
      medianHomeValue: rankForFlorida(eligibleStateRows(home, 'B25077_001E'), 'high'),
      population: rankForFlorida(eligibleStateRows(population, 'B01003_001E'), 'high'),
      bachelorsPlusPct: rankForFlorida(attainmentRecords, 'high'),
      unemploymentRate: unemploymentRank,
    },
    ageBreakdown: ageBreakdown(age.headers, age.rows[0] ?? []),
  };
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = process.env.CENSUS_API_KEY?.trim() || process.env.DATA_GOV_API_KEY?.trim();

  try {
    const payload = key ? await buildFromApiKey(key) : await buildFromDataCensusGov();
    const out = await writePayload(payload);
    const period = (payload.meta as { period?: string }).period ?? 'ACS';
    console.log(`Wrote ${out} (live=true, period=${period}, via=${key ? 'api.census.gov' : 'data.census.gov'})`);
  } catch (err) {
    console.error(err);
    await writeHonestGap(
      `Census state rankings fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exitCode = 1;
  }
}

main().catch(async (err: unknown) => {
  console.error(err);
  try {
    await writeHonestGap(`Census state rankings fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  } catch (writeErr) {
    console.error(writeErr);
  }
  process.exit(1);
});
