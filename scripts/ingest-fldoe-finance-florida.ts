/**
 * Florida Division of Elections — campaign contributions (Tier 1 official, public record).
 * Output: data/fldoe/florida-contributions.json
 *
 * Source data is the official FL Campaign Finance Database. Its export endpoint
 * (cgi-bin/contrib.exe) blocks non-browser requests, so the raw tab-delimited
 * export is captured via the public search form in a real browser session and
 * committed to data/fldoe/_raw-contributions.tsv. This script normalizes that
 * raw export into the standard snapshot shape (reproducible offline). Refreshing
 * the raw file requires a browser session — see the data-refresh notes.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot, writeFloridaSnapshot } from './lib/ingest-utils';

const FLDOE_SOURCE = {
  name: 'Florida Division of Elections',
  url: 'https://dos.elections.myflorida.com/campaign-finance/contributions/',
  tier: 'official' as const,
  description: 'Official Florida campaign contribution disclosures (Campaign Finance Database)',
};

const TYPE_LABELS: Record<string, string> = {
  CHE: 'Check', CAS: 'Cash', LOA: 'Loan', INK: 'In-kind', CRE: 'Credit card',
  MON: 'Money order', OTH: 'Other', REF: 'Refund', TRA: 'Transfer', INT: 'Interest', DIS: 'Distribution',
};

const OFFICE_LABELS: Record<string, string> = {
  STR: 'State Representative', STS: 'State Senator', GOV: 'Governor', LTG: 'Lieutenant Governor',
  ATG: 'Attorney General', CFO: 'Chief Financial Officer', COM: 'Commissioner of Agriculture',
  CTJ: 'County Judge', CCJ: 'Circuit Judge', SCJ: 'Supreme Court Justice', SBE: 'State Board of Education',
  CCE: 'County Commissioner', SCH: 'School Board', SHF: 'Sheriff', CLK: 'Clerk of Court',
  PSC: 'Public Service Commission', USR: 'U.S. Representative', USS: 'U.S. Senator',
};

function parseRecipient(s: string): { name: string; party: string | null; office: string | null } {
  const parens = [...s.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
  const name = s.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  return { name: name || 'No record on file', party: parens[0] ?? null, office: parens[1] ?? null };
}

function toIso(d: string): string {
  const m = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : (d || 'No record on file');
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  try {
    const raw = await readFile(path.join(projectRoot, 'data/fldoe/_raw-contributions.tsv'), 'utf8');
    const lines = raw.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
    for (const line of lines.slice(1)) {
      const c = line.split('\t');
      if (c.length < 5) continue;
      const recip = parseRecipient(c[0] ?? '');
      records.push({
        recipient: recip.name,
        recipientParty: recip.party,
        recipientOffice: recip.office ? (OFFICE_LABELS[recip.office] ?? recip.office) : null,
        date: toIso(c[1] ?? ''),
        amount: Number((c[2] ?? '').replace(/[^0-9.]/g, '')) || 0,
        contributionType: TYPE_LABELS[(c[3] ?? '').trim()] ?? ((c[3] ?? '').trim() || 'Unknown'),
        contributorName: (c[4] ?? '').trim() || 'No record on file',
        contributorCity: (c[6] ?? '').trim() || 'No record on file',
        contributorOccupation: (c[7] ?? '').trim() || 'No record on file',
        source: { ...FLDOE_SOURCE, date: toIso(c[1] ?? '') },
        asOf,
        sourceUrl: FLDOE_SOURCE.url,
      });
    }
    records.sort((a, b) => (b.amount as number) - (a.amount as number));
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('fldoe', 'florida-contributions.json', {
    meta: {
      source: FLDOE_SOURCE,
      asOf,
      fetchedAt,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: FLDOE_SOURCE.url,
      note: 'Florida campaign contributions of $25,000+ filed 2025-01-01 through 2026-06-24, from the official FL Campaign Finance Database (tab-delimited export). Tier 1 official public record. Captured via the public search form; refreshing requires a browser session (the export endpoint blocks non-browser requests).',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
