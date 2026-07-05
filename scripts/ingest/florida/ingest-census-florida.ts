/**
 * Census ACS Florida demographics (no key).
 * Output: data/census/florida-demographics.json
 */
import { loadEnvLocal, writeFloridaSnapshot } from './lib/ingest-utils';

const CENSUS_SOURCE = {
  name: 'U.S. Census Bureau ACS',
  url: 'https://api.census.gov',
  tier: 'official' as const,
  description: 'American Community Survey 5-year estimates via api.census.gov',
};

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = process.env.CENSUS_API_KEY?.trim() || process.env.FEC_API_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];

  if (!key) {
    const out = await writeFloridaSnapshot('census', 'florida-demographics.json', {
      meta: {
        source: CENSUS_SOURCE,
        asOf,
        count: 0,
        stateCode: 'FL',
        fetchedLive: false,
        errors: ['CENSUS_API_KEY not configured (api.data.gov key works)'],
        note: 'No record on file until Census API key is set.',
      },
      records: [],
    });
    console.warn(`Wrote empty ${out}`);
    return;
  }

  const years = ['2023', '2022', '2021'];

  try {
    let raw: string[][] | null = null;
    let usedYear = years[0];
    let usedUrl = '';

    for (const year of years) {
      const url = `https://api.census.gov/data/${year}/acs/acs5?get=NAME,B01003_001E,B19013_001E,B25077_001E&for=state:12&key=${encodeURIComponent(key)}`;
      try {
        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok) {
          errors.push(`${year}: HTTP ${res.status}`);
          continue;
        }
        raw = JSON.parse(text) as string[][];
        usedYear = year;
        usedUrl = url;
        break;
      } catch (err) {
        errors.push(`${year}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!raw) {
      throw new Error(errors.join('; ') || 'Census fetch failed');
    }
    const headers = raw[0];
    const row = raw[1];
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });

    const records = [
      {
        stateCode: 'FL',
        stateName: obj.NAME ?? 'Florida',
        population: Number(obj.B01003_001E) || null,
        medianHouseholdIncome: Number(obj.B19013_001E) || null,
        medianHomeValue: Number(obj.B25077_001E) || null,
        survey: `ACS 5-Year ${usedYear}`,
        source: CENSUS_SOURCE,
        asOf,
        censusApiUrl: `https://api.census.gov/data/${usedYear}/acs/acs5`,
      },
    ];

    const out = await writeFloridaSnapshot('census', 'florida-demographics.json', {
      meta: {
        source: CENSUS_SOURCE,
        asOf,
        count: records.length,
        stateCode: 'FL',
        fetchedLive: true,
        datasetUrl: usedUrl.replace(/key=[^&]+/, 'key=***'),
        note: 'State-level ACS demographics. Tier 1 official Census Bureau.',
      },
      records,
    });

    console.log(`Wrote ${out} (${records.length} records)`);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    const out = await writeFloridaSnapshot('census', 'florida-demographics.json', {
      meta: {
        source: CENSUS_SOURCE,
        asOf,
        count: 0,
        stateCode: 'FL',
        fetchedLive: false,
        errors,
        note: 'Census fetch failed.',
      },
      records: [],
    });
    console.warn(`Wrote empty ${out}: ${errors.join('; ')}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
