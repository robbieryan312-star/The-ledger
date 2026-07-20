/**
 * Frozen fixtures for docsConsistencyGuard — append-only regression evidence.
 */

/** Doc claims script retired but package.json still registers it (BAD). */
export const RETIRED_SCRIPT_KNOWN_BAD = {
  docClaim: 'ingest:gdelt-fl is retired and removed from package.json',
  scriptName: 'ingest:gdelt-fl',
  /** Script exists in package.json on this branch — doc must not claim removed. */
  scriptMustExist: true,
};

/** Doc guard count must match prebuild npm run chain (GOOD). */
export const PREBUILD_COUNT_KNOWN_GOOD = {
  /**
   * Parsed from package.json prebuild at guard wiring time — updated when prebuild changes.
   * 2026-07-20: 20 → 21 with `test:navigation-integrity`; 21 → 22 with `test:vercel-json`.
   */
  expectedPrebuildCommands: 22,
};

/** Default build must run render-integrity after Next build (GOOD). */
export const POSTBUILD_RENDER_INTEGRITY_KNOWN_GOOD = {
  requiredScript: 'test:render-integrity',
};

/** Migrated profile count from manifest (GOOD). */
export const MIGRATED_COUNT_KNOWN_GOOD = {
  manifestPath: 'lib/data/generated/profiles/_manifest.json',
  expectedCount: 7,
};

/** Legacy Tier label in active doc (BAD). */
export const TIER_LABEL_KNOWN_BAD = 'Tier 1 official sources only';

/** §1.1 letter that must resolve to a real heading in core-rules (GOOD). */
export const SECTION_CITE_KNOWN_GOOD = {
  cite: '§1.1 J',
  headingPattern: /#### J\. Agent handoff log/i,
};

/** Wrong §1.1 letter cite (BAD) — was used before B1 fix. */
export const SECTION_CITE_KNOWN_BAD = {
  cite: '§1.1 B',
  wrongMeaning: 'Claude handoff report template',
  correctSection: '§1.1 B is Two-or-more-failure handoff; template is §1.1 F',
};

/**
 * The source constitution owns routing; KEYS.md must point at it (one fact, one owner).
 * Frozen 2026-07-19 with the SOURCE REGISTRY brief (R2/R5). Append-only.
 */
export const KEYS_REGISTRY_CROSSREF_KNOWN_GOOD = {
  registryFile: 'docs/OBJECTIVE_SOURCES.md',
  keysFile: 'KEYS.md',
  /** KEYS.md must cite the registry as the routing owner. */
  keysMustCite: 'docs/OBJECTIVE_SOURCES.md',
};
