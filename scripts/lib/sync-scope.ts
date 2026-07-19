/**
 * Sync scoping (core-rules §5): agent-initiated national syncs MUST be scoped with
 * `--members <bioguideId,...>`. A full-corpus run must be opted into explicitly with
 * `--full-corpus` (scheduled CI / owner-initiated only). An unscoped invocation is refused.
 */

/** Parse `--members a,b,c` into a Set, or null when the flag is absent/empty. */
export function parseMembersArg(argv: string[]): Set<string> | null {
  const idx = argv.indexOf('--members');
  if (idx === -1 || !argv[idx + 1]) return null;
  const ids = argv[idx + 1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? new Set(ids) : null;
}

/**
 * Enforce scoping. Returns the member filter (a Set) for a scoped run, or null for an explicit
 * `--full-corpus` run. Exits the process (code 1) with guidance when neither is provided, so an
 * unscoped full-corpus sync can never run by accident in an agent session.
 */
export function requireSyncScope(argv: string[], scriptName: string): Set<string> | null {
  const members = parseMembersArg(argv);
  const fullCorpus = argv.includes('--full-corpus');
  if (members) return members;
  if (fullCorpus) return null;
  console.error(
    `[${scriptName}] refusing to run unscoped. Pass "--members <bioguideId,...>" to scope an ` +
      `agent run, or "--full-corpus" for a scheduled/owner full run (core-rules §5).`,
  );
  process.exit(1);
}

/** True when a member is in scope (always true for a full-corpus run). */
export function memberInScope(bioguideId: string, filter: Set<string> | null): boolean {
  return !filter || filter.has(bioguideId);
}
