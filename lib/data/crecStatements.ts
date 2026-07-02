/**
 * Shared Congressional Record "Said" eligibility checks.
 *
 * A CREC statement is usable as a Ledger "Said" record only when it is the
 * member's spoken floor remark, not clerk text, roll-call output, or a
 * submission/cosponsor list that happens to include the member's name.
 */

const FLOOR_SPEECH_OPENER_RE =
  /^\s*(?:Mr|Ms|Mrs)\.\s+[A-Z][A-Za-z.'’ -]{1,60}\.\s+(?:Mr\.|Madam)\s+(?:President|Speaker)\b/i;

const PROCEDURAL_CREC_PATTERNS = [
  /submitted an amendment/i,
  /submitted the following (?:concurrent )?resolution/i,
  /introduced the following bill/i,
  /the yeas and nays resulted/i,
  /\bYEAS--\d+/i,
  /\bNAYS--\d+/i,
  /were added as cosponsors/i,
  /were removed as cosponsors/i,
  /names of the Senator/i,
  /necessarily absent/i,
  /At the request of/i,
  /A bill to amend/i,
  /were referred to the Committee/i,
  /which was ordered to lie on the table/i,
  /^\s*(?:Mr|Ms|Mrs)\.\s+[A-Z][A-Za-z.'’ -]+\),/i,
  /^\s*(?:Mr|Ms|Mrs)\.\s+[A-Z][A-Za-z.'’ -]+,\s+(?:Mr|Ms|Mrs)\./i,
];

function normalizeCrecText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isProceduralCrecText(text: string): boolean {
  const normalized = normalizeCrecText(text);
  return PROCEDURAL_CREC_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isCrecFloorSpeechText(text: string): boolean {
  return FLOOR_SPEECH_OPENER_RE.test(normalizeCrecText(text));
}

export function isQualifiedOfficialCrecStatement(text: string): boolean {
  const normalized = normalizeCrecText(text);
  return normalized.length >= 80 && isCrecFloorSpeechText(normalized) && !isProceduralCrecText(normalized);
}
