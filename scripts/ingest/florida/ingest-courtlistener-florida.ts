/**
 * CourtListener (Free Law Project) — recent Supreme Court of Florida opinions (no key).
 * Output: data/florida/courts/florida-court-opinions.json
 *
 * Tier 2 nonpartisan aggregator; the opinions themselves are official primary
 * court records. Each record is dated and linked to the opinion on CourtListener.
 * Summary field: sourced from syllabus/posture/procedural_history/opinion snippet only.
 */
import { fetchJson, sleep, writeFloridaSnapshot } from '../../lib/ingest-utils';
import {
  courtSummaryFallbackHeadline,
  extractCourtSummaryFromSearchResult,
} from '../../lib/courtListenerSummary';

const CL_SOURCE = {
  name: 'CourtListener (Free Law Project)',
  url: 'https://www.courtlistener.com',
  tier: 'nonpartisan' as const,
  description: 'Nonpartisan Free Law Project legal database; opinions are official court records',
};

interface CLSearch {
  count: number;
  next: string | null;
  results: Array<{
    absolute_url?: string;
    caseName?: string;
    court?: string;
    court_id?: string;
    dateFiled?: string;
    docketNumber?: string;
    status?: string;
    citation?: string[];
    syllabus?: string;
    posture?: string;
    procedural_history?: string;
    opinions?: Array<{ snippet?: string }>;
  }>;
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  try {
    let url: string | null =
      'https://www.courtlistener.com/api/rest/v4/search/?type=o&court=fla&order_by=dateFiled%20desc';
    for (let page = 0; page < 3 && url; page += 1) {
      const data: CLSearch = await fetchJson<CLSearch>(url);
      for (const r of data.results ?? []) {
        const caseName = r.caseName ?? 'No record on file';
        const status = r.status ?? 'No record on file';
        const { summary, summarySource } = extractCourtSummaryFromSearchResult(r);
        records.push({
          caseName,
          court: r.court ?? 'Supreme Court of Florida',
          dateFiled: r.dateFiled ?? 'No record on file',
          docketNumber: r.docketNumber ?? 'No record on file',
          citation: Array.isArray(r.citation) ? r.citation : [],
          status,
          summary: summary ?? undefined,
          summarySource: summarySource ?? undefined,
          summaryFallback: summary ? undefined : courtSummaryFallbackHeadline(caseName, status),
          source: { ...CL_SOURCE, date: r.dateFiled },
          asOf,
          opinionUrl: r.absolute_url
            ? `https://www.courtlistener.com${r.absolute_url}`
            : 'https://www.courtlistener.com',
        });
      }
      url = data.next ?? null;
      await sleep(400);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const withSummary = records.filter((r) => typeof r.summary === 'string').length;
  const out = await writeFloridaSnapshot('courts', 'florida-court-opinions.json', {
    meta: {
      source: CL_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://www.courtlistener.com/api/rest/v4/search/?type=o&court=fla',
      note: `Most recent Supreme Court of Florida opinions (newest-first). ${withSummary}/${records.length} records include a sourced summary (syllabus, posture, or extractive snippet).`,
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records, ${withSummary} with sourced summary)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
