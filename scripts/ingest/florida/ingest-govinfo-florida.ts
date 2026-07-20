/**
 * GovInfo — Florida-related federal legislative documents (api.data.gov key).
 * Output: data/florida/govinfo/florida-legislative-docs.json
 *
 * Tier official (GPO). Recent Congressional Bills, Congressional Record, and
 * Committee Reports mentioning Florida — the legislative-branch counterpart to
 * the Federal Register's executive/agency documents. Each item dated and linked.
 *
 * Wave-1 / core-rules §6: never overwrite a fetched-live snapshot with an empty /
 * honest-gap payload on key miss or fetch failure.
 */
import { fetchJson, loadEnvLocal, writeFloridaSnapshotPreservingLive } from '../../lib/ingest-utils';

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
    const { action, outFile } = await writeFloridaSnapshotPreservingLive('govinfo', 'florida-legislative-docs.json', {
      meta: {
        source: GOVINFO_SOURCE,
        asOf,
        fetchedAt,
        count: 0,
        stateCode: 'FL',
        fetchedLive: false,
        provenance: 'honest-gap',
        errors: ['No api.data.gov key configured'],
        note:
          'Honest-gap: set GOVINFO_API_KEY or DATA_GOV_API_KEY (api.data.gov). Prior fetched-live snapshot preserved when present.',
      },
      records: [],
    });
    console.warn(
      action === 'preserved-prior'
        ? `Preserved prior fetched-live ${outFile} — no api.data.gov key`
        : `Wrote honest-gap ${outFile} — no api.data.gov key`,
    );
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

  const fetchedLive = errors.length === 0 && records.length > 0;
  const payload = fetchedLive
    ? {
        meta: {
          source: GOVINFO_SOURCE,
          asOf,
          fetchedAt,
          count: records.length,
          stateCode: 'FL' as const,
          fetchedLive: true,
          provenance: 'fetched-live' as const,
          datasetUrl: 'https://api.govinfo.gov/search',
          note:
            'Recent Florida-related federal legislative documents (bills, Congressional Record, committee reports) via GovInfo. Tier official GPO.',
        },
        records,
      }
    : {
        meta: {
          source: GOVINFO_SOURCE,
          asOf,
          fetchedAt,
          count: 0,
          stateCode: 'FL' as const,
          fetchedLive: false,
          provenance: 'honest-gap' as const,
          errors: errors.length ? errors : ['GovInfo returned no documents'],
          datasetUrl: 'https://api.govinfo.gov/search',
          note: 'Fetch failed or empty — prior fetched-live snapshot preserved when present (Wave-1 / core-rules §6).',
        },
        records: [] as Array<Record<string, unknown>>,
      };

  const { action, outFile } = await writeFloridaSnapshotPreservingLive('govinfo', 'florida-legislative-docs.json', payload);

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
