/**
 * Ingest Florida FEC candidates from api.open.fec.gov
 * Output: data/fec/florida-candidates.json
 */
import {
  DATA_ROOT,
  fetchJson,
  loadEnvLocal,
  sleep,
  writeFloridaSnapshot,
} from './lib/ingest-utils';
import { FEC_SOURCE } from '../lib/data/fecClient';

interface FecPage<T> {
  results: T[];
  pagination: { count: number; pages: number; page: number; per_page: number };
}

interface RawCandidate {
  candidate_id: string;
  name: string;
  office: string;
  state: string;
  party: string;
  party_full?: string;
  active_through?: number;
  candidate_inactive?: boolean;
  cycles?: number[];
  incumbent_challenge?: string;
  candidate_status?: string;
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = process.env.FEC_API_KEY?.trim();
  if (!key) {
    console.error('FEC_API_KEY missing — set in .env.local');
    process.exit(1);
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const records: Array<{
    candidateId: string;
    name: string;
    office: string;
    state: string;
    party: string;
    activeThrough?: number;
    candidateInactive: boolean;
    cycles?: number[];
    incumbentChallenge?: string;
    status?: string;
    source: typeof FEC_SOURCE;
    asOf: string;
    fecProfileUrl: string;
  }> = [];

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = new URL('https://api.open.fec.gov/v1/candidates/');
    url.searchParams.set('api_key', key);
    url.searchParams.set('state', 'FL');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', '-election_years');

    try {
      const data = await fetchJson<FecPage<RawCandidate>>(url.toString());
      totalPages = data.pagination.pages;
      for (const row of data.results) {
        records.push({
          candidateId: row.candidate_id,
          name: row.name,
          office: row.office,
          state: row.state,
          party: row.party_full ?? row.party,
          activeThrough: row.active_through,
          candidateInactive: !!row.candidate_inactive,
          cycles: row.cycles,
          incumbentChallenge: row.incumbent_challenge,
          status: row.candidate_status,
          source: FEC_SOURCE,
          asOf,
          fecProfileUrl: `https://www.fec.gov/data/candidate/${row.candidate_id}/`,
        });
      }
      console.log(`  page ${page}/${totalPages}: ${data.results.length} candidates`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`page ${page}: ${msg}`);
      break;
    }
    page += 1;
    await sleep(200);
  }

  const out = await writeFloridaSnapshot('fec', 'florida-candidates.json', {
    meta: {
      source: FEC_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.open.fec.gov/v1/candidates/?state=FL',
      note: 'Florida candidates from OpenFEC. Tier 1 official source.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
  console.log(`DATA_ROOT: ${DATA_ROOT}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
