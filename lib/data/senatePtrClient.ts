/**
 * senatePtrClient.ts — Senate eFD PTR search (Tier 1, no API key).
 * Requires session + CSRF agreement on efdsearch.senate.gov.
 */
import type { Source, StockTrade } from '../types';

export const SENATE_EFD_SOURCE: Source = {
  name: 'Senate Electronic Financial Disclosures',
  url: 'https://efdsearch.senate.gov/search/',
  tier: 'official',
  description: 'STOCK Act periodic transaction reports filed with the U.S. Senate',
};

export interface FeaturedSenateTarget {
  politicianId: string;
  bioguideId?: string;
  lastName: string;
  firstName?: string;
  stateCode: string;
}

export interface SenatePtrReportRef {
  reportId: string;
  firstName: string;
  lastName: string;
  filingDate: string;
  reportUrl: string;
}

export interface SenateSession {
  cookies: string;
  csrfToken: string;
}

const USER_AGENT = 'TheLedger/1.0 (civic research; STOCK Act sync)';

function parseUsDate(mdy: string): string {
  const [m, d, y] = mdy.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

function mergeCookies(existing: string, setCookie: string[] | undefined): string {
  const jar = new Map<string, string>();
  for (const part of existing.split(';').map((s) => s.trim()).filter(Boolean)) {
    const eq = part.indexOf('=');
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
  for (const raw of setCookie ?? []) {
    const pair = raw.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

export async function createSenateEfdSession(): Promise<SenateSession> {
  const home = await fetch('https://efdsearch.senate.gov/search/home/', {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!home.ok) {
    throw new Error(`Senate eFD home unreachable: HTTP ${home.status}`);
  }
  const html = await home.text();
  if (html.includes('Site Under Maintenance')) {
    throw new Error('Senate eFD portal is under maintenance');
  }
  const csrf =
    html.match(/name=['"]csrfmiddlewaretoken['"] value=['"]([^'"]+)['"]/)?.[1] ??
    html.match(/csrfmiddlewaretoken['"] value=['"]([^'"]+)['"]/)?.[1];
  if (!csrf) throw new Error('Senate eFD CSRF token not found');

  let cookies = mergeCookies('', home.headers.getSetCookie?.());
  const agree = await fetch('https://efdsearch.senate.gov/search/home/', {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
      Referer: 'https://efdsearch.senate.gov/search/home/',
    },
    body: `csrfmiddlewaretoken=${encodeURIComponent(csrf)}&prohibition_agreement=1`,
    redirect: 'manual',
  });
  cookies = mergeCookies(cookies, agree.headers.getSetCookie?.());

  const searchPage = await fetch('https://efdsearch.senate.gov/search/', {
    headers: { 'User-Agent': USER_AGENT, Cookie: cookies },
  });
  const searchHtml = await searchPage.text();
  cookies = mergeCookies(cookies, searchPage.headers.getSetCookie?.());
  const csrf2 =
    searchHtml.match(/name=['"]csrfmiddlewaretoken['"] value=['"]([^'"]+)['"]/)?.[1] ?? csrf;

  return { cookies, csrfToken: csrf2 };
}

interface SenateSearchRow {
  first_name?: string;
  last_name?: string;
  ptr_report_id?: string;
  report_id?: string;
  report_uuid?: string;
  filing_date?: string;
  report_type?: string;
  [key: string]: unknown;
}

export async function searchSenatePtrReports(
  session: SenateSession,
  startDate: string,
  endDate: string,
): Promise<SenatePtrReportRef[]> {
  const body = new URLSearchParams({
    csrfmiddlewaretoken: session.csrfToken,
    report_type: '7',
    start_date: startDate,
    end_date: endDate,
    filing_status: '',
    senator: '',
    office_id: '',
    state: '',
  });

  const res = await fetch('https://efdsearch.senate.gov/search/report/data/', {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: session.cookies,
      Referer: 'https://efdsearch.senate.gov/search/',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 503 || text.includes('Site Under Maintenance')) {
      throw new Error('Senate eFD search API under maintenance (HTTP 503)');
    }
    throw new Error(`Senate eFD search failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { data?: SenateSearchRow[] };
  const rows = data.data ?? [];
  return rows
    .map((row) => {
      const reportId = String(row.ptr_report_id ?? row.report_id ?? row.report_uuid ?? '');
      if (!reportId) return null;
      const last = String(row.last_name ?? '');
      const first = String(row.first_name ?? '');
      const filingDate = String(row.filing_date ?? '');
      return {
        reportId,
        firstName: first,
        lastName: last,
        filingDate,
        reportUrl: `https://efdsearch.senate.gov/search/view/report/${reportId}/`,
      } satisfies SenatePtrReportRef;
    })
    .filter((r): r is SenatePtrReportRef => r !== null);
}

function mapSenateTransactionType(value: string): StockTrade['type'] | null {
  const v = value.toLowerCase();
  if (v.includes('purchase')) return 'Purchase';
  if (v.includes('partial')) return 'Partial Sale';
  if (v.includes('sale')) return 'Sale';
  return null;
}

function parseSenateAmountRange(raw: string): { amountMin: number; amountMax: number; amount: number } | null {
  const range = raw.match(/\$([\d,]+)\s*-\s*\$([\d,]+)/);
  if (range) {
    const amountMin = parseInt(range[1].replace(/,/g, ''), 10);
    const amountMax = parseInt(range[2].replace(/,/g, ''), 10);
    return { amountMin, amountMax, amount: Math.round((amountMin + amountMax) / 2) };
  }
  return null;
}

/** Parse Senate PTR view HTML (transaction table). */
export function parseSenatePtrHtml(html: string, report: SenatePtrReportRef, politicianId: string): StockTrade[] {
  const trades: StockTrade[] = [];
  const rowRe =
    /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>/gi;

  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = rowRe.exec(html)) !== null) {
    const asset = match[1]?.trim() ?? '';
    const txTypeRaw = match[2]?.trim() ?? '';
    const txDateRaw = match[3]?.trim() ?? '';
    const disclosureRaw = match[4]?.trim() ?? '';
    const amountRaw = match[5]?.trim() ?? '';
    if (!asset || asset === 'Asset' || asset === 'Transaction Type') continue;

    const tickerMatch = asset.match(/\(([A-Z]{1,6})\)/);
    const ticker = tickerMatch?.[1] ?? asset.slice(0, 12).toUpperCase();
    const txType = mapSenateTransactionType(txTypeRaw);
    const amount = parseSenateAmountRange(amountRaw);
    if (!txType || !amount) continue;

    const tradeDate = txDateRaw.includes('/') ? parseUsDate(txDateRaw) : txDateRaw.slice(0, 10);
    const disclosureDate = disclosureRaw.includes('/')
      ? parseUsDate(disclosureRaw)
      : disclosureRaw.slice(0, 10) || report.filingDate;

    const source: Source = {
      ...SENATE_EFD_SOURCE,
      url: report.reportUrl,
      date: disclosureDate,
      description: `Senate PTR — ${report.lastName}`,
    };

    trades.push({
      id: `senate-ptr-${report.reportId}-${idx}-${ticker}`,
      ticker,
      companyName: asset.replace(/\s*\([^)]+\)\s*/, '').trim() || ticker,
      type: txType,
      amount: amount.amount,
      amountMin: amount.amountMin,
      amountMax: amount.amountMax,
      date: tradeDate,
      disclosureDate,
      daysToDisclose: daysBetween(tradeDate, disclosureDate),
      conflictScore: 12,
      sector: 'Securities',
      source,
    });
    idx += 1;
  }

  return trades;
}

export async function fetchSenatePtrReport(
  session: SenateSession,
  report: SenatePtrReportRef,
  politicianId: string,
): Promise<StockTrade[]> {
  const res = await fetch(report.reportUrl, {
    headers: { 'User-Agent': USER_AGENT, Cookie: session.cookies },
  });
  if (!res.ok) {
    console.warn(`  skip Senate PTR ${report.reportId}: HTTP ${res.status}`);
    return [];
  }
  const html = await res.text();
  return parseSenatePtrHtml(html, report, politicianId);
}

export function matchSenateReportsToTarget(
  reports: SenatePtrReportRef[],
  target: FeaturedSenateTarget,
): SenatePtrReportRef[] {
  const wantLast = target.lastName.toLowerCase();
  return reports.filter((r) => r.lastName.toLowerCase() === wantLast);
}

export async function syncSenatePtrForTarget(
  target: FeaturedSenateTarget,
  options?: { startDate?: string; endDate?: string; maxReports?: number },
): Promise<{ trades: StockTrade[]; sessionOk: boolean; error?: string }> {
  const startDate = options?.startDate ?? '01/01/2024';
  const endDate = options?.endDate ?? new Date().toLocaleDateString('en-US');

  try {
    const session = await createSenateEfdSession();
    const reports = matchSenateReportsToTarget(
      await searchSenatePtrReports(session, startDate, endDate),
      target,
    );
    const limited = options?.maxReports ? reports.slice(0, options.maxReports) : reports;
    const trades: StockTrade[] = [];
    for (const report of limited) {
      trades.push(...(await fetchSenatePtrReport(session, report, target.politicianId)));
    }
    trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { trades, sessionOk: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { trades: [], sessionOk: false, error: message };
  }
}
