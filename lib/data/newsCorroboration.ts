/**
 * News corroboration — mark items verified when 2+ INDEPENDENT approved outlets
 * report the same event. Near-identical (syndicated) headlines are NOT independent.
 */
import type { NewsItem } from '../types';
import {
  isNearDuplicateHeadline,
  isWireServiceOutlet,
  normalizeUrlForDedupe,
} from './sourceIntegrity';

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'with', 'as', 'by',
  'at', 'from', 'into', 'over', 'after', 'before', 'about', 'its', 'his', 'her',
  'their', 'new', 'says', 'said',
]);

function independentOutletKey(item: NewsItem): string {
  return item.source.name.trim().toLowerCase();
}

function significantTokens(headline: string): Set<string> {
  return new Set(
    headline
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 3 && !STOP.has(t)),
  );
}

function sharedSignificantTokenCount(a: string, b: string): number {
  const A = significantTokens(a);
  const B = significantTokens(b);
  let n = 0;
  for (const t of A) if (B.has(t)) n += 1;
  return n;
}

/** Syndicated / wire republish — near-identical headline (or same URL). */
export function isSyndicatedRepublish(a: NewsItem, b: NewsItem): boolean {
  if (normalizeUrlForDedupe(a.url ?? '') === normalizeUrlForDedupe(b.url ?? '')) return true;
  if (isNearDuplicateHeadline(a.headline, b.headline)) return true;
  if (
    isWireServiceOutlet(a.url) &&
    isWireServiceOutlet(b.url) &&
    isNearDuplicateHeadline(a.headline, b.headline)
  ) {
    return true;
  }
  return false;
}

/**
 * Distinct independent reporting of the same event:
 * different outlets, NOT syndicated near-dup headlines, ≥2 shared significant tokens.
 */
export function isIndependentSameEventReporting(a: NewsItem, b: NewsItem): boolean {
  if (independentOutletKey(a) === independentOutletKey(b)) return false;
  if (isSyndicatedRepublish(a, b)) return false;
  return sharedSignificantTokenCount(a.headline, b.headline) >= 2;
}

function countIndependentCorroborators(item: NewsItem, pool: NewsItem[]): number {
  const keys = new Set<string>();
  for (const other of pool) {
    if (!isIndependentSameEventReporting(item, other)) continue;
    keys.add(independentOutletKey(other));
  }
  return keys.size;
}

/** Set isVerified when ≥1 other independent outlet corroborates the same event. */
export function applyNewsCorroboration(items: NewsItem[]): NewsItem[] {
  return items.map((item) => {
    const corroborators = countIndependentCorroborators(item, items);
    return {
      ...item,
      isVerified: corroborators >= 1,
    };
  });
}
