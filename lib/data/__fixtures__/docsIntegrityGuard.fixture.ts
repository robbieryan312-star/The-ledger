/**
 * Frozen fixtures for docsIntegrityGuard — append-only regression evidence.
 */

/**
 * Known-bad: docs cited a gitignored render artifact path in backticks.
 * Fresh clones fail `test:docs-integrity` because the file is not in the tree
 * (fe1be0a9 class — third occurrence; this fixture must prevent a fourth).
 */
export const GITIGNORED_PATH_CITATION_KNOWN_BAD = {
  defect: 'gitignored-path-cited-in-docs',
  /** Exact backtick path that must never reappear in active docs. */
  path: 'data/reports/render-integrity/contact-sheet.json',
  description:
    'AGENT_HANDOFF_LOG cited gitignored contact-sheet.json; docs-integrity passes locally after a gate but fails on fresh clone / CI checkout',
};
