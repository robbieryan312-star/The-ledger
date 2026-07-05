/**
 * Legacy sync keys before 10-topic consolidation — merged at read time until full re-sync.
 * Shared by profileRecordByTopic, issuesFromTopicPositions, and memberDeep lookups.
 */
export const LEGACY_TOPIC_ALIASES: Record<string, string> = {
  environment: 'climate',
  defense: 'defense-veterans',
  crime: 'public-safety',
  civil: 'civil-liberties',
  judiciary: 'civil-liberties',
  economy: 'economy-taxes',
};

export function normalizeTopicId(rawId: string): string {
  return LEGACY_TOPIC_ALIASES[rawId] ?? rawId;
}

/** All byTopic keys that resolve to the same current topic id (legacy + canonical). */
export function topicIdsForMergedLookup(canonicalId: string): string[] {
  const ids = new Set<string>([canonicalId]);
  for (const [legacy, current] of Object.entries(LEGACY_TOPIC_ALIASES)) {
    if (current === canonicalId) ids.add(legacy);
  }
  return [...ids];
}

export interface MergedDeepTopicBlock<T> {
  sponsored: T[];
  cosponsored: T[];
}

/** Merge legacy byTopic keys (defense, economy, …) into the canonical topic bucket. */
export function getMergedDeepTopicBlock<T>(
  byTopic: Record<string, MergedDeepTopicBlock<T> | undefined>,
  topicId: string,
): MergedDeepTopicBlock<T> | null {
  const canonicalId = normalizeTopicId(topicId);
  const sponsored: T[] = [];
  const cosponsored: T[] = [];

  for (const key of topicIdsForMergedLookup(canonicalId)) {
    const block = byTopic[key];
    if (!block) continue;
    sponsored.push(...block.sponsored);
    cosponsored.push(...block.cosponsored);
  }

  if (sponsored.length === 0 && cosponsored.length === 0) return null;
  return { sponsored, cosponsored };
}
