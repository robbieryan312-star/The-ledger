/**
 * Shared HTML-entity decoder for scraped/collected text (Ballotpedia, CREC HTML, GDELT).
 * Single source of truth — sync scripts and the reprocess/backfill pipeline both use this.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'");
}

/** True if raw text still contains an undecoded numeric/named HTML entity. */
export function hasUndecodedHtmlEntity(text: string): boolean {
  return /&#\d+;|&#x[0-9a-f]+;|&(?:quot|lt|gt|nbsp|amp|apos);/i.test(text);
}
