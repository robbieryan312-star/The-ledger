/**
 * GovInfo — Florida-related federal legislative documents (api.data.gov key).
 * Output: data/govinfo/florida-legislative-docs.json
 *
 * Tier 1 official (GPO). Recent Congressional Bills, Congressional Record, and
 * Committee Reports mentioning Florida — the legislative-branch counterpart to
 * the Federal Register's executive/agency documents. Each item dated and linked.
 */
import { fetchJson, loadEnvLocal, writeFloridaSnapshot } from './lib/ingest-utils';

const GOVINFO_SOURCE = {
  name: 'GovInfo (U.S. GPO)',
  url: 'https://www.govinfo.gov',
  tier: 'official' as const,
  description: 'U.S. Government Publishing Office official publications via api.govinfo.gov',
};

const COLLECTION_LABELS: Record<string, string> = {
  BILLS: 'Congressional Bill', CREC: 'Congressional Record', CRPT: 'Committee Report',
  CPRT: 'Committee Print', CRI: 'Congressional Record Index', BILLSTATUS: 'Bill Status',
  PLAW: 'Public Law', STATUTE: 'Statute', HMAN: 'House Manual',
};

interface GovInfoSearch {
  count: number;
  results: Array<{
    title?: string;
    packageId?: string;
    dateIssued?: string;
    lastModified?: string;
    collectionCode?: string;
    governmentAuthor?: string[];
  }>;
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = (process.env.GOVINFO_API_KEY || process.env.DATA_GOV_API_KEY || process.env.FEC_API_KEY || '').trim();
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  if (!key) {
    const out = await writeFloridaSnapshot('govinfo', 'florida-legislative-docs.json', {
      meta: { source: GOVINFO_SOURCE, asOf, fetchedAt, count: 0, stateCode: 'FL', fetchedLive: false, errors: ['No api.data.gov key configured'], note: 'No record on file — set DATA_GOV_API_KEY (api.data.gov key).' },
      records: [],
    });
    console.warn(`Wrote empty ${out}`);
    return;
  }

  try {
    const data = await fetchJson<GovInfoSearch>(`https://api.govinfo.gov/search?api_key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Florida AND collection:(BILLS CREC CRPT CPRT)',
        pageSize: 40,
        offsetMark: '*',
        sorts: [{ field: 'publishdate', sortOrder: 'DESC' }],
      }),
    });
    for (const r of data.results ?? []) {
      const code = r.collectionCode ?? '';
      records.push({
        title: r.title ?? 'No record on file',
        documentType: COLLECTION_LABELS[code] ?? code ?? 'No record on file',
        collectionCode: code,
        dateIssued: r.dateIssued ?? 'No record on file',
        governmentAuthor: Array.isArray(r.governmentAuthor) ? r.governmentAuthor : [],
        packageId: r.packageId ?? 'No record on file',
        source: { ...GOVINFO_SOURCE, date: r.dateIssued },
        asOf,
        govinfoUrl: r.packageId ? `https://www.govinfo.gov/app/details/${r.packageId}` : 'https://www.govinfo.gov',
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('govinfo', 'florida-legislative-docs.json', {
    meta: {
      source: GOVINFO_SOURCE,
      asOf,
      fetchedAt,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.govinfo.gov/search',
      note: 'Recent Florida-related federal legislative documents (bills, Congressional Record, committee reports) via GovInfo. Tier 1 official GPO.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
