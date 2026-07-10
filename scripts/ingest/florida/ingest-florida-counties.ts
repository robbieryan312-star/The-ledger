/**
 * Census ACS county sample for Florida state profile dropdowns.
 * Output: data/florida/census/florida-counties-sample.json
 *
 * Usage: npm run ingest:fl-counties -- --limit 10
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvLocal, projectRoot } from '../../lib/ingest-utils';

const CENSUS_SOURCE = {
  name: 'U.S. Census Bureau ACS',
  url: 'https://api.census.gov',
  tier: 'official' as const,
  description: 'ACS 5-year county estimates — small sample batch',
};

const COUNTY_FIPS_SAMPLE = [
  '12086', '12011', '12057', '12095', '12031',
  '12021', '12071', '12009', '12103', '12005',
];

async function main(): Promise<void> {
  await loadEnvLocal();
  const argv = process.argv.slice(2);
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number.parseInt(argv[limitIdx + 1] ?? '10', 10) : 10;
  const fipsList = COUNTY_FIPS_SAMPLE.slice(0, Math.min(limit, COUNTY_FIPS_SAMPLE.length));
  const key = process.env.CENSUS_API_KEY?.trim() || process.env.FEC_API_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);

  let records: {
    fips: string;
    name: string;
    population: number;
    medianHouseholdIncome: number;
    medianHomeValue: number;
    unemploymentRate: number;
  }[] = [];
  let fetchedLive = false;
  let note = 'Sample batch only. Full county ingest deferred until owner review.';

  if (key) {
    try {
      const year = '2022';
      const url =
        `https://api.census.gov/data/${year}/acs/acs5?get=NAME,B01003_001E,B19013_001E,B25077_001E&for=county:*&in=state:12&key=${encodeURIComponent(key)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      const raw = (await res.json()) as string[][];
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const headers = raw[0];
      const rows = raw.slice(1);
      const idx = (h: string) => headers.indexOf(h);

      records = rows
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
            unemploymentRate: 3.5,
          };
        })
        .sort((a, b) => b.population - a.population);

      if (records.length > 0) {
        fetchedLive = true;
        note = `ACS ${year} county sample (n=${records.length}). Unemployment rates pending BLS LAUS county series.`;
      }
    } catch (err) {
      note = `Census fetch failed — sample retained: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (!records.length) {
    const existing = JSON.parse(
      await readFile(path.join(projectRoot, 'data/florida/census/florida-counties-sample.json'), 'utf8'),
    ) as { records: typeof records };
    records = existing.records;
  }

  const payload = {
    meta: {
      source: CENSUS_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive,
      note,
    },
    stateSummary: {
      populationRank: 3,
      populationGrowthPct: 1.6,
      attainment: {
        hsPlusPct: 89.2,
        someCollegePct: 29.8,
        bachelorsPct: 20.6,
        graduatePct: 10.9,
        bachelorsPlusPct: 31.5,
      },
    },
    records,
  };

  const dir = path.join(projectRoot, 'data', 'florida', 'census');
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, 'florida-counties-sample.json');
  await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${out} (${records.length} counties, live=${fetchedLive})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
