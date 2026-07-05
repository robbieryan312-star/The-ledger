/**
 * housePtrClient.ts — fetch House Clerk STOCK Act PTR index + parse filing PDFs.
 * Tier 1 official source: disclosures-clerk.house.gov (no API key).
 */
import pdf from 'pdf-parse';
import type { Source, StockTrade } from '../types';

export const HOUSE_CLERK_SOURCE: Source = {
  name: 'House Clerk Financial Disclosure',
  url: 'https://disclosures-clerk.house.gov/FinancialDisclosure',
  tier: 'official',
  description: 'STOCK Act periodic transaction reports filed with the U.S. House',
};

export interface HousePtrFiling {
  year: number;
  docId: string;
  lastName: string;
  firstName: string;
  stateDst: string;
  filingDate: string;
  pdfUrl: string;
}

export interface FeaturedHouseTarget {
  politicianId: string;
  bioguideId?: string;
  lastName: string;
  stateCode: string;
  district?: string;
}

const AMOUNT_BOUNDS: [number, number][] = [
  [1, 1000],
  [1001, 15000],
  [15001, 50000],
  [50001, 100000],
  [100001, 250000],
  [250001, 500000],
  [500001, 1000000],
  [1000001, 5000000],
  [5000001, 25000000],
  [25000001, 50000000],
  [50000001, 100000000],
];

function parseAmountRange(raw: string): { amountMin: number; amountMax: number; amount: number } | null {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  const over = cleaned.match(/Over\s+\$([\d,]+)/i);
  if (over) {
    const min = parseInt(over[1].replace(/,/g, ''), 10);
    return { amountMin: min, amountMax: min * 2, amount: Math.round(min * 1.5) };
  }
  const range = cleaned.match(/\$([\d,]+)\s*-\s*\$([\d,]+)/);
  if (range) {
    const amountMin = parseInt(range[1].replace(/,/g, ''), 10);
    const amountMax = parseInt(range[2].replace(/,/g, ''), 10);
    return { amountMin, amountMax, amount: Math.round((amountMin + amountMax) / 2) };
  }
  const single = cleaned.match(/\$([\d,]+)/);
  if (single) {
    const v = parseInt(single[1].replace(/,/g, ''), 10);
    const bound = AMOUNT_BOUNDS.find(([lo, hi]) => v >= lo && v <= hi);
    if (bound) return { amountMin: bound[0], amountMax: bound[1], amount: v };
    return { amountMin: v, amountMax: v, amount: v };
  }
  return null;
}

function parseUsDate(mdy: string): string {
  const [m, d, y] = mdy.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

function mapTransactionType(code: string): StockTrade['type'] | null {
  if (code === 'P') return 'Purchase';
  if (code === 'S') return 'Sale';
  if (code === 'SP' || code === 'PS') return 'Partial Sale';
  return null;
}

function sectorFromAssetCode(code: string): string {
  const map: Record<string, string> = {
    ST: 'Equities',
    CT: 'Cryptocurrency',
    MF: 'Mutual Fund',
    ETF: 'ETF',
    OP: 'Options',
    DB: 'Bonds',
    GS: 'Government Securities',
    O: 'Other',
  };
  return map[code] ?? 'Securities';
}

function stableId(docId: string, idx: number, ticker: string, date: string): string {
  return `house-ptr-${docId}-${idx}-${ticker}-${date}`.replace(/[^a-zA-Z0-9-]/g, '-');
}

/** Parse extracted PDF text into STOCK Act transaction rows. */
export function parseHousePtrPdfText(
  text: string,
  filing: HousePtrFiling,
  politicianId: string,
): StockTrade[] {
  const cleaned = text.replace(/\u0000/g, ' ').replace(/\r/g, '');
  const trades: StockTrade[] = [];

  const rowRe =
    /([PS](?:P)?)(\d{2}\/\d{2}\/\d{4})(\d{2}\/\d{2}\/\d{4})(\$[\d,]+(?:\s*-\s*\$[\d,]+)?|Over\s+\$[\d,]+)/;

  const anchorRe = /\(([^)]+)\)\s*\[([A-Z]{2})\]/g;
  const anchors = [...cleaned.matchAll(anchorRe)];

  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    const start = anchor.index ?? 0;
    const end = i + 1 < anchors.length ? (anchors[i + 1].index ?? cleaned.length) : cleaned.length;
    const chunk = cleaned.slice(start, end).replace(/\s+/g, ' ');

    const ticker = anchor[1].trim();
    const assetCode = anchor[2];
    if (!ticker || ticker.length > 12) continue;

    const nameStart = Math.max(0, start - 160);
    const nameChunk = cleaned.slice(nameStart, start);
    const nameLines = nameChunk
      .split('\n')
      .map((l) => l.replace(/\u0000/g, '').trim())
      .filter(
        (l) =>
          l &&
          !l.includes('Owner') &&
          !l.includes('Transaction') &&
          !l.includes('$200') &&
          !l.startsWith('SP') &&
          !l.startsWith('F ') &&
          !l.startsWith('S O'),
      );
    const companyName =
      nameLines
        .slice(-2)
        .join(' ')
        .replace(/^(SP|S)/, '')
        .replace(/\s+/g, ' ')
        .trim() || ticker;

    const rowMatch = rowRe.exec(chunk);
    if (!rowMatch) continue;

    const txType = mapTransactionType(rowMatch[1]);
    if (!txType) continue;

    const amount = parseAmountRange(rowMatch[4]);
    if (!amount) continue;

    const tradeDate = parseUsDate(rowMatch[2]);
    const disclosureDate = parseUsDate(rowMatch[3]);
    const source: Source = {
      ...HOUSE_CLERK_SOURCE,
      url: filing.pdfUrl,
      date: disclosureDate,
      description: `House PTR filing #${filing.docId} — ${filing.lastName}, ${filing.stateDst}`,
    };

    trades.push({
      id: stableId(filing.docId, trades.length, ticker, tradeDate),
      ticker,
      companyName,
      type: txType,
      amount: amount.amount,
      amountMin: amount.amountMin,
      amountMax: amount.amountMax,
      date: tradeDate,
      disclosureDate,
      daysToDisclose: daysBetween(tradeDate, disclosureDate),
      conflictScore: 12,
      sector: sectorFromAssetCode(assetCode),
      source,
    });
  }

  return trades;
}

function stateDstFor(target: FeaturedHouseTarget): string {
  const districtNum = target.district?.replace(/\D/g, '') ?? '';
  const padded = districtNum.padStart(2, '0');
  return `${target.stateCode}${padded}`;
}

function normalizeLastName(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

/** Parse House Clerk YTD XML index for PTR (FilingType P) rows. */
export function parseHousePtrIndexXml(xml: string, _year: number): HousePtrFiling[] {
  const filings: HousePtrFiling[] = [];
  const memberRe = /<Member>([\s\S]*?)<\/Member>/g;
  let block: RegExpExecArray | null;

  while ((block = memberRe.exec(xml)) !== null) {
    const chunk = block[1];
    if (!chunk.includes('<FilingType>P</FilingType>')) continue;

    const lastName = chunk.match(/<Last>([^<]*)<\/Last>/)?.[1]?.trim() ?? '';
    const firstName = chunk.match(/<First>([^<]*)<\/First>/)?.[1]?.trim() ?? '';
    const stateDst = chunk.match(/<StateDst>([^<]*)<\/StateDst>/)?.[1]?.trim() ?? '';
    const filingYear = parseInt(chunk.match(/<Year>(\d+)<\/Year>/)?.[1] ?? '0', 10);
    const filingDate = chunk.match(/<FilingDate>([^<]*)<\/FilingDate>/)?.[1]?.trim() ?? '';
    const docId = chunk.match(/<DocID>(\d+)<\/DocID>/)?.[1] ?? '';
    if (!lastName || !docId || !filingYear) continue;

    filings.push({
      year: filingYear,
      docId,
      lastName,
      firstName,
      stateDst,
      filingDate,
      pdfUrl: `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${filingYear}/${docId}.pdf`,
    });
  }

  return filings;
}

export function matchFilingsToTarget(
  filings: HousePtrFiling[],
  target: FeaturedHouseTarget,
): HousePtrFiling[] {
  const wantDst = stateDstFor(target);
  const wantLast = normalizeLastName(target.lastName);
  return filings.filter(
    (f) =>
      normalizeLastName(f.lastName) === wantLast &&
      f.stateDst.replace(/\s/g, '').toUpperCase() === wantDst.toUpperCase(),
  );
}

export async function fetchHousePtrIndex(year: number): Promise<HousePtrFiling[]> {
  const url = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.xml`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TheLedger/1.0 (civic research; STOCK Act sync)' },
  });
  if (!res.ok) {
    throw new Error(`House FD index ${year} unreachable: HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseHousePtrIndexXml(xml, year);
}

export async function fetchAndParseHousePtr(
  filing: HousePtrFiling,
  politicianId: string,
): Promise<StockTrade[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(filing.pdfUrl, {
        headers: { 'User-Agent': 'TheLedger/1.0 (civic research; STOCK Act sync)' },
      });
      if (!res.ok) {
        console.warn(`  skip PTR PDF ${filing.docId}: HTTP ${res.status}`);
        return [];
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const parsed = await pdf(buf);
      const trades = parseHousePtrPdfText(parsed.text, filing, politicianId);
      if (trades.length === 0) {
        console.warn(`  no rows parsed from PTR ${filing.docId} (${filing.lastName})`);
      }
      return trades;
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function syncHousePtrForTarget(
  target: FeaturedHouseTarget,
  years: number[],
  options?: { maxFilings?: number; sinceDate?: string },
): Promise<{ trades: StockTrade[]; filingsParsed: number }> {
  const allFilings: HousePtrFiling[] = [];
  for (const year of years) {
    try {
      const index = await fetchHousePtrIndex(year);
      allFilings.push(...matchFilingsToTarget(index, target));
    } catch (err) {
      console.warn(`House index ${year} failed:`, err instanceof Error ? err.message : err);
    }
  }

  let filings = allFilings.sort(
    (a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime(),
  );

  if (options?.sinceDate) {
    const since = new Date(options.sinceDate).getTime();
    filings = filings.filter((f) => {
      const parts = f.filingDate.split('/');
      const iso = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      return new Date(iso).getTime() >= since;
    });
  }

  if (options?.maxFilings) {
    filings = filings.slice(0, options.maxFilings);
  }

  const trades: StockTrade[] = [];
  for (const filing of filings) {
    try {
      const rows = await fetchAndParseHousePtr(filing, target.politicianId);
      trades.push(...rows);
    } catch (err) {
      console.warn(
        `  skip PTR ${filing.docId} (${filing.lastName}):`,
        err instanceof Error ? err.message : err,
      );
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // Newest transaction first
  trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { trades, filingsParsed: filings.length };
}
