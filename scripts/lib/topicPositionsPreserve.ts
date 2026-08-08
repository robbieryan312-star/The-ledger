export function canRefreshSaidDidLinks(
  votesLoaded: boolean,
  votesByBioguideId: Map<string, unknown>,
  bioguideId: string,
): boolean {
  const votes = votesByBioguideId.get(bioguideId);
  return votesLoaded && Array.isArray(votes) && votes.length > 0;
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
