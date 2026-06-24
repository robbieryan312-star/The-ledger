/**
 * Senate LDA lobbying disclosures mentioning Florida (no key for read).
 * Output: data/lobbying/florida-disclosures.json
 */
import { fetchJson, sleep, writeFloridaSnapshot } from './lib/ingest-utils';

const LDA_SOURCE = {
  name: 'Senate Lobbying Disclosure Act Database',
  url: 'https://lda.senate.gov',
  tier: 'official' as const,
  description: 'Federal lobbying registrations and reports via lda.senate.gov/api',
};

interface LdaFiling {
  id?: number;
  registrant_name?: string;
  client_name?: string;
  dt_posted?: string;
  filing_period?: string;
  filing_year?: number;
  filing_type?: string;
  url?: string;
}

interface LdaResponse {
  results?: LdaFiling[];
  count?: number;
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  try {
    // Search filings — filter client/registrant text for Florida references in post-processing
    const url = 'https://lda.senate.gov/api/v1/filings/?page_size=100&ordering=-dt_posted';
    const data = await fetchJson<LdaResponse>(url);
    const filings = data.results ?? [];

    for (const f of filings) {
      const text = `${f.registrant_name ?? ''} ${f.client_name ?? ''}`.toLowerCase();
      const isFlorida =
        text.includes('florida') ||
        text.includes(' miami') ||
        text.includes(' tampa') ||
        text.includes(' orlando') ||
        text.includes(' jacksonville');

      if (!isFlorida && records.length >= 50) continue;

      records.push({
        filingId: f.id ?? 'No record on file',
        registrantName: f.registrant_name ?? 'No record on file',
        clientName: f.client_name ?? 'No record on file',
        postedDate: f.dt_posted ?? 'No record on file',
        filingPeriod: f.filing_period ?? 'No record on file',
        filingYear: f.filing_year ?? null,
        filingType: f.filing_type ?? 'No record on file',
        floridaMatch: isFlorida,
        source: LDA_SOURCE,
        asOf,
        ldaUrl: f.url ?? `https://lda.senate.gov/filings/${f.id ?? ''}`,
      });

      if (records.length >= 100) break;
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const floridaTagged = records.filter((r) => r.floridaMatch).length;

  const out = await writeFloridaSnapshot('lobbying', 'florida-disclosures.json', {
    meta: {
      source: LDA_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://lda.senate.gov/api/v1/filings/',
      note: `${floridaTagged} filings tagged Florida by name match; ${records.length} total recent filings included. Tier 1 official Senate LDA.`,
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records, ${floridaTagged} FL-tagged)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
