/**
 * News corroboration — mark items verified when 2+ independent approved outlets
 * report the same story (near-duplicate headline, distinct outlets, not wire republish).
 */
import type { NewsItem } from '../types';
import { isNearDuplicateHeadline, isWireServiceOutlet, normalizeUrlForDedupe } from './sourceIntegrity';

function independentOutletKey(item: NewsItem): string {
  return item.source.name.trim().toLowerCase();
}

function countIndependentCorroborators(item: NewsItem, pool: NewsItem[]): number {
  const keys = new Set<string>();
  for (const other of pool) {
    if (normalizeUrlForDedupe(other.url ?? '') === normalizeUrlForDedupe(item.url ?? '')) continue;
    if (!isNearDuplicateHeadline(item.headline, other.headline)) continue;
    const key = independentOutletKey(other);
    if (isWireServiceOutlet(item.url ?? '') && isWireServiceOutlet(other.url ?? '')) continue;
    keys.add(key);
  }
  return keys.size;
}

/** Set isVerified when ≥1 other independent outlet corroborates the same story. */
export function applyNewsCorroboration(items: NewsItem[]): NewsItem[] {
  return items.map((item) => {
    const corroborators = countIndependentCorroborators(item, items);
    return {
      ...item,
      isVerified: corroborators >= 1,
    };
  });
}
