/**
 * OpenStates Florida legislators.
 * Output: data/florida/openstates/florida-legislators.json
 *
 * Wave-1 / core-rules §6: never overwrite a fetched-live snapshot with an empty /
 * honest-gap payload on key miss or fetch failure.
 */
import { fetchJson, loadEnvLocal, sleep, writeFloridaSnapshotPreservingLive } from '../../lib/ingest-utils';

const OPENSTATES_SOURCE = {
  name: 'Open States',
  url: 'https://openstates.org',
  tier: 'nonpartisan' as const,
  description: 'State legislator records via openstates.org API',
};

const BASE_URL =
  'https://v3.openstates.org/people?jurisdiction=ocd-jurisdiction/country:us/state:fl/government&per_page=50';

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = process.env.OPENSTATES_API_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  if (!key) {
    const { action, outFile } = await writeFloridaSnapshotPreservingLive('openstates', 'florida-legislators.json', {
      meta: {
        source: OPENSTATES_SOURCE,
        asOf,
        fetchedAt,
        count: 0,
        stateCode: 'FL',
        fetchedLive: false,
        provenance: 'honest-gap',
        errors: ['OPENSTATES_API_KEY not configured'],
        note:
          'Honest-gap: OPENSTATES_API_KEY missing. Prior fetched-live snapshot (if any) is preserved — never wiped. Register at openstates.org/api.',
      },
      records: [],
    });
    console.warn(
      action === 'preserved-prior'
        ? `Preserved prior fetched-live ${outFile} — OPENSTATES_API_KEY missing`
        : `Wrote honest-gap ${outFile} — OPENSTATES_API_KEY missing (no prior live sample)`,
    );
    return;
  }

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      const data = await fetchJson<{
        results: Array<Record<string, unknown>>;
        pagination?: { page: number; max_page: number };
      }>(`${BASE_URL}&page=${page}`, {
        headers: { 'X-API-KEY': key },
        signal: AbortSignal.timeout(60_000),
      });
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

  const fetchedLive = errors.length === 0 && records.length > 0;
  const payload = fetchedLive
    ? {
        meta: {
          source: OPENSTATES_SOURCE,
          asOf,
          fetchedAt,
          count: records.length,
          stateCode: 'FL' as const,
          fetchedLive: true,
          provenance: 'fetched-live' as const,
          datasetUrl: 'https://v3.openstates.org/people',
          note: 'Florida state legislators via Open States v3. Tier nonpartisan.',
        },
        records,
      }
    : {
        meta: {
          source: OPENSTATES_SOURCE,
          asOf,
          fetchedAt,
          count: 0,
          stateCode: 'FL' as const,
          fetchedLive: false,
          provenance: 'honest-gap' as const,
          errors: errors.length ? errors : ['OpenStates returned no legislators'],
          datasetUrl: 'https://v3.openstates.org/people',
          note: 'Fetch failed or empty — prior fetched-live snapshot preserved when present (Wave-1 / core-rules §6).',
        },
        records: [] as Array<Record<string, unknown>>,
      };

  const { action, outFile } = await writeFloridaSnapshotPreservingLive('openstates', 'florida-legislators.json', payload);

  if (action === 'preserved-prior') {
    console.warn(
      `Preserved prior fetched-live ${outFile} — refused to overwrite after errors: ${errors.join('; ') || 'empty'}`,
    );
    process.exitCode = 1;
  } else {
    console.log(`Wrote ${outFile} (${fetchedLive ? records.length : 0} records, fetchedLive=${fetchedLive})`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
