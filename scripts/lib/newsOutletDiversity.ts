/**
 * Cap any single news outlet's share of a member's News tab.
 * Binding product rule for flagship profiles: no outlet >50%.
 */
import type { NewsItem } from '../../lib/types';

/** Normalize outlet labels so "The Hill News" / "The Hill" share a bucket. */
export function normalizeNewsOutletName(name: string | undefined | null): string {
  const raw = (name ?? '').trim().toLowerCase();
  if (!raw) return 'unknown';
  if (raw.includes('guardian')) return 'The Guardian';
  if (raw.includes('associated press') || raw === 'ap' || raw.startsWith('ap ')) return 'AP News';
  if (raw.includes('ap news')) return 'AP News';
  if (raw.includes('politico')) return 'Politico';
  if (raw.includes('reuters')) return 'Reuters';
  if (raw.includes('the hill') || raw === 'hill') return 'The Hill';
  if (raw.includes('npr') || raw.includes('national public radio')) return 'NPR';
  if (raw.includes('new york times') || raw === 'nyt') return 'New York Times';
  if (raw.includes('washington post') || raw === 'wapo') return 'Washington Post';
  if (raw.includes('pbs')) return 'PBS NewsHour';
  if (raw.includes('roll call')) return 'Roll Call';
  if (raw.includes('propublica')) return 'ProPublica';
  // Title-case unknown labels lightly
  return (name ?? 'unknown').trim();
}

export function outletCounts(items: NewsItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = normalizeNewsOutletName(item.source?.name);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function maxOutletShare(items: NewsItem[]): { outlet: string; count: number; share: number } {
  if (items.length === 0) return { outlet: '', count: 0, share: 0 };
  const counts = outletCounts(items);
  let best = { outlet: '', count: 0 };
  for (const [outlet, count] of Object.entries(counts)) {
    if (count > best.count) best = { outlet, count };
  }
  return { ...best, share: best.count / items.length };
}

/**
 * Select up to `maxItems` newest items such that **in the final set** no outlet
 * exceeds `maxShare`. When other outlets are exhausted, the set shrinks
 * (drop oldest from the dominant outlet) rather than shipping a >50% monopoly.
 */
export function selectNewsItemsWithOutletCap(
  items: NewsItem[],
  maxItems: number,
  maxShare = 0.5,
): NewsItem[] {
  if (maxItems <= 0 || items.length === 0) return [];
  // Newest-first pool, hard-capped at maxItems before share trim.
  let selected = [...items]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maxItems);

  // Shrink until every outlet is ≤ maxShare of the published set (or set size 1).
  while (selected.length > 1) {
    const { outlet, share } = maxOutletShare(selected);
    if (share <= maxShare) break;
    // Drop the oldest item from the dominant outlet.
    let dropIdx = -1;
    for (let i = selected.length - 1; i >= 0; i--) {
      if (normalizeNewsOutletName(selected[i].source?.name) === outlet) {
        dropIdx = i;
        break;
      }
    }
    if (dropIdx < 0) break;
    selected = selected.filter((_, i) => i !== dropIdx);
  }

  return selected;
}
