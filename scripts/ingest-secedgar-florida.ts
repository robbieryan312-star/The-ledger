/**
 * SEC EDGAR — recent 8-K material-event filings by Florida-located filers (no key).
 * Output: data/secedgar/florida-filings.json
 *
 * Tier 1 official (U.S. SEC). Full-text search filtered to filers whose location
 * is Florida. Each filing dated and linked to the EDGAR filing index. SEC fair-
 * access policy requires a descriptive User-Agent, set on every request.
 */
import { fetchJson, sleep, writeFloridaSnapshot } from './lib/ingest-utils';

const SEC_SOURCE = {
  name: 'SEC EDGAR',
  url: 'https://www.sec.gov/edgar',
  tier: 'official' as const,
  description: 'U.S. Securities and Exchange Commission EDGAR full-text filing search (efts.sec.gov)',
};

const UA = 'The Ledger civic-data project (contact: robbie.ryan312@gmail.com)';

interface EftsResp {
  hits: {
    total: { value: number };
    hits: Array<{ _id: string; _source: { file_date?: string; file_type?: string; display_names?: string[]; ciks?: string[] } }>;
  };
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];
  const enddt = ymd(new Date());
  const startdt = ymd(new Date(Date.now() - 60 * 86_400_000));

  const seen = new Set<string>();
  try {
    // EDGAR FTS returns up to 100 hits per request; one page is plenty for a snapshot.
    for (let from = 0; from < 100; from += 100) {
      const url = `https://efts.sec.gov/LATEST/search-index?q=&forms=8-K&locationCode=FL&startdt=${startdt}&enddt=${enddt}&from=${from}`;
      const data = await fetchJson<EftsResp>(url, { headers: { 'User-Agent': UA } });
      const hits = data.hits?.hits ?? [];
      if (hits.length === 0) break;
      for (const hit of hits) {
        const s = hit._source;
        const accession = (hit._id ?? '').split(':')[0];
        if (!accession || seen.has(accession)) continue;
        seen.add(accession);
        const dn = (s.display_names ?? [])[0] ?? '';
        const company = dn.replace(/\s*\(CIK.*$/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        const cik = (s.ciks ?? [])[0] ?? '';
        const accNoDash = accession.replace(/-/g, '');
        records.push({
          company: company || dn || 'No record on file',
          formType: s.file_type ?? '8-K',
          filingDate: s.file_date ?? 'No record on file',
          cik,
          accessionNumber: accession,
          source: { ...SEC_SOURCE, date: s.file_date },
          asOf,
          filingUrl: cik && accNoDash
            ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accNoDash}/`
            : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}`,
        });
      }
      await sleep(250);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('secedgar', 'florida-filings.json', {
    meta: {
      source: SEC_SOURCE,
      asOf,
      fetchedAt,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://efts.sec.gov/LATEST/search-index?forms=8-K&locationCode=FL',
      note: 'Recent 8-K material-event filings (last 60 days) by Florida-located SEC filers. Tier 1 official SEC EDGAR.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
