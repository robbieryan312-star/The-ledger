/**
 * Display-layer formatting for MERIC cost-of-living period strings.
 * Raw provenance strings stay in data; UI shows compact quarter labels.
 */

const QUARTER_MAP: Array<{ re: RegExp; q: string }> = [
  { re: /first\s+quarter/i, q: 'Q1' },
  { re: /second\s+quarter/i, q: 'Q2' },
  { re: /third\s+quarter/i, q: 'Q3' },
  { re: /fourth\s+quarter/i, q: 'Q4' },
];

/** "Cost of Living-First Quarter 2026" → "Q1 2026" */
export function formatMericPeriodDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  const year = raw.match(/\b(20\d{2})\b/)?.[1];
  for (const { re, q } of QUARTER_MAP) {
    if (re.test(raw)) {
      return year ? `${q} ${year}` : q;
    }
  }
  return raw.trim();
}
