import type { PoliticianSearchHit } from '@/lib/types/searchIndex';

/** Client-safe filter over pre-built hits. */
export function filterPoliticianHits(hits: PoliticianSearchHit[], query: string, limit = 8): PoliticianSearchHit[] {
  const lower = query.toLowerCase().trim();
  if (lower.length < 2) return [];
  return hits
    .filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.lastName.toLowerCase().includes(lower) ||
        p.state.toLowerCase().includes(lower) ||
        p.stateCode.toLowerCase() === lower,
    )
    .slice(0, limit);
}

export function sortOfficialsForDisplay<T extends { party: string; name: string }>(items: T[]): T[] {
  const partyOrder: Record<string, number> = { Democrat: 0, Independent: 1, Republican: 2 };
  return [...items].sort((a, b) => {
    const pa = partyOrder[a.party] ?? 3;
    const pb = partyOrder[b.party] ?? 3;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
}

export function politiciansForState(
  hits: PoliticianSearchHit[],
  stateCode: string,
): PoliticianSearchHit[] {
  return hits.filter((p) => p.stateCode === stateCode);
}
