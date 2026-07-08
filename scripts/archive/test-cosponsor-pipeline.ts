import { loadEnvLocal } from './lib/ingest-utils';
import { fetchCosponsoredLegislation } from './ingest-member-deep';
import { RECORD_TOPIC_BUCKETS } from '../lib/data/profileRecordByTopic';

const MAX = 50;

function emptyByTopic() {
  const out: Record<string, { sponsored: never[]; cosponsored: unknown[] }> = {};
  for (const b of RECORD_TOPIC_BUCKETS) out[b.id] = { sponsored: [], cosponsored: [] };
  return out;
}

function sortByDateDesc<T extends { introducedDate: string }>(bills: T[]): T[] {
  return [...bills].sort(
    (a, b) => new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime(),
  );
}

function limitCosponsoredPerTopic(byTopic: Record<string, { cosponsored: unknown[] }>) {
  for (const b of RECORD_TOPIC_BUCKETS) {
    byTopic[b.id].cosponsored = sortByDateDesc(
      byTopic[b.id].cosponsored as { introducedDate: string }[],
    ).slice(0, MAX);
  }
}

async function main() {
  await loadEnvLocal();
  const key = process.env.CONGRESS_API_KEY!.trim();
  const { bills, pagesFetched, earlyStopped } = await fetchCosponsoredLegislation('K000009', key);
  const has238 = bills.some((b) => b.type === 'HRES' && b.billNumber === '238' && b.congress === 119);
  console.log({ pagesFetched, earlyStopped, billCount: bills.length, has238InMapped: has238 });

  const byTopic = emptyByTopic();
  for (const bill of bills) byTopic[bill.topicId]?.cosponsored.push(bill);
  limitCosponsoredPerTopic(byTopic);

  const abort = byTopic.abortion.cosponsored as Array<{ url: string; introducedDate: string }>;
  console.log('abortion kept', abort.length, 'newest', abort[0]?.introducedDate, abort[0]?.url);
  console.log('has238InOutput', abort.some((b) => b.url.includes('house-resolution/238')));
}

main().catch(console.error);
