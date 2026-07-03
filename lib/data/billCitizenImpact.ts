/**
 * Extractive-only "what this means" line for a bill drop-down, derived STRICTLY from the
 * official Congress.gov CRS summary already stored as `TopicRecordExample.billSummary`.
 * Never adds a fact not present in the original summary — only strips generic Congress.gov
 * boilerplate framing so the substantive clause reads plainly.
 */
const BOILERPLATE_PREFIXES: RegExp[] = [
  /^this bill\s+/i,
  /^an original bill to provide\s+/i,
  /^a bill to\s+/i,
  /^an act to\s+/i,
  /^to amend[^,]*(?:act)?\s+to\s+/i,
  /^to\s+/i,
];

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Returns `null` when no official summary is available — callers must render an honest
 * "No official summary available" state rather than fabricate one.
 */
export function citizenImpactFromSummary(billSummary: string | undefined | null): string | null {
  const trimmed = billSummary?.trim();
  if (!trimmed) return null;

  let clause = trimmed;
  for (const re of BOILERPLATE_PREFIXES) {
    const stripped = clause.replace(re, '');
    if (stripped !== clause) {
      clause = stripped;
      break;
    }
  }

  clause = clause.trim();
  if (!clause) return null;
  return capitalize(clause);
}
