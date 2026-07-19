/**
 * Census ACS Florida counties + state attainment for the state profile.
 * Output: data/florida/census/florida-counties-sample.json
 *
 * Usage:
 *   npm run ingest:fl-counties              # all counties (preferred)
 *   npm run ingest:fl-counties -- --limit 10  # sample subset (debug)
 *
 * Prefers CENSUS_API_KEY / DATA_GOV_API_KEY (api.census.gov).
 * Falls back to keyless data.census.gov for the full 67-county set.
 * County unemployment from BLS LAUS (keyless, batched).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { B15003_VARS, attainmentFromB15003 } from '../../lib/census-attainment';
import { fetchBlsSeries, latestPoint, type BLSDataPoint } from '../../lib/bls-api';
import { loadEnvLocal, projectRoot, writeSnapshotPreservingLive } from '../../lib/ingest-utils';

const CENSUS_SOURCE = {
  name: 'U.S. Census Bureau ACS',
  url: 'https://api.census.gov',
  tier: 'official' as const,
  description: 'ACS 5-year county + state attainment estimates',
};

const DATA_CENSUS_SOURCE = {
  ...CENSUS_SOURCE,
  url: 'https://data.census.gov',
  description: 'ACS 5-year county + state attainment via data.census.gov',
};

const COUNTY_FIPS_SAMPLE = [
  '12086', '12011', '12057', '12095', '12031',
  '12021', '12071', '12009', '12103', '12005',
];

const FL_COUNTY_GEO = '040XX00US12$0500000';
const ACS_TABLE_YEAR = '2023';
const EXPECTED_FL_COUNTIES = 67;
const BLS_BATCH = 25;

type CountyRecord = {
  fips: string;
  name: string;
  population: number;
  medianHouseholdIncome: number;
  medianHomeValue: number;
  unemploymentRate: number | null;
};

type StateAcs = {
  population: number | null;
  medianHouseholdIncome: number | null;
  medianHomeValue: number | null;
  nationalMedianHouseholdIncome: number | null;
  nationalMedianHomeValue: number | null;
  survey: string;
  censusApiUrl: string;
};

function countyLausSeriesId(fips: string): string {
  const state = fips.slice(0, 2);
  const county = fips.slice(2, 5);
  return `LAUCN${state}${county}0000000003`;
}

function parseAcs(raw: string | undefined): number | null {
  if (raw == null || raw === '' || raw === '-' || raw === 'null') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function cleanUrl(url: string): string {
  return url.replace(/key=[^&]+/, 'key=***');
}

function fipsFromGeoId(geoId: string): string | null {
  const m = geoId.match(/US(\d{5})$/);
  return m?.[1] ?? null;
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

async function fetchDataCensusTable(tableId: string, geography: string): Promise<{
  headers: string[];
  rows: string[][];
  url: string;
}> {
  const url = `https://data.census.gov/api/access/data/table?id=${encodeURIComponent(tableId)}&g=${encodeURIComponent(geography)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(90_000),
    headers: { 'User-Agent': 'TheLedger/1.0 (civic transparency; fl-counties ingest)' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`data.census.gov HTTP ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { response?: { data?: string[][] } };
  const data = json.response?.data;
  if (!data || data.length < 2) throw new Error(`data.census.gov empty for ${tableId}`);
  return { headers: data[0], rows: data.slice(1), url };
}

function rowObject(headers: string[], row: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((header, idx) => {
    obj[header] = row[idx];
  });
  return obj;
}

async function attachBlsUnemployment(records: CountyRecord[]): Promise<{
  records: CountyRecord[];
  blsFetchedLive: boolean;
}> {
  const yearNow = new Date().getFullYear();
  const ids = records.map((r) => countyLausSeriesId(r.fips));
  const merged = new Map<string, BLSDataPoint[]>();
  for (let i = 0; i < ids.length; i += BLS_BATCH) {
    const chunk = ids.slice(i, i + BLS_BATCH);
    try {
      const part = await fetchBlsSeries(chunk, yearNow - 2, yearNow);
      for (const [k, v] of part) merged.set(k, v);
    } catch (err) {
      console.warn(
        `BLS LAUS batch ${Math.floor(i / BLS_BATCH) + 1} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  let next = records.map((r) => {
    const pt = latestPoint(merged.get(countyLausSeriesId(r.fips)));
    return { ...r, unemploymentRate: pt?.value ?? null };
  });

  // Retry counties that missed the first pass (BLS v1 timeouts are common on large batches).
  const missing = next.filter((r) => r.unemploymentRate == null).map((r) => r.fips);
  if (missing.length > 0) {
    console.warn(`BLS LAUS retry for ${missing.length} counties…`);
    for (let i = 0; i < missing.length; i += BLS_BATCH) {
      const chunk = missing.slice(i, i + BLS_BATCH).map(countyLausSeriesId);
      try {
        await new Promise((r) => setTimeout(r, 1500));
        const part = await fetchBlsSeries(chunk, yearNow - 2, yearNow);
        for (const [k, v] of part) merged.set(k, v);
      } catch (err) {
        console.warn(
          `BLS LAUS retry batch failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    next = records.map((r) => {
      const pt = latestPoint(merged.get(countyLausSeriesId(r.fips)));
      return { ...r, unemploymentRate: pt?.value ?? null };
    });
  }

  return { records: next, blsFetchedLive: next.some((r) => r.unemploymentRate != null) };
}

async function writeDemographicsLockstep(
  asOf: string,
  usedYear: string,
  stateAcs: StateAcs,
  datasetUrl: string,
): Promise<void> {
  const demoOut = path.join(projectRoot, 'data', 'florida', 'census', 'florida-demographics.json');
  await mkdir(path.dirname(demoOut), { recursive: true });
  await writeFile(
    demoOut,
    JSON.stringify(
      {
        meta: {
          source: CENSUS_SOURCE,
          asOf,
          count: 1,
          stateCode: 'FL',
          provenance: 'fetched-live',
          fetchedLive: true,
          datasetUrl: cleanUrl(datasetUrl),
          note: `Written by ingest:fl-counties — same ACS ${usedYear} vintage as county file (single read-path).`,
        },
        records: [
          {
            stateCode: 'FL',
            stateName: 'Florida',
            ...stateAcs,
            source: CENSUS_SOURCE,
            asOf,
            provenance: 'fetched-live',
          },
        ],
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  console.log(`Synced ${demoOut} to ACS ${usedYear} (single read-path)`);
}

async function buildFromApiKey(
  key: string,
  limit: number | null,
): Promise<{
  records: CountyRecord[];
  stateSummary: {
    populationRank: number | null;
    populationGrowthPct: number | null;
    attainment: ReturnType<typeof attainmentFromB15003>;
    usAttainmentBachelorsPlusPct: number | null;
    acs: StateAcs | null;
  };
  metaExtras: Record<string, unknown>;
  blsFetchedLive: boolean;
}> {
  const asOf = new Date().toISOString().slice(0, 10);
  const years = ['2023', '2022', '2021'];
  let countyRaw: string[][] | null = null;
  let usedYear = years[0];
  let countyUrl = '';

  for (const year of years) {
    const url =
      `https://api.census.gov/data/${year}/acs/acs5?get=NAME,B01003_001E,B19013_001E,B25077_001E&for=county:*&in=state:12&key=${encodeURIComponent(key)}`;
    try {
      countyRaw = await fetchCensusJson(url);
      usedYear = year;
      countyUrl = url;
      break;
    } catch (err) {
      console.warn(`${year} county fetch failed:`, err instanceof Error ? err.message : err);
    }
  }
  if (!countyRaw) throw new Error('Census county fetch failed for all ACS years');

  const headers = countyRaw[0];
  const rows = countyRaw.slice(1);
  const idx = (h: string) => headers.indexOf(h);

  let records: CountyRecord[] = rows
    .map((row) => {
      const county = row[idx('county')];
      const fips = `12${county}`;
      const name = (row[idx('NAME')] ?? '').replace(/ County, Florida$/, '');
      return {
        fips,
        name,
        population: parseAcs(row[idx('B01003_001E')]) ?? 0,
        medianHouseholdIncome: parseAcs(row[idx('B19013_001E')]) ?? 0,
        medianHomeValue: parseAcs(row[idx('B25077_001E')]) ?? 0,
        unemploymentRate: null as number | null,
      };
    })
    .filter((r) => r.population > 0)
    .sort((a, b) => b.population - a.population);

  if (limit != null && limit > 0) {
    const allow = new Set(COUNTY_FIPS_SAMPLE.slice(0, Math.min(limit, COUNTY_FIPS_SAMPLE.length)));
    records = records.filter((r) => allow.has(r.fips));
  }

  if (records.length === 0) throw new Error('No matching counties in Census response');

  const bls = await attachBlsUnemployment(records);
  records = bls.records;

  let attainmentUrl = '';
  let flAttainment = attainmentFromB15003({});
  let usAttainment = attainmentFromB15003({});
  for (const year of years) {
    const url = `https://api.census.gov/data/${year}/acs/acs5?get=${B15003_VARS}&for=state:12&key=${encodeURIComponent(key)}`;
    try {
      const raw = await fetchCensusJson(url);
      const obj = rowObject(raw[0], raw[1]);
      flAttainment = attainmentFromB15003(obj);
      if (flAttainment) attainmentUrl = url;
      break;
    } catch {
      // try prior year
    }
  }

  try {
    const usUrl = `https://api.census.gov/data/${usedYear}/acs/acs5?get=${B15003_VARS}&for=us:1&key=${encodeURIComponent(key)}`;
    const raw = await fetchCensusJson(usUrl);
    usAttainment = attainmentFromB15003(rowObject(raw[0], raw[1]));
  } catch (err) {
    console.warn('US attainment fetch failed:', err instanceof Error ? err.message : err);
  }

  let stateAcs: StateAcs | null = null;
  try {
    const stateUrl =
      `https://api.census.gov/data/${usedYear}/acs/acs5?get=NAME,B01003_001E,B19013_001E,B25077_001E&for=state:12&key=${encodeURIComponent(key)}`;
    const usMedUrl =
      `https://api.census.gov/data/${usedYear}/acs/acs5?get=B19013_001E,B25077_001E&for=us:1&key=${encodeURIComponent(key)}`;
    const [stateRaw, usRaw] = await Promise.all([
      fetchCensusJson(stateUrl),
      fetchCensusJson(usMedUrl),
    ]);
    const sh = stateRaw[0];
    const sr = stateRaw[1];
    const uh = usRaw[0];
    const ur = usRaw[1];
    stateAcs = {
      population: parseAcs(sr[sh.indexOf('B01003_001E')]),
      medianHouseholdIncome: parseAcs(sr[sh.indexOf('B19013_001E')]),
      medianHomeValue: parseAcs(sr[sh.indexOf('B25077_001E')]),
      nationalMedianHouseholdIncome: parseAcs(ur[uh.indexOf('B19013_001E')]),
      nationalMedianHomeValue: parseAcs(ur[uh.indexOf('B25077_001E')]),
      survey: `ACS 5-Year ${usedYear}`,
      censusApiUrl: `https://api.census.gov/data/${usedYear}/acs/acs5`,
    };
    await writeDemographicsLockstep(asOf, usedYear, stateAcs, stateUrl);
  } catch (err) {
    console.warn('State ACS (single read-path) failed:', err instanceof Error ? err.message : err);
  }

  const popRankUrl = `https://api.census.gov/data/${usedYear}/acs/acs5?get=NAME,B01003_001E&for=state:*&key=${encodeURIComponent(key)}`;
  const popRankRaw = await fetchCensusJson(popRankUrl);
  const pops = popRankRaw
    .slice(1)
    .map((row) => ({ name: row[0], pop: Number(row[1]) || 0 }))
    .sort((a, b) => b.pop - a.pop);
  const flRank = pops.findIndex((p) => p.name.includes('Florida')) + 1;

  const popPrevYear = String(Number(usedYear) - 1);
  let populationGrowthPct: number | null = null;
  try {
    const prevRaw = await fetchCensusJson(
      `https://api.census.gov/data/${popPrevYear}/acs/acs5?get=B01003_001E&for=state:12&key=${encodeURIComponent(key)}`,
    );
    const prevPop = Number(prevRaw[1][0]) || 0;
    const flPop = stateAcs?.population ?? pops.find((p) => p.name.includes('Florida'))?.pop ?? 0;
    if (prevPop > 0 && flPop > 0) {
      populationGrowthPct = Math.round(((flPop - prevPop) / prevPop) * 1000) / 10;
    }
  } catch {
    populationGrowthPct = null;
  }

  return {
    records,
    stateSummary: {
      populationRank: flRank || null,
      populationGrowthPct,
      attainment: flAttainment,
      usAttainmentBachelorsPlusPct: usAttainment?.bachelorsPlusPct ?? null,
      acs: stateAcs,
    },
    metaExtras: {
      datasetUrl: cleanUrl(countyUrl),
      attainmentUrl: attainmentUrl ? cleanUrl(attainmentUrl) : undefined,
      retrieval: 'api.census.gov',
      period: `ACS 5-Year ${usedYear}`,
    },
    blsFetchedLive: bls.blsFetchedLive,
  };
}

async function buildFromDataCensusGov(limit: number | null): Promise<{
  records: CountyRecord[];
  stateSummary: {
    populationRank: number | null;
    populationGrowthPct: number | null;
    attainment: ReturnType<typeof attainmentFromB15003>;
    usAttainmentBachelorsPlusPct: number | null;
    acs: StateAcs | null;
  };
  metaExtras: Record<string, unknown>;
  blsFetchedLive: boolean;
}> {
  const asOf = new Date().toISOString().slice(0, 10);
  const year = ACS_TABLE_YEAR;
  const [popT, incT, homeT] = await Promise.all([
    fetchDataCensusTable(`ACSDT5Y${year}.B01003`, FL_COUNTY_GEO),
    fetchDataCensusTable(`ACSDT5Y${year}.B19013`, FL_COUNTY_GEO),
    fetchDataCensusTable(`ACSDT5Y${year}.B25077`, FL_COUNTY_GEO),
  ]);

  const byFips = new Map<string, CountyRecord>();
  for (const row of popT.rows) {
    const obj = rowObject(popT.headers, row);
    const fips = fipsFromGeoId(obj.GEO_ID);
    if (!fips || !fips.startsWith('12')) continue;
    const name = (obj.NAME ?? '').replace(/ County, Florida$/, '');
    byFips.set(fips, {
      fips,
      name,
      population: parseAcs(obj.B01003_001E) ?? 0,
      medianHouseholdIncome: 0,
      medianHomeValue: 0,
      unemploymentRate: null,
    });
  }
  for (const row of incT.rows) {
    const obj = rowObject(incT.headers, row);
    const fips = fipsFromGeoId(obj.GEO_ID);
    const rec = fips ? byFips.get(fips) : undefined;
    if (rec) rec.medianHouseholdIncome = parseAcs(obj.B19013_001E) ?? 0;
  }
  for (const row of homeT.rows) {
    const obj = rowObject(homeT.headers, row);
    const fips = fipsFromGeoId(obj.GEO_ID);
    const rec = fips ? byFips.get(fips) : undefined;
    if (rec) rec.medianHomeValue = parseAcs(obj.B25077_001E) ?? 0;
  }

  let records = [...byFips.values()]
    .filter((r) => r.population > 0)
    .sort((a, b) => b.population - a.population);

  if (limit != null && limit > 0) {
    const allow = new Set(COUNTY_FIPS_SAMPLE.slice(0, Math.min(limit, COUNTY_FIPS_SAMPLE.length)));
    records = records.filter((r) => allow.has(r.fips));
  }

  if (records.length === 0) throw new Error('data.census.gov returned no FL counties');

  const bls = await attachBlsUnemployment(records);
  records = bls.records;

  const flAttT = await fetchDataCensusTable(`ACSDT5Y${year}.B15003`, '040XX00US12');
  const flAttainment = attainmentFromB15003(rowObject(flAttT.headers, flAttT.rows[0] ?? []));

  let usAttainment = attainmentFromB15003({});
  try {
    const usAttT = await fetchDataCensusTable(`ACSDT5Y${year}.B15003`, '010XX00US');
    usAttainment = attainmentFromB15003(rowObject(usAttT.headers, usAttT.rows[0] ?? []));
  } catch (err) {
    console.warn('US attainment (data.census.gov) failed:', err instanceof Error ? err.message : err);
  }

  const statePop = await fetchDataCensusTable(`ACSDT5Y${year}.B01003`, '040XX00US12');
  const stateInc = await fetchDataCensusTable(`ACSDT5Y${year}.B19013`, '040XX00US12');
  const stateHome = await fetchDataCensusTable(`ACSDT5Y${year}.B25077`, '040XX00US12');
  const usInc = await fetchDataCensusTable(`ACSDT5Y${year}.B19013`, '010XX00US');
  const usHome = await fetchDataCensusTable(`ACSDT5Y${year}.B25077`, '010XX00US');

  const sp = rowObject(statePop.headers, statePop.rows[0] ?? []);
  const si = rowObject(stateInc.headers, stateInc.rows[0] ?? []);
  const sh = rowObject(stateHome.headers, stateHome.rows[0] ?? []);
  const ui = rowObject(usInc.headers, usInc.rows[0] ?? []);
  const uh = rowObject(usHome.headers, usHome.rows[0] ?? []);

  const stateAcs: StateAcs = {
    population: parseAcs(sp.B01003_001E),
    medianHouseholdIncome: parseAcs(si.B19013_001E),
    medianHomeValue: parseAcs(sh.B25077_001E),
    nationalMedianHouseholdIncome: parseAcs(ui.B19013_001E),
    nationalMedianHomeValue: parseAcs(uh.B25077_001E),
    survey: `ACS 5-Year ${year}`,
    censusApiUrl: 'https://data.census.gov',
  };
  await writeDemographicsLockstep(asOf, year, stateAcs, statePop.url);

  const allStates = await fetchDataCensusTable(`ACSDT5Y${year}.B01003`, '010XX00US$0400000');
  const pops = allStates.rows
    .map((row) => {
      const obj = rowObject(allStates.headers, row);
      const code = obj.GEO_ID?.match(/US(\d{2})$/)?.[1];
      return { code, name: obj.NAME, pop: parseAcs(obj.B01003_001E) ?? 0 };
    })
    .filter((r) => r.code && r.code !== '11' && r.code !== '72' && r.pop > 0)
    .sort((a, b) => b.pop - a.pop);
  const flRank = pops.findIndex((p) => p.code === '12') + 1;

  let populationGrowthPct: number | null = null;
  try {
    const prev = await fetchDataCensusTable(`ACSDT5Y${Number(year) - 1}.B01003`, '040XX00US12');
    const prevPop = parseAcs(rowObject(prev.headers, prev.rows[0] ?? []).B01003_001E) ?? 0;
    const flPop = stateAcs.population ?? 0;
    if (prevPop > 0 && flPop > 0) {
      populationGrowthPct = Math.round(((flPop - prevPop) / prevPop) * 1000) / 10;
    }
  } catch {
    populationGrowthPct = null;
  }

  return {
    records,
    stateSummary: {
      populationRank: flRank || null,
      populationGrowthPct,
      attainment: flAttainment,
      usAttainmentBachelorsPlusPct: usAttainment?.bachelorsPlusPct ?? null,
      acs: stateAcs,
    },
    metaExtras: {
      datasetUrl: popT.url,
      attainmentUrl: flAttT.url,
      retrieval: 'data.census.gov',
      period: `ACS 5-Year ${year}`,
      auxiliaryUrls: {
        income: incT.url,
        home: homeT.url,
      },
    },
    blsFetchedLive: bls.blsFetchedLive,
  };
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const argv = process.argv.slice(2);
  const limitIdx = argv.indexOf('--limit');
  const limit =
    limitIdx >= 0 ? Number.parseInt(argv[limitIdx + 1] ?? '10', 10) : null; // null = all counties
  const key = process.env.CENSUS_API_KEY?.trim() || process.env.DATA_GOV_API_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);

  const built = key
    ? await buildFromApiKey(key, limit)
    : await buildFromDataCensusGov(limit);

  const { records, stateSummary, metaExtras, blsFetchedLive } = built;
  const censusFetchedLive = records.length > 0;
  const attainmentFetchedLive = stateSummary.attainment != null;
  const anyLive = censusFetchedLive || blsFetchedLive || attainmentFetchedLive;
  const coverage =
    limit != null || records.length < EXPECTED_FL_COUNTIES ? ('sample' as const) : ('full' as const);

  const payload = {
    meta: {
      source: key ? CENSUS_SOURCE : DATA_CENSUS_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      provenance: anyLive ? ('fetched-live' as const) : ('honest-gap' as const),
      fetchedLive: anyLive,
      censusFetchedLive,
      blsFetchedLive,
      attainmentFetchedLive,
      coverage,
      isSample: coverage === 'sample',
      fetchedAt: new Date().toISOString(),
      ...metaExtras,
      note:
        coverage === 'full'
          ? `ACS county set (n=${records.length}) + state ACS (single read-path) + B15003. County unemployment from BLS LAUS.`
          : `ACS county sample (n=${records.length}) + state ACS (single read-path) + B15003. County unemployment from BLS LAUS.`,
      blsSource: {
        name: 'U.S. Bureau of Labor Statistics',
        url: 'https://www.bls.gov',
        tier: 'official',
        description: 'LAUS county unemployment rate (LAUCN series)',
      },
    },
    stateSummary,
    records,
  };

  const out = path.join(projectRoot, 'data', 'florida', 'census', 'florida-counties-sample.json');
  // Data-loss prevention (core-rules §6): never replace a prior full county set with an
  // empty/honest-gap payload after a partial network failure.
  const { action } = await writeSnapshotPreservingLive(out, payload);
  if (action === 'preserved-prior') {
    console.warn(`Preserved prior fetched-live ${out} — refused to overwrite with ${records.length}-county non-live payload`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Wrote ${out} (${records.length} counties; coverage=${coverage}; census=${censusFetchedLive} bls=${blsFetchedLive} attainment=${attainmentFetchedLive})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
