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

function normalizeStatementUrl(url: string | undefined): string {
  if (!url?.trim()) return '';
  return url.trim().replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
}

function normalizeStatementText(text: string | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function statementKey(statement: { tier?: string; url?: string; title?: string }): string {
  const url = normalizeStatementUrl(statement.url);
  if (url) return `${statement.tier ?? ''}:${url}`;
  return `${statement.tier ?? ''}:${normalizeStatementText(statement.title)}`;
}

/**
 * Media quote verification depends on live/Wayback fetches. A transient fetch miss is not
 * proof that an already committed verified quote should be deleted.
 */
export function mergeStatementsPreservingPriorMedia<T extends { tier?: string; url?: string; title?: string }>(
  existingStatements: T[] | undefined,
  freshStatements: T[] | undefined,
): T[] {
  const merged = [...(freshStatements ?? [])];
  const seen = new Set(merged.map(statementKey));
  for (const prior of existingStatements ?? []) {
    if (prior.tier !== 'media') continue;
    const key = statementKey(prior);
    if (seen.has(key)) continue;
    merged.push(prior);
    seen.add(key);
  }
  return merged;
}
