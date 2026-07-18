/**
 * Census ACS county sample + state attainment for Florida state profile.
 * Output: data/florida/census/florida-counties-sample.json
 *
 * Usage: npm run ingest:fl-counties -- --limit 10
 * Requires CENSUS_API_KEY (api.census.gov). County unemployment from BLS LAUS (keyless).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { B15003_VARS, attainmentFromB15003 } from '../../lib/census-attainment';
import { fetchBlsSeries, latestPoint } from '../../lib/bls-api';
import { loadEnvLocal, projectRoot } from '../../lib/ingest-utils';

const CENSUS_SOURCE = {
  name: 'U.S. Census Bureau ACS',
  url: 'https://api.census.gov',
  tier: 'official' as const,
  description: 'ACS 5-year county + state attainment estimates',
};

const COUNTY_FIPS_SAMPLE = [
  '12086', '12011', '12057', '12095', '12031',
  '12021', '12071', '12009', '12103', '12005',
];

function countyLausSeriesId(fips: string): string {
  const state = fips.slice(0, 2);
  const county = fips.slice(2, 5);
  return `LAUCN${state}${county}0000000003`;
}

async function fetchCensusJson(url: string): Promise<string[][]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as string[][];
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const argv = process.argv.slice(2);
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number.parseInt(argv[limitIdx + 1] ?? '10', 10) : 10;
  const fipsList = COUNTY_FIPS_SAMPLE.slice(0, Math.min(limit, COUNTY_FIPS_SAMPLE.length));
  const key = process.env.CENSUS_API_KEY?.trim() || process.env.DATA_GOV_API_KEY?.trim();
  if (!key) {
    console.error('CENSUS_API_KEY or DATA_GOV_API_KEY required for Census ACS fetch');
    process.exit(1);
  }

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
  if (!countyRaw) {
    console.error('Census county fetch failed for all ACS years');
    process.exit(1);
  }

  const headers = countyRaw[0];
  const rows = countyRaw.slice(1);
  const idx = (h: string) => headers.indexOf(h);

  let records = rows
    .filter((row) => fipsList.includes(`12${row[idx('county')]}`))
    .map((row) => {
      const county = row[idx('county')];
      const fips = `12${county}`;
      const name = (row[idx('NAME')] ?? '').replace(/ County, Florida$/, '');
      return {
        fips,
        name,
        population: Number(row[idx('B01003_001E')]) || 0,
        medianHouseholdIncome: Number(row[idx('B19013_001E')]) || 0,
        medianHomeValue: Number(row[idx('B25077_001E')]) || 0,
        unemploymentRate: null as number | null,
      };
    })
    .sort((a, b) => b.population - a.population);

  if (records.length === 0) {
    console.error('No matching counties in Census response');
    process.exit(1);
  }

  const lausIds = records.map((r) => countyLausSeriesId(r.fips));
  const yearNow = new Date().getFullYear();
  let blsFetchedLive = false;
  try {
    const blsMap = await fetchBlsSeries(lausIds, yearNow - 2, yearNow);
    records = records.map((r) => {
      const pt = latestPoint(blsMap.get(countyLausSeriesId(r.fips)));
      return { ...r, unemploymentRate: pt?.value ?? null };
    });
    blsFetchedLive = records.some((r) => r.unemploymentRate != null);
  } catch (err) {
    console.warn('BLS LAUS fetch failed:', err instanceof Error ? err.message : err);
    blsFetchedLive = false;
  }

  let attainmentUrl = '';
  let flAttainment = attainmentFromB15003({});
  let usAttainment = attainmentFromB15003({});
  for (const year of years) {
    const url = `https://api.census.gov/data/${year}/acs/acs5?get=${B15003_VARS}&for=state:12&key=${encodeURIComponent(key)}`;
    try {
      const raw = await fetchCensusJson(url);
      const h = raw[0];
      const row = raw[1];
      const obj: Record<string, string> = {};
      h.forEach((col, i) => {
        obj[col] = row[i];
      });
      flAttainment = attainmentFromB15003(obj);
      if (flAttainment) attainmentUrl = url;
      break;
    } catch {
      // try prior year
    }
  }

  const usUrl = `https://api.census.gov/data/${usedYear}/acs/acs5?get=${B15003_VARS}&for=us:1&key=${encodeURIComponent(key)}`;
  try {
    const raw = await fetchCensusJson(usUrl);
    const h = raw[0];
    const row = raw[1];
    const obj: Record<string, string> = {};
    h.forEach((col, i) => {
      obj[col] = row[i];
    });
    usAttainment = attainmentFromB15003(obj);
  } catch (err) {
    console.warn('US attainment fetch failed:', err instanceof Error ? err.message : err);
  }

  const attainmentFetchedLive = flAttainment != null;
  const censusFetchedLive = records.length > 0;

  // Single read-path (Q3): same ACS vintage as counties — state B01003/B19013/B25077 + US nationals.
  // build-data-slices prefers stateSummary.acs for hero/§01 indicators.
  let stateAcs: {
    population: number | null;
    medianHouseholdIncome: number | null;
    medianHomeValue: number | null;
    nationalMedianHouseholdIncome: number | null;
    nationalMedianHomeValue: number | null;
    survey: string;
    censusApiUrl: string;
  } | null = null;
  try {
    const stateUrl =
      `https://api.census.gov/data/${usedYear}/acs/acs5?get=NAME,B01003_001E,B19013_001E,B25077_001E&for=state:12&key=${encodeURIComponent(key)}`;
    const usUrl =
      `https://api.census.gov/data/${usedYear}/acs/acs5?get=B19013_001E,B25077_001E&for=us:1&key=${encodeURIComponent(key)}`;
    const [stateRaw, usRaw] = await Promise.all([
      fetchCensusJson(stateUrl),
      fetchCensusJson(usUrl),
    ]);
    const sh = stateRaw[0];
    const sr = stateRaw[1];
    const uh = usRaw[0];
    const ur = usRaw[1];
    const parseAcs = (raw: string | undefined): number | null => {
      if (raw == null || raw === '') return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return null;
      return n;
    };
    stateAcs = {
      population: parseAcs(sr[sh.indexOf('B01003_001E')]),
      medianHouseholdIncome: parseAcs(sr[sh.indexOf('B19013_001E')]),
      medianHomeValue: parseAcs(sr[sh.indexOf('B25077_001E')]),
      nationalMedianHouseholdIncome: parseAcs(ur[uh.indexOf('B19013_001E')]),
      nationalMedianHomeValue: parseAcs(ur[uh.indexOf('B25077_001E')]),
      survey: `ACS 5-Year ${usedYear}`,
      censusApiUrl: `https://api.census.gov/data/${usedYear}/acs/acs5`,
    };
    // Keep florida-demographics.json in lockstep with county ACS vintage (slice fallback).
    const demoOut = path.join(projectRoot, 'data', 'florida', 'census', 'florida-demographics.json');
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
            datasetUrl: stateUrl.replace(/key=[^&]+/, 'key=***'),
            note: `Written by ingest:fl-counties — same ACS ${usedYear} vintage as county sample (single read-path).`,
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
  const popPrevUrl = `https://api.census.gov/data/${popPrevYear}/acs/acs5?get=B01003_001E&for=state:12&key=${encodeURIComponent(key)}`;
  let populationGrowthPct: number | null = null;
  try {
    const prevRaw = await fetchCensusJson(popPrevUrl);
    const prevPop = Number(prevRaw[1][0]) || 0;
    const flPop =
      stateAcs?.population ??
      pops.find((p) => p.name.includes('Florida'))?.pop ??
      0;
    if (prevPop > 0 && flPop > 0) {
      populationGrowthPct = Math.round(((flPop - prevPop) / prevPop) * 1000) / 10;
    }
  } catch {
    populationGrowthPct = null;
  }

  const anyLive = censusFetchedLive || blsFetchedLive || attainmentFetchedLive;

  const payload = {
    meta: {
      source: CENSUS_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      provenance: anyLive ? ('fetched-live' as const) : ('honest-gap' as const),
      fetchedLive: anyLive,
      censusFetchedLive,
      blsFetchedLive,
      attainmentFetchedLive,
      fetchedAt: new Date().toISOString(),
      datasetUrl: countyUrl.replace(/key=[^&]+/, 'key=***'),
      attainmentUrl: attainmentUrl ? attainmentUrl.replace(/key=[^&]+/, 'key=***') : undefined,
      note: `ACS ${usedYear} county sample (n=${records.length}) + state ACS (single read-path) + B15003. County unemployment from BLS LAUS.`,
      blsSource: {
        name: 'U.S. Bureau of Labor Statistics',
        url: 'https://www.bls.gov',
        tier: 'official',
        description: 'LAUS county unemployment rate (LAUCN series)',
      },
    },
    stateSummary: {
      populationRank: flRank || null,
      populationGrowthPct,
      attainment: flAttainment,
      usAttainmentBachelorsPlusPct: usAttainment?.bachelorsPlusPct ?? null,
      acs: stateAcs,
    },
    records,
  };

  const dir = path.join(projectRoot, 'data', 'florida', 'census');
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, 'florida-counties-sample.json');
  await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(
    `Wrote ${out} (${records.length} counties; census=${censusFetchedLive} bls=${blsFetchedLive} attainment=${attainmentFetchedLive})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
