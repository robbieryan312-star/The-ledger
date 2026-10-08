import type { SaidDidLinkEntry } from '../../lib/data/topicPositions';

export function canRefreshSaidDidLinks(
  votesLoaded: boolean,
  votesByBioguideId: Map<string, unknown>,
  bioguideId: string,
): boolean {
  return votesLoaded && votesByBioguideId.has(bioguideId);
}

export function mergeSaidDidLinksForRefresh<T>(
  existingLinks: T[] | undefined,
  freshLinks: T[] | undefined,
  canRefresh: boolean,
): T[] {
  if (canRefresh) {
    return freshLinks ?? [];
  }
  return existingLinks ?? [];
}

function saidDidVoteKey(link: SaidDidLinkEntry): string {
  return [
    link.topicId ?? '',
    link.voteDate,
    link.billNumber,
    link.congressGovUrl,
    link.voteChoice,
  ].join('|');
}

export function combineFreshSaidDidLinks(
  topicLinks: SaidDidLinkEntry[] | undefined,
  crecOverlapLinks: SaidDidLinkEntry[] | undefined,
): SaidDidLinkEntry[] {
  const out: SaidDidLinkEntry[] = [];
  const seenVotes = new Set<string>();
  // Prefer overlap links because they embed the exact CREC Said quote and URL.
  for (const link of [...(crecOverlapLinks ?? []), ...(topicLinks ?? [])]) {
    const key = saidDidVoteKey(link);
    if (seenVotes.has(key)) continue;
    seenVotes.add(key);
    out.push(link);
  }
  return out;
}

export function mergeTopicSyncSaidDidLinks(
  existingLinks: SaidDidLinkEntry[] | undefined,
  topicLinks: SaidDidLinkEntry[] | undefined,
  crecOverlapLinks: SaidDidLinkEntry[] | undefined,
  canRefresh: boolean,
): SaidDidLinkEntry[] {
  return mergeSaidDidLinksForRefresh(
    existingLinks,
    combineFreshSaidDidLinks(topicLinks, crecOverlapLinks),
    canRefresh,
  );
}
