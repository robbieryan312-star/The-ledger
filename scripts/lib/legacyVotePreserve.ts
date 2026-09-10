import type { CongressVoteEntry } from '../../lib/data/congressVotes';

function hasVoteRows(entry: CongressVoteEntry | undefined): boolean {
  return (entry?.votes?.length ?? 0) > 0;
}

function withPreserveNote(entry: CongressVoteEntry): CongressVoteEntry {
  const preserveNote = 'Prior vote rows preserved because this refresh produced no replacement rows.';
  if (entry.note?.includes(preserveNote)) return entry;
  return {
    ...entry,
    note: entry.note ? `${entry.note} ${preserveNote}` : preserveNote,
  };
}

/**
 * Legacy sync:votes rebuilds the generated snapshot from live API responses. A per-roll
 * fetch miss is not a verified zero-vote record, so keep prior rows unless fresh rows exist.
 */
export function mergeLegacyVoteEntriesWithPrior(
  freshEntries: Record<string, CongressVoteEntry>,
  priorEntries: Record<string, CongressVoteEntry>,
  currentPoliticianIds: Iterable<string>,
): Record<string, CongressVoteEntry> {
  const merged: Record<string, CongressVoteEntry> = {};
  for (const politicianId of currentPoliticianIds) {
    const fresh = freshEntries[politicianId];
    const prior = priorEntries[politicianId];
    if (hasVoteRows(fresh)) {
      merged[politicianId] = fresh;
      continue;
    }
    if (hasVoteRows(prior)) {
      merged[politicianId] = withPreserveNote(prior);
      continue;
    }
    if (fresh) merged[politicianId] = fresh;
  }
  return merged;
}
