/**
 * CREC floor-speech opener regex — shared by the sync pipeline
 * (scripts/sync-topic-positions.ts) and the fixture regression test
 * (scripts/__tests__/crecProceduralFilter.test.ts).
 *
 * A genuine "Said" floor remark opens with the member's OWN honorific + surname, then an
 * address to the chair, e.g. "Mrs. RADEWAGEN. Mr. Speaker, ..." or "Mr. SANDERS. Mr.
 * President, ...". The speaker's honorific varies by gender (Mr./Mrs./Ms./Miss) — accepting
 * only "Mr." silently excluded every female member (§6 failure ≠ absence). The address to the
 * chair stays Mr./Madam. Applied uniformly to BOTH chambers.
 */
export function crecFloorSpeechOpenerRegex(lastName: string): RegExp {
  const escaped = lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?:Mr|Mrs|Ms|Miss)\\.\\s+${escaped}\\.\\s+(?:Mr\\.|Madam)\\s+(?:President|Speaker)\\b`,
    'i',
  );
}
