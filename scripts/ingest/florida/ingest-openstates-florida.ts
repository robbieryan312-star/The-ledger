/**
 * OpenStates Florida legislators.
 * Output: data/openstates/florida-legislators.json
 */
import { fetchJson, loadEnvLocal, sleep, writeFloridaSnapshot } from './lib/ingest-utils';

const OPENSTATES_SOURCE = {
  name: 'Open States',
  url: 'https://openstates.org',
  tier: 'nonpartisan' as const,
  description: 'State legislator records via openstates.org API',
};

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = process.env.OPENSTATES_API_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  if (!key) {
    const out = await writeFloridaSnapshot('openstates', 'florida-legislators.json', {
      meta: {
        source: OPENSTATES_SOURCE,
        asOf,
        count: 0,
        stateCode: 'FL',
        fetchedLive: false,
        errors: ['OPENSTATES_API_KEY not configured'],
        note: 'No record on file — API key required. Register at openstates.org/api',
      },
      records: [],
    });
    console.warn(`Wrote empty ${out} — OPENSTATES_API_KEY missing`);
    return;
  }

  try {
    const url = `https://v3.openstates.org/people?jurisdiction=ocd-jurisdiction/country:us/state:fl/government&per_page=50&page=1`;
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      const data = await fetchJson<{ results: Array<Record<string, unknown>>; pagination?: { page: number; max_page: number } }>(
        `${url}&page=${page}`,
        { headers: { 'X-API-KEY': key } },
      );
      for (const person of data.results ?? []) {
        records.push({
          openstatesId: person.id ?? 'No record on file',
          name: person.name ?? 'No record on file',
          party: person.party ?? 'No record on file',
          currentRole: person.current_role ?? 'No record on file',
          jurisdiction: 'Florida',
          source: OPENSTATES_SOURCE,
          asOf,
          openstatesUrl: person.openstates_url ?? 'https://openstates.org/find_your_legislator/',
        });
      }
      hasMore = (data.pagination?.page ?? page) < (data.pagination?.max_page ?? page);
      page += 1;
      await sleep(300);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('openstates', 'florida-legislators.json', {
    meta: {
      source: OPENSTATES_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://v3.openstates.org/people',
      note: 'Florida state legislators. Tier 2 nonpartisan Open States.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
