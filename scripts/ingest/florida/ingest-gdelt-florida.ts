/**
 * GDELT 2.0 DOC API — Florida political coverage (no key).
 * Output: data/gdelt/florida-coverage.json
 *
 * Tier 3 (media aggregator). GDELT indexes worldwide news; results are an
 * automated aggregation over journalism and must be corroborated with Tier 1/2
 * sources before being treated as fact. Each item dated + linked + flagged.
 */
import { writeFloridaSnapshot } from './lib/ingest-utils';

const GDELT_SOURCE = {
  name: 'GDELT Project',
  url: 'https://www.gdeltproject.org',
  tier: 'media' as const,
  description: 'Global news aggregator (GDELT 2.0 DOC API) — Tier 3, corroborate before citing',
};

interface GdeltResp {
  articles?: Array<{ url?: string; title?: string; seendate?: string; domain?: string; language?: string; sourcecountry?: string }>;
}

function parseSeen(s: string): string {
  const m = (s || '').match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : 'No record on file';
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];
  const query = 'Florida (governor OR legislature OR senate OR election OR congress)';
  const datasetUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=50&format=json&sort=datedesc&timespan=14d`;

  try {
    const res = await fetch(datasetUrl, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as GdeltResp;
    for (const a of data.articles ?? []) {
      records.push({
        title: a.title ?? 'No record on file',
        url: a.url ?? 'No record on file',
        domain: a.domain ?? 'No record on file',
        date: parseSeen(a.seendate ?? ''),
        language: a.language ?? 'Unknown',
        sourceCountry: a.sourcecountry ?? 'Unknown',
        source: { ...GDELT_SOURCE, date: parseSeen(a.seendate ?? '') },
        asOf,
        tierFlag: 'Tier 3 aggregator — corroborate with Tier 1/2 sources before presenting as fact',
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('gdelt', 'florida-coverage.json', {
    meta: {
      source: GDELT_SOURCE,
      asOf,
      fetchedAt,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl,
      note: 'Florida political news coverage (last 14 days) via the GDELT 2.0 DOC API. Tier 3 automated aggregator over global journalism — always corroborate with Tier 1/2 records before treating as fact.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
