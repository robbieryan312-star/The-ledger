/**
 * Append-only: DOC-07 — only ONE improvement backlog may exist.
 */
export const IMPROVEMENT_BACKLOG_CANONICAL_PATH =
  'docs/workflows/IMPROVEMENT_BACKLOG.md' as const;

/** Frozen bad: second "## Improvement backlog" heading (must never reappear outside canonical). */
export const IMPROVEMENT_BACKLOG_KNOWN_BAD_SECOND_HEADING = {
  defect: 'scattered-improvement-backlog',
  description:
    'More than one "## Improvement backlog" heading under docs/ (DOC-07) — must be a single file',
  bannedHeading: /^## Improvement backlog\b/m,
  maxHeadingsAcrossDocs: 0,
} as const;

/**
 * Frozen bad: canonical "## Backlog" duplicated anywhere (outside canonical or >1 total).
 * Canonical file is allowed exactly one `## Backlog` heading.
 */
export const IMPROVEMENT_BACKLOG_KNOWN_BAD_DUPLICATE_BACKLOG = {
  defect: 'duplicate-canonical-backlog-heading',
  description:
    '`## Backlog` must appear exactly once under docs/, only in IMPROVEMENT_BACKLOG.md',
  backlogHeading: /^## Backlog\b/m,
  maxOccurrencesAcrossDocs: 1,
  onlyAllowedPath: IMPROVEMENT_BACKLOG_CANONICAL_PATH,
} as const;

/** Frozen good: canonical file exists and is the fountainhead. */
export const IMPROVEMENT_BACKLOG_KNOWN_GOOD = {
  path: IMPROVEMENT_BACKLOG_CANONICAL_PATH,
  requiredTitle: '# Improvement backlog — SINGLE canonical source',
  requiredOwnerDashboardSection: 'Owner / dashboard state (mirror — GitHub is source of truth)',
  requiredBacklogHeading: /^## Backlog\b/m,
} as const;
