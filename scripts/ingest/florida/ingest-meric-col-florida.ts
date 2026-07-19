/**
 * MERIC/C2ER cost-of-living ingest for Florida.
 * Output: data/florida/meric/florida-col-sample.json
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from '../../lib/ingest-utils';

const MERIC_URL = 'https://meric.mo.gov/data/cost-living-data-series';

const MERIC_SOURCE = {
  name: 'Missouri Economic Research and Information Center / C2ER',
  url: MERIC_URL,
  tier: 'nonpartisan' as const,
  description: 'MERIC cost-of-living data series derived from C2ER index data',
};

const EXCLUDED_RANK_GEOGRAPHIES = new Set([
  'district of columbia',
  'puerto rico',
  'united states',
]);

type ParsedTable = {
  period: string;
  headers: string[];
  rows: string[][];
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-');
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function numeric(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[,$%*]/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === 'N/A') return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function extractRows(tableHtml: string): string[][] {
  const rows: string[][] = [];
  for (const tr of tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = [...tr[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
      stripTags(m[1] ?? ''),
    );
    if (cells.some(Boolean)) rows.push(cells);
  }
  return rows;
}

function headingBefore(html: string, tableIndex: number): string {
  const before = html.slice(Math.max(0, tableIndex - 3000), tableIndex);
  const headings = [...before.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map((m) =>
    stripTags(m[1] ?? ''),
  );
  return headings.at(-1) ?? '';
}

function periodFromHeading(heading: string, fallbackText: string): string {
  const source = `${heading} ${fallbackText}`;
  return (
    source.match(/Cost of Living[-\s]*(?:First|Second|Third|Fourth) Quarter \d{4}/i)?.[0] ??
    source.match(/(?:First|Second|Third|Fourth) Quarter \d{4}/i)?.[0] ??
    source.match(/Cost of Living[-\s]*Annual Average \d{4}/i)?.[0] ??
    source.match(/Annual Average \d{4}/i)?.[0] ??
    'Latest available MERIC cost-of-living table'
  );
}

function parseTables(html: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  for (const match of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const rows = extractRows(match[0]);
    if (rows.length < 2) continue;
    const heading = headingBefore(html, match.index ?? 0);
    const headers = rows[0].map((h) => h.trim());
    const period = periodFromHeading(heading, stripTags(html.slice(match.index ?? 0, (match.index ?? 0) + 500)));
    tables.push({ period, headers, rows: rows.slice(1) });
  }
  return tables;
}

function headerIndex(headers: string[], candidates: RegExp[]): number {
  return headers.findIndex((h) => candidates.some((candidate) => candidate.test(h.toLowerCase())));
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const res = await fetch(MERIC_URL, {
    signal: AbortSignal.timeout(60_000),
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });
  const html = await res.text();
  if (!res.ok) throw new Error(`MERIC HTTP ${res.status}: ${html.slice(0, 200)}`);

  const tables = parseTables(html);
  const target =
    tables.find((table) => /Cost of Living-?First Quarter 2026/i.test(table.period)) ??
    tables.find((table) => /Quarter \d{4}/i.test(table.period)) ??
    tables[0];
  if (!target) throw new Error('No MERIC cost-of-living table found');

  const stateIdx = headerIndex(target.headers, [/^state$/, /state name/]);
  const rankIdx = headerIndex(target.headers, [/rank/]);
  const indexIdx = headerIndex(target.headers, [/composite/, /cost of living index/, /^index$/]);
  if (stateIdx < 0 || indexIdx < 0) {
    throw new Error(`MERIC table headers not recognized: ${target.headers.join(' | ')}`);
  }

  const parsedRows = target.rows
    .map((row) => ({
      state: row[stateIdx],
      reportedRank: rankIdx >= 0 ? numeric(row[rankIdx]) : null,
      index: numeric(row[indexIdx]),
      row,
    }))
    .filter((row) => row.state && row.index != null);

  const florida = parsedRows.find((row) => row.state.toLowerCase() === 'florida');
  if (!florida || florida.index == null) {
    throw new Error('Florida row missing from MERIC table');
  }

  const rankUniverse = parsedRows
    .filter((row) => !EXCLUDED_RANK_GEOGRAPHIES.has(row.state.toLowerCase()))
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const rankAmong50 = rankUniverse.findIndex((row) => row.state.toLowerCase() === 'florida') + 1;
  if (rankAmong50 <= 0) throw new Error('Florida missing from MERIC rank universe');

  const components = target.headers
    .map((header, idx) => ({ header, idx }))
    .filter(({ idx }) => idx !== stateIdx && idx !== rankIdx && idx !== indexIdx)
    .map(({ header, idx }) => ({ label: header, index: numeric(florida.row[idx]) }))
    .filter((component): component is { label: string; index: number } => component.index != null);

  const payload = {
    meta: {
      source: MERIC_SOURCE,
      asOf,
      count: 1,
      stateCode: 'FL',
      provenance: 'fetched-live' as const,
      fetchedLive: true,
      fetchedAt: new Date().toISOString(),
      citation: MERIC_URL,
      datasetUrl: MERIC_URL,
      period: target.period,
      note:
        'Rank recomputed among 50 states by ascending all-items index; District of Columbia, Puerto Rico, and United States are excluded from rank-among-50.',
      rankExclusions: [...EXCLUDED_RANK_GEOGRAPHIES],
    },
    state: {
      state: 'Florida',
      period: target.period,
      allItemsIndex: florida.index,
      rankAmong50,
      reportedRank: florida.reportedRank,
      components,
    },
  };

  const dir = path.join(projectRoot, 'data', 'florida', 'meric');
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, 'florida-col-sample.json');
  await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${out} (live=true, index=${florida.index}, rankAmong50=${rankAmong50})`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
