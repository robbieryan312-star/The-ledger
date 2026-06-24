/**
 * Federal Register Florida-related documents (no key).
 * Output: data/fedregister/florida-documents.json
 *
 * Tier 1 official: the daily journal of the U.S. government. Captures the most
 * recent federal rules, proposed rules, notices, and presidential documents
 * that reference Florida, each dated and linked to the primary record.
 */
import { fetchJson, writeFloridaSnapshot } from './lib/ingest-utils';

const FEDREG_SOURCE = {
  name: 'Federal Register',
  url: 'https://www.federalregister.gov',
  tier: 'official' as const,
  description: 'Official daily journal of the U.S. government via federalregister.gov API',
};

interface FedRegResponse {
  count: number;
  results: Array<{
    document_number?: string;
    title?: string;
    type?: string;
    publication_date?: string;
    html_url?: string;
    abstract?: string | null;
    agency_names?: string[];
  }>;
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  let records: Array<Record<string, unknown>> = [];

  const params = new URLSearchParams();
  params.set('conditions[term]', 'Florida');
  params.set('per_page', '100');
  params.set('order', 'newest');
  for (const f of ['document_number', 'title', 'type', 'publication_date', 'html_url', 'abstract', 'agency_names']) {
    params.append('fields[]', f);
  }
  const url = `https://www.federalregister.gov/api/v1/documents.json?${params.toString()}`;

  try {
    const data = await fetchJson<FedRegResponse>(url);
    records = (data.results ?? []).map((d) => ({
      documentNumber: d.document_number ?? 'No record on file',
      title: d.title ?? 'No record on file',
      type: d.type ?? 'No record on file',
      publicationDate: d.publication_date ?? 'No record on file',
      agencies: Array.isArray(d.agency_names) ? d.agency_names : [],
      abstract: d.abstract ?? null,
      source: { ...FEDREG_SOURCE, date: d.publication_date },
      asOf,
      documentUrl: d.html_url ?? 'https://www.federalregister.gov',
    }));
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('fedregister', 'florida-documents.json', {
    meta: {
      source: FEDREG_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://www.federalregister.gov/api/v1/documents.json?conditions[term]=Florida',
      note: 'Most recent 100 Federal Register documents matching "Florida" (rules, proposed rules, notices, presidential documents). Tier 1 official.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
