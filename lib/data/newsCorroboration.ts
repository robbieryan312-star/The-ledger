/**
 * News corroboration — mark items verified when 2+ INDEPENDENT approved outlets
 * report the same event. Near-identical (syndicated) headlines are NOT independent.
 * Member-name tokens never count toward the shared-token threshold (name-only overlap
 * across unrelated same-member stories is not corroboration).
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

/** Lowercase significant tokens (≥4 chars, not stopwords) from member display/match names. */
export function tokensFromMemberNames(names: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const name of names) {
    for (const t of name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)) {
      if (t.length > 3 && !STOP.has(t)) out.add(t);
    }
  }
  return out;
}

function significantTokens(headline: string, excludeNameTokens?: Set<string>): Set<string> {
  return new Set(
    headline
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 3 && !STOP.has(t) && !excludeNameTokens?.has(t)),
  );
}

function sharedSignificantTokenCount(
  a: string,
  b: string,
  excludeNameTokens?: Set<string>,
): number {
  const A = significantTokens(a, excludeNameTokens);
  const B = significantTokens(b, excludeNameTokens);
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
 * different outlets, NOT syndicated near-dup headlines,
 * ≥2 shared significant NON-NAME tokens.
 */
export function isIndependentSameEventReporting(
  a: NewsItem,
  b: NewsItem,
  memberNameTokens?: Iterable<string>,
): boolean {
  if (independentOutletKey(a) === independentOutletKey(b)) return false;
  if (isSyndicatedRepublish(a, b)) return false;
  const exclude =
    memberNameTokens === undefined
      ? undefined
      : memberNameTokens instanceof Set
        ? memberNameTokens
        : new Set(memberNameTokens);
  return sharedSignificantTokenCount(a.headline, b.headline, exclude) >= 2;
}

function countIndependentCorroborators(
  item: NewsItem,
  pool: NewsItem[],
  memberNameTokens?: Iterable<string>,
): number {
  const keys = new Set<string>();
  for (const other of pool) {
    if (!isIndependentSameEventReporting(item, other, memberNameTokens)) continue;
    keys.add(independentOutletKey(other));
  }
  return keys.size;
}

/**
 * Set isVerified when ≥1 other independent outlet corroborates the same event
 * (≥2 shared non-name tokens). Listing tier is preserved — approved-outlet news
 * listings stay `'media'`/`'nonpartisan'`/`'official'`; failed corroboration is
 * NOT a demotion to `'alleged'` (data-policy 2026-07-26).
 */
export function applyNewsCorroboration(
  items: NewsItem[],
  memberNameTokens?: Iterable<string>,
): NewsItem[] {
  return items.map((item) => {
    const corroborators = countIndependentCorroborators(item, items, memberNameTokens);
    const isVerified = corroborators >= 1;
    return {
      ...item,
      isVerified,
      source: {
        ...item.source,
        // Preserve builder/registry listing tier — never rewrite to alleged.
        tier: item.source.tier,
      },
    };
  });
}
