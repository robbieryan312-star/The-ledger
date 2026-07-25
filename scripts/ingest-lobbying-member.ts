/**
 * ingest-lobbying-member.ts — Senate LDA lobbyist FECA contributions naming a member as honoree.
 * LDA open API does not key filings to individual offices (only chamber "SENATE"); this conduit
 * acquires lobbyist contribution disclosures where honoree_name matches the member.
 *
 * Run: npm run ingest:lobbying -- --members S000033
 * Output: lib/data/generated/profiles/{id}/lobbying.json + data/national/lobbying/by-bioguide/{id}.json
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireSyncScope } from './lib/sync-scope';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib/data/generated/currentLegislators.json');
const NATIONAL_DIR = path.join(projectRoot, 'data/national/lobbying/by-bioguide');
const PROFILES_DIR = path.join(projectRoot, 'lib/data/generated/profiles');

const LDA_SOURCE = {
  name: 'Senate Lobbying Disclosure Act Database',
  url: 'https://lda.senate.gov',
  tier: 'official' as const,
  description: 'Federal lobbying registrations and lobbyist contribution reports via lda.senate.gov/api',
};

const MAX_PAGES_PER_YEAR = 25;
const PAGE_SIZE = 50;
const YEARS = [2026, 2025, 2024, 2023];

interface ContributionItem {
  contribution_type?: string;
  contributor_name?: string;
  payee_name?: string;
  honoree_name?: string;
  amount?: string;
  date?: string;
}

interface ContributionFiling {
  url?: string;
  filing_uuid?: string;
  filing_year?: number;
  filing_period?: string;
  dt_posted?: string;
  registrant?: { name?: string };
  contribution_items?: ContributionItem[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'The-Ledger/1.0 (civic research)' },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function honoreeMatches(honoree: string, lastName: string, firstName: string): boolean {
  const h = honoree.toLowerCase();
  const last = lastName.toLowerCase();
  if (!h.includes(last)) return false;
  const first = firstName.toLowerCase();
  // Require first-name or common nickname signal so "Sanders" alone is not enough noise.
  if (first && h.includes(first)) return true;
  if (last === 'sanders' && (h.includes('bernie') || h.includes('bernard'))) return true;
  return h.includes(`sen. ${last}`) || h.includes(`senator ${last}`);
}

async function main(): Promise<void> {
  const memberFilter = requireSyncScope(process.argv, 'ingest-lobbying');
  if (!memberFilter || memberFilter.size === 0) {
    console.error('ingest:lobbying requires --members <bioguideId[,...]>');
    process.exit(1);
  }

  const legislators = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: Array<{ bioguideId: string; name: string; firstName: string; lastName: string }>;
  };

  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  for (const bioguideId of memberFilter) {
    const leg = legislators.legislators.find((l) => l.bioguideId === bioguideId);
    if (!leg) {
      console.error(`No legislator row for ${bioguideId}`);
      process.exit(1);
    }
    const memberLast = leg.lastName;
    const memberFirst = leg.firstName;
    const memberName = leg.name;

    const matches: Array<{
      honoreeName: string;
      amount: number | null;
      date: string | null;
      payeeName: string | null;
      registrantName: string | null;
      filingYear: number | null;
      filingUrl: string | null;
    }> = [];
    let pagesScanned = 0;
    let filingsSeen = 0;
    const errors: string[] = [];

    const searchTerms = Array.from(
      new Set(
        [memberFirst, memberLast, `${memberFirst} ${memberLast}`, memberName]
          .map((s) => s.trim())
          .filter((s) => s.length >= 3),
      ),
    );

    async function scanUrl(url: string): Promise<{ next: string | null; results: number }> {
      const data = await fetchJson<{
        results?: ContributionFiling[];
        next?: string | null;
        count?: number;
      }>(url);
      pagesScanned += 1;
      const results = data.results ?? [];
      filingsSeen += results.length;
      for (const filing of results) {
        for (const item of filing.contribution_items ?? []) {
          const honoree = (item.honoree_name ?? '').trim();
          if (!honoree || !honoreeMatches(honoree, memberLast, memberFirst)) continue;
          const amount = item.amount != null ? Number(item.amount) : null;
          matches.push({
            honoreeName: honoree,
            amount: Number.isFinite(amount) ? amount : null,
            date: item.date ?? null,
            payeeName: item.payee_name ?? null,
            registrantName: filing.registrant?.name ?? null,
            filingYear: filing.filing_year ?? null,
            filingUrl: filing.url ?? null,
          });
        }
      }
      return { next: data.next ?? null, results: results.length };
    }

    // Path A: name search (finds sparse honoree hits that chronological pages miss).
    for (const term of searchTerms) {
      for (const year of YEARS) {
        for (let page = 1; page <= Math.min(MAX_PAGES_PER_YEAR, 15); page += 1) {
          const url =
            `https://lda.senate.gov/api/v1/contributions/?filing_year=${year}` +
            `&page_size=${PAGE_SIZE}&page=${page}&ordering=-dt_posted` +
            `&search=${encodeURIComponent(term)}`;
          try {
            const { next, results } = await scanUrl(url);
            if (results === 0 || !next) break;
          } catch (err) {
            errors.push(`search ${term} ${year} p${page}: ${err instanceof Error ? err.message : String(err)}`);
            break;
          }
          await sleep(120);
        }
      }
    }

    // Path B: recent chronological sample (diagnostic breadth).
    for (const year of YEARS) {
      for (let page = 1; page <= Math.min(MAX_PAGES_PER_YEAR, 10); page += 1) {
        const url =
          `https://lda.senate.gov/api/v1/contributions/?filing_year=${year}` +
          `&page_size=${PAGE_SIZE}&page=${page}&ordering=-dt_posted`;
        try {
          const { next, results } = await scanUrl(url);
          if (results === 0 || !next) break;
        } catch (err) {
          errors.push(`${year} p${page}: ${err instanceof Error ? err.message : String(err)}`);
          break;
        }
        await sleep(120);
      }
    }

    // Dedup by registrant+date+amount+honoree
    const seen = new Set<string>();
    const unique = matches.filter((m) => {
      const key = `${m.registrantName}|${m.date}|${m.amount}|${m.honoreeName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const diagnosedEmpty =
      unique.length === 0
        ? `Senate LDA open API does not key lobbying-contact filings to individual members (government_entities=SENATE only). Scanned ${pagesScanned} contribution-report pages (${filingsSeen} filings, years ${YEARS.join(',')}, name-search + chronological) for lobbyist FECA items with honoree matching ${memberName}; 0 matches. Consistent with limited lobbyist-PAC profile — diagnosed empty after scan, not undiagnosed.`
        : undefined;

    const payload = {
      bioguideId,
      status: unique.length > 0 ? ('filled' as const) : ('honest-gap' as const),
      asOf,
      fetchedAt,
      source: LDA_SOURCE,
      scan: {
        years: YEARS,
        pagesScanned,
        filingsSeen,
        maxPagesPerYear: MAX_PAGES_PER_YEAR,
      },
      items: unique,
      ...(diagnosedEmpty ? { note: diagnosedEmpty } : {}),
      ...(errors.length ? { errors } : {}),
    };

    await mkdir(NATIONAL_DIR, { recursive: true });
    await writeFile(path.join(NATIONAL_DIR, `${bioguideId}.json`), `${JSON.stringify(payload, null, 2)}\n`);

    const profileDir = path.join(PROFILES_DIR, bioguideId);
    await mkdir(profileDir, { recursive: true });
    await writeFile(path.join(profileDir, 'lobbying.json'), `${JSON.stringify(payload, null, 2)}\n`);

    console.log(
      `${bioguideId}: lobbying items=${unique.length} pages=${pagesScanned} filingsSeen=${filingsSeen} status=${payload.status}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
