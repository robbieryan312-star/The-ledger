/**
 * Strip CREC floor-speech openers for UI display only.
 * Raw `title` on stored statements stays verbatim for integrity guards.
 *
 * Thin wrappers over the shared displaySummary module — kept for the many existing
 * `statementDisplayText`/`stripCrecFloorOpener` call sites.
 */
import { clean } from '@/lib/displaySummary';

export function stripCrecFloorOpener(text: string): string {
  return clean(text);
}

/** Display text for a CREC or media statement — never mutates stored verbatim title. */
export function statementDisplayText(entry: { title: string; displayText?: string }): string {
  if (entry.displayText?.trim()) return clean(entry.displayText);
  return clean(entry.title);
}
