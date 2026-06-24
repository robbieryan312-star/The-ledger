/**
 * build-sources-index.ts — compile every /data/<source>/florida-*.json snapshot
 * into one compact, pre-summarized index for the Records & Sources explorer UI.
 *
 * Output: lib/data/generated/sourcesIndex.json (imported by app/sources/page.tsx).
 * Keeping a small pre-summarized index (vs importing the large raw snapshots) keeps
 * type-checking/bundle lean and is Vercel-safe. Re-run after any /data refresh.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_ROOT = path.join(projectRoot, 'data');
const OUT = path.join(projectRoot, 'lib', 'data', 'generated', 'sourcesIndex.json');
const SAMPLE = 25;

const REGISTRY: Record<string, { label: string; category: string }> = {
  fldoe: { label: 'Florida Campaign Contributions', category: 'Campaign finance' },
  fec: { label: 'Florida Federal Candidates', category: 'Campaign finance' },
  spending: { label: 'Florida Federal Contracts', category: 'Campaign finance' },
  secedgar: { label: 'Florida SEC Filings', category: 'Campaign finance' },
  congress: { label: 'Florida Congressional Votes', category: 'Legislative' },
  legiscan: { label: 'Florida State Legislation', category: 'Legislative' },
  openstates: { label: 'Florida State Legislators', category: 'Legislative' },
  govtrack: { label: 'Florida Members (GovTrack)', category: 'Legislative' },
  govinfo: { label: 'Florida Legislative Documents', category: 'Legislative' },
  voteview: { label: 'Florida Congressional Ideology', category: 'Legislative' },
  fedregister: { label: 'Federal Register — Florida', category: 'Government actions' },
  fara: { label: 'Foreign Agent Registrations', category: 'Government actions' },
  sam: { label: 'Florida Federal Contractors', category: 'Government actions' },
  courts: { label: 'Florida Supreme Court Opinions', category: 'Judiciary' },
  census: { label: 'Florida Demographics (ACS)', category: 'Economic' },
  bls: { label: 'Florida Labor Statistics', category: 'Economic' },
  civic: { label: 'Florida Congressional Districts', category: 'Elections & districts' },
  lobbying: { label: 'Federal Lobbying Disclosures (LDA)', category: 'Lobbying' },
  fllobbyist: { label: 'Florida Lobbying Firm Directories', category: 'Lobbying' },
  news: { label: 'Florida News Coverage (NewsAPI)', category: 'News' },
  gdelt: { label: 'Florida News Coverage (GDELT)', category: 'News' },
};

const TITLE_FIELDS = ['title', 'caseName', 'recipient', 'company', 'indicator', 'registrantName', 'recipientName', 'representative', 'name', 'stateName', 'billNumber', 'awardId', 'documentNumber', 'congressionalDistrict'];
const DATE_FIELDS = ['date', 'dateFiled', 'publicationDate', 'dateIssued', 'statusDate', 'postedDate', 'filingDate', 'publishedAt', 'startDate', 'latestPeriod', 'year', 'activeThrough'];
const LINK_FIELDS = ['opinionUrl', 'documentUrl', 'filingUrl', 'legiscanUrl', 'voteviewUrl', 'govinfoUrl', 'blsUrl', 'openstatesUrl', 'usaspendingUrl', 'fecProfileUrl', 'congressGovUrl', 'ldaUrl', 'profileUrl', 'censusApiUrl', 'censusGeocoderUrl', 'url', 'sourceUrl'];
const SKIP_DETAIL = new Set([...TITLE_FIELDS, ...DATE_FIELDS, ...LINK_FIELDS, 'source', 'asOf', 'tierFlag', 'stateCode']);

function pick(rec: Record<string, unknown>, fields: string[]): string {
  for (const f of fields) {
    const v = rec[f];
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  return '';
}

function detailOf(rec: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(rec)) {
    if (SKIP_DETAIL.has(k)) continue;
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'object') continue;
    let val = String(v);
    if (typeof v === 'number' && /amount|donation|raised|value|income/i.test(k)) {
      val = v >= 1000 ? `$${v.toLocaleString('en-US')}` : `$${v}`;
    }
    parts.push(`${val}`);
    if (parts.length >= 3) break;
  }
  return parts.join(' · ');
}

function summarize(rec: Record<string, unknown>): { title: string; detail: string; date: string; link: string } {
  const source = (rec.source && typeof rec.source === 'object') ? (rec.source as Record<string, unknown>) : {};
  return {
    title: pick(rec, TITLE_FIELDS) || 'Record',
    detail: detailOf(rec),
    date: pick(rec, DATE_FIELDS),
    link: pick(rec, LINK_FIELDS) || String(source.url ?? ''),
  };
}

async function main(): Promise<void> {
  const dirs = await readdir(DATA_ROOT, { withFileTypes: true });
  const sources: unknown[] = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const id = d.name;
    const dirPath = path.join(DATA_ROOT, id);
    const files = (await readdir(dirPath)).filter((f) => f.startsWith('florida-') && f.endsWith('.json'));
    if (files.length === 0) continue;
    const file = files[0];
    let parsed: { meta?: Record<string, unknown>; records?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(await readFile(path.join(dirPath, file), 'utf8'));
    } catch {
      continue;
    }
    const meta = parsed.meta ?? {};
    const records = Array.isArray(parsed.records) ? parsed.records : [];
    const reg = REGISTRY[id] ?? { label: id, category: 'Other' };
    sources.push({
      id,
      label: reg.label,
      category: reg.category,
      file: `data/${id}/${file}`,
      source: meta.source ?? null,
      asOf: meta.asOf ?? null,
      fetchedAt: meta.fetchedAt ?? null,
      fetchedLive: meta.fetchedLive ?? false,
      count: meta.count ?? records.length,
      datasetUrl: meta.datasetUrl ?? null,
      note: meta.note ?? null,
      errors: meta.errors ?? null,
      sample: records.slice(0, SAMPLE).map(summarize),
    });
  }
  sources.sort((a, b) => String((a as { category: string }).category).localeCompare(String((b as { category: string }).category))
    || String((b as { count: number }).count).localeCompare(String((a as { count: number }).count)));

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), sourceCount: sources.length, sources }, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${OUT} (${sources.length} sources)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
