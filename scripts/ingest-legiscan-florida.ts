/**
 * LegiScan Florida legislation.
 * Output: data/legiscan/florida-legislation.json
 */
import { fetchJson, loadEnvLocal, writeFloridaSnapshot } from './lib/ingest-utils';

const LEGISCAN_SOURCE = {
  name: 'LegiScan',
  url: 'https://legiscan.com',
  tier: 'nonpartisan' as const,
  description: 'State and federal bill tracking via legiscan.com API',
};

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = process.env.LEGISCAN_API_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  if (!key) {
    const out = await writeFloridaSnapshot('legiscan', 'florida-legislation.json', {
      meta: {
        source: LEGISCAN_SOURCE,
        asOf,
        count: 0,
        stateCode: 'FL',
        fetchedLive: false,
        errors: ['LEGISCAN_API_KEY not configured'],
        note: 'No record on file — API key required. Register at legiscan.com/legiscan',
      },
      records: [],
    });
    console.warn(`Wrote empty ${out} — LEGISCAN_API_KEY missing`);
    return;
  }

  try {
    const url = `https://api.legiscan.com/?key=${encodeURIComponent(key)}&op=getMasterList&state=FL`;
    const data = await fetchJson<{
      status: string;
      masterlist?: Record<string, { bill_id: number; number: string; title: string; status_date: string }>;
    }>(url);

    if (data.status !== 'OK') {
      errors.push(`LegiScan status: ${data.status}`);
    } else {
      const list = Object.values(data.masterlist ?? {}).slice(0, 100);
      for (const bill of list) {
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

  const out = await writeFloridaSnapshot('legiscan', 'florida-legislation.json', {
    meta: {
      source: LEGISCAN_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.legiscan.com/',
      note: 'Florida state legislation master list (up to 100 bills). Tier 2.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
