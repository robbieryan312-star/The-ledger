/**
 * Strip CREC floor-speech openers for UI display only.
 * Raw `title` on stored statements stays verbatim for integrity guards.
 */
const FLOOR_OPENER_RE =
  /^(?:Mr|Mrs|Ms|Miss)\.\s+[A-Z][A-Za-z'.\-]*(?:\([A-Z]{2}\))?\.\s+(?:Mr\.|Madam)\s+(?:President|Speaker),?\s*/i;

export function stripCrecFloorOpener(text: string): string {
  const trimmed = text.trim();
  if (!FLOOR_OPENER_RE.test(trimmed)) return trimmed;
  return trimmed.replace(FLOOR_OPENER_RE, '').trim();
}

/** Display text for a CREC or media statement — never mutates stored verbatim title. */
export function statementDisplayText(entry: { title: string; displayText?: string; url?: string }): string {
  if (entry.displayText?.trim()) return entry.displayText.trim();
  if (entry.url && /\/CREC-/i.test(entry.url)) {
    return stripCrecFloorOpener(entry.title);
  }
  return entry.title;
}
