/**
 * Pick verbatim CourtListener metadata for court opinion display.
 * Only official cluster/search fields — never extractive snippet or plain_text summarization.
 */
import type { ClusterDetail } from './courtListenerDetail';

export type CourtSourceField =
  | 'syllabus'
  | 'headnotes'
  | 'summary'
  | 'disposition'
  | 'posture'
  | 'procedural_history';

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

export function pickCourtSourceText(
  searchResult: CourtListenerSearchResult,
  extras?: { cluster?: ClusterDetail },
): { sourceText: string | null; sourceField: CourtSourceField | null } {
  const cluster = extras?.cluster;
  const candidates: Array<[string | undefined, CourtSourceField]> = [
    [searchResult.syllabus || cluster?.syllabus, 'syllabus'],
    [cluster?.headnotes, 'headnotes'],
    [cluster?.summary, 'summary'],
    [cluster?.disposition, 'disposition'],
    [searchResult.posture || cluster?.posture, 'posture'],
    [searchResult.procedural_history || cluster?.procedural_history, 'procedural_history'],
  ];

  for (const [value, field] of candidates) {
    const text = (value ?? '').trim();
    if (text) return { sourceText: text, sourceField: field };
  }

  return { sourceText: null, sourceField: null };
}

/** @deprecated Use pickCourtSourceText */
export function extractCourtSummary(
  searchResult: CourtListenerSearchResult,
  extras?: { cluster?: ClusterDetail },
): { summary: string | null; summarySource: CourtSourceField | null } {
  const { sourceText, sourceField } = pickCourtSourceText(searchResult, extras);
  return { summary: sourceText, summarySource: sourceField };
}

/** @deprecated Use pickCourtSourceText */
export function extractCourtSummaryFromSearchResult(
  result: CourtListenerSearchResult,
): { summary: string | null; summarySource: CourtSourceField | null } {
  return extractCourtSummary(result);
}

export function courtSummaryFallbackHeadline(caseName: string, status: string): string {
  const name = caseName.trim() || 'No verified record available';
  const stat = status.trim();
  if (stat && stat !== 'No record on file') {
    return `${name} — ${stat}`;
  }
  return name;
}
