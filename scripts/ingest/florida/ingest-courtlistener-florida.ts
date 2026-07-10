/**
 * CourtListener (Free Law Project) — recent Supreme Court of Florida opinions.
 * Output: data/florida/courts/florida-court-opinions.json
 *
 * Presents verbatim CourtListener metadata fields only (syllabus, headnotes, etc.).
 * Never extractive-summarizes opinion body text or snippets.
 *
 * Usage:
 *   npm run ingest:courts-fl -- --limit 10   # small verified sample (recommended first)
 */
import { fetchJson, loadEnvLocal, sleep, writeFloridaSnapshot } from '../../lib/ingest-utils';
import { fetchClusterDetail } from '../../lib/courtListenerDetail';
import {
  courtSummaryFallbackHeadline,
  pickCourtSourceText,
} from '../../lib/courtListenerSummary';

const CL_SOURCE = {
  name: 'CourtListener (Free Law Project)',
  url: 'https://www.courtlistener.com',
  tier: 'nonpartisan' as const,
  description: 'Nonpartisan Free Law Project legal database; opinions are official court records',
};

const DEFAULT_RECORD_LIMIT = 60;
const SEARCH_PAGE_SIZE = 20;

interface CLSearch {
  count: number;
  next: string | null;
  results: Array<{
    absolute_url?: string;
    caseName?: string;
    court?: string;
    court_id?: string;
    cluster_id?: number;
    dateFiled?: string;
    docketNumber?: string;
    status?: string;
    citation?: string[];
    syllabus?: string;
    posture?: string;
    procedural_history?: string;
    opinions?: Array<{ id?: number; snippet?: string }>;
  }>;
}

function parseLimitArg(argv: string[]): number {
  const idx = argv.indexOf('--limit');
  if (idx === -1) return DEFAULT_RECORD_LIMIT;
  const n = Number.parseInt(argv[idx + 1] ?? '', 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error('--limit requires a positive integer');
  }
  return n;
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const recordLimit = parseLimitArg(process.argv.slice(2));
  const clToken = process.env.COURTLISTENER_API_KEY?.trim();
  const detailEnrichment = Boolean(clToken);

  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];
  let withSourceText = 0;
  let fallback = 0;

  try {
    let url: string | null =
      `https://www.courtlistener.com/api/rest/v4/search/?type=o&court=fla&order_by=dateFiled%20desc&page_size=${SEARCH_PAGE_SIZE}`;
    while (url && records.length < recordLimit) {
      const data: CLSearch = await fetchJson<CLSearch>(url);
      for (const r of data.results ?? []) {
        if (records.length >= recordLimit) break;

        const caseName = r.caseName ?? 'No record on file';
        const status = r.status ?? 'No record on file';
        const opinionId = r.opinions?.[0]?.id;
        const clusterId = r.cluster_id;

        let clusterDetail;
        if (detailEnrichment && clusterId) {
          try {
            clusterDetail = await fetchClusterDetail(clusterId, clToken!);
            await sleep(250);
          } catch (err) {
            errors.push(
              `cluster ${clusterId}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        const { sourceText, sourceField } = pickCourtSourceText(r, { cluster: clusterDetail });
        if (sourceText && sourceField) withSourceText += 1;
        else fallback += 1;

        records.push({
          caseName,
          court: r.court ?? 'Supreme Court of Florida',
          dateFiled: r.dateFiled ?? 'No record on file',
          docketNumber: r.docketNumber ?? 'No record on file',
          citation: Array.isArray(r.citation) ? r.citation : [],
          status,
          summary: sourceText ?? undefined,
          summarySource: sourceField ?? undefined,
          summaryFallback: sourceText ? undefined : courtSummaryFallbackHeadline(caseName, status),
          clusterId: clusterId ?? undefined,
          opinionId: opinionId ?? undefined,
          source: { ...CL_SOURCE, date: r.dateFiled },
          asOf,
          opinionUrl: r.absolute_url
            ? `https://www.courtlistener.com${r.absolute_url}`
            : 'https://www.courtlistener.com',
        });
      }
      url = data.next ?? null;
      if (url) await sleep(400);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const detailNote = detailEnrichment
    ? 'cluster detail enrichment ON'
    : 'COURTLISTENER_API_KEY missing — cluster detail skipped';
  const out = await writeFloridaSnapshot('courts', 'florida-court-opinions.json', {
    meta: {
      source: CL_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://www.courtlistener.com/api/rest/v4/search/?type=o&court=fla',
      note: `Supreme Court of Florida (${recordLimit} cap). ${withSourceText}/${records.length} records include verbatim CourtListener metadata; ${fallback} show case title + status only. ${detailNote}.`,
    },
    records,
  });

  console.log(
    `Wrote ${out} (${records.length} records, ${withSourceText} with verbatim source field, ${fallback} fallback, detail=${detailEnrichment})`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
