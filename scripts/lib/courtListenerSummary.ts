/**
 * Extract sourced plain-language summary from CourtListener v4 search + optional detail.
 * Priority: syllabus → headnotes → summary → disposition → posture → procedural_history
 *           → opinion plain_text (extractive) → search snippet (extractive).
 * Never invents text — returns null when no usable sourced summary exists.
 */
import { leadSummary, trimToWordBoundary } from '../../lib/displaySummary';
import type { ClusterDetail } from './courtListenerDetail';

export type CourtSummarySource =
  | 'syllabus'
  | 'headnotes'
  | 'summary'
  | 'disposition'
  | 'posture'
  | 'procedural_history'
  | 'plain_text'
  | 'snippet';

/** Sources that carry case outcome/holding language from the record (not opening narrative). */
export const HOLDING_LEVEL_SOURCES: ReadonlySet<CourtSummarySource> = new Set([
  'syllabus',
  'headnotes',
  'summary',
  'disposition',
]);

export interface CourtListenerSearchOpinion {
  snippet?: string;
  id?: number;
}

export interface CourtListenerSearchResult {
  caseName?: string;
  status?: string;
  cluster_id?: number;
  syllabus?: string;
  posture?: string;
  procedural_history?: string;
  opinions?: CourtListenerSearchOpinion[];
}

const CAPTION_LINE =
  /^(Supreme Court|No\.|_{3,}|Appellant|Appellee|Petitioner|Respondent|vs\.|PER CURIAM\.?|Lower Tribunal)/i;

function stripCaptionFromSnippet(snippet: string): string {
  const lines = snippet.split('\n').map((l) => l.trim()).filter(Boolean);
  const substantive = lines.filter((line) => {
    if (line.length < 20) return false;
    if (CAPTION_LINE.test(line)) return false;
    if (/^SC20\d{2}[-\s&]/i.test(line)) return false;
    return true;
  });
  if (substantive.length > 0) {
    return substantive.join(' ');
  }
  const flattened = snippet.replace(/\s+/g, ' ').trim();
  const perCuriam = flattened.match(/PER CURIAM\.?\s+(.+)/i);
  if (perCuriam?.[1] && perCuriam[1].length >= 30) {
    return perCuriam[1].trim();
  }
  return flattened;
}

function looksLikeCaptionOnly(text: string): boolean {
  const t = text.trim();
  if (/Appellant,?\s+vs\./i.test(t)) return true;
  if (/Supreme Court of Florida/i.test(t) && /Appellant|Appellee/i.test(t)) return true;
  if (/^No\. SC20\d{2}-\d+/i.test(t)) return true;
  if (/^(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY), [A-Z]+ \d+, \d{4}/i.test(t)) {
    return true;
  }
  if (/^[A-Z][A-Z\s,.'-]{10,},\s+[A-Z][a-z]+ [A-Z][a-z]+,/i.test(t) && t.length < 120) {
    return true;
  }
  return false;
}

function pickSourcedField(
  value: string | undefined,
  source: CourtSummarySource,
  maxLen: number,
): { summary: string; summarySource: CourtSummarySource } | null {
  const text = (value ?? '').trim();
  if (text.length < 20) return null;
  return { summary: trimToWordBoundary(text, maxLen), summarySource: source };
}

function pickExtractiveField(
  value: string | undefined,
  source: 'plain_text' | 'snippet',
  maxLen: number,
): { summary: string; summarySource: CourtSummarySource } | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  const body = stripCaptionFromSnippet(raw);
  const lead = leadSummary(body, maxLen);
  if (lead.length >= 30 && !looksLikeCaptionOnly(lead)) {
    return { summary: lead, summarySource: source };
  }
  return null;
}

export function extractCourtSummary(
  searchResult: CourtListenerSearchResult,
  extras?: { cluster?: ClusterDetail; opinionPlainText?: string },
  maxLen = 220,
): { summary: string | null; summarySource: CourtSummarySource | null } {
  const cluster = extras?.cluster;
  const merged = {
    syllabus: searchResult.syllabus || cluster?.syllabus,
    headnotes: cluster?.headnotes,
    summary: cluster?.summary,
    disposition: cluster?.disposition,
    posture: searchResult.posture || cluster?.posture,
    procedural_history: searchResult.procedural_history || cluster?.procedural_history,
  };

  for (const [value, source] of [
    [merged.syllabus, 'syllabus'],
    [merged.headnotes, 'headnotes'],
    [merged.summary, 'summary'],
    [merged.disposition, 'disposition'],
    [merged.posture, 'posture'],
    [merged.procedural_history, 'procedural_history'],
  ] as const) {
    const picked = pickSourcedField(value, source, maxLen);
    if (picked) return picked;
  }

  const plainText = extras?.opinionPlainText?.trim();
  if (plainText) {
    const fromPlain = pickExtractiveField(plainText, 'plain_text', maxLen);
    if (fromPlain) return fromPlain;
  }

  const snippet = searchResult.opinions?.[0]?.snippet ?? '';
  const fromSnippet = pickExtractiveField(snippet, 'snippet', maxLen);
  if (fromSnippet) return fromSnippet;

  return { summary: null, summarySource: null };
}

/** @deprecated Use extractCourtSummary — kept for tests and search-only callers */
export function extractCourtSummaryFromSearchResult(
  result: CourtListenerSearchResult,
  maxLen = 220,
): { summary: string | null; summarySource: CourtSummarySource | null } {
  return extractCourtSummary(result, undefined, maxLen);
}

export function courtSummaryFallbackHeadline(caseName: string, status: string): string {
  const name = caseName.trim() || 'No verified record available';
  const stat = status.trim();
  if (stat && stat !== 'No record on file') {
    return `${name} — ${stat}`;
  }
  return name;
}

export function isHoldingLevelSummary(source: CourtSummarySource | null | undefined): boolean {
  return source != null && HOLDING_LEVEL_SOURCES.has(source);
}
