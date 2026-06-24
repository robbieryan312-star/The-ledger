/**
 * USASpending Florida awards (no key).
 * Output: data/spending/florida-contracts.json
 */
import { fetchJson, writeFloridaSnapshot } from './lib/ingest-utils';

const USASPENDING_SOURCE = {
  name: 'USASpending.gov',
  url: 'https://www.usaspending.gov',
  tier: 'official' as const,
  description: 'Official federal spending and contract awards via api.usaspending.gov',
};

interface SpendingResponse {
  results: Array<{
    'Award ID'?: string;
    'Recipient Name'?: string;
    'Award Amount'?: number;
    'Awarding Agency'?: string;
    'Awarding Sub Agency'?: string;
    'Start Date'?: string;
    'End Date'?: string;
    'Place of Performance State Code'?: string;
    'Description'?: string;
  }>;
  page_metadata?: { total: number; page: number; hasNext: boolean };
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);

  const body = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      place_of_performance_locations: [{ country: 'USA', state: 'FL' }],
      time_period: [{ start_date: '2024-01-01', end_date: asOf }],
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Awarding Agency',
      'Awarding Sub Agency',
      'Start Date',
      'End Date',
      'Place of Performance State Code',
      'Description',
    ],
    page: 1,
    limit: 100,
    sort: 'Award Amount',
    order: 'desc',
  };

  const data = await fetchJson<SpendingResponse>(
    'https://api.usaspending.gov/api/v2/search/spending_by_award/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  const records = (data.results ?? []).map((row) => ({
    awardId: row['Award ID'] ?? 'No record on file',
    recipientName: row['Recipient Name'] ?? 'No record on file',
    awardAmount: row['Award Amount'] ?? null,
    awardingAgency: row['Awarding Agency'] ?? 'No record on file',
    awardingSubAgency: row['Awarding Sub Agency'] ?? 'No record on file',
    startDate: row['Start Date'] ?? 'No record on file',
    endDate: row['End Date'] ?? 'No record on file',
    placeOfPerformanceState: row['Place of Performance State Code'] ?? 'FL',
    description: row['Description'] ?? 'No record on file',
    source: USASPENDING_SOURCE,
    asOf,
    usaspendingUrl: row['Award ID']
      ? `https://www.usaspending.gov/award/${encodeURIComponent(row['Award ID'])}`
      : undefined,
  }));

  const out = await writeFloridaSnapshot('spending', 'florida-contracts.json', {
    meta: {
      source: USASPENDING_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: true,
      datasetUrl: 'https://api.usaspending.gov/api/v2/search/spending_by_award/',
      note: 'Top 100 federal awards with Florida place of performance, FY2024–present. Tier 1 official.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
