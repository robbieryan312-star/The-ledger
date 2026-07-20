/**
 * LegiScan Florida legislation.
 * Output: data/florida/legiscan/florida-legislation.json
 *
 * Fetches master list then getBill detail for each bill to capture the official
 * LegiScan `description` field as summary.
 *
 * Wave-1 / core-rules §6: never overwrite a fetched-live 10-bill (or larger) sample
 * with an empty/honest-gap payload on key miss or fetch failure.
 *
 * Usage:
 *   npm run ingest:legiscan-fl -- --limit 10   # small verified sample (recommended first)
 */
import { fetchJson, loadEnvLocal, sleep, writeFloridaSnapshotPreservingLive } from '../../lib/ingest-utils';

const LEGISCAN_SOURCE = {
  name: 'LegiScan',
  url: 'https://legiscan.com',
  tier: 'nonpartisan' as const,
  description: 'State and federal bill tracking via legiscan.com API',
};

const DEFAULT_LIST_LIMIT = 100;
const DEFAULT_DETAIL_LIMIT = 30;

function parseLimitArg(argv: string[], flag: string, fallback: number): number {
  const idx = argv.indexOf(flag);
  if (idx === -1) return fallback;
  const n = Number.parseInt(argv[idx + 1] ?? '', 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`${flag} requires a positive integer`);
  }
  return n;
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const argv = process.argv.slice(2);
  const detailLimit = parseLimitArg(argv, '--limit', DEFAULT_DETAIL_LIMIT);
  const listLimit = parseLimitArg(argv, '--list-limit', DEFAULT_LIST_LIMIT);

  const key = process.env.LEGISCAN_API_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  if (!key) {
    const { action, outFile } = await writeFloridaSnapshotPreservingLive('legiscan', 'florida-legislation.json', {
      meta: {
        source: LEGISCAN_SOURCE,
        asOf,
        fetchedAt,
        count: 0,
        stateCode: 'FL',
        fetchedLive: false,
        provenance: 'honest-gap',
        errors: ['LEGISCAN_API_KEY not configured'],
        datasetUrl: 'https://api.legiscan.com/',
        note:
          'Honest-gap: LEGISCAN_API_KEY missing. Prior fetched-live sample (if any) is preserved — never wiped. Set key in .env.local / Cloud Secrets.',
      },
      records: [],
    });
    console.warn(
      action === 'preserved-prior'
        ? `Preserved prior fetched-live ${outFile} — LEGISCAN_API_KEY missing (10-bill sample intact)`
        : `Wrote honest-gap ${outFile} — LEGISCAN_API_KEY missing (no prior live sample)`,
    );
    return;
  }

  try {
    const listUrl = `https://api.legiscan.com/?key=${encodeURIComponent(key)}&op=getMasterList&state=FL`;
    const data = await fetchJson<{
      status: string;
      masterlist?: Record<string, { bill_id: number; number: string; title: string; status_date: string }>;
    }>(listUrl);

    if (data.status !== 'OK') {
      errors.push(`LegiScan status: ${data.status}`);
    } else {
      const list = Object.values(data.masterlist ?? {}).slice(0, listLimit);
      const detailTargets = list.slice(0, detailLimit);

      for (const bill of detailTargets) {
        let description = '';
        let billStatus: number | undefined;
        let currentBody = '';
        try {
          const detailUrl = `https://api.legiscan.com/?key=${encodeURIComponent(key)}&op=getBill&id=${bill.bill_id}`;
          const detail = await fetchJson<{
            status: string;
            bill?: {
              description?: string;
              status?: number;
              status_desc?: string;
              current_body?: string;
            };
          }>(detailUrl);
          if (detail.status === 'OK' && detail.bill) {
            description = (detail.bill.description ?? '').trim();
            billStatus = detail.bill.status;
            currentBody = detail.bill.current_body ?? '';
          }
          await sleep(350);
        } catch (err) {
          errors.push(`getBill ${bill.bill_id}: ${err instanceof Error ? err.message : String(err)}`);
        }

        records.push({
          billId: bill.bill_id,
          billNumber: bill.number,
          title: bill.title ?? 'No record on file',
          summary: description || undefined,
          statusDate: bill.status_date ?? 'No record on file',
          billStatus,
          currentBody: currentBody || undefined,
          state: 'FL',
          source: LEGISCAN_SOURCE,
          asOf,
          legiscanUrl: `https://legiscan.com/FL/bill/${bill.bill_id}`,
        });
      }

      if (listLimit > detailLimit) {
        for (const bill of list.slice(detailLimit)) {
          records.push({
            billId: bill.bill_id,
            billNumber: bill.number,
            title: bill.title ?? 'No record on file',
            statusDate: bill.status_date ?? 'No record on file',
            state: 'FL',
            source: LEGISCAN_SOURCE,
            asOf,
            legiscanUrl: `https://legiscan.com/FL/bill/${bill.bill_id}`,
          });
        }
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const withSummary = records.filter((r) => typeof r.summary === 'string' && r.summary).length;
  const fetchedLive = errors.length === 0 && records.length > 0;

  // On failure (or empty result), write a non-live payload so preserve-on-failure keeps the sample.
  const payload = fetchedLive
    ? {
        meta: {
          source: LEGISCAN_SOURCE,
          asOf,
          fetchedAt,
          count: records.length,
          stateCode: 'FL' as const,
          fetchedLive: true,
          provenance: 'fetched-live' as const,
          datasetUrl: 'https://api.legiscan.com/',
          note: `Florida legislation (detail --limit ${detailLimit}, list --list-limit ${listLimit}). ${withSummary}/${Math.min(detailLimit, records.length)} detail rows include LegiScan official description as summary.`,
        },
        records,
      }
    : {
        meta: {
          source: LEGISCAN_SOURCE,
          asOf,
          fetchedAt,
          count: 0,
          stateCode: 'FL' as const,
          fetchedLive: false,
          provenance: 'honest-gap' as const,
          errors: errors.length ? errors : ['LegiScan returned no bills'],
          datasetUrl: 'https://api.legiscan.com/',
          note: 'Fetch failed or empty — prior fetched-live sample preserved when present (Wave-1 / core-rules §6).',
        },
        records: [] as Array<Record<string, unknown>>,
      };

  const { action, outFile } = await writeFloridaSnapshotPreservingLive('legiscan', 'florida-legislation.json', payload);

  if (action === 'preserved-prior') {
    console.warn(
      `Preserved prior fetched-live ${outFile} — refused to overwrite 10-bill (or larger) sample after errors: ${errors.join('; ') || 'empty'}`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Wrote ${outFile} (${records.length} records, ${withSummary}/${detailLimit} with description summary, fetchedLive=${fetchedLive})`,
    );
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
