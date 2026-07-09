/**
 * Extract sourced plain-language summary from CourtListener v4 search opinion results.
 * Priority: syllabus → posture → procedural_history → opinion snippet (extractive).
 * Never invents text — returns null when no usable sourced summary exists.
 */
import { leadSummary, trimToWordBoundary } from '../../lib/displaySummary';

export type CourtSummarySource = 'syllabus' | 'posture' | 'procedural_history' | 'snippet';

export interface CourtListenerSearchOpinion {
  snippet?: string;
}

export interface CourtListenerSearchResult {
  caseName?: string;
  status?: string;
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
  return false;
}

export function extractCourtSummaryFromSearchResult(
  result: CourtListenerSearchResult,
  maxLen = 220,
): { summary: string | null; summarySource: CourtSummarySource | null } {
  const syllabus = (result.syllabus ?? '').trim();
  if (syllabus.length >= 20) {
    return { summary: trimToWordBoundary(syllabus, maxLen), summarySource: 'syllabus' };
  }

  const posture = (result.posture ?? '').trim();
  if (posture.length >= 20) {
    return { summary: trimToWordBoundary(posture, maxLen), summarySource: 'posture' };
  }

  const procedural = (result.procedural_history ?? '').trim();
  if (procedural.length >= 20) {
    return { summary: trimToWordBoundary(procedural, maxLen), summarySource: 'procedural_history' };
  }

  const snippet = result.opinions?.[0]?.snippet ?? '';
  if (snippet.trim()) {
    const body = stripCaptionFromSnippet(snippet);
    const lead = leadSummary(body, maxLen);
    if (lead.length >= 30 && !looksLikeCaptionOnly(lead)) {
      return { summary: lead, summarySource: 'snippet' };
    }
  }

  return { summary: null, summarySource: null };
}

export function courtSummaryFallbackHeadline(caseName: string, status: string): string {
  const name = caseName.trim() || 'No verified record available';
  const stat = status.trim();
  if (stat && stat !== 'No record on file') {
    return `${name} — ${stat}`;
  }
  return name;
}
