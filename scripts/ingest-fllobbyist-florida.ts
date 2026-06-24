/**
 * Florida Lobbyist Registration — official lobbying firm directory documents (no key).
 * Output: data/fllobbyist/florida-lobbying-firm-directories.json
 *
 * Tier 1 official. The detailed firm rosters and quarterly compensation figures
 * are published only as PDFs (not machine-readable here), so this captures the
 * authoritative document index (year + branch + direct PDF link) with an honest
 * note. Server-rendered HTML, so no browser is required.
 */
import { writeFloridaSnapshot } from './lib/ingest-utils';

const FLLOB_SOURCE = {
  name: 'Florida Lobbyist Registration',
  url: 'https://floridalobbyist.gov',
  tier: 'official' as const,
  description: 'Official Florida legislative & executive branch lobbying firm directories',
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Safari/537.36';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  const pages = [
    { branch: 'Legislative', url: 'https://floridalobbyist.gov/LobbyistInformation/LegislativeFirmDirectory' },
    { branch: 'Executive', url: 'https://floridalobbyist.gov/LobbyistInformation/ExecutiveFirmDirectory' },
  ];

  try {
    for (const p of pages) {
      const html = await fetchHtml(p.url);
      const re = /href=["']?\.\.\/(reports\/lobfirm[le]_(\d{4})\.pdf)["']?[^>]*>\s*([^<]+)</gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        const docUrl = `https://floridalobbyist.gov/${m[1]}`;
        if (seen.has(docUrl)) continue;
        seen.add(docUrl);
        records.push({
          branch: p.branch,
          year: m[2],
          title: m[3].replace(/\s+/g, ' ').trim(),
          format: 'PDF',
          documentUrl: docUrl,
          source: { ...FLLOB_SOURCE, date: `${m[2]}-01-01` },
          asOf,
          sourceUrl: p.url,
        });
      }
    }
    records.sort((a, b) => String(b.year).localeCompare(String(a.year)) || String(a.branch).localeCompare(String(b.branch)));
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('fllobbyist', 'florida-lobbying-firm-directories.json', {
    meta: {
      source: FLLOB_SOURCE,
      asOf,
      fetchedAt,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://floridalobbyist.gov/LobbyistInformation/LegislativeFirmDirectory',
      note: 'Authoritative index of Florida annual lobbying firm directories (Legislative & Executive branches). Detailed firm rosters and quarterly compensation figures are published as PDFs and are not machine-readable in this snapshot — each record links to the official PDF. Tier 1 official.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
