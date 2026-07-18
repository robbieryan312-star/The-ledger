/**
 * Census ACS Florida demographics + US national benchmarks (income/home).
 * Output: data/florida/census/florida-demographics.json
 *
 * Requires CENSUS_API_KEY (or DATA_GOV_API_KEY). Falls back to data.census.gov
 * public table API for US B19013/B25077 when the keyed Census API is unavailable
 * for national geography only.
 */
import { loadEnvLocal, writeFloridaSnapshot } from '../../lib/ingest-utils';

const CENSUS_SOURCE = {
  name: 'U.S. Census Bureau ACS',
  url: 'https://api.census.gov',
  tier: 'official' as const,
  description: 'American Community Survey 5-year estimates via api.census.gov',
};

function parseAcsNumber(raw: string | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null; // ACS sentinels are negative
  return n;
}

async function fetchUsMediansFromDataCensus(year: string): Promise<{
  medianHouseholdIncome: number | null;
  medianHomeValue: number | null;
}> {
  const incomeUrl = `https://data.census.gov/api/access/data/table?g=010XX00US&y=${year}&d=ACS%205-Year%20Estimates%20Detailed%20Tables&tid=ACSDT5Y${year}.B19013`;
  const homeUrl = `https://data.census.gov/api/access/data/table?g=010XX00US&y=${year}&d=ACS%205-Year%20Estimates%20Detailed%20Tables&tid=ACSDT5Y${year}.B25077`;
  const [incomeRes, homeRes] = await Promise.all([
    fetch(incomeUrl, { signal: AbortSignal.timeout(30_000) }),
    fetch(homeUrl, { signal: AbortSignal.timeout(30_000) }),
  ]);
  const incomeJson = (await incomeRes.json()) as {
    response?: { data?: string[][] };
  };
  const homeJson = (await homeRes.json()) as {
    response?: { data?: string[][] };
  };
  const incomeHeaders = incomeJson.response?.data?.[0] ?? [];
  const incomeRow = incomeJson.response?.data?.[1];
  const homeHeaders = homeJson.response?.data?.[0] ?? [];
  const homeRow = homeJson.response?.data?.[1];
  const incomeIdx = incomeHeaders.indexOf('B19013_001E');
  const homeIdx = homeHeaders.indexOf('B25077_001E');
  return {
    medianHouseholdIncome:
      incomeIdx >= 0 && incomeRow ? parseAcsNumber(incomeRow[incomeIdx]) : null,
    medianHomeValue: homeIdx >= 0 && homeRow ? parseAcsNumber(homeRow[homeIdx]) : null,
  };
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = process.env.CENSUS_API_KEY?.trim() || process.env.DATA_GOV_API_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];

  if (!key) {
    console.error('CENSUS_API_KEY (or DATA_GOV_API_KEY) required for Florida ACS demographics');
    process.exit(1);
  }

  const years = ['2023', '2022', '2021'];

  try {
    let raw: string[][] | null = null;
    let usedYear = years[0];
    let usedUrl = '';

    for (const year of years) {
      const url = `https://api.census.gov/data/${year}/acs/acs5?get=NAME,B01003_001E,B19013_001E,B25077_001E&for=state:12&key=${encodeURIComponent(key)}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
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

    let usIncome: number | null = null;
    let usHome: number | null = null;
    const usUrl = `https://api.census.gov/data/${usedYear}/acs/acs5?get=B19013_001E,B25077_001E&for=us:1&key=${encodeURIComponent(key)}`;
    try {
      const usRes = await fetch(usUrl, { signal: AbortSignal.timeout(30_000) });
      const usText = await usRes.text();
      if (usRes.ok) {
        const usRaw = JSON.parse(usText) as string[][];
        const uh = usRaw[0];
        const ur = usRaw[1];
        usIncome = parseAcsNumber(ur[uh.indexOf('B19013_001E')]);
        usHome = parseAcsNumber(ur[uh.indexOf('B25077_001E')]);
      } else {
        throw new Error(`HTTP ${usRes.status}`);
      }
    } catch (err) {
      errors.push(`US keyed fetch: ${err instanceof Error ? err.message : String(err)}`);
      const fallback = await fetchUsMediansFromDataCensus(usedYear);
      usIncome = fallback.medianHouseholdIncome;
      usHome = fallback.medianHomeValue;
      if (usIncome == null || usHome == null) {
        errors.push('US medians unavailable from data.census.gov fallback');
      }
    }

    const records = [
      {
        stateCode: 'FL',
        stateName: obj.NAME ?? 'Florida',
        population: parseAcsNumber(obj.B01003_001E),
        medianHouseholdIncome: parseAcsNumber(obj.B19013_001E),
        medianHomeValue: parseAcsNumber(obj.B25077_001E),
        nationalMedianHouseholdIncome: usIncome,
        nationalMedianHomeValue: usHome,
        survey: `ACS 5-Year ${usedYear}`,
        source: CENSUS_SOURCE,
        asOf,
        censusApiUrl: `https://api.census.gov/data/${usedYear}/acs/acs5`,
        provenance: 'fetched-live' as const,
      },
    ];

    const out = await writeFloridaSnapshot('census', 'florida-demographics.json', {
      meta: {
        source: CENSUS_SOURCE,
        asOf,
        count: records.length,
        stateCode: 'FL',
        fetchedLive: true,
        provenance: 'fetched-live',
        datasetUrl: usedUrl.replace(/key=[^&]+/, 'key=***'),
        note: 'State-level ACS demographics + US B19013/B25077 for vs-U.S. chips. CENSUS_API_KEY required.',
        errors: errors.length ? errors : undefined,
      },
      records,
    });

    console.log(`Wrote ${out} (FL income=${records[0].medianHouseholdIncome}, US income=${usIncome})`);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    console.error(`Census demographics ingest failed: ${errors.join('; ')}`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
