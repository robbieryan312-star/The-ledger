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

interface StatementForRefresh {
  title: string;
  date: string;
  url: string;
  tier: string;
  topicId: string;
}

export function statementUrlStem(url: string): string {
  const granule = url.match(/CREC-[^/?#]+/i)?.[0] ?? url;
  // Same physical CREC page can appear as ...-PgS3474-2 vs ...-PgS3474-3.
  return granule.replace(/-\d+$/, '');
}

function isRefreshPreservableStatement(s: StatementForRefresh): boolean {
  if (!s.title.trim() || !s.date.trim() || !s.url.trim() || !s.topicId.trim()) return false;
  return s.tier === 'official' || s.tier === 'nonpartisan' || s.tier === 'media';
}

function isCommittedCrecStatement(s: StatementForRefresh): boolean {
  return s.tier === 'official' && /\/CREC-/i.test(s.url);
}

export function shouldAddStatementForRefresh(
  existing: StatementForRefresh[],
  entry: StatementForRefresh,
): boolean {
  const titleKey = entry.title.trim().toLowerCase();
  const stem = statementUrlStem(entry.url);
  if (existing.some((e) => e.title.trim().toLowerCase() === titleKey)) return false;
  if (existing.some((e) => statementUrlStem(e.url) === stem)) return false;
  return true;
}

export function mergeStatementsForRefresh<T extends StatementForRefresh>(
  existingStatements: T[] | undefined,
  freshStatements: T[] | undefined,
  options: { isProceduralCrecText?: (text: string) => boolean } = {},
): T[] {
  const merged: T[] = [...(freshStatements ?? [])];
  for (const prior of existingStatements ?? []) {
    if (!isRefreshPreservableStatement(prior)) continue;
    if (isCommittedCrecStatement(prior) && options.isProceduralCrecText?.(prior.title)) continue;
    if (!shouldAddStatementForRefresh(merged, prior)) continue;
    merged.push(prior);
  }
  return merged;
}
