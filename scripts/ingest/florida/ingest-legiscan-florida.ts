/**
 * LegiScan Florida legislation.
 * Output: data/florida/legiscan/florida-legislation.json
 *
 * Fetches master list then getBill detail for each bill to capture the official
 * LegiScan `description` field as summary.
 */
import { fetchJson, loadEnvLocal, sleep, writeFloridaSnapshot } from '../../lib/ingest-utils';

const LEGISCAN_SOURCE = {
  name: 'LegiScan',
  url: 'https://legiscan.com',
  tier: 'nonpartisan' as const,
  description: 'State and federal bill tracking via legiscan.com API',
};

const BILL_DETAIL_LIMIT = 30;

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = process.env.LEGISCAN_API_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  if (!key) {
    console.warn('LEGISCAN_API_KEY missing — skipping ingest; existing florida-legislation.json preserved');
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
      const list = Object.values(data.masterlist ?? {}).slice(0, 100);
      const detailTargets = list.slice(0, BILL_DETAIL_LIMIT);

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

      for (const bill of list.slice(BILL_DETAIL_LIMIT)) {
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
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const withSummary = records.filter((r) => typeof r.summary === 'string' && r.summary).length;
  const out = await writeFloridaSnapshot('legiscan', 'florida-legislation.json', {
    meta: {
      source: LEGISCAN_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.legiscan.com/',
      note: `Florida state legislation (up to 100 bills). First ${BILL_DETAIL_LIMIT} include LegiScan official description as summary (${withSummary} with summary).`,
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records, ${withSummary} with description summary)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
