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
