/**
 * NewsAPI Florida political coverage.
 * Output: data/florida/news/florida-coverage.json
 */
import { loadEnvLocal, writeFloridaSnapshotPreservingLive } from '../../lib/ingest-utils';

const NEWSAPI_SOURCE = {
  name: 'NewsAPI',
  url: 'https://newsapi.org',
  tier: 'media' as const,
  description: 'News headlines via newsapi.org — Tier 3 journalism; flagged when used alone',
};

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = process.env.NEWSAPI_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  if (!key) {
    const { action, outFile } = await writeFloridaSnapshotPreservingLive('news', 'florida-coverage.json', {
      meta: {
        source: NEWSAPI_SOURCE,
        asOf,
        count: 0,
        stateCode: 'FL',
        fetchedLive: false,
        errors: ['NEWSAPI_KEY not configured'],
        note: 'No record on file — API key required. Register at newsapi.org/register',
      },
      records: [],
    });
    console.warn(
      action === 'preserved-prior'
        ? `Preserved prior fetched-live ${outFile} — NEWSAPI_KEY missing`
        : `Wrote empty ${outFile} — NEWSAPI_KEY missing`,
    );
    return;
  }

  try {
    const q = encodeURIComponent('Florida AND (Congress OR Senate OR Governor OR legislation)');
    const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=50&apiKey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      articles?: Array<{
        title?: string;
        description?: string;
        url?: string;
        publishedAt?: string;
        source?: { name?: string };
      }>;
    };

    for (const article of data.articles ?? []) {
      records.push({
        title: article.title ?? 'No record on file',
        description: article.description ?? 'No record on file',
        url: article.url ?? 'No record on file',
        publishedAt: article.publishedAt ?? 'No record on file',
        outlet: article.source?.name ?? 'No record on file',
        source: { ...NEWSAPI_SOURCE, tier: 'media' as const },
        asOf,
        tierFlag: 'Tier 3 journalism — corroborate with official records',
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const { action, outFile } = await writeFloridaSnapshotPreservingLive('news', 'florida-coverage.json', {
    meta: {
      source: NEWSAPI_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://newsapi.org/v2/everything',
      note: 'Tier 3 journalism — always corroborate with Tier 1/2 sources before presenting as fact.',
    },
    records,
  });

  if (action === 'preserved-prior') {
    console.warn(`Preserved prior fetched-live ${outFile} — refused to overwrite with ${records.length} records after errors`);
    process.exitCode = 1;
  } else {
    console.log(`Wrote ${outFile} (${records.length} records)`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
