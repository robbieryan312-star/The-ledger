/**
 * Ceremonial CREC remarks (tributes, recognitions, condolences) may remain in the raw
 * record but must not surface as policy positions in "Where They Stand".
 */
const CEREMONIAL_PATTERNS: RegExp[] = [
  /\bpay tribute\b/i,
  /\brise to (?:a )?(?:recognize|honor)\b/i,
  /\brises? to (?:a )?(?:recognize|honor)\b/i,
  /\bPerson of the Year\b/i,
  /\bcongratulate\b/i,
  /\bmourn(?:ing|s)?\b/i,
  /\bexpress(?:es)? condolences\b/i,
  /\bin recognition of\b/i,
  /\brecognize(?:s|d)? (?:an intern|a constituent|the service of)\b/i,
  /\ban intern in (?:my|his|her|the|our)\b/i,
];

export function isCeremonialCrecRemark(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return CEREMONIAL_PATTERNS.some((re) => re.test(t));
}
