/**
 * FARA Florida registrants (no key).
 * Output: data/fara/florida-registrants.json
 */
import { fetchJson, writeFloridaSnapshot } from './lib/ingest-utils';

const FARA_SOURCE = {
  name: 'DOJ FARA eFile',
  url: 'https://www.fara.gov',
  tier: 'official' as const,
  description: 'Foreign Agents Registration Act disclosures via efts.fara.justice.gov',
};

interface FaraResponse {
  _embedded?: {
    documents?: Array<{
      registrant_name?: string;
      registrant_city?: string;
      registrant_state?: string;
      registrant_country?: string;
      foreign_principal?: string;
      registration_number?: string;
      registration_date?: string;
      termination_date?: string;
      url?: string;
    }>;
  };
  page?: { totalElements?: number; totalPages?: number };
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  try {
    const urls = [
      'https://efts.fara.gov/motd-search/api/documents?q=Florida&size=100&page=0',
      'https://efts.fara.gov/motd-search/api/documents?registrant_state=FL&size=100&page=0',
    ];
    let docs: NonNullable<NonNullable<FaraResponse['_embedded']>['documents']> = [];
    for (const url of urls) {
      try {
        const data = await fetchJson<FaraResponse>(url);
        const batch = data._embedded?.documents ?? [];
        if (batch.length > docs.length) docs = batch;
      } catch {
        // try next URL pattern
      }
    }
    for (const doc of docs) {
      records.push({
        registrantName: doc.registrant_name ?? 'No record on file',
        city: doc.registrant_city ?? 'No record on file',
        state: doc.registrant_state ?? 'FL',
        country: doc.registrant_country ?? 'No record on file',
        foreignPrincipal: doc.foreign_principal ?? 'No record on file',
        registrationNumber: doc.registration_number ?? 'No record on file',
        registrationDate: doc.registration_date ?? 'No record on file',
        terminationDate: doc.termination_date ?? 'No record on file',
        source: FARA_SOURCE,
        asOf,
        faraUrl: doc.url ?? 'https://www.fara.gov/',
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('fara', 'florida-registrants.json', {
    meta: {
      source: FARA_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://efts.fara.justice.gov/motd-search/api/documents',
      note: 'FARA registrants with Florida address. Tier 1 official DOJ source.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
